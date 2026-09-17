#!/usr/bin/env node
/**
 * build-image-manifest.mjs
 *
 * Corre en "prebuild"/"predev" (ver package.json), ANTES de que arranque
 * Astro. Escanea todas las imágenes de public/ y escribe un JSON con el
 * ancho/alto real de cada una (src/lib/imageManifest.json).
 *
 * Por qué esto y no leer el archivo directo en el frontmatter del .astro
 * (como hacía la versión anterior de src/lib/imageSize.ts): Cloudflare
 * corre el paso de "prerender" de las páginas (getStaticPaths, etc.)
 * adentro de un sandbox tipo Workers, no Node normal - ese sandbox no
 * tiene acceso al filesystem real del repo, así que un fs.readFileSync
 * ahí falla en silencio (sin tirar error, el try/catch de imageSize.ts lo
 * tapaba) y siempre devolvía "sin tamaño". Los scripts de "prebuild", en
 * cambio, corren como un proceso de Node normal ANTES de que ese sandbox
 * exista (confirmado: copy-vendor-css.mjs, que corre igual como prebuild,
 * sí funciona bien) - por eso el cálculo tiene que pasar por acá, dejando
 * el resultado ya listo en un JSON que Astro solo importa como dato
 * estático (sin tocar el filesystem de nuevo en ningún momento del build).
 *
 * Si se agrega una carpeta nueva de imágenes editables por el panel, no
 * hace falta tocar esto - escanea TODO public/ recursivamente.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { imageSize } from "image-size";

const PUBLIC_DIR = join(process.cwd(), "public");
const OUT_FILE = join(process.cwd(), "src/lib/imageManifest.json");
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function listImageFiles(dir) {
  const resultado = [];
  for (const nombre of readdirSync(dir)) {
    const full = join(dir, nombre);
    const info = statSync(full);
    if (info.isDirectory()) {
      resultado.push(...listImageFiles(full));
    } else if (EXTENSIONS.has(extname(nombre).toLowerCase())) {
      resultado.push(full);
    }
  }
  return resultado;
}

function run() {
  const archivos = listImageFiles(PUBLIC_DIR);
  const manifest = {};

  for (const archivo of archivos) {
    try {
      const buffer = readFileSync(archivo);
      const { width, height } = imageSize(buffer);
      if (width && height) {
        // Clave = URL pública (relativa a public/, con "/" siempre, nunca
        // "\" - Windows devuelve backslash en relative(), pero el resto del
        // sitio referencia estas rutas al estilo URL).
        const publicPath = "/" + relative(PUBLIC_DIR, archivo).split("\\").join("/");
        manifest[publicPath] = { width, height };
      }
    } catch {
      // Archivo corrupto/no soportado: se salta, imageSize.ts ya maneja
      // el caso de "no está en el manifiesto" devolviendo null.
    }
  }

  writeFileSync(OUT_FILE, JSON.stringify(manifest));
  console.log(`build-image-manifest: ${Object.keys(manifest).length} imágenes -> src/lib/imageManifest.json`);
}

run();
