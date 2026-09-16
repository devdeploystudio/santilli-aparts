import { useEffect, useRef, useState } from "preact/hooks";

// Columna del Hero: vidriera rotativa de fotos/video del barrio, editable
// desde el panel (colección "config-inicio", campo "heroSlides": agregar,
// borrar, reordenar). Fade cruzado simple con CSS (no Embla: acá no hay
// drag/swipe, es 100% automático).
export interface HeroSlideData {
  archivo: string;
  poster?: string;
}

function esVideo(ruta: string): boolean {
  return /\.(mp4|mov|webm)$/i.test(ruta);
}

interface Props {
  slides: HeroSlideData[];
}

const DURACION_FOTO_MS = 4500;

export default function HeroShowcase({ slides }: Props) {
  const [activo, setActivo] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    if (slides.length === 0) return;
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducirMovimiento) return;

    const slide = slides[activo];
    if (!esVideo(slide.archivo)) {
      const t = setTimeout(() => setActivo((i) => (i + 1) % slides.length), DURACION_FOTO_MS);
      return () => clearTimeout(t);
    }

    const video = videoRefs.current[activo];
    if (!video) return;
    const avanzar = () => setActivo((i) => (i + 1) % slides.length);
    video.currentTime = 0;
    video.play().catch(() => {});
    video.addEventListener("ended", avanzar);
    return () => video.removeEventListener("ended", avanzar);
  }, [activo, slides]);

  if (slides.length === 0) return null;

  return (
    <div class="relative h-full w-full overflow-hidden bg-canvas">
      {slides.map((slide, i) => (
        <div
          key={slide.archivo}
          class="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{ opacity: i === activo ? 1 : 0 }}
          aria-hidden={i !== activo}
        >
          {esVideo(slide.archivo) ? (
            <video
              ref={(el) => (videoRefs.current[i] = el)}
              src={slide.archivo}
              poster={slide.poster}
              muted
              playsInline
              preload="none"
              class="h-full w-full object-cover"
            />
          ) : (
            <img src={slide.archivo} alt="" draggable={false} class="h-full w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
          )}
        </div>
      ))}

      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
    </div>
  );
}
