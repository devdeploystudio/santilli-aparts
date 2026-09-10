import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const departamentos = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/data/departamentos" }),
  schema: z.object({
    nombre: z.string(),
    zona: z.enum(["Recoleta", "Palermo", "Balvanera"]),
    direccion: z.string(),
    coords: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    capacidadMin: z.number().int().min(1),
    capacidadMax: z.number().int().min(1),
    descripcionBreve: z.string(),
    servicios: z.array(
      z.enum([
        "wifi",
        "cocina",
        "ropaBlanca",
        "tv",
        "aire",
        "calefaccion",
        "ascensor",
        "cochera",
        "amenities",
        "seguridad",
      ]),
    ),
    fotos: z.array(z.string()),
    // Para deptos sin fotos todavía pero con un video corto ya cargado
    // (preview mudo, liviano): se usa como imagen de card en vez del
    // bloque "Foto próximamente". videoPoster es un frame fijo del mismo
    // video (recortado a 4:3) para mostrar en la card en vez del <video>
    // en vivo — evita el gris que se ve mientras el video autoplay
    // arranca, y es la miniatura sobre la que va el ícono de play.
    video: z.string().optional(),
    videoPoster: z.string().optional(),
    esPlaceholder: z.boolean().default(false),
  }),
});

export const collections = { departamentos };
