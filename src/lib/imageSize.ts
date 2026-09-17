import { readFileSync } from "node:fs";
import { join } from "node:path";
import { imageSize as leerTamaño } from "image-size";

// Lee el ancho/alto REAL de una imagen de public/ en tiempo de build (esto
// corre en Node, adentro del frontmatter de un .astro - nunca llega al
// navegador). Sirve para declarar width/height en el <img> sin depender de
// astro:assets/image() (ver el comentario en content.config.ts sobre por
// qué eso rompía en Cloudflare) - object-cover en el CSS igual manda el
// tamaño final en pantalla, así que ni siquiera hace falta que el valor sea
// exacto para que se vea bien, pero sí para que el navegador reserve el
// espacio correcto ANTES de que cargue la imagen y no "salte" la página.
//
// "image-size" (JS puro, lee solo los primeros bytes del header, sin
// binarios nativos) y NO "sharp": Cloudflare corre el getStaticPaths de las
// páginas dentro de un sandbox tipo Workers para "prerenderear" el sitio, y
// ese sandbox no puede cargar módulos nativos (sharp trae binarios en C++)
// bajo ninguna circunstancia - reventaba el build entero con "No such
// module 'chunks/sharp'" aunque en local (Node normal) andaba perfecto.
// Mismo tipo de límite que ya habíamos pisado con astro:assets/image() en
// este proyecto (ver ese otro comentario) - cualquier lectura de imagen en
// build time en este repo tiene que ser JS puro, nunca un módulo nativo.
//
// Cacheado por ruta: en un build con 40+ deptos, la misma foto se puede
// pedir varias veces (carrusel del home + ficha + explorador).
const cache = new Map<string, { width: number; height: number } | null>();

export async function imageSize(publicPath: string): Promise<{ width: number; height: number } | null> {
  if (cache.has(publicPath)) return cache.get(publicPath)!;

  let size: { width: number; height: number } | null = null;
  try {
    // process.cwd(), no import.meta.url: Vite/Astro bundlea este módulo
    // para el build, así que en tiempo de ejecución import.meta.url apunta
    // a donde haya quedado ese bundle (no a src/lib/imageSize.ts como
    // archivo fuente) - la ruta relativa calculada desde ahí no daba con
    // public/ de verdad y esto siempre devolvía null en silencio (por eso
    // ningún <img> del sitio terminaba con width/height, aunque el código
    // no tiraba ningún error). astro build/dev siempre corre con el cwd en
    // la raíz del proyecto, así que esto sí es estable.
    const filePath = join(process.cwd(), "public", publicPath);
    const buffer = readFileSync(filePath);
    const { width, height } = leerTamaño(buffer);
    if (width && height) size = { width, height };
  } catch {
    size = null;
  }

  cache.set(publicPath, size);
  return size;
}
