import { useEffect, useRef, useState } from "preact/hooks";

// Columna derecha del Hero: reemplaza al dibujo del skyline (que se movió al
// CtaBanner) por una pequeña vidriera rotativa de fotos/video del barrio y
// amenities, en el mismo tipo de columna confinada que ocupaba el dibujo
// (no a pantalla completa, ver decisión con el cliente). Fade cruzado simple
// con CSS (no Embla: acá no hay drag/swipe, es 100% automático).
interface Slide {
  tipo: "foto" | "video";
  src: string;
  poster?: string;
}

const SLIDES: Slide[] = [
  { tipo: "foto", src: "/hero/hero-foto-1.jpg" },
  { tipo: "video", src: "/hero/hero-video-1.mp4", poster: "/hero/hero-video-1-poster.jpg" },
  { tipo: "foto", src: "/hero/hero-foto-2.jpg" },
  { tipo: "video", src: "/departamentos/_compartido/pileta-callao-930.mp4", poster: "/departamentos/_compartido/pileta-callao-930-poster.jpg" },
  { tipo: "foto", src: "/hero/hero-foto-3.jpg" },
  { tipo: "video", src: "/hero/hero-video-2.mp4", poster: "/hero/hero-video-2-poster.jpg" },
];

const DURACION_FOTO_MS = 4500;

export default function HeroShowcase() {
  const [activo, setActivo] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducirMovimiento) return;

    const slide = SLIDES[activo];
    if (slide.tipo === "foto") {
      const t = setTimeout(() => setActivo((i) => (i + 1) % SLIDES.length), DURACION_FOTO_MS);
      return () => clearTimeout(t);
    }

    const video = videoRefs.current[activo];
    if (!video) return;
    const avanzar = () => setActivo((i) => (i + 1) % SLIDES.length);
    video.currentTime = 0;
    video.play().catch(() => {});
    video.addEventListener("ended", avanzar);
    return () => video.removeEventListener("ended", avanzar);
  }, [activo]);

  return (
    <div class="relative h-full min-h-[26rem] w-full overflow-hidden bg-canvas">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          class="absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{ opacity: i === activo ? 1 : 0 }}
          aria-hidden={i !== activo}
        >
          {slide.tipo === "foto" ? (
            <img src={slide.src} alt="" draggable={false} class="h-full w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
          ) : (
            <video
              ref={(el) => (videoRefs.current[i] = el)}
              src={slide.src}
              poster={slide.poster}
              muted
              playsInline
              preload="none"
              class="h-full w-full object-cover"
            />
          )}
        </div>
      ))}

      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
    </div>
  );
}
