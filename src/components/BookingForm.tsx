import { useEffect, useRef, useState } from "preact/hooks";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import { buildConsultaDeptoMensaje, buildWhatsAppLink } from "../lib/whatsapp";
import { loadVendorCss } from "../lib/loadVendorCss";

interface Props {
  nombreDepto: string;
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

export default function BookingForm({ nombreDepto, whatsappNumero }: Props) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [rango, setRango] = useState<Date[]>([]);
  const [adultos, setAdultos] = useState(2);
  const [menores, setMenores] = useState(0);
  const [tieneMascotas, setTieneMascotas] = useState(false);
  const [detalleMascotas, setDetalleMascotas] = useState("");

  // form_start: se dispara UNA sola vez, en la primera interacción real con
  // cualquier campo (fecha, steppers o mascotas), sea cual sea el orden en
  // que la persona los toque.
  const formIniciadoRef = useRef(false);
  function marcarInicio() {
    if (formIniciadoRef.current) return;
    formIniciadoRef.current = true;
    (window as any).gtag?.("event", "form_start", { ubicacion: "ficha_depto" });
  }

  useEffect(() => {
    if (!dateInputRef.current) return;
    loadVendorCss("flatpickr.css");
    // Bug real encontrado y resuelto: flatpickr llama `e.stopPropagation()`
    // en cada click de día (así que un listener puesto en el calendario o
    // en el documento nunca lo ve), y en modo rango MUTA el mismo array
    // `selectedDates` en vez de crear uno nuevo en cada selección. Pasarlo
    // tal cual a `setRango` le da a Preact la MISMA referencia que ya tenía
    // guardada, así que no vuelve a renderizar (aunque el array ahora tenga
    // 2 fechas adentro) y el botón se queda deshabilitado. Por eso acá se
    // clona con `[...selectedDates]`: fuerza una referencia nueva en cada
    // cambio para que el estado se actualice de verdad.
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
        buildConsultaDeptoMensaje({
          nombreDepto,
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
      <h3 class="font-display text-xl text-ink">Consultar disponibilidad</h3>

      <div class="mt-4">
        <label for="rango-fechas" class="font-body text-xs font-semibold uppercase tracking-wide text-muted">
          Entrada y salida
        </label>
        <input
          ref={dateInputRef}
          id="rango-fechas"
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
        data-ubicacion="ficha_depto"
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
