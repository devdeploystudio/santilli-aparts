#!/usr/bin/env node
/**
 * rename-new-deptos.mjs
 *
 * Corre en el mismo workflow que rename-uploads.mjs/compress-images.mjs
 * (.github/workflows/optimize-images.yml), después de los dos. Sveltia no
 * tiene forma de "contar cuántos deptos hay y sumar uno" al crear una
 * ficha nueva desde /panel: le pone de nombre de archivo el slug de la
 * propia `nombre` que cargó el cliente (ej.
 * "depto-para-3-y-4-personas-av-callao-500.json"), sin el número interno
 * que usamos para ordenar/identificar cada unidad ("depto-NN-...").
 *
 * Este script detecta esos archivos RECIÉN AGREGADOS (status "A" en el
 * diff) que no siguen la convención "depto-NN-...", calcula el próximo
 * número libre (mirando tanto los activos como los archivados, para no
 * repetir un número ya usado antes), y renombra el JSON + su carpeta de
 * fotos en public/departamentos, actualizando las referencias adentro
 * del JSON (fotos[], video, videoPoster).
 *
 * Un depto ya creado a mano por Deploy con el nombre "depto-NN-..." de
 * entrada queda intacto (el script lo detecta y lo saltea).
 *
 * Requiere: node >=18. No usa el paquete "glob" (carpetas planas, alcanza
 * con fs.readdirSync).
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, renameSync, readdirSync, existsSync, unlinkSync } from "node:fs";
import { dirname, basename, join } from "node:path/posix";

const DATA_DIR = "src/data/departamentos";
const DATA_ARCHIVADOS_DIR = "src/data/departamentos-archivados";
const PUBLIC_DIR = "public/departamentos";
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

function diffBase() {
  const fromEnv = process.env.DIFF_BASE;
  if (fromEnv && /^[0-9a-f]{40}$/i.test(fromEnv) && fromEnv !== "0".repeat(40)) return fromEnv;
  try {
    // HEAD~1, no HEAD^: ver rename-uploads.mjs para el detalle (cmd.exe
    // en Windows rompe "^" como carácter de escape de línea).
    execSync("git rev-parse HEAD~1", { stdio: "ignore" });
    return "HEAD~1";
  } catch {
    return EMPTY_TREE;
  }
}

function getNewDeptoFiles() {
  const base = diffBase();
  const diff = execSync(`git diff --name-status ${base} HEAD -- ${DATA_DIR}`, { encoding: "utf8" });
  return diff
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, ...pathParts] = line.trim().split("\t");
      return { status: status.trim(), path: pathParts.join("\t").trim() };
    })
    .filter((f) => f.status === "A" && f.path.endsWith(".json"))
    .map((f) => f.path);
}

// Siguiente número = el más alto usado + 1 (activo O archivado), NO el
// primer hueco libre. Con deptos archivados (que dejan huecos en la
// numeración a propósito, ver content.config.ts) rellenar el primer
// hueco reasignaría un número que ya perteneció a otra unidad - confuso
// para cualquiera que compare con un registro viejo (fotos, capturas,
// esta misma conversación). Los números nuevos siempre avanzan.
function siguienteNumero() {
  let max = 0;
  for (const dir of [DATA_DIR, DATA_ARCHIVADOS_DIR]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = f.match(/^depto-(\d+)-/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return max + 1;
}

// Quita tildes, "Av."/"Av" -> "av", ", CABA" y similares, y deja solo
// minúsculas/números separados por guiones.
function slugify(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/,?\s*caba\.?$/i, "")
    .replace(/\bav\.?\b/g, "av")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function run() {
  const nuevos = getNewDeptoFiles();
  if (!nuevos.length) {
    console.log("rename-new-deptos: sin deptos nuevos en este push.");
    return;
  }

  for (const jsonPath of nuevos) {
    const oldSlug = basename(jsonPath, ".json");

    // Ya sigue la convención (Deploy lo creó a mano con el nombre
    // correcto, o el bot ya lo proceso en una corrida anterior) - no
    // tocar.
    if (/^depto-\d+-/.test(oldSlug)) {
      console.log(`rename-new-deptos: ${oldSlug} ya tiene el formato correcto, se deja igual.`);
      continue;
    }
    if (!existsSync(jsonPath)) continue; // por si un rename previo ya lo movió

    const data = JSON.parse(readFileSync(jsonPath, "utf8"));
    const base = slugify(data.direccion) || slugify(data.nombre) || "sin-direccion";
    const numero = siguienteNumero();
    const newSlug = `depto-${String(numero).padStart(2, "0")}-${base}`;

    data.fotos = (data.fotos || []).map((f) => f.replace(`/departamentos/${oldSlug}/`, `/departamentos/${newSlug}/`));
    if (data.video) data.video = data.video.replace(`/departamentos/${oldSlug}/`, `/departamentos/${newSlug}/`);
    if (data.videoPoster) data.videoPoster = data.videoPoster.replace(`/departamentos/${oldSlug}/`, `/departamentos/${newSlug}/`);

    const newJsonPath = join(dirname(jsonPath), `${newSlug}.json`);
    writeFileSync(newJsonPath, JSON.stringify(data, null, 2) + "\n");
    if (newJsonPath !== jsonPath) unlinkSync(jsonPath);

    const oldFolder = join(PUBLIC_DIR, oldSlug);
    const newFolder = join(PUBLIC_DIR, newSlug);
    if (existsSync(oldFolder)) {
      renameSync(oldFolder, newFolder);
    } else {
      console.error(`rename-new-deptos: no encontré la carpeta de fotos esperada en ${oldFolder}`);
    }

    console.log(`rename-new-deptos: ${oldSlug} -> ${newSlug}`);
  }
}

run();
