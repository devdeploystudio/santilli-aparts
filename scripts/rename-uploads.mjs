#!/usr/bin/env node
/**
 * rename-uploads.mjs
 *
 * Corre en el workflow .github/workflows/optimize-images.yml después de
 * cada push a main que toque ASSETS_ROOT (acá, public/departamentos/**).
 * Objetivo: que CADA foto/video subido por el panel (nuevo o reemplazo)
 * termine en una URL que nunca existió antes, para que la caché larga de
 * public/_headers (30 días, ver "Paso 5" en MD para configurar dominio y
 * cloudflare.md) nunca pueda quedar mostrando una versión vieja de una
 * foto.
 *
 * Adaptado de la plantilla estándar de Deploy para este proyecto: acá
 * las imágenes de las fichas viven en public/departamentos/ (no
 * src/assets/, que en este sitio son solo las que pasan por astro:assets
 * y ya tienen hash propio), y la referencia que hay que actualizar vive
 * en JSON (src/data/departamentos/*.json), no en YAML.
 *
 * - Archivo NUEVO (status "A" en el diff): se deja como está, la URL ya
 *   es única porque nunca existió antes.
 * - Archivo REEMPLAZADO en el mismo path (status "M"): el cliente subió
 *   un archivo nuevo pero mantuvo el nombre (Sveltia/Decap no renombra
 *   solo). Se renombra a la próxima versión libre (foto.jpg ->
 *   foto_v02.jpg -> foto_v03.jpg...) y se actualiza la referencia en el
 *   contenido (YAML y/o JSON, ver CONTENT_GLOBS) que la usa.
 *
 * Requiere: node >=18, paquete "glob" (npm install glob, lo instala el
 * workflow, no hace falta agregarlo al package.json del proyecto).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, readdirSync, existsSync } from 'node:fs';
// path/posix explícito, no 'node:path' pelado: git siempre usa "/" en
// sus rutas sin importar el SO, pero el 'node:path' genérico en Windows
// devuelve dirname()/join() con "\" - rompía la comparación de rutas
// contra el diff de git y dejaba referencias con backslash en el JSON.
import { dirname, basename, extname, join, relative } from 'node:path/posix';
import { globSync } from 'glob';

const ASSETS_ROOT = 'public/departamentos';
// Acá se referencian las fotos/video de cada depto (fotos[], video,
// videoPoster). Es JSON, no YAML, a diferencia de la plantilla estándar.
// Se deja también src/content/**/*.yaml por si en el futuro se suma algún
// campo imagen ahí (no hace daño, simplemente no encuentra nada que tocar).
const CONTENT_GLOBS = ['src/data/departamentos/**/*.json', 'src/content/**/*.yaml'];
// Incluye mp4: el campo "video" de cada depto también puede reemplazarse
// manteniendo el nombre de archivo. compress-images.mjs sigue sin tocar
// video (necesita ffmpeg, no sharp) - esto solo es el renombrado.
const VERSIONABLE_EXT = /\.(jpe?g|png|webp|avif|gif|svg|mp4)$/i;
// Hash fijo de git para "el árbol vacío" - se usa como base del diff
// cuando no hay commit anterior real (primer push a una rama nueva).
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

function diffBase() {
  const fromEnv = process.env.DIFF_BASE;
  if (fromEnv && /^[0-9a-f]{40}$/i.test(fromEnv) && fromEnv !== '0'.repeat(40)) return fromEnv;
  try {
    // HEAD~1, no HEAD^: en Windows, execSync corre los comandos por
    // cmd.exe, donde "^" es el carácter de escape de línea y rompe esta
    // sintaxis. "~1" tiene el mismo significado en git (el padre directo)
    // sin ese conflicto, en Windows y en Linux (donde corre el workflow real).
    execSync('git rev-parse HEAD~1', { stdio: 'ignore' });
    return 'HEAD~1';
  } catch {
    return EMPTY_TREE;
  }
}

function getChangedAssetFiles() {
  const base = diffBase();
  const diff = execSync(`git diff --name-status ${base} HEAD -- ${ASSETS_ROOT}`, { encoding: 'utf8' });
  return diff.trim().split('\n').filter(Boolean).map((line) => {
    const [status, ...pathParts] = line.trim().split('\t');
    // .trim() en el path también: en algunos entornos (visto en Windows)
    // git diff devuelve las líneas con \r al final, que si no se saca
    // rompe silenciosamente el chequeo de extensión más abajo (".jpg\r"
    // ya no matchea /\.jpg$/).
    return { status: status.trim(), path: pathParts.join('\t').trim() };
  });
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nextVersion(dir, baseName, ext) {
  const files = existsSync(dir) ? readdirSync(dir) : [];
  const re = new RegExp(`^${escapeRegExp(baseName)}_v(\\d+)${escapeRegExp(ext)}$`, 'i');
  let max = 1;
  for (const f of files) {
    const m = f.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

// Si ASSETS_ROOT vive bajo "public/", la URL pública es la misma ruta
// sin ese prefijo ("public/depto-x/01.jpg" -> "/depto-x/01.jpg"). Acá
// siempre aplica: los campos fotos[]/video/videoPoster del schema son
// z.string() con la URL pública, no un import vía astro:assets.
function toPublicUrl(relPath) {
  return relPath.startsWith('public/') ? relPath.slice('public'.length) : null;
}

function updateContentReferences(oldRelPath, newRelPath) {
  // Reemplazo de texto literal, no un parser YAML/JSON de verdad a
  // propósito: la ruta siempre está como valor de string simple en estos
  // schemas, y un reemplazo de texto es más robusto ante distintos
  // estilos de indentación/comillas que reserializar el árbol entero
  // (evita reformatear de paso todo el archivo, lo que ensuciaría el
  // diff del commit del bot).
  // .split('\\').join('/') sobre cada resultado: en Windows, "glob"
  // devuelve las rutas con backslash ("src\\data\\...\\x.json"), no con
  // "/" como todo lo demás en este script. Como dirname()/relative() se
  // importan de 'node:path/posix' a propósito (ver arriba), no reconocen
  // "\\" como separador - sin este split/join, dirname(file) da "." para
  // CUALQUIER archivo, y la ruta relativa calculada abajo sale mal en
  // Windows sin ningún error visible (0 referencias actualizadas).
  const files = CONTENT_GLOBS.flatMap((pattern) => globSync(pattern)).map((f) => f.split('\\').join('/'));
  const oldUrl = toPublicUrl(oldRelPath);
  const newUrl = toPublicUrl(newRelPath);
  let touched = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    let next = text;

    // Por si algún campo imagen llegara a vivir en src/content/**/*.yaml
    // vía astro:assets (no es el caso hoy en departamentos, pero sí lo
    // sería si esto se extiende): esos guardan la ruta RELATIVA AL
    // PROPIO ARCHIVO, no relativa al repo. Se calcula por archivo porque
    // cada uno está a una distancia distinta del asset.
    const relDesdeArchivo = relative(dirname(file), oldRelPath);
    const relNuevoDesdeArchivo = relative(dirname(file), newRelPath);

    const variantes = [
      oldRelPath,
      `/${oldRelPath}`,
      relDesdeArchivo,
      `./${relDesdeArchivo}`,
      ...(oldUrl ? [oldUrl] : []),
    ];
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

function run() {
  const changed = getChangedAssetFiles();
  const modified = changed.filter((f) => f.status === 'M' && VERSIONABLE_EXT.test(f.path));

  if (!modified.length) {
    console.log('rename-uploads: sin reemplazos en este push.');
    return;
  }

  for (const { path } of modified) {
    if (!existsSync(path)) continue; // por si un rename previo ya lo movió

    const dir = dirname(path);
    const ext = extname(path);
    const baseName = basename(path, ext);

    // Ya está versionado a mano (alguien subió directo "algo_v03.jpg")
    // - no lo tocamos de nuevo.
    if (/_v\d+$/i.test(baseName)) continue;

    const version = nextVersion(dir, baseName, ext);
    const newName = `${baseName}_v${String(version).padStart(2, '0')}${ext}`;
    const newPath = join(dir, newName);

    renameSync(path, newPath);
    const touched = updateContentReferences(path, newPath);
    console.log(`rename-uploads: ${path} -> ${newPath} (${touched} referencia(s) actualizada(s))`);
  }
}

run();
