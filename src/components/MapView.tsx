import { useEffect, useRef } from "preact/hooks";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
// Pin propio (dorado de marca), generado a partir de la silueta default de
// Leaflet vía sharp (mismo alto, mismo recorte) en vez de un filter CSS
// hue-rotate sobre el ícono azul, que no daba un dorado convincente.
import markerIcon2x from "../assets/map-marker-gold-2x.png";
import markerIcon from "../assets/map-marker-gold.png";

// Leaflet's Icon.Default sobreescribe _getIconUrl para anteponer su propio
// imagePath detectado incluso cuando le pasamos URLs ya resueltas por Vite,
// lo que rompe el ícono con cualquier bundler. Fix estándar: borrar el
// override y dejar que use las URLs tal cual se las pasamos.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: (markerIcon2x as { src?: string }).src ?? (markerIcon2x as unknown as string),
  iconUrl: (markerIcon as { src?: string }).src ?? (markerIcon as unknown as string),
  shadowUrl: (markerShadow as { src?: string }).src ?? (markerShadow as unknown as string),
});

export interface MapPin {
  nombre: string;
  slug?: string;
  lat: number;
  lng: number;
}

export interface ZonaLabel {
  nombre: string;
  lat: number;
  lng: number;
}

interface Props {
  pines: MapPin[];
  zoom?: number;
  className?: string;
  etiquetasZona?: ZonaLabel[];
}

export default function MapView({ pines, zoom, className = "h-80 w-full", etiquetasZona = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || pines.length === 0) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
    });

    // Antes usaba Carto Positron (más minimalista), pero el endpoint
    // anónimo de basemaps.cartocdn.com tiene un límite de uso: pasado un
    // punto empieza a devolver un tile placeholder que dice literalmente
    // "API KEY REQUIRED" en vez de un error — no se nota hasta que se
    // supera la cuota. Los tiles estándar de OpenStreetMap no tienen ese
    // límite (solo la política de uso justo de siempre), así que son la
    // opción confiable para no depender de una key en ningún momento.
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const markers = pines.map((pin) => {
      const marker = L.marker([pin.lat, pin.lng]).addTo(map);
      const link = pin.slug
        ? `<a href="/departamentos/${pin.slug}" style="color:#434242;text-decoration:none;">
             <span style="font-weight:600;">${pin.nombre}</span><br/>
             <span style="color:#ad8830;font-weight:600;">Ver más →</span>
           </a>`
        : pin.nombre;
      marker.bindPopup(link);
      return marker;
    });

    // Nombres de barrio como texto fijo sobre el mapa (no un marker más):
    // sin ícono ni popup, solo para ubicar de un vistazo qué zona es cada
    // grupo de pines en el mapa general del home.
    etiquetasZona.forEach((etiqueta) => {
      L.marker([etiqueta.lat, etiqueta.lng], {
        icon: L.divIcon({
          className: "map-zona-label",
          html: etiqueta.nombre,
          iconSize: undefined,
        }),
        interactive: false,
        keyboard: false,
        zIndexOffset: -1000,
      }).addTo(map);
    });

    if (pines.length === 1) {
      map.setView([pines[0].lat, pines[0].lng], zoom ?? 15);
    } else {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => map.remove();
  }, [pines]);

  if (pines.length === 0) return null;

  return <div ref={containerRef} class={`${className} rounded-2xl`} role="application" aria-label="Mapa de ubicación" />;
}
