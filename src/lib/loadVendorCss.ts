// Inyecta a mano un <link rel="stylesheet"> apuntando a public/vendor/
// (ver scripts/copy-vendor-css.mjs) en vez de un import de CSS en el
// código: un import de CSS (estático o dinámico) hace que Astro/Vite lo
// trate como parte del CSS crítico de la página y lo agregue como <link>
// BLOQUEANTE en el <head> de TODAS las páginas que usan el componente,
// aunque esté detrás de client:visible/client:only. Sirviéndolo como
// archivo estático e inyectándolo por JS recién cuando el componente se
// monta, el navegador nunca lo espera para el primer render.
export function loadVendorCss(nombreArchivo: string) {
  const href = `/vendor/${nombreArchivo}`;
  if (document.querySelector(`link[href="${href}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}
