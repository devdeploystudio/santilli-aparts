import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

// El panel (Sveltia) guarda un campo opcional vacío como "" (string vacío),
// no como ausente — y "" no es una imagen/número válido, así que rompe la
// validación entera del build. Este helper convierte "" a "ausente" ANTES
// de validar, para cualquier campo opcional (imagen, texto o número), así
// dejar algo en blanco en el panel nunca puede tirar abajo el sitio entero.
const sinVacios = <T extends z.ZodType>(schema: T) =>
  z.preprocess((val) => (val === "" ? undefined : val), schema.optional());

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
    // Video corto opcional (preview mudo, liviano): aparece como una foto
    // más al final del carrusel de la ficha (Gallery.tsx), no reemplaza
    // las fotos propias del depto. Puede ser propio de esa unidad o uno
    // compartido por varias (ej. video de la pileta del edificio, mismo
    // archivo referenciado desde varios deptos). videoPoster es un frame
    // fijo del mismo video (recortado a 4:3) para la miniatura del
    // carrusel en vez de un <video> en vivo — evita el gris mientras el
    // video autoplay arranca, y es la base sobre la que va el ícono de play.
    video: sinVacios(z.string()),
    videoPoster: sinVacios(z.string()),
    // Portada de la TARJETA (carrusel de la home, listado de deptos) -
    // sin esto, la tarjeta usa la primera foto por default, o el video
    // solo si el depto no tiene ninguna foto todavía. Se usa este campo
    // para forzar algo puntual (ej. que la tarjeta muestre el video en
    // vez de una foto, aunque el depto sí tenga fotos). Admite foto o
    // video (se detecta por la extensión del archivo al mostrarla).
    portada: sinVacios(z.string()),
    esPlaceholder: z.boolean().default(false),
  }),
});

const resenas = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/resenas" }),
  schema: z.object({
    orden: z.number(),
    zona: z.string(),
    // Captura real de WhatsApp (recortada, no editada en el contenido) —
    // se muestra la imagen tal cual para que se note que es real, dentro
    // de una tarjeta con los colores del sitio. `texto` queda igual para
    // el alt/lectores de pantalla.
    imagen: z.string(),
    texto: z.string(),
  }),
});

// Instagram/WhatsApp/etc: configuración general, no pertenece a una sola
// página. Nombre/descripción del sitio (SEO) quedan en código a propósito
// (no forman parte del contenido editable por ahora), mismo criterio que
// proyecto-s3.
const config = defineCollection({
  loader: file("./src/content/config/site.yaml"),
  schema: z.object({
    id: z.string(),
    whatsappNumero: sinVacios(z.string()),
  }),
});

// Hero + bloque "Nuestros departamentos" + ayuda a elegir + CTA final: todo
// vive en la home, agrupado como "Inicio" en el panel.
const configInicio = defineCollection({
  loader: file("./src/content/config/inicio.yaml"),
  schema: z.object({
    id: z.string(),
    heroTitulo: z.string(),
    // Las 3 frases resaltadas del párrafo del Hero (subrayado animado).
    // El texto que las conecta queda fijo en el componente para no
    // romper la animación armada a mano.
    heroDestacado1: z.string(),
    heroDestacado2: z.string(),
    heroDestacado3: z.string(),
    deptosTexto1: z.string(),
    deptosTexto2: z.string(),
    ayudaTitulo: z.string(),
    ayudaTexto: z.string(),
    ayudaBullet1: z.string(),
    ayudaBullet2: z.string(),
    ayudaBullet3: z.string(),
    ctaTitulo: z.string(),
    ctaTexto: z.string(),
    // Path a /public (no astro:assets/image()): en el hosting de Cloudflare
    // la optimización de imagen en build (sharp) generaba un endpoint
    // /_image en vez de un archivo estático, que no funciona sin server
    // runtime — se rompía en el deploy aunque local funcionara bien. Mismo
    // criterio que las fotos de departamentos: archivo plano ya comprimido.
    ctaFoto: z.string(),
  }),
});

const configNosotros = defineCollection({
  loader: file("./src/content/config/nosotros.yaml"),
  schema: z.object({
    id: z.string(),
    // Ver comentario en ctaFoto (configInicio) sobre por qué es un path a
    // /public y no astro:assets.
    foto: z.string(),
    titulo: z.string(),
      texto1: z.string(),
      texto2: z.string(),
      punto1Titulo: z.string(),
      punto1Texto: z.string(),
      punto2Titulo: z.string(),
      punto2Texto: z.string(),
      punto3Titulo: z.string(),
      punto3Texto: z.string(),
    }),
});

const configDiferenciales = defineCollection({
  loader: file("./src/content/config/diferenciales.yaml"),
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    texto: z.string(),
    secundario1Titulo: z.string(),
    secundario1Texto: z.string(),
    secundario2Titulo: z.string(),
    secundario2Texto: z.string(),
    secundario3Titulo: z.string(),
    secundario3Texto: z.string(),
    importanteTitulo: z.string(),
    importanteTexto: z.string(),
  }),
});

const configQueIncluye = defineCollection({
  loader: file("./src/content/config/que-incluye.yaml"),
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    texto: z.string(),
    ropaBlancaTexto: z.string(),
    wifiTexto: z.string(),
    tvTexto: z.string(),
    cocinaTexto: z.string(),
    aireTexto: z.string(),
    seguridadTexto: z.string(),
    amenitiesTexto: z.string(),
    cocheraTexto: z.string(),
  }),
});

const configComoTrabajamos = defineCollection({
  loader: file("./src/content/config/como-trabajamos.yaml"),
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    texto: z.string(),
    paso1Titulo: z.string(),
    paso1Texto: z.string(),
    paso2Titulo: z.string(),
    paso2Texto: z.string(),
    paso3Titulo: z.string(),
    paso3Texto: z.string(),
    paso4Titulo: z.string(),
    paso4Texto: z.string(),
    reservaTitulo: z.string(),
    reservaTexto: z.string(),
  }),
});

const configZonas = defineCollection({
  loader: file("./src/content/config/zonas.yaml"),
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    texto: z.string(),
    recoletaSubtitulo: z.string(),
    recoletaTexto: z.string(),
    palermoSubtitulo: z.string(),
    palermoTexto: z.string(),
    acceso1Texto: z.string(),
    acceso2Texto: z.string(),
    acceso3Texto: z.string(),
    acceso4Texto: z.string(),
  }),
});

export const collections = {
  departamentos,
  resenas,
  config,
  configInicio,
  configNosotros,
  configDiferenciales,
  configQueIncluye,
  configComoTrabajamos,
  configZonas,
};
