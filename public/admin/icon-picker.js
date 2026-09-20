// Widget propio "icon-picker": un selector visual de ícono (se ve el
// dibujo de cada opción, no solo el nombre en texto) - un <select> nativo
// del navegador no puede mostrar SVGs dentro de sus opciones, por eso hace
// falta un widget a medida en vez del widget "select" de siempre.
//
// El set de íconos tiene que coincidir con `IconKey`/`paths` en
// src/components/Icon.astro (el que realmente dibuja el ícono en el
// sitio) - si se agrega un ícono nuevo, agregarlo en LOS DOS lugares.
// No se pudo evitar la duplicación: Icon.astro es un componente de Astro
// (corre en el build), este archivo es JS de navegador que corre en el
// panel - son dos entornos distintos, no se pueden compartir el módulo.
//
// Todo el archivo va adentro de un IIFE: sin type="module" (ver
// index.html - Sveltia pide script clásico), dos <script> classic que
// declaran un `const` con el mismo nombre en su nivel superior CHOCAN
// (comparten el mismo scope léxico de nivel superior, a diferencia de los
// módulos ES) - rompía todo con "Identifier 'createClass' has already
// been declared" apenas se sumó preview.js al lado de este archivo.
(function () {

const ICONOS = {
  wifi: "M5 12.5a10 10 0 0 1 14 0 M8 15.5a6 6 0 0 1 8 0 M12 19h.01",
  cocina: "M4 3v7a3 3 0 0 0 3 3v8 M7 3v6 M10 3v6 M17 3c-1.5 1-2 3-2 5 0 2.5 1 3.5 2 4v9",
  ropaBlanca: "M4 4v16 M4 8h16a2 2 0 0 1 2 2v9 M4 17h20 M8 8v7",
  tv: "M3 5h18v12H3z M8 21h8 M12 17v4",
  aire: "M3 6h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M7 11c0 1.6-1.2 2-1.2 3.6 M12 11c0 1.6-1.2 2-1.2 3.6 M17 11c0 1.6-1.2 2-1.2 3.6",
  calefaccion: "M6 3v18M12 3v18M18 3v18 M3 8h6M9 16h6M15 8h6",
  ascensor: "M4 3h16v18H4z M9 9l3-3 3 3 M9 15l3 3 3-3",
  cochera: "M4 21V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12 M4 21h16 M8 13h8 M8 17h8",
  amenities: "M4 18c1.5-4 3-5 4-5s2 1.5 3 3 2 3 3 3 3-1 4-5 M3 21h18",
  seguridad: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  subte: "M4 3h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M4 11h16 M8 19l-2 2 M16 19l2 2 M7.5 15h.01 M16.5 15h.01",
  salud: "M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z M9.5 10h5 M12 7.5v5",
  ubicacion: "M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  reloj: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 7v5l3.5 2",
  estrella: "M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9z",
  corazon: "M12 20.5s-7.5-4.6-9.8-9.1C.6 7.8 2.2 4 6 4c2 0 3.4 1.1 4 2 0.6-0.9 2-2 4-2 3.8 0 5.4 3.8 3.8 7.4C19.5 15.9 12 20.5 12 20.5z",
  sol: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 3v2 M12 19v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M3 12h2 M19 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4",
  cama: "M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6 M3 18h18 M3 14h18 M7 10V8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2",
  ducha: "M6 12V6a4 4 0 0 1 8 0 M4 12h16 M8 16v2 M12 16v3 M16 16v2",
  telefono: "M6 3h3l1.5 4.5-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2C10.5 19 5 13.5 5 5a2 2 0 0 1 1-2z",
  descuento: "M12 3v18 M16.5 7.5a3.5 3.5 0 0 0-3.5-2H11a2.8 2.8 0 0 0 0 5.5h2a2.8 2.8 0 0 1 0 5.5h-2a3.5 3.5 0 0 1-3.5-2",
  candado: "M5 11h14v9H5z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2",
  familia: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2.5 21v-1.5A4 4 0 0 1 6.5 15.5h1 M17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M13.5 21v-1A4 4 0 0 1 17.5 16h1a4 4 0 0 1 4 4v1",
  mascota: "M7 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M4.5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 21c-3 0-5.5-1.8-5.5-4.3S9 13 12 13s5.5 1.2 5.5 3.7S15 21 12 21z",
  cafe: "M4 8h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M16 9h1.5a2 2 0 0 1 0 4H16 M7.5 4c0 .8-1 1-1 2 M11.5 4c0 .8-1 1-1 2",
  avion: "M22 2L2 9.5l7 2.5 2.5 7L18 2z M11.5 12l3-3",
  maleta: "M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z M9 8V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V8 M4 12.5h16",
};

const ETIQUETAS = {
  wifi: "WiFi",
  cocina: "Cocina",
  ropaBlanca: "Ropa blanca",
  tv: "TV",
  aire: "Aire acondicionado",
  calefaccion: "Calefacción",
  ascensor: "Ascensor",
  cochera: "Cochera",
  amenities: "Amenities",
  seguridad: "Seguridad",
  subte: "Subte / transporte",
  salud: "Salud / hospital",
  ubicacion: "Ubicación",
  reloj: "Tiempo / horario",
  estrella: "Calidad / destacado",
  corazon: "Atención / cuidado",
  sol: "Aire libre / luz",
  cama: "Descanso",
  ducha: "Baño",
  telefono: "Contacto",
  descuento: "Precio / descuento",
  candado: "Privacidad / seguro",
  familia: "Familia / personas",
  mascota: "Mascotas",
  cafe: "Desayuno / cafetería",
  avion: "Viajes",
  maleta: "Equipaje",
};

function svgIcono(nombre, tamaño) {
  return h(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: tamaño,
      height: tamaño,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    h("path", { d: ICONOS[nombre] || "" }),
  );
}

const { createClass, h } = window;

const IconPickerControl = createClass({
  render() {
    const valorActual = this.props.value;
    return h(
      "div",
      {
        className: this.props.classNameWrapper,
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
          gap: "8px",
        },
      },
      Object.keys(ICONOS).map((clave) =>
        h(
          "button",
          {
            key: clave,
            type: "button",
            onClick: () => this.props.onChange(clave),
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "10px 6px",
              borderRadius: "10px",
              border: valorActual === clave ? "2px solid #ad8830" : "1px solid #e7e3dc",
              background: valorActual === clave ? "#fff8e8" : "#ffffff",
              color: "#434242",
              cursor: "pointer",
              fontFamily: "sans-serif",
              fontSize: "11px",
              lineHeight: 1.2,
              textAlign: "center",
            },
          },
          svgIcono(clave, 22),
          ETIQUETAS[clave] || clave,
        ),
      ),
    );
  },
});

const IconPickerPreview = createClass({
  render() {
    const valor = this.props.value;
    if (!valor || !ICONOS[valor]) return h("span", {}, "(sin ícono)");
    return h(
      "span",
      { style: { display: "inline-flex", alignItems: "center", gap: "6px" } },
      svgIcono(valor, 18),
      ETIQUETAS[valor] || valor,
    );
  },
});

CMS.registerWidget("icon-picker", IconPickerControl, IconPickerPreview);

// Se expone para que preview.js pueda dibujar el mismo ícono real en sus
// tarjetas, sin duplicar el mapa de paths una tercera vez.
window.__iconosDeploy = { paths: ICONOS, labels: ETIQUETAS };

})();
