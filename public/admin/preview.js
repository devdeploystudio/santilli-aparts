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
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: #faf7f2;
    color: #ad8830;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
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
`);

const { createClass, h } = window;

// Arma la lista ordenada de trocitos del párrafo del Hero/Portada
// (heroPre + destacado1 + entre1 + destacado2 + entre2 + destacado3 +
// final), igual que hace Hero.astro, para que el subrayado dorado
// aparezca en el mismo lugar acá también.
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

function Lista({ items, campo }) {
  const lista = toPlainArray(items);
  if (!lista.length) return null;
  return h(
    "ul",
    { className: "p-lista" },
    lista.map((item, i) => h("li", { key: i }, campo ? campoDe(item, campo) : item)),
  );
}

// `items` puede ser una List de Immutable.js (viene de entry.getIn(...))
// o un array común (cuando arma la lista a mano, ej. los puntos de
// Nosotros) - toArray() normaliza ambos casos a un array plano.
function toPlainArray(items) {
  if (!items) return [];
  return typeof items.toArray === "function" ? items.toArray() : items;
}

function campoDe(item, nombre) {
  return typeof item.get === "function" ? item.get(nombre) : item[nombre];
}

function Grid({ items }) {
  const lista = toPlainArray(items);
  if (!lista.length) return null;
  return h(
    "div",
    { className: "p-grid" },
    lista.map((item, i) =>
      h(
        "div",
        { className: "p-card", key: i },
        campoDe(item, "icono") && h("span", { className: "p-card-icono" }, "●"),
        h("p", { className: "p-card-titulo" }, campoDe(item, "titulo")),
        h("p", { className: "p-card-texto" }, campoDe(item, "texto")),
      ),
    ),
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
        this.props.getAsset(data.get("foto")) &&
          h("img", { className: "p-foto", src: this.props.getAsset(data.get("foto")).toString() }),
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto")),
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
        this.props.getAsset(data.get("fotoFondo")) &&
          h("img", { className: "p-foto", src: this.props.getAsset(data.get("fotoFondo")).toString() }),
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
        h(Lista, { items: data.get("accesos"), campo: "texto" }),
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
        this.props.getAsset(data.get("fotoFondo")) &&
          h("img", { className: "p-foto", src: this.props.getAsset(data.get("fotoFondo")).toString() }),
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
        this.props.getAsset(data.get("foto")) &&
          h("img", { className: "p-foto", src: this.props.getAsset(data.get("foto")).toString() }),
        h("h1", { className: "p-titulo" }, data.get("titulo")),
        h("p", { className: "p-texto" }, data.get("texto1")),
        h("p", { className: "p-texto" }, data.get("texto2")),
        h(Grid, {
          items: [1, 2, 3]
            .map((n) => data.get(`punto${n}Titulo`) && { titulo: data.get(`punto${n}Titulo`), texto: data.get(`punto${n}Texto`) })
            .filter(Boolean),
        }),
      );
    },
  }),
);
