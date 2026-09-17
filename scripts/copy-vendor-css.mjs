#!/usr/bin/env node
/**
 * copy-vendor-css.mjs
 *
 * Copia el CSS de leaflet y flatpickr a public/vendor/ antes de cada
 * dev/build. Existe para que MapView.tsx y BookingForm.tsx/
 * AyudaElegirForm.tsx puedan inyectar esas hojas de estilo a mano con un
 * <link> en tiempo de ejecución (ver esos componentes), en vez de
 * importarlas en el código - un import (estático O dinámico) de CSS desde
 * un paquete de npm hace que Astro/Vite lo trate como CSS "de la página" y
 * lo agregue como <link rel="stylesheet"> BLOQUEANTE en el <head>, aunque
 * el componente use client:visible/client:only. El checker de
 * /post-deploy/performance lo marcaba como hoja de estilo bloqueante en
 * CUALQUIER página del sitio, no solo en las que muestran mapa o
 * calendario. Sirviéndolo como archivo estático de public/ (fuera del
 * pipeline de CSS de Vite) y agregando el <link> por JS recién cuando el
 * componente se monta, el navegador nunca lo espera para el primer render.
 *
 * Re-correr esto (se corre solo antes de dev/build, ver package.json) cada
 * vez que se actualice la versión de "leaflet" o "flatpickr" en
 * package.json, para no quedar sirviendo un CSS viejo.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path/posix";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url).split("\\").join("/")));
const destDir = join(root, "public/vendor");
mkdirSync(destDir, { recursive: true });

const archivos = [
  ["node_modules/leaflet/dist/leaflet.css", "leaflet.css"],
  ["node_modules/flatpickr/dist/flatpickr.min.css", "flatpickr.css"],
];

for (const [origen, destino] of archivos) {
  copyFileSync(join(root, origen), join(destDir, destino));
  console.log(`copy-vendor-css: ${origen} -> public/vendor/${destino}`);
}
