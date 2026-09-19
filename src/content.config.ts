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
    instagramUrl: sinVacios(z.string()),
  }),
});

// El bloque "Inicio" está partido en 5 colecciones separadas (una por
// sección de la home) para que el panel las muestre como items
// independientes dentro de la misma carpeta "🏠 Inicio" - así editar el
// texto del Hero no mezcla en la misma pantalla las fotos, ni "Nuestros
// departamentos" con "Ayuda a elegir", etc. Antes era un solo YAML/objeto
// gigante con todo junto.

const configInicioHero = defineCollection({
  loader: file("./src/content/config/inicio-hero.yaml"),
  schema: z.object({
    id: z.string(),
    heroTitulo: z.string(),
    // Párrafo del Hero completo y editable, armado en 7 piezas en este
    // orden: heroPre + [heroDestacado1] + heroEntre1 + [heroDestacado2] +
    // heroEntre2 + [heroDestacado3] + heroFinal. Los 3 "heroDestacadoN"
    // son los que salen subrayados con la animación; el resto es texto
    // plano, pero también editable (antes quedaba fijo en el componente).
    heroPre: z.string(),
    heroDestacado1: z.string(),
    heroEntre1: z.string(),
    heroDestacado2: z.string(),
    heroEntre2: z.string(),
    heroDestacado3: z.string(),
    heroFinal: z.string(),
  }),
});

const configInicioFotos = defineCollection({
  loader: file("./src/content/config/inicio-fotos.yaml"),
  schema: z.object({
    id: z.string(),
    // Vidriera rotativa de fotos/video del barrio en el Hero — editable
    // desde el panel (agregar, borrar, reordenar). "archivo" admite foto o
    // video (se detecta por extensión al mostrarlo); "poster" solo aplica
    // si es video (frame fijo para la miniatura mientras carga).
    heroSlides: z.array(
      z.object({
        archivo: z.string(),
        poster: sinVacios(z.string()),
      }),
    ),
  }),
});

const configInicioDeptos = defineCollection({
  loader: file("./src/content/config/inicio-deptos.yaml"),
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    texto1: z.string(),
    texto2: z.string(),
  }),
});

const configInicioAyuda = defineCollection({
  loader: file("./src/content/config/inicio-ayuda.yaml"),
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    texto: z.string(),
    // Lista dinámica (agregar/borrar/reordenar desde el panel) en vez de
    // 3 campos fijos (ayudaBullet1/2/3 antes) - así se pueden sumar o
    // sacar puntos sin tocar el schema.
    items: z.array(z.object({ texto: z.string() })),
  }),
});

const configInicioCta = defineCollection({
  loader: file("./src/content/config/inicio-cta.yaml"),
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    texto: z.string(),
    // Path a /public (no astro:assets/image()): en el hosting de Cloudflare
    // la optimización de imagen en build (sharp) generaba un endpoint
    // /_image en vez de un archivo estático, que no funciona sin server
    // runtime — se rompía en el deploy aunque local funcionara bien. Mismo
    // criterio que las fotos de departamentos: archivo plano ya comprimido.
    foto: z.string(),
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
    // Foto de fondo de toda la sección (path a /public, mismo criterio que
    // foto/configInicioCta: ver comentario ahí).
    fotoFondo: z.string(),
    titulo: z.string(),
    texto: z.string(),
    // Lista dinámica (agregar/borrar/reordenar) en vez de 3 campos fijos
    // (secundario1/2/3 antes). El ícono de cada tarjeta rota entre un set
    // fijo de dibujos (ver ICONOS_CARDS en el componente) según la
    // posición, no es elegible desde el panel - son decorativos, no hay
    // uno "correcto" por tarjeta como sí pasa en Qué incluye (ahí el
    // ícono SÍ importa, es wifi/cocina/etc., y por eso ahí es un campo
    // elegible).
    cards: z.array(z.object({ titulo: z.string(), texto: z.string() })),
    importanteTitulo: z.string(),
    importanteTexto: z.string(),
  }),
});

const configQueIncluye = defineCollection({
  loader: file("./src/content/config/que-incluye.yaml"),
  schema: z.object({
    id: z.string(),
    fotoFondo: z.string(),
    titulo: z.string(),
    texto: z.string(),
    // Lista dinámica (agregar/borrar/reordenar) en vez de un campo fijo
    // por servicio. Acá el ícono SÍ importa (tiene que representar bien
    // wifi/cocina/etc., a diferencia de las cards decorativas de
    // Diferenciales/Zonas), así que es un campo elegible de un set fijo
    // (mismos íconos que ya existían como servicios en ServiceIcon.astro)
    // en vez de texto libre, para que el cliente no pueda dejarlo vacío o
    // escribir cualquier cosa ahí.
    items: z.array(
      z.object({
        icono: z.enum([
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
        titulo: z.string(),
        texto: z.string(),
      }),
    ),
  }),
});

const configComoTrabajamos = defineCollection({
  loader: file("./src/content/config/como-trabajamos.yaml"),
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    texto: z.string(),
    // Lista dinámica (agregar/borrar/reordenar) en vez de 4 pasos fijos
    // (paso1..4 antes). El número ("01", "02"...) se calcula solo según
    // la posición en la lista, no se guarda como dato - así reordenar
    // nunca deja un número pisado o repetido.
    pasos: z.array(z.object({ titulo: z.string(), texto: z.string() })),
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
    // Antes "Recoleta"/"Palermo" fijos en código, solo subtítulo/texto
    // editables. Ahora la tarjeta completa (incluido el nombre) es un
    // ítem de lista - se pueden agregar/sacar/reordenar zonas destacadas
    // sin tocar código. El link "Ver departamentos en {nombre}" de cada
    // tarjeta filtra por ese mismo nombre.
    zonas: z.array(z.object({ nombre: z.string(), subtitulo: z.string(), texto: z.string() })),
    // Ídem cards de Diferenciales: el ícono es decorativo, rota según la
    // posición del ítem en la lista, no es elegible desde el panel.
    accesos: z.array(z.object({ texto: z.string() })),
  }),
});

export const collections = {
  departamentos,
  resenas,
  config,
  configInicioHero,
  configInicioFotos,
  configInicioDeptos,
  configInicioAyuda,
  configInicioCta,
  configNosotros,
  configDiferenciales,
  configQueIncluye,
  configComoTrabajamos,
  configZonas,
};
