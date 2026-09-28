#!/usr/bin/env node
/**
 * delete-orphaned-media.mjs
 *
 * Corre AL FINAL del workflow (después de rename-uploads.mjs,
 * compress-images.mjs, compress-videos.mjs, rename-new-deptos.mjs y
 * sync-nuevos-deptos-en-listas-curadas.mjs - necesita que todas las
 * referencias ya estén en su forma FINAL antes de decidir qué sobra),
 * justo antes de "Commitear cambios".
 *
 * Sveltia (como cualquier CMS estilo Decap) nunca borra el archivo físico
 * cuando el cliente saca una foto/video de una lista o reemplaza una
 * imagen - solo actualiza la referencia. Con el tiempo, esto deja
 * archivos "huérfanos" en el repo (nadie los referencia desde ningún
 * lado) que solo ocupan espacio, sin romper nada del sitio.
 *
 * Este script compara TODOS los archivos que hay en las carpetas que
 * sube el panel (ASSETS_ROOTS) contra el texto completo de TODO el
 * contenido (CONTENT_GLOBS) - si el path público de un archivo no
 * aparece en ningún lado, se borra. Corre SOLO sobre esas carpetas
 * puntuales (nunca sobre public/ entero), porque son las únicas que el
 * panel llena - iconos, logos, favicons y demás quedan afuera a
 * propósito, esos se referencian desde el código (.astro/.tsx), no desde
 * el contenido, y este script ni los mira.
 *
 * Nada de esto es "sin vuelta atrás": como el borrado se comitea a git,
 * cualquier archivo borrado por error sigue recuperable desde el
 * historial (`git checkout <commit>~1 -- <path>`) - no es un rm -rf
 * fuera de git.
 *
 * "src/data/departamentos-archivados" se incluye en CONTENT_GLOBS (no
 * solo "src/data/departamentos") a propósito: un depto archivado no
 * aparece en el sitio, pero sus fotos siguen "en uso" en el sentido de
 * que el archivo JSON archivado las sigue referenciando - archivar no es
 * lo mismo que borrar, y este script no debe tratarlas como huérfanas.
 *
 * Requiere: node >=18, paquete "glob".
 */

import { readFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path/posix';
import { globSync } from 'glob';

const ASSETS_ROOTS = ['public/departamentos', 'public/hero', 'public/inicio', 'public/nosotros', 'public/resenas'];
const CONTENT_GLOBS = [
  'src/data/departamentos/**/*.json',
  'src/data/departamentos-archivados/**/*.json',
  'src/content/**/*.yaml',
];

function listAllFiles(dir) {
  let results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    // Dotfiles (.gitkeep, etc.) no son media del panel - se ignoran, no
    // se borran nunca por este script.
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) results = results.concat(listAllFiles(full));
    else results.push(full);
  }
  return results;
}

// Un solo blob con TODO el contenido, en vez de buscar archivo por
// archivo: acá no hace falta saber QUIÉN referencia cada media, solo si
// ALGUIEN lo hace - más simple y sirve igual.
function buildReferencedBlob() {
  const files = CONTENT_GLOBS.flatMap((pattern) => globSync(pattern)).map((f) => f.split('\\').join('/'));
  return files.map((f) => readFileSync(f, 'utf8')).join('\n');
}

// Los campos del schema guardan la URL pública ("/departamentos/x/01.jpg"),
// sin el prefijo "public/" - mismo criterio que toPublicUrl() en
// rename-uploads.mjs/compress-videos.mjs.
function toPublicUrl(relPath) {
  return relPath.startsWith('public/') ? relPath.slice('public'.length) : relPath;
}

function run() {
  const blob = buildReferencedBlob();
  const borrados = [];

  for (const root of ASSETS_ROOTS) {
    for (const file of listAllFiles(root)) {
      const url = toPublicUrl(file);
      if (blob.includes(url)) continue;
      const size = statSync(file).size;
      unlinkSync(file);
      borrados.push({ file, size });
    }
  }

  if (!borrados.length) {
    console.log('delete-orphaned-media: nada para borrar, todo lo que hay en las carpetas del panel está en uso.');
    return;
  }

  const totalKB = borrados.reduce((acc, b) => acc + b.size, 0) / 1024;
  console.log(`delete-orphaned-media: borré ${borrados.length} archivo(s) sin usar (${totalKB.toFixed(0)}KB total):`);
  for (const b of borrados) {
    console.log(`  - ${b.file} (${(b.size / 1024).toFixed(0)}KB)`);
  }
}

run();
