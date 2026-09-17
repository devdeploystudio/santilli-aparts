import manifest from "./imageManifest.json";

// Ancho/alto real de cada imagen de public/, precalculado por
// scripts/build-image-manifest.mjs (corre en "prebuild"/"predev", ANTES de
// Astro - ver ese script para el por qué). Acá solo se hace un lookup en un
// JSON ya armado: nada de leer archivos en este punto, porque el paso de
// "prerender" de Cloudflare corre en un sandbox sin acceso al filesystem
// real del repo (ahí fallaba en silencio leyendo el archivo directo, y
// antes de eso con astro:assets/sharp fallaba directamente con un error -
// ver los comentarios de content.config.ts y el historial de este archivo).
//
// object-cover en el CSS manda el tamaño final en pantalla igual, así que
// ni hace falta que el valor sea exacto para que se vea bien - sirve para
// que el navegador reserve el espacio correcto ANTES de que cargue la
// imagen, evitando que la página "salte".
const tamaños: Record<string, { width: number; height: number }> = manifest;

export async function imageSize(publicPath: string): Promise<{ width: number; height: number } | null> {
  return tamaños[publicPath] ?? null;
}
