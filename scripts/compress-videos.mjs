#!/usr/bin/env node
/**
 * compress-videos.mjs
 *
 * Corre en el mismo workflow que compress-images.mjs (después de
 * rename-uploads.mjs), sobre los videos que hayan cambiado en este push.
 * A diferencia de las fotos, acá SÍ puede cambiar la extensión: cualquier
 * formato de entrada (mov, avi, mkv, webm...) se reencodea a H.264/AAC
 * dentro de un contenedor .mp4 (el más compatible, y el que ya usa el
 * sitio como formato principal) - si el original YA era .mp4, se
 * comprime en el mismo archivo, sin renombrar nada.
 *
 * Cuando la extensión SÍ cambia, hay que actualizar toda referencia a
 * ese archivo en el contenido (JSON/YAML) - mismo patrón que
 * rename-uploads.mjs para reemplazos, pero acá aplica también a
 * archivos NUEVOS (status "A"): el commit de Sveltia ya guardó la
 * referencia con el nombre/extensión ORIGINAL, así que hay que
 * corregirla sea nuevo o reemplazo.
 *
 * Solo reemplaza el archivo si el resultado da más chico Y el video
 * comprimido es válido (ffprobe puede leerle la duración) - nunca deja
 * un archivo roto ni empeora uno ya optimizado. Un video puntual que
 * falle (formato raro, corrupto) no corta el resto del job.
 *
 * ⚠️ Límite duro de la plataforma, no algo que se pueda "ajustar mejor":
 * este sitio se despliega como Cloudflare Worker (`@astrojs/cloudflare`,
 * `wrangler deploy`), que rechaza CUALQUIER asset de más de 25 MiB -
 * "Error: Asset too large" y el deploy entero falla (no solo ese
 * archivo). Encontrado en producción (`santilli-aparts`, sep 2026): un
 * video de 72 segundos comprimido "a mano" con el CRF por default dio
 * 29.2 MiB, tiró abajo el deploy en silencio (sin que nadie se enterara
 * hasta revisar los logs de Cloudflare) durante varios pushes seguidos.
 * Por eso este script reintenta con más compresión hasta entrar bajo el
 * límite, en vez de aceptar el primer resultado que dé "más chico que el
 * original" sin más.
 *
 * Requiere: node >=18, "ffmpeg"/"ffprobe" en el PATH. Los runners de
 * GitHub Actions (ubuntu-latest) los traen preinstalados - no hace falta
 * sumarlos al step de "Instalar dependencias".
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { dirname, basename, extname, join, relative } from 'node:path/posix';
import { globSync } from 'glob';

const ASSETS_ROOTS = ['public/departamentos', 'public/hero', 'public/inicio', 'public/nosotros', 'public/resenas'];
const CONTENT_GLOBS = ['src/data/departamentos/**/*.json', 'src/content/**/*.yaml'];
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
// Mismos formatos que reconoce rename-uploads.mjs para video - lista
// amplia a propósito, el cliente puede subir cualquier cosa desde el
// celular/cámara.
const VIDEO_EXT = /\.(mp4|mov|webm|avi|mkv|m4v|ogv|3gp|wmv|flv|mpe?g)$/i;
// 25 MiB es el límite real de Cloudflare Workers - se apunta a 24 MiB
// (un poco menos) para dejar margen, nunca al límite justo.
const MAX_SIZE_BYTES = 24 * 1024 * 1024;
// Escalera de intentos: primero solo sube el CRF (más compresión, mismo
// ancho); si ni con el CRF más agresivo entra, el último intento además
// baja el ancho máximo. Cada paso es progresivamente más agresivo -
// nunca se usa uno más agresivo de lo necesario para entrar bajo el límite.
const INTENTOS = [
  { crf: 28, ancho: 1920 },
  { crf: 32, ancho: 1920 },
  { crf: 36, ancho: 1920 },
  { crf: 36, ancho: 1280 },
];

function diffBase() {
  const fromEnv = process.env.DIFF_BASE;
  if (fromEnv && /^[0-9a-f]{40}$/i.test(fromEnv) && fromEnv !== '0'.repeat(40)) return fromEnv;
  try {
    execFileSync('git', ['rev-parse', 'HEAD~1'], { stdio: 'ignore' });
    return 'HEAD~1';
  } catch {
    return EMPTY_TREE;
  }
}

function getChangedVideoFiles() {
  const base = diffBase();
  const diff = execFileSync('git', ['diff', '--name-status', base, 'HEAD', '--', ...ASSETS_ROOTS], {
    encoding: 'utf8',
  });
  return diff
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.trim().split('\t'))
    .filter(([status]) => status.startsWith('A') || status.startsWith('M'))
    .map(([, path]) => path.trim())
    .filter((path) => VIDEO_EXT.test(path));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// rename-uploads.mjs corre antes en el mismo workflow y puede haber
// versionado este mismo archivo (foto.ext -> foto_v02.ext) sin que el
// commit todavía exista - el "git diff" de acá sigue señalando el path
// viejo. Si ya no existe, buscamos la versión más nueva con ese mismo
// nombre base.
function resolveRenamedPath(path) {
  if (existsSync(path)) return path;
  const dir = dirname(path);
  const ext = extname(path);
  const baseName = basename(path, ext);
  const re = new RegExp(`^${escapeRegExp(baseName)}_v(\\d+)${escapeRegExp(ext)}$`, 'i');
  const files = existsSync(dir) ? readdirSync(dir) : [];
  let best = null;
  let bestVersion = -1;
  for (const f of files) {
    const m = f.match(re);
    if (m) {
      const version = parseInt(m[1], 10);
      if (version > bestVersion) {
        bestVersion = version;
        best = f;
      }
    }
  }
  return best ? join(dir, best) : null;
}

// Próximo nombre libre tipo "archivo.mp4", "archivo_v02.mp4"... - hace
// falta cuando la conversión a .mp4 chocaría con un archivo que ya existe
// con ese nombre (ej. subieron "clip.mov" pero ya había un "clip.mp4"
// de otra unidad).
function nextFreeName(dir, baseName, ext) {
  let candidate = `${baseName}${ext}`;
  if (!existsSync(join(dir, candidate))) return candidate;
  let n = 2;
  while (existsSync(join(dir, `${baseName}_v${String(n).padStart(2, '0')}${ext}`))) n++;
  return `${baseName}_v${String(n).padStart(2, '0')}${ext}`;
}

function updateContentReferences(oldRelPath, newRelPath) {
  const files = CONTENT_GLOBS.flatMap((pattern) => globSync(pattern)).map((f) => f.split('\\').join('/'));
  const oldUrl = oldRelPath.startsWith('public/') ? oldRelPath.slice('public'.length) : null;
  const newUrl = newRelPath.startsWith('public/') ? newRelPath.slice('public'.length) : null;
  let touched = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    let next = text;
    const relDesdeArchivo = relative(dirname(file), oldRelPath);
    const relNuevoDesdeArchivo = relative(dirname(file), newRelPath);
    const variantes = [oldRelPath, `/${oldRelPath}`, relDesdeArchivo, `./${relDesdeArchivo}`, ...(oldUrl ? [oldUrl] : [])];
    for (const variant of variantes) {
      if (!next.includes(variant)) continue;
      const replacement =
        variant === oldUrl
          ? newUrl
          : variant === relDesdeArchivo
            ? relNuevoDesdeArchivo
            : variant === `./${relDesdeArchivo}`
              ? `./${relNuevoDesdeArchivo}`
              : variant.startsWith('/')
                ? `/${newRelPath}`
                : newRelPath;
      next = next.split(variant).join(replacement);
    }
    if (next !== text) {
      writeFileSync(file, next);
      touched++;
    }
  }
  return touched;
}

// true si ffprobe puede leerle una duración > 0 - chequeo mínimo de que
// el archivo de salida es un video válido y no quedó corrupto/vacío.
function esVideoValido(path) {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path],
      { encoding: 'utf8' },
    ).trim();
    return parseFloat(out) > 0;
  } catch {
    return false;
  }
}

function encodeIntento(path, tmpOut, { crf, ancho }) {
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i', path,
      '-c:v', 'libx264',
      '-crf', String(crf),
      '-preset', 'medium',
      '-vf', `scale='min(${ancho},iw)':-2`, // nunca agranda, solo limita al ancho de este intento
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', '128k',
      tmpOut,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
}

// Prueba la escalera de INTENTOS en orden hasta conseguir un resultado
// válido y por debajo de MAX_SIZE_BYTES. Devuelve la ruta temporal del
// que sirvió, o null si ni el intento más agresivo entró bajo el límite
// (caso raro - un video muy largo a máxima duración) o ffmpeg falló.
function comprimirBajoElLimite(path, dir, baseName) {
  const tmpOut = join(dir, `.${baseName}.compress-tmp.mp4`);
  let ultimoTamaño = null;

  for (const intento of INTENTOS) {
    try {
      encodeIntento(path, tmpOut, intento);
    } catch (err) {
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
      throw new Error(`ffmpeg falló: ${err.stderr?.toString().slice(-500) || err.message}`);
    }

    if (!existsSync(tmpOut) || !esVideoValido(tmpOut)) {
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
      return { tmpOut: null, ultimoTamaño };
    }

    ultimoTamaño = statSync(tmpOut).size;
    if (ultimoTamaño <= MAX_SIZE_BYTES) {
      return { tmpOut, ultimoTamaño };
    }
    // Todavía pesa de más: se descarta este intento y se prueba el
    // siguiente escalón, más agresivo.
    unlinkSync(tmpOut);
  }

  return { tmpOut: null, ultimoTamaño };
}

async function compressOne(path) {
  const originalSize = statSync(path).size;
  const dir = dirname(path);
  const ext = extname(path);
  const baseName = basename(path, ext);
  const yaEsMp4 = ext.toLowerCase() === '.mp4';

  const { tmpOut, ultimoTamaño } = comprimirBajoElLimite(path, dir, baseName);

  if (!tmpOut) {
    // Ni el intento más agresivo entró bajo el límite (o el resultado no
    // era un video válido) - NUNCA reemplazar el original con algo que
    // rompería el deploy. Esto se loguea bien visible porque significa
    // que el video necesita intervención manual (acortar duración,
    // recortar más el ancho a mano) - silenciarlo sería repetir
    // exactamente el error que motivó este chequeo.
    console.log(
      `::error::compress-videos: ${path} sigue pesando más de ${(MAX_SIZE_BYTES / 1024 / 1024).toFixed(0)}MiB` +
        (ultimoTamaño ? ` (${(ultimoTamaño / 1024 / 1024).toFixed(1)}MiB con la compresión más agresiva)` : '') +
        ` incluso con el intento más agresivo - Cloudflare Workers rechaza cualquier asset de más de 25MiB y el deploy fallaría. Se dejó el original sin tocar, requiere achicarlo a mano (menos duración o menos resolución).`,
    );
    return;
  }

  if (ultimoTamaño >= originalSize) {
    unlinkSync(tmpOut);
    console.log(`compress-videos: ${path} ya está óptimo (comprimir no lo achica), sin cambios.`);
    return;
  }

  const newSize = ultimoTamaño;
  if (yaEsMp4) {
    // Mismo nombre/extensión: se reemplaza en el lugar, no hace falta
    // tocar ninguna referencia.
    unlinkSync(path);
    writeFileSync(path, readFileSync(tmpOut));
    unlinkSync(tmpOut);
    console.log(`compress-videos: ${path} ${(originalSize / 1024 / 1024).toFixed(1)}MB -> ${(newSize / 1024 / 1024).toFixed(1)}MB`);
    return;
  }

  // Cambia la extensión (ej. .mov -> .mp4): hay que elegir un nombre
  // libre, mover el archivo, borrar el original y corregir la referencia
  // que el commit de Sveltia guardó con el nombre/extensión vieja.
  const newName = nextFreeName(dir, baseName, '.mp4');
  const newPath = join(dir, newName);
  writeFileSync(newPath, readFileSync(tmpOut));
  unlinkSync(tmpOut);
  unlinkSync(path);
  const touched = updateContentReferences(path, newPath);
  console.log(
    `compress-videos: ${path} -> ${newPath} (${(originalSize / 1024 / 1024).toFixed(1)}MB -> ${(newSize / 1024 / 1024).toFixed(1)}MB, ${touched} referencia(s) actualizada(s))`,
  );
}

async function run() {
  const files = getChangedVideoFiles();
  if (!files.length) {
    console.log('compress-videos: sin videos para comprimir en este push.');
    return;
  }
  for (const file of files) {
    const resolved = resolveRenamedPath(file);
    if (!resolved) {
      console.log(`compress-videos: ${file} ya no existe (probablemente eliminado en este mismo push), se salteó.`);
      continue;
    }
    try {
      await compressOne(resolved);
    } catch (err) {
      console.log(`compress-videos: no se pudo comprimir ${resolved} (${err.message}), se dejó tal cual.`);
    }
  }
}

run();
