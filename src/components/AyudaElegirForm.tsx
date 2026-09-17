import { useEffect, useRef, useState } from "preact/hooks";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import { buildConsultaAyudaMensaje, buildWhatsAppLink } from "../lib/whatsapp";
import { loadVendorCss } from "../lib/loadVendorCss";

// Mismo componente y lógica que BookingForm.tsx (ficha de depto puntual),
// pero sin nombreDepto: este es el que ayuda a ELEGIR uno, para el home.
interface Props {
  whatsappNumero: string;
}
function Stepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span class="font-body text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div class="mt-2 flex items-center gap-3">
        <button
          type="button"
          aria-label={`Restar ${label.toLowerCase()}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          class="h-9 w-9 rounded-full border border-hairline text-ink hover:border-gold-active"
        >
          −
        </button>
        <span class="w-6 text-center font-body text-sm font-semibold text-ink">{value}</span>
        <button
          type="button"
          aria-label={`Sumar ${label.toLowerCase()}`}
          onClick={() => onChange(value + 1)}
          class="h-9 w-9 rounded-full border border-hairline text-ink hover:border-gold-active"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function AyudaElegirForm({ whatsappNumero }: Props) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [rango, setRango] = useState<Date[]>([]);
  const [adultos, setAdultos] = useState(2);
  const [menores, setMenores] = useState(0);
  const [tieneMascotas, setTieneMascotas] = useState(false);
  const [detalleMascotas, setDetalleMascotas] = useState("");

  // form_start: ver BookingForm.tsx para el detalle (se dispara una sola
  // vez, en la primera interacción con cualquier campo).
  const formIniciadoRef = useRef(false);
  function marcarInicio() {
    if (formIniciadoRef.current) return;
    formIniciadoRef.current = true;
    (window as any).gtag?.("event", "form_start", { ubicacion: "form_ayuda_elegir" });
  }

  useEffect(() => {
    if (!dateInputRef.current) return;
    loadVendorCss("flatpickr.css");
    // Ver BookingForm.tsx para el detalle del bug de flatpickr que explica
    // el `[...selectedDates]` acá abajo (clonar el array en cada cambio).
    const fp = flatpickr(dateInputRef.current, {
      mode: "range",
      minDate: "today",
      dateFormat: "d/m/Y",
      locale: Spanish,
      onChange: (selectedDates) => {
        marcarInicio();
        setRango([...selectedDates]);
      },
    });
    return () => fp.destroy();
  }, []);

  const fechasCompletas = rango.length === 2;
  const mascotasOk = !tieneMascotas || detalleMascotas.trim().length > 0;
  const puedeConsultar = fechasCompletas && mascotasOk;
  const formatoFecha = (d: Date) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const link = puedeConsultar
    ? buildWhatsAppLink(
        buildConsultaAyudaMensaje({
          checkin: formatoFecha(rango[0]),
          checkout: formatoFecha(rango[1]),
          adultos,
          menores,
          tieneMascotas,
          detalleMascotas,
        }),
        whatsappNumero,
      )
    : undefined;

  return (
    <div class="rounded-2xl border border-hairline bg-surface p-6">
      <div class="mt-0">
        <label for="ayuda-rango-fechas" class="font-body text-xs font-semibold uppercase tracking-wide text-muted">
          Entrada y salida
        </label>
        <input
          ref={dateInputRef}
          id="ayuda-rango-fechas"
          type="text"
          readOnly
          placeholder="Elegí las fechas"
          class="mt-2 w-full cursor-pointer rounded-xl border border-hairline px-4 py-3 font-body text-sm text-ink"
        />
      </div>

      <div class="mt-5 flex flex-wrap gap-8">
        <Stepper label="Adultos" value={adultos} min={1} onChange={(v) => { marcarInicio(); setAdultos(v); }} />
        <Stepper label="Menores" value={menores} min={0} onChange={(v) => { marcarInicio(); setMenores(v); }} />
      </div>

      <div class="mt-5">
        <span class="font-body text-xs font-semibold uppercase tracking-wide text-muted">Mascotas</span>
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => { marcarInicio(); setTieneMascotas(false); }}
            class={`rounded-full border px-3.5 py-1.5 font-body text-sm transition-colors ${
              !tieneMascotas ? "border-gold bg-gold text-ink" : "border-hairline text-ink hover:border-gold-active"
            }`}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => { marcarInicio(); setTieneMascotas(true); }}
            class={`rounded-full border px-3.5 py-1.5 font-body text-sm transition-colors ${
              tieneMascotas ? "border-gold bg-gold text-ink" : "border-hairline text-ink hover:border-gold-active"
            }`}
          >
            Sí
          </button>
        </div>

        {tieneMascotas && (
          <input
            type="text"
            value={detalleMascotas}
            onInput={(e) => setDetalleMascotas((e.target as HTMLInputElement).value)}
            placeholder="Contanos cuál (ej: un perro pequeño)"
            aria-label="Detalle de la mascota"
            required
            aria-required="true"
            class="mt-3 w-full rounded-xl border border-hairline px-4 py-2.5 font-body text-sm text-ink"
          />
        )}
      </div>

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        data-ubicacion="form_ayuda_elegir"
        data-generate-lead="true"
        aria-disabled={!puedeConsultar}
        onClick={(e) => {
          if (!puedeConsultar) e.preventDefault();
        }}
        class={`mt-6 block rounded-full px-5 py-3.5 text-center font-body text-sm font-semibold transition-colors ${
          puedeConsultar
            ? "btn-press bg-gold text-ink hover:bg-gold-active"
            : "cursor-not-allowed bg-hairline text-muted"
        }`}
      >
        Consultar por WhatsApp
      </a>
      {!puedeConsultar && (
        <p class="mt-2 text-center font-body text-xs text-muted">
          {!fechasCompletas
            ? "Elegí fecha de entrada y salida para continuar."
            : "Contanos qué mascota tenés para continuar."}
        </p>
      )}
    </div>
  );
}
