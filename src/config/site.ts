// Número real tomado del sitio de prueba anterior del cliente
// (santilliaparts.netlify.app) — confirmar que sigue vigente antes de producción.
export const WHATSAPP_NUMBER = "5491158299969";

export const SITE = {
  nombre: "Santilli Aparts",
  descripcion:
    "Alquiler temporario por noche en Recoleta y Palermo, CABA. Departamentos de 1 a 5 personas, atendidos por una familia.",
  zonas: ["Recoleta", "Palermo"] as const,
};

export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#zonas", label: "Zonas" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/departamentos", label: "Departamentos" },
];
