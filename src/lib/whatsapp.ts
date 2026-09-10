import { WHATSAPP_NUMBER } from "../config/site";

export function buildWhatsAppLink(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}

export function buildConsultaGeneralLink(): string {
  return buildWhatsAppLink(
    "Hola Santilli Aparts, necesitaría que me ayuden a elegir un departamento para mi estadía.",
  );
}

export interface ConsultaDepto {
  nombreDepto: string;
  checkin: string;
  checkout: string;
  adultos: number;
  menores: number;
  tieneMascotas: boolean;
  detalleMascotas?: string;
}

export function buildConsultaDeptoMensaje(datos: ConsultaDepto): string {
  const lineaMascotas = datos.tieneMascotas
    ? `Sí, tenemos mascota(s): ${datos.detalleMascotas?.trim() || "sin especificar"}.`
    : "No tenemos mascotas.";

  return [
    `Hola! Quisiera consultar por el departamento *${datos.nombreDepto}* para el ${datos.checkin} → ${datos.checkout}.`,
    `Somos ${datos.adultos} adulto(s) y ${datos.menores} menor(es).`,
    lineaMascotas,
  ].join("\n");
}

export interface ConsultaAyuda {
  checkin: string;
  checkout: string;
  adultos: number;
  menores: number;
  tieneMascotas: boolean;
  detalleMascotas?: string;
}

// Mismo mensaje que buildConsultaDeptoMensaje pero sin depto puntual: es
// para el formulario del home que ayuda a ELEGIR uno, no para confirmar uno
// que ya se está mirando en su ficha.
export function buildConsultaAyudaMensaje(datos: ConsultaAyuda): string {
  const lineaMascotas = datos.tieneMascotas
    ? `Sí, tenemos mascota(s): ${datos.detalleMascotas?.trim() || "sin especificar"}.`
    : "No tenemos mascotas.";

  return [
    `Hola! Necesitaría ayuda para elegir un departamento para el ${datos.checkin} → ${datos.checkout}.`,
    `Somos ${datos.adultos} adulto(s) y ${datos.menores} menor(es).`,
    lineaMascotas,
  ].join("\n");
}
