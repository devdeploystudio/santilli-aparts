// Resalta en negrita dorada las palabras de servicios/comodidades dentro de
// la descripción libre de cada depto (texto real cargado por el cliente),
// en vez de redactar a mano un texto curado por cada uno de los 44+
// departamentos — no escala y se desactualiza apenas cambie una descripción.
const PALABRAS_SERVICIO = [
  "ropa de cama",
  "toallones",
  "toallas",
  "wifi",
  "tv con cable",
  "tv",
  "aire acondicionado",
  "calefacción",
  "calefaccion",
  "utensilios de cocina",
  "heladera",
  "heladerita",
  "microondas",
  "anafe",
  "hornito",
  "cocina",
  "pileta",
  "piscina",
  "cochera",
  "ascensor",
  "seguridad",
  "portero",
  "gimnasio",
  "balcón",
  "balcon",
  "amenities",
  "cama matrimonial",
  "camas de plaza",
  "sillón cama",
  "sillon cama",
  "baño completo",
  "baño con cuadro de ducha",
  "bañera",
  "bañadera",
].sort((a, b) => b.length - a.length);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const PATRON_SERVICIOS = new RegExp(
  `(?<![\\p{L}\\p{N}])(${PALABRAS_SERVICIO.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`,
  "giu",
);

export function resaltarServicios(texto: string): string {
  return escapeHtml(texto).replace(
    PATRON_SERVICIOS,
    (match) => `<strong class="font-semibold text-gold-active">${match}</strong>`,
  );
}
