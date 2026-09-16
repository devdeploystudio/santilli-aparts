import { useEffect, useRef, useState } from "preact/hooks";
import EmblaCarousel from "embla-carousel";
import type { EmblaCarouselType } from "embla-carousel";

interface Props {
  fotos: string[];
  esPlaceholder: boolean;
  nombre: string;
  video?: string;
  videoPoster?: string;
}

function FotoSlide({
  src,
  placeholder,
  alt,
  eager = false,
}: {
  src: string;
  placeholder: boolean;
  alt: string;
  eager?: boolean;
}) {
  if (placeholder) {
    return (
      <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-[color-mix(in_srgb,var(--color-gold)_18%,var(--color-canvas))] to-canvas">
        <div class="flex flex-col items-center gap-2 px-4 text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-gold-active" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <path d="M21 16l-5-5-4 4-3-3-6 6" />
          </svg>
          <span class="font-body text-xs font-medium text-muted">Foto próximamente</span>
        </div>
      </div>
    );
  }
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} draggable={false} class="h-full w-full object-cover" />;
}

// Miniatura recortada con zoom (mismo trato que una foto, object-cover, no
// letterbox) con un ícono de play encima; al clickear abre el lightbox de
// video. Se usa tanto si el video es la ÚNICA slide (depto sin fotos
// todavía) como si es una slide más al final del carrusel de fotos (ej.
// video de la pileta del edificio, compartido entre varios deptos).
function VideoSlide({
  video,
  videoPoster,
  nombre,
  eager,
  onClick,
}: {
  video: string;
  videoPoster?: string;
  nombre: string;
  eager: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" class="relative h-full w-full cursor-zoom-in overflow-hidden" onClick={onClick} aria-label={`Reproducir video de ${nombre}`}>
      {videoPoster ? (
        <img src={videoPoster} alt={`Preview de ${nombre}`} loading={eager ? "eager" : "lazy"} draggable={false} class="h-full w-full object-cover" />
      ) : (
        <video src={video} muted playsInline preload="metadata" class="h-full w-full object-cover" />
      )}
      <span class="absolute inset-0 flex items-center justify-center">
        <span class="flex h-16 w-16 items-center justify-center rounded-full bg-surface/90 text-ink shadow-lg">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}

export default function Gallery({ fotos, esPlaceholder, nombre, video, videoPoster }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const emblaRef = useRef<EmblaCarouselType | null>(null);
  const [selected, setSelected] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [videoAbierto, setVideoAbierto] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeVideoRef = useRef<HTMLButtonElement>(null);

  // El video (si existe) siempre va como última slide del carrusel, sea
  // el único contenido (depto sin fotos todavía) o una slide más sumada
  // a las fotos propias del depto (ej. video de una pileta compartida por
  // varios deptos del mismo edificio).
  const totalSlides = fotos.length + (video ? 1 : 0);

  useEffect(() => {
    if (!viewportRef.current) return;
    const embla = EmblaCarousel(viewportRef.current, { loop: true, align: "start" });
    emblaRef.current = embla;
    embla.on("select", () => setSelected(embla.selectedScrollSnap()));
    return () => embla.destroy();
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? i : (i + 1) % fotos.length));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxIndex, fotos.length]);

  useEffect(() => {
    if (!videoAbierto) return;
    document.body.style.overflow = "hidden";
    closeVideoRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVideoAbierto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [videoAbierto]);

  return (
    <div class="relative aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[20rem]">
      <div class="absolute inset-0 overflow-hidden rounded-2xl" ref={viewportRef}>
        <div class="flex h-full">
          {fotos.map((foto, i) => (
            <button
              type="button"
              key={i}
              class="h-full min-w-0 shrink-0 grow-0 basis-full cursor-zoom-in"
              onClick={() => setLightboxIndex(i)}
              aria-label={`Ampliar foto ${i + 1} de ${nombre}`}
            >
              <FotoSlide src={foto} placeholder={esPlaceholder} alt={`Foto ${i + 1} de ${nombre}`} eager={i === 0} />
            </button>
          ))}
          {video && (
            <div class="h-full min-w-0 shrink-0 grow-0 basis-full">
              <VideoSlide
                video={video}
                videoPoster={videoPoster}
                nombre={nombre}
                eager={fotos.length === 0}
                onClick={() => setVideoAbierto(true)}
              />
            </div>
          )}
        </div>
      </div>

      {totalSlides > 1 && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={() => emblaRef.current?.scrollPrev()}
            class="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow hover:text-gold-active"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={() => emblaRef.current?.scrollNext()}
            class="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow hover:text-gold-active"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>

          <div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <span key={i} class={`h-1.5 w-1.5 rounded-full ${i === selected ? "bg-gold" : "bg-surface/70"}`} />
            ))}
          </div>
        </>
      )}

      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada de ${nombre}`}
          class="fixed inset-0 z-[1200] flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Cerrar"
            onClick={() => setLightboxIndex(null)}
            class="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/10 text-surface hover:bg-surface/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>

          {fotos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
                }}
                class="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/10 text-surface hover:bg-surface/20"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button
                type="button"
                aria-label="Foto siguiente"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i === null ? i : (i + 1) % fotos.length));
                }}
                class="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/10 text-surface hover:bg-surface/20"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </>
          )}

          <div class="relative" onClick={(e) => e.stopPropagation()}>
            {esPlaceholder ? (
              <div class="flex h-[60vh] w-[85vw] max-w-xl items-center justify-center rounded-xl bg-gradient-to-br from-[color-mix(in_srgb,var(--color-gold)_18%,var(--color-canvas))] to-canvas">
                <div class="flex flex-col items-center gap-2 px-4 text-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-gold-active" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="2" />
                    <path d="M21 16l-5-5-4 4-3-3-6 6" />
                  </svg>
                  <span class="font-body text-xs font-medium text-muted">Foto próximamente</span>
                </div>
              </div>
            ) : (
              // object-contain acá a propósito: en la miniatura recortamos
              // para que las cards queden parejas, pero en el lightbox el
              // objetivo es ver la foto entera, no una versión recortada.
              <img
                src={fotos[lightboxIndex]}
                alt={`Foto ${lightboxIndex + 1} de ${nombre}, tamaño completo`}
                draggable={false}
                class="block max-h-[85vh] max-w-[90vw] w-auto h-auto rounded-xl object-contain"
              />
            )}
          </div>
        </div>
      )}

      {videoAbierto && video && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Video de ${nombre}`}
          class="fixed inset-0 z-[1200] flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setVideoAbierto(false)}
        >
          <button
            ref={closeVideoRef}
            type="button"
            aria-label="Cerrar"
            onClick={() => setVideoAbierto(false)}
            class="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/10 text-surface hover:bg-surface/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <video
            src={video}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
            class="block max-h-[85vh] max-w-[90vw] w-auto h-auto rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
