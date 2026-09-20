// Vista previa en vivo para el panel (Sveltia CMS). NO pretende ser un
// espejo pixel-perfect de la página real (eso solo se logra con un preview
// deploy real de Cloudflare, mucho más trabajo/fricción para un sitio de
// este tamaño - ver charla con Mariana, sep 2026): alcanza con mostrar los
// textos/fotos con la tipografía y los colores reales de la marca, para que
// el cliente vea cómo va a leerse antes de guardar, sin tener que adivinar.
//
// API usada: CMS.registerPreviewStyle / CMS.registerPreviewTemplate, la
// misma que Decap CMS (Sveltia mantiene compatibilidad). Sin build step:
// se escribe con createClass + h (hyperscript), variables globales que
// expone el propio script de Sveltia una vez cargado.
//
// Tiene que cargarse DESPUÉS de icon-picker.js (usa window.__iconosDeploy).
//
// Todo el archivo va en un IIFE: sin type="module" (script clásico, ver
// index.html), un `const` de nivel superior acá chocaría con el mismo
// nombre declarado en icon-picker.js (comparten scope léxico al no ser
// módulos) - pasó de verdad con `const { createClass, h }`, tiraba
// "Identifier 'createClass' has already been declared" y rompía el panel
// entero.
(function () {

CMS.registerPreviewStyle(
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;600;700&display=swap",
);

CMS.registerPreviewStyle(`
  body {
    margin: 0;
    padding: 2rem;
    background: #faf7f2;
    color: #434242;
    font-family: 'Manrope', sans-serif;
    font-size: 16px;
    line-height: 1.6;
  }
  .p-titulo {
    font-family: 'Fraunces', serif;
    font-size: 2rem;
    line-height: 1.1;
    color: #434242;
    margin: 0 0 0.75rem;
  }
  .p-subtitulo {
    font-family: 'Fraunces', serif;
    font-size: 1.15rem;
    color: #434242;
    margin: 0 0 0.35rem;
  }
  .p-texto {
    color: #7a7876;
    margin: 0 0 1rem;
    max-width: 40rem;
  }
  .p-destacado {
    color: #434242;
    font-weight: 700;
    box-shadow: inset 0 -0.4em 0 color-mix(in srgb, #cca038 55%, transparent);
  }
  .p-lista { list-style: none; margin: 0 0 1rem; padding: 0; }
  .p-lista li {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    color: #434242;
  }
  .p-lista li::before {
    content: "✓";
    color: #ad8830;
    font-weight: 700;
    flex-shrink: 0;
  }
  .p-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  .p-card {
    background: #ffffff;
    border: 1px solid #e7e3dc;
    border-radius: 1rem;
    padding: 1rem;
  }
  .p-card-icono {
    display: inline-flex;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 999px;
    background: #faf7f2;
    color: #ad8830;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem;
  }
  .p-card-titulo {
    font-family: 'Fraunces', serif;
    font-size: 1.05rem;
    margin: 0 0 0.35rem;
    color: #434242;
  }
  .p-card-texto {
    color: #7a7876;
    font-size: 0.9rem;
    margin: 0;
  }
  .p-foto {
    width: 100%;
    max-width: 28rem;
    border-radius: 1rem;
    margin-bottom: 1rem;
    display: block;
    object-fit: cover;
  }
  .p-nota {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.5rem 0.85rem;
    border-radius: 0.6rem;
    background: #fff8e8;
    color: #ad8830;
    font-size: 0.8rem;
  }
  .p-boton {
    display: inline-block;
    margin: 0 0.5rem 0.5rem 0;
    padding: 0.5rem 1rem;
    border-radius: 999px;
    background: #cca038;
    color: #434242;
    font-weight: 600;
    font-size: 0.85rem;
  }
  .p-boton-secundario {
    background: transparent;
    border: 1px solid #e7e3dc;
  }
`);

const { createClass, h } = window;

// `items` puede ser una List de Immutable.js (viene de entry.getIn(...))
// o un array común (cuando arma la lista a mano) - toArray() normaliza
// ambos casos a un array plano.
function toPlainArray(items) {
  if (!items) return [];
  return typeof items.toArray === "function" ? items.toArray() : items;
}

function campoDe(item, nombre) {
  return typeof item.get === "function" ? item.get(nombre) : item[nombre];
}

// getAsset() es sincrónico y devuelve { url, ... } (o undefined) - NO un
// string ni una Promise. Usarlo directo como src rompía todas las fotos
// de fondo del preview (quedaba "[object Object]").
function Foto({ getAsset, ruta }) {
  if (!ruta) return null;
  const asset = getAsset(ruta);
  if (!asset || !asset.url) return null;
  return h("img", { className: "p-foto", src: asset.url });
}

function IconoIndividual({ nombre }) {
  const iconos = window.__iconosDeploy;
  if (!iconos || !nombre || !iconos.paths[nombre]) return null;
  return h(
    "svg",
    { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: iconos.paths[nombre] }),
  );
}

function Lista({ items, campo }) {
  const lista = toPlainArray(items);
  if (!lista.length) return null;
  return h(
    "ul",
    { className: "p-lista" },
    lista.map((item, i) => h("li", { key: i }, campo ? campoDe(item, campo) : item)),
  );
}

// Grilla de tarjetas título+texto, con ícono opcional (si el item trae
// `icono`, se dibuja el SVG real - mismo set que src/components/Icon.astro).
function Grid({ items }) {
  const lista = toPlainArray(items);
  if (!lista.length) return null;
  return h(
    "div",
    { className: "p-grid" },
    lista.map((item, i) => {
      const icono = campoDe(item, "icono");
      return h(
        "div",
        { className: "p-card", key: i },
        icono && h("span", { className: "p-card-icono" }, h(IconoIndividual, { nombre: icono })),
        h("p", { className: "p-card-titulo" }, campoDe(item, "titulo")),
        h("p", { className: "p-card-texto" }, campoDe(item, "texto")),
      );
    }),
  );
}

// Botón de muestra (no es un link real, es solo para ver el texto con la
// pinta del sitio - la nota de "adónde lleva" va aparte, en el campo).
function Boton({ texto, secundario }) {
  if (!texto) return null;
  return h("span", { className: secundario ? "p-boton p-boton-secundario" : "p-boton" }, texto);
}

// Arma la lista ordenada de trocitos del párrafo de la Portada (heroPre +
// destacado1 + entre1 + destacado2 + entre2 + destacado3 + final), igual
// que hace Hero.astro, para que el subrayado dorado aparezca en el mismo
// lugar acá también.
function ParrafoPortada({ data }) {
  return h(
    "p",
    { className: "p-texto" },
    data.get("heroPre"),
    " ",
    h("span", { className: "p-destacado" }, data.get("heroDestacado1")),
    " ",
    data.get("heroEntre1"),
    " ",
    h("span", { className: "p-destacado" }, data.get("heroDestacado2")),
    ", ",
    data.get("heroEntre2"),
    " ",
    h("span", { className: "p-destacado" }, data.get("heroDestacado3")),
    ". ",
    data.get("heroFinal"),
  );
}

// --- Inicio → Portada (texto) ---
CMS.registerPreviewTemplate(
  "inicio-hero",
  createClass({
    render() {
      const data = this.props.entry.getIn(["data", "inicioHero"]);
      if (!data) return null;
      return h(
        "div",
        {},
        h("h1", { className: "p-titulo" }, data.get("heroTitulo")),
        h(ParrafoPortada, { data }),
        h("span", { className: "p-nota" }, "El subrayado dorado es solo una referencia: en el sitio real aparece con una animación."),
        h("div", { style: { marginTop: "1.25rem" } }, h(Boton, { texto: data.get("botonWhatsappTexto") }), h(Boton, { texto: data.get("botonDeptosTexto"), secundario: true })),
      );
    },
  }),
);

// --- Inicio → Nuestros departamentos ---
CMS.registerPreviewTemplate(
  "inicio-deptos",
  createClass({
    render() {
      const data = this.props.entry.getIn(["data", "inicioDeptos"]);
      if (!data) return null;
      return h(
        "div",
        {},
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto1")),
        h("p", { className: "p-texto" }, data.get("texto2")),
        h("span", { className: "p-nota" }, "Abajo de esto va el carrusel con las fotos de los departamentos."),
      );
    },
  }),
);

// --- Inicio → Ayuda a elegir ---
CMS.registerPreviewTemplate(
  "inicio-ayuda",
  createClass({
    render() {
      const data = this.props.entry.getIn(["data", "inicioAyuda"]);
      if (!data) return null;
      return h(
        "div",
        {},
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto")),
        h(Lista, { items: data.get("items"), campo: "texto" }),
      );
    },
  }),
);

// --- Inicio → Bloque final ---
CMS.registerPreviewTemplate(
  "inicio-cta",
  createClass({
    render() {
      const data = this.props.entry.getIn(["data", "inicioCta"]);
      if (!data) return null;
      return h(
        "div",
        {},
        h(Foto, { getAsset: this.props.getAsset, ruta: data.get("foto") }),
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto")),
        h(Boton, { texto: data.get("botonTexto") }),
      );
    },
  }),
);

// --- Diferenciales ---
CMS.registerPreviewTemplate(
  "diferenciales",
  createClass({
    render() {
      const data = this.props.entry.getIn(["data", "diferenciales"]);
      if (!data) return null;
      return h(
        "div",
        {},
        h(Foto, { getAsset: this.props.getAsset, ruta: data.get("fotoFondo") }),
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto")),
        h(Grid, { items: data.get("cards") }),
        h("p", { className: "p-subtitulo", style: { marginTop: "1.5rem" } }, data.get("importanteTitulo")),
        h("p", { className: "p-texto" }, data.get("importanteTexto")),
      );
    },
  }),
);

// --- Zonas ---
CMS.registerPreviewTemplate(
  "zonas",
  createClass({
    render() {
      const data = this.props.entry.getIn(["data", "zonas"]);
      if (!data) return null;
      return h(
        "div",
        {},
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto")),
        h(
          "div",
          { className: "p-grid" },
          toPlainArray(data.get("zonas")).map((z, i) =>
            h(
              "div",
              { className: "p-card", key: i },
              h("p", { className: "p-card-titulo" }, z.get("nombre")),
              h("p", { className: "p-card-texto", style: { fontWeight: 600, color: "#ad8830" } }, z.get("subtitulo")),
              h("p", { className: "p-card-texto" }, z.get("texto")),
            ),
          ),
        ),
        h("p", { className: "p-subtitulo", style: { marginTop: "1.5rem" } }, "Estas zonas cuentan con:"),
        h(Grid, { items: data.get("accesos") }),
      );
    },
  }),
);

// --- Qué incluye ---
CMS.registerPreviewTemplate(
  "que-incluye",
  createClass({
    render() {
      const data = this.props.entry.getIn(["data", "que-incluye"]);
      if (!data) return null;
      return h(
        "div",
        {},
        h(Foto, { getAsset: this.props.getAsset, ruta: data.get("fotoFondo") }),
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto")),
        h(Grid, { items: data.get("items") }),
      );
    },
  }),
);

// --- Cómo se reserva ---
CMS.registerPreviewTemplate(
  "como-trabajamos",
  createClass({
    render() {
      const data = this.props.entry.getIn(["data", "como-trabajamos"]);
      if (!data) return null;
      return h(
        "div",
        {},
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto")),
        h(
          "div",
          { className: "p-grid" },
          toPlainArray(data.get("pasos")).map((p, i) =>
            h(
              "div",
              { className: "p-card", key: i },
              h("p", { style: { color: "#cca038", fontFamily: "Fraunces, serif", fontSize: "1.4rem", margin: "0 0 0.35rem" } }, String(i + 1).padStart(2, "0")),
              h("p", { className: "p-card-titulo" }, p.get("titulo")),
              h("p", { className: "p-card-texto" }, p.get("texto")),
            ),
          ),
        ),
        h("p", { className: "p-subtitulo", style: { marginTop: "1.5rem" } }, data.get("reservaTitulo")),
        h("p", { className: "p-texto" }, data.get("reservaTexto")),
      );
    },
  }),
);

// --- Nosotros ---
CMS.registerPreviewTemplate(
  "nosotros",
  createClass({
    render() {
      const data = this.props.entry.getIn(["data", "nosotros"]);
      if (!data) return null;
      return h(
        "div",
        {},
        h(Foto, { getAsset: this.props.getAsset, ruta: data.get("foto") }),
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto1")),
        h("p", { className: "p-texto" }, data.get("texto2")),
        h(Grid, { items: data.get("puntos") }),
      );
    },
  }),
);

})();
