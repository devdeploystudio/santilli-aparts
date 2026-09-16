import fs from "node:fs";
import path from "node:path/posix";
import sharp from "sharp";

const SITE_ROOT = "C:/Users/Mariana/OneDrive/Desktop/Deploy/08. Clientes/Santilli aparts/santilli-aparts_franco";
const CAT_ROOT = `${SITE_ROOT}/catalogo_5491158299969`;
const SITE_PUBLIC = `${SITE_ROOT}/public/departamentos`;
const SITE_DATA = `${SITE_ROOT}/src/data/departamentos`;

// dHash de 9x8 -> 64 bits: compara cada pixel con el siguiente en la fila.
async function dhash(filePath) {
  const { data } = await sharp(filePath)
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let hash = 0n;
  let bit = 0n;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      if (left > right) hash |= 1n << bit;
      bit++;
    }
  }
  return hash;
}

function hamming(a, b) {
  let x = a ^ b;
  let count = 0n;
  while (x) {
    count += x & 1n;
    x >>= 1n;
  }
  return Number(count);
}

async function hashFolder(dirAbs, files) {
  const hashes = [];
  for (const f of files) {
    try {
      hashes.push(await dhash(path.join(dirAbs, f)));
    } catch (e) {
      console.error("error hasheando", f, e.message);
    }
  }
  return hashes;
}

async function main() {
  // 1. Hashear todas las fotos de cada depto del sitio.
  const siteFiles = fs.readdirSync(SITE_DATA).filter((f) => f.endsWith(".json"));
  const siteDeptos = [];
  for (const f of siteFiles) {
    const d = JSON.parse(fs.readFileSync(path.join(SITE_DATA, f), "utf8"));
    const slug = f.replace(/\.json$/, "");
    const dirAbs = path.join(SITE_PUBLIC, slug);
    const photoFiles = d.fotos.map((p) => p.split("/").pop());
    const hashes = fs.existsSync(dirAbs) ? await hashFolder(dirAbs, photoFiles) : [];
    siteDeptos.push({ slug, nombre: d.nombre, direccion: d.direccion, fotos: d.fotos.length, hashes });
    process.stderr.write(`hasheado sitio: ${slug} (${hashes.length} fotos)\n`);
  }

  // 2. Hashear todas las fotos de cada carpeta del catalogo.
  const catFolders = fs
    .readdirSync(CAT_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "inactivos")
    .map((e) => e.name)
    .sort();

  const catDeptos = [];
  for (const folder of catFolders) {
    const dirAbs = path.join(CAT_ROOT, folder);
    const imgFiles = fs.readdirSync(dirAbs).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    const hashes = await hashFolder(dirAbs, imgFiles);
    let descripcion = "";
    const descPath = path.join(dirAbs, "descripcion.txt");
    if (fs.existsSync(descPath)) descripcion = fs.readFileSync(descPath, "utf8");
    catDeptos.push({ folder, imgFiles, hashes, descripcion });
    process.stderr.write(`hasheado catalogo: ${folder} (${hashes.length} fotos)\n`);
  }

  // 3. Para cada carpeta del catalogo, encontrar el depto del sitio con mas fotos "iguales" (distancia <= 8).
  const UMBRAL = 8; // dHash: <=8 de 64 bits distintos se considera "misma foto" (tolera recompresion/resize)
  const resultados = [];
  for (const cat of catDeptos) {
    const scores = siteDeptos.map((site) => {
      let matches = 0;
      const usedSite = new Set();
      for (const ch of cat.hashes) {
        let best = null;
        let bestDist = Infinity;
        site.hashes.forEach((sh, i) => {
          if (usedSite.has(i)) return;
          const dist = hamming(ch, sh);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        if (best !== null && bestDist <= UMBRAL) {
          matches++;
          usedSite.add(best);
        }
      }
      return { slug: site.slug, nombre: site.nombre, matches, totalSite: site.hashes.length };
    });
    scores.sort((a, b) => b.matches - a.matches);
    const top = scores[0];
    resultados.push({
      carpeta: cat.folder,
      fotosCatalogo: cat.hashes.length,
      mejorMatch: top,
      segundoMatch: scores[1],
      descripcion: cat.descripcion.slice(0, 200),
    });
  }

  fs.writeFileSync(
    "C:/Users/Mariana/AppData/Local/Temp/claude/C--Users-Mariana-OneDrive-Desktop-Deploy-08--Clientes-Santilli-aparts-santilli-aparts-franco/5f81715b-0001-465e-b129-4c5d46bb8175/scratchpad/match-results.json",
    JSON.stringify(resultados, null, 1),
  );
  console.log("listo");
}

main();
