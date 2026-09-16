// El número de WhatsApp ahora vive en src/content/config/site.yaml, editable
// desde /admin. Mantiene el mismo nombre de export para no tocar sus
// consumidores.
import { getEntry } from "astro:content";

const configEntry = await getEntry("config", "site");
export const WHATSAPP_NUMBER = configEntry!.data.whatsappNumero || "5491158299969";

export const SITE = {
  nombre: "Santilli Aparts",
  descripcion:
    "Alquiler temporario por noche en Recoleta y Palermo, CABA. Departamentos de 1 a 5 personas, atendidos por una familia.",
  zonas: ["Recoleta", "Palermo"] as const,
};

export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#zonas", label: "Zonas" },
  { href: "/#como-se-reserva", label: "Cómo se reserva" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/departamentos", label: "Departamentos" },
];
