import { useMemo, useState } from "preact/hooks";

export interface DeptoResumen {
  slug: string;
  nombre: string;
  zona: string;
  capacidadMax: number;
  esPlaceholder: boolean;
  foto: string;
  video?: string;
  videoPoster?: string;
}

const ZONAS = ["Todas", "Recoleta", "Palermo", "Balvanera"] as const;
const CAPACIDADES = [1, 2, 3, 4, 5] as const;

interface Props {
  deptos: DeptoResumen[];
}

function PlaceholderThumb() {
  return (
    <div class="flex h-full w-full items-center justify-center bg-canvas">
      <span class="font-body text-[11px] font-medium text-muted">Foto próximamente</span>
    </div>
  );
}

// Lee ?zona= de la URL (el link "Ver departamentos en {zona}" de la home
// llega acá) para arrancar ya filtrado, en vez de mostrar todo y obligar a
// volver a elegir la zona a mano.
function zonaDesdeUrl(): (typeof ZONAS)[number] {
  if (typeof window === "undefined") return "Todas";
  const param = new URLSearchParams(window.location.search).get("zona");
  return (ZONAS as readonly string[]).includes(param ?? "") ? (param as (typeof ZONAS)[number]) : "Todas";
}

export default function DepartamentosExplorer({ deptos }: Props) {
  const [zona, setZona] = useState<(typeof ZONAS)[number]>(zonaDesdeUrl);
  const [capacidadMin, setCapacidadMin] = useState(1);
  const [filtroAbierto, setFiltroAbierto] = useState(() => zonaDesdeUrl() !== "Todas");

  const filtrados = useMemo(() => {
    return deptos.filter((d) => {
      if (zona !== "Todas" && d.zona !== zona) return false;
      if (d.capacidadMax < capacidadMin) return false;
      return true;
    });
  }, [deptos, zona, capacidadMin]);

  return (
    <div>
      <div class="rounded-2xl border border-hairline bg-surface p-5">
        <button
          type="button"
          onClick={() => setFiltroAbierto((v) => !v)}
          aria-expanded={filtroAbierto}
          class="flex w-full items-center gap-2 text-left"
        >
          <svg class="h-4 w-4 shrink-0 text-gold-active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 5h16M7 12h10M10 19h4" />
          </svg>
          <p class="font-body text-sm font-semibold text-ink">Filtrar por zona y por cantidad de personas</p>
          <svg
            class={`ml-auto h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${filtroAbierto ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {filtroAbierto && (
        <div class="mt-4 flex flex-wrap items-end gap-6">
        <fieldset>
          <legend class="font-body text-xs font-semibold uppercase tracking-wide text-muted">Barrio</legend>
          <div class="mt-2 flex flex-wrap gap-2">
            {ZONAS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZona(z)}
                class={`rounded-full border px-3.5 py-1.5 font-body text-sm transition-colors ${
                  zona === z ? "border-gold bg-gold text-ink" : "border-hairline text-ink hover:border-gold-active"
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend class="font-body text-xs font-semibold uppercase tracking-wide text-muted">
            Cantidad de personas
          </legend>
          <div class="mt-2 flex flex-wrap gap-2">
            {CAPACIDADES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCapacidadMin(n)}
                class={`rounded-full border px-3.5 py-1.5 font-body text-sm transition-colors ${
                  capacidadMin === n ? "border-gold bg-gold text-ink" : "border-hairline text-ink hover:border-gold-active"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        </div>
        )}
      </div>

      <p class="mt-4 font-body text-sm text-muted" aria-live="polite">
        {filtrados.length} {filtrados.length === 1 ? "departamento encontrado" : "departamentos encontrados"}
      </p>

      <div class="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((d) => (
          <a
            key={d.slug}
            href={`/departamentos/${d.slug}/`}
            class="depto-card group relative block overflow-hidden rounded-2xl border border-hairline bg-surface transition-shadow duration-300 hover:shadow-xl hover:shadow-ink/10"
          >
            <div class="relative aspect-[4/3] overflow-hidden">
              {d.video ? (
                <video
                  src={d.video}
                  autoplay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : d.esPlaceholder ? (
                <PlaceholderThumb />
              ) : (
                <img src={d.foto} alt={`Foto de ${d.nombre}`} loading="lazy" draggable={false} class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )}
              <span class="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 font-body text-xs font-semibold text-ink backdrop-blur-sm">
                {d.zona}
              </span>
            </div>
            <div class="flex items-start justify-between gap-3 p-5">
              <h3 class="font-display text-lg text-ink">{d.nombre}</h3>
              <svg class="depto-card__arrow mt-1 h-4 w-4 shrink-0 text-gold-active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
            <span class="depto-card__accent absolute inset-x-0 bottom-0 h-[3px] bg-gold" />
          </a>
        ))}
      </div>

      {filtrados.length === 0 && (
        <p class="mt-10 rounded-2xl border border-dashed border-hairline p-8 text-center font-body text-sm text-muted">
          No hay departamentos que cumplan esos filtros. Probá ampliar la búsqueda.
        </p>
      )}
    </div>
  );
}
