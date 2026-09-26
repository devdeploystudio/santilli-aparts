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
 * Si el cliente YA armó una selección puntual (la lista no está vacía),
 * un depto nuevo NO se suma solo - hay que agregarlo a mano. Este script
 * lo hace automático, con dos comportamientos según el campo:
 *
 * - "deptosDestacados" (carrusel) tiene un checkbox al lado,
 *   "seguirOrdenDepartamentos" (ver content.config.ts). Si está tildado
 *   (default), el script no solo agrega los deptos nuevos: RE-ORDENA TODO
 *   el array según el "orden" real de cada depto en "departamentos" cada
 *   vez que corre - así, si el cliente reordenó "🏢 Departamentos", el
 *   array de acá se actualiza solo (aunque en el código el checkbox ya
 *   hace que el SITIO ignore este array para el orden - esto es además
 *   para que lo que el cliente VE al abrir el campo en el panel no quede
 *   desactualizado). Si el checkbox está destildado, el cliente quiere un
 *   orden propio para el carrusel: el script NO reordena nada de lo que
 *   ya había, solo inserta los deptos nuevos en la posición que les
 *   corresponde (ver `insertarSegunOrden` más abajo), sin tocar el resto.
 *
 * - "deptosMapa" no tiene ese checkbox (el orden no afecta nada en el
 *   mapa, solo importa qué pines se ven) - siempre inserta los deptos
 *   nuevos por posición, nunca reordena el resto.
 *
 * Nunca toca una lista vacía (forzar algo ahí cambiaría "se muestran
 * todos" por "se muestra solo este", que nadie pidió).
 *
 * Requiere: node >=18, el paquete "js-yaml" (mismo que usa Astro/Sveltia
 * para leer estos archivos - se instala junto con sharp/glob en el step
 * de dependencias del workflow).
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path/posix";
import yaml from "js-yaml";

const DATA_DIR = "src/data/departamentos";
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

const LISTAS_CURADAS = [
  {
    archivo: "src/content/config/inicio-deptos.yaml",
    campo: "deptosDestacados",
    campoOrdenEnVivo: "seguirOrdenDepartamentos",
  },
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

// Mapa id -> "orden" (mismo campo que usa "reorder: { key: orden }" en el
// panel para el drag-and-drop de "Departamentos"), leído directo de cada
// JSON. Si un archivo no se puede leer o no tiene "orden" numérico, se
// omite - ese depto simplemente no puede usarse como referencia de
// posición (no rompe el resto del script).
function leerOrdenPorId() {
  const mapa = new Map();
  for (const f of readdirSync(DATA_DIR)) {
    if (!f.endsWith(".json")) continue;
    const id = basename(f, ".json");
    try {
      const data = JSON.parse(readFileSync(join(DATA_DIR, f), "utf8"));
      if (typeof data.orden === "number") mapa.set(id, data.orden);
    } catch {
      // archivo raro/corrupto: se ignora, no bloquea el resto
    }
  }
  return mapa;
}

// Inserta "nuevoId" en la posición que le corresponde según "orden": justo
// antes del primer ítem de la lista que tenga un "orden" mayor (o al
// final, si ninguno lo tiene). Con una lista curada que ya sigue más o
// menos el orden de "Departamentos", esto inserta en el lugar lógico real
// en vez de siempre al final.
function insertarSegunOrden(lista, nuevoId, ordenPorId) {
  const ordenNuevo = ordenPorId.get(nuevoId);
  if (ordenNuevo === undefined) {
    lista.push(nuevoId);
    return;
  }
  const idx = lista.findIndex((id) => {
    const o = ordenPorId.get(id);
    return o !== undefined && o > ordenNuevo;
  });
  if (idx === -1) lista.push(nuevoId);
  else lista.splice(idx, 0, nuevoId);
}

function sincronizarListaCurada({ archivo, campo, campoOrdenEnVivo }, nuevos, ordenPorId) {
  const doc = yaml.load(readFileSync(archivo, "utf8"));
  const claveRaiz = Object.keys(doc)[0];
  const raiz = doc[claveRaiz];
  const lista = raiz[campo];

  // Lista ausente o vacía = "se muestran todos" (fallback del código) -
  // no forzar nada acá, el depto nuevo ya aparece solo.
  if (!Array.isArray(lista) || lista.length === 0) return;

  const antes = JSON.stringify(lista);
  const faltantes = nuevos.filter((slug) => !lista.includes(slug));
  const siguiendoOrdenEnVivo = campoOrdenEnVivo && raiz[campoOrdenEnVivo] === true;

  if (siguiendoOrdenEnVivo) {
    // El checkbox ya hace que el sitio ignore el orden guardado acá y lo
    // recalcule en vivo - esto es solo para que el array del panel no
    // quede visualmente desactualizado si el cliente reordenó
    // "Departamentos" (con o sin deptos nuevos en el medio).
    lista.push(...faltantes);
    lista.sort((a, b) => (ordenPorId.get(a) ?? Infinity) - (ordenPorId.get(b) ?? Infinity));
  } else if (faltantes.length) {
    // Orden propio del cliente: no tocar lo que ya había, solo insertar
    // cada depto nuevo en su posición lógica (propio orden entre sí
    // primero, por si llegan varios en el mismo push).
    faltantes.sort((a, b) => (ordenPorId.get(a) ?? Infinity) - (ordenPorId.get(b) ?? Infinity));
    for (const id of faltantes) insertarSegunOrden(lista, id, ordenPorId);
  }

  if (JSON.stringify(lista) === antes) return;
  writeFileSync(archivo, yaml.dump(doc, { lineWidth: -1 }));
  const detalle = faltantes.length ? `nuevos: [${faltantes.join(", ")}]` : "resincronizado por orden en vivo";
  console.log(`sync-nuevos-deptos: actualicé "${campo}" en ${archivo} (${detalle})`);
}

function run() {
  const nuevos = getNuevosSlugs();
  const ordenPorId = leerOrdenPorId();
  for (const config of LISTAS_CURADAS) {
    sincronizarListaCurada(config, nuevos, ordenPorId);
  }
  if (!nuevos.length) {
    console.log("sync-nuevos-deptos: sin deptos nuevos en este push (igual se revisó si hace falta resincronizar orden).");
  }
}

run();
