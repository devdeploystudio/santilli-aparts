import sharp from "sharp";
import { rename } from "node:fs/promises";

const DIR = "public/hero";

const jobs = [
  { file: "congreso.jpg", out: "congreso.jpg" },
  { file: "hospita de clinicas.JPG", out: "hospital-clinicas.jpg" },
  { file: "hospital aleman.jpg", out: "hospital-aleman.jpg" },
  { file: "hospital rivadavia.JPG", out: "hospital-rivadavia.jpg" },
  { file: "obelisco 1.jpg", out: "obelisco-1.jpg" },
  { file: "obelisco 2.jpg", out: "obelisco-2.jpg" },
  { file: "pasaje pizzurno.jpg", out: "pasaje-pizzurno.jpg" },
  { file: "rodriguez peña.jpg", out: "rodriguez-pena.jpg" },
  { file: "Santa fe y callao 2.jpg", out: "santa-fe-callao-2.jpg" },
  { file: "Santa fe y callao.jpg", out: "santa-fe-callao.jpg" },
  { file: "santa fe.jpg", out: "santa-fe.jpg" },
  { file: "teatro colon 2.jpg", out: "teatro-colon-2.jpg" },
  { file: "teatro colon.jpg", out: "teatro-colon.jpg" },
];

for (const job of jobs) {
  const tmpOut = `${DIR}/_new_${job.out}`;
  await sharp(`${DIR}/${job.file}`)
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(tmpOut);
  console.log(`OK: ${job.file} -> ${job.out}`);
}
