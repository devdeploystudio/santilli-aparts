#!/usr/bin/env node
/**
 * sync-nuevos-deptos-en-listas-curadas.mjs
 *
 * Corre en el mismo workflow que rename-new-deptos.mjs (después de ese),
 * .github/workflows/optimize-images.yml.
 *
 * Dos campos del panel usan un `widget: "relation"` a "departamentos"
 * para curar a mano un subconjunto/orden puntual:
 *   - src/content/config/inicio-deptos.yaml -> deptosDestacados (carrusel)
 *   - src/content/config/zonas.yaml         -> deptosMapa (pines del mapa)
 *
 * Cuando esas listas están VACÍAS, el sitio ya muestra TODOS los deptos
 * solo (fallback en el código, ver content.config.ts/index.astro) - un
 * depto nuevo aparece ahí sin que nadie tenga que tocar nada, y este
 * script no hace nada.
 *
 * Pero si el cliente YA armó una selección/orden puntual (la lista no
 * está vacía), un depto nuevo NO se suma solo a esa lista - hay que
 * agregarlo a mano. Este script lo hace automático: agrega los deptos
 * nuevos de este push al FINAL de cada lista que ya tenga algo,
 * preservando intacto el orden/selección que el cliente ya armó. Nunca
 * toca una lista vacía (forzar algo ahí cambiaría el comportamiento
 * "se muestran todos" a "se muestra solo este", que nadie pidió).
 *
 * Requiere: node >=18, el paquete "js-yaml" (mismo que usa Astro/Sveltia
 * para leer estos archivos - se instala junto con sharp/glob en el step
 * de dependencias del workflow).
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { basename } from "node:path/posix";
import yaml from "js-yaml";

const DATA_DIR = "src/data/departamentos";
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

const LISTAS_CURADAS = [
  { archivo: "src/content/config/inicio-deptos.yaml", campo: "deptosDestacados" },
  { archivo: "src/content/config/zonas.yaml", campo: "deptosMapa" },
];

function diffBase() {
  const fromEnv = process.env.DIFF_BASE;
  if (fromEnv && /^[0-9a-f]{40}$/i.test(fromEnv) && fromEnv !== "0".repeat(40)) return fromEnv;
  try {
    // HEAD~1, no HEAD^: en Windows cmd.exe "^" es el carácter de escape de
    // línea y rompe la sintaxis (mismo motivo que en los otros scripts del
    // bot) - acá corre en Linux (GitHub Actions) pero se mantiene igual
    // por consistencia con el resto del bot.
    execSync("git rev-parse HEAD~1", { stdio: "ignore" });
    return "HEAD~1";
  } catch {
    return EMPTY_TREE;
  }
}

// A diferencia de rename-new-deptos.mjs (que compara qué ARCHIVOS cambiaron
// entre commits), acá hace falta el listado de slugs EXISTENTES en el
// filesystem ahora mismo, después de que rename-new-deptos.mjs ya renombró
// los nuevos a "depto-NN-...". Comparar contra "git diff" otra vez daría
// los nombres VIEJOS (pre-renombre), que ya no existen en disco. Por eso
// se compara "qué slugs había en el commit base" vs "qué slugs hay ahora
// en el filesystem", no un diff de contenido.
function getSlugsEnCommit(ref) {
  let salida;
  try {
    salida = execSync(`git ls-tree -r --name-only ${ref} -- ${DATA_DIR}`, { encoding: "utf8" });
  } catch {
    return new Set();
  }
  return new Set(
    salida
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((p) => basename(p, ".json")),
  );
}

function getNuevosSlugs() {
  const antes = getSlugsEnCommit(diffBase());
  const ahora = readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => basename(f, ".json"));
  return ahora.filter((slug) => !antes.has(slug));
}

function agregarAlFinalSiYaEstaCurada(rutaYaml, campo, nuevos) {
  const doc = yaml.load(readFileSync(rutaYaml, "utf8"));
  const claveRaiz = Object.keys(doc)[0];
  const raiz = doc[claveRaiz];
  const lista = raiz[campo];

  // Lista ausente o vacía = "se muestran todos" (fallback del código) -
  // no forzar nada acá, el depto nuevo ya aparece solo.
  if (!Array.isArray(lista) || lista.length === 0) return;

  const faltantes = nuevos.filter((slug) => !lista.includes(slug));
  if (!faltantes.length) return;

  lista.push(...faltantes);
  writeFileSync(rutaYaml, yaml.dump(doc, { lineWidth: -1 }));
  console.log(`sync-nuevos-deptos: agregué [${faltantes.join(", ")}] a "${campo}" en ${rutaYaml}`);
}

function run() {
  const nuevos = getNuevosSlugs();
  if (!nuevos.length) {
    console.log("sync-nuevos-deptos: sin deptos nuevos en este push.");
    return;
  }
  for (const { archivo, campo } of LISTAS_CURADAS) {
    agregarAlFinalSiYaEstaCurada(archivo, campo, nuevos);
  }
}

run();
