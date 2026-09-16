// Portada de la TARJETA (carrusel de la home, listado de /departamentos).
// Prioridad: portada elegida a mano > primera foto > video (solo si no hay
// ninguna foto todavía) > placeholder. Sin esto, un depto con fotos Y
// video (ej. video de una pileta compartida sumado a la galería) mostraría
// el video en la tarjeta por default, tapando su propia primera foto.
export interface DatosPortada {
  fotos: string[];
  video?: string;
  portada?: string;
}

function esVideo(ruta: string): boolean {
  return /\.(mp4|mov|webm)$/i.test(ruta);
}

export function resolverPortada(d: DatosPortada): { foto: string; video?: string } {
  if (d.portada) {
    return esVideo(d.portada) ? { foto: "", video: d.portada } : { foto: d.portada, video: undefined };
  }
  if (d.fotos.length > 0) {
    return { foto: d.fotos[0], video: undefined };
  }
  if (d.video) {
    return { foto: "", video: d.video };
  }
  return { foto: "", video: undefined };
}
