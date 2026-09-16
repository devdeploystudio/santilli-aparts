#!/usr/bin/env node
/**
 * compress-images.mjs
 *
 * Corre DESPUÉS de rename-uploads.mjs en el mismo workflow, sobre los
 * archivos que hayan cambiado en este push (ya con el nombre final, si
 * rename-uploads los renombró). Comprime sin pérdida (PNG) o a calidad
 * 82 (JPEG/WebP), y solo reemplaza el archivo si el resultado da más
 * chico que el original - nunca empeora un archivo ya optimizado.
 *
 * Adaptado de la plantilla estándar de Deploy: acá las fotos del panel
 * viven en public/departamentos/, no src/assets/. El video (mp4) de
 * cada depto NO se comprime acá a propósito (necesita ffmpeg, no sharp).
 *
 * Gotcha Windows (no aplica en CI, que corre en Linux, pero si se
 * prueba en local en Windows): pasarle a sharp() la RUTA del archivo en
 * vez de un buffer ya leído deja el archivo con un handle abierto, y la
 * escritura posterior al mismo path falla con "UNKNOWN: unknown error,
 * open". Por eso acá siempre se lee a buffer primero.
 *
 * Requiere: node >=18, paquete "sharp" (npm install sharp, lo instala
 * el workflow, no hace falta agregarlo al package.json del proyecto).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, basename, extname, join } from 'node:path/posix';
import sharp from 'sharp';

// Mismas carpetas que rename-uploads.mjs (ver ese archivo) - cualquier
// carpeta nueva de fotos/video editables desde el panel se agrega en AMBOS.
const ASSETS_ROOTS = ['public/departamentos', 'public/hero', 'public/inicio', 'public/nosotros', 'public/resenas'];
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
  const diff = execSync(`git diff --name-status ${base} HEAD -- ${ASSETS_ROOTS.join(' ')}`, { encoding: 'utf8' });
  return diff
    .trim()
    .split('\n')
    .filter(Boolean)
    // .trim() en cada línea: en algunos entornos (visto en Windows) git
    // diff devuelve las líneas con \r al final, que si no se saca rompe
    // silenciosamente el chequeo de extensión de más abajo.
    .map((line) => line.trim().split('\t'))
    .filter(([status]) => status.startsWith('A') || status.startsWith('M'))
    .map(([, path]) => path.trim())
    .filter((path) => /\.(jpe?g|png|webp)$/i.test(path));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// rename-uploads.mjs corre justo antes en el mismo workflow y puede haber
// renombrado este mismo archivo a foto_v02.ext en el filesystem (si detectó
// un reemplazo con el mismo nombre). Ese renombre todavía no está
// commiteado, así que el "git diff contra HEAD~1" de este script no se
// entera y sigue señalando el nombre viejo, que ya no existe -> ENOENT. Si
// el path original desapareció, buscamos la versión más nueva con ese mismo
// nombre base en la carpeta, seleccionandonos automaticamente al renombrado.
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

async function compressOne(path) {
  const before = readFileSync(path);
  const originalSize = before.length;
  const ext = path.toLowerCase().split('.').pop();

  let output;
  if (ext === 'png') {
    output = await sharp(before).png({ compressionLevel: 9, quality: 90 }).toBuffer();
  } else if (ext === 'webp') {
    output = await sharp(before).webp({ quality: 82 }).toBuffer();
  } else {
    output = await sharp(before).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }

  if (output.length < originalSize) {
    writeFileSync(path, output);
    console.log(
      `compress-images: ${path} ${(originalSize / 1024).toFixed(0)}KB -> ${(output.length / 1024).toFixed(0)}KB`
    );
  } else {
    console.log(`compress-images: ${path} ya está óptimo, sin cambios.`);
  }
}

async function run() {
  const files = getChangedAssetFiles();
  if (!files.length) {
    console.log('compress-images: sin imágenes para comprimir en este push.');
    return;
  }
  for (const file of files) {
    const resolved = resolveRenamedPath(file);
    if (!resolved) {
      console.log(`compress-images: ${file} ya no existe (probablemente eliminado en este mismo push), se salteó.`);
      continue;
    }
    await compressOne(resolved);
  }
}

run();
