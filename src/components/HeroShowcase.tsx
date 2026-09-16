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
  { tipo: "video", src: "/hero/video-av-callao.mp4", poster: "/hero/video-av-callao-poster.jpg" },
  { tipo: "foto", src: "/hero/av-callao.jpg" },
  { tipo: "foto", src: "/hero/rodriguez-pena-2.jpg" },
  { tipo: "foto", src: "/hero/obelisco-1.jpg" },
  { tipo: "foto", src: "/hero/santa-fe-callao.jpg" },
  { tipo: "foto", src: "/hero/teatro-colon.jpg" },
  { tipo: "foto", src: "/hero/congreso.jpg" },
  { tipo: "foto", src: "/hero/rodriguez-pena.jpg" },
  { tipo: "foto", src: "/hero/santa-fe.jpg" },
  { tipo: "foto", src: "/hero/pasaje-pizzurno.jpg" },
  { tipo: "foto", src: "/hero/obelisco-2.jpg" },
  { tipo: "foto", src: "/hero/santa-fe-callao-2.jpg" },
  { tipo: "foto", src: "/hero/teatro-colon-2.jpg" },
  { tipo: "foto", src: "/hero/hospital-aleman.jpg" },
  { tipo: "foto", src: "/hero/hospital-clinicas.jpg" },
  { tipo: "foto", src: "/hero/hospital-rivadavia.jpg" },
  { tipo: "foto", src: "/hero/alto-palermo.jpg" },
  { tipo: "foto", src: "/hero/alto-palermo-2.jpg" },
  { tipo: "foto", src: "/hero/parque-las-heras.jpg" },
  { tipo: "foto", src: "/hero/parque-las-heras-2.jpg" },
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
    <div class="relative h-full w-full overflow-hidden bg-canvas">
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
