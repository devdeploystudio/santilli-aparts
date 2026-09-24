import { defineCollection, z } from "astro:content";
import { glob, file } from "astro/loaders";

// El panel (Sveltia) guarda un campo opcional vacío como "" (string vacío),
// no como ausente — y "" no es una imagen/número válido, así que rompe la
// validación entera del build. Este helper convierte "" a "ausente" ANTES
// de validar, para cualquier campo opcional (imagen, texto o número), así
// dejar algo en blanco en el panel nunca puede tirar abajo el sitio entero.
const sinVacios = <T extends z.ZodType>(schema: T) =>
  z.preprocess((val) => (val === "" ? undefined : val), schema.optional());

// Biblioteca de íconos compartida por Qué incluye, Zonas (accesos),
// Nosotros (puntos) y el catálogo de servicios de Departamentos - tiene
// que coincidir EXACTO con `IconKey` en src/components/Icon.astro (el que
// dibuja el ícono real) y con el mapa `ICONOS` en
// public/admin/icon-picker.js (el que arma el selector visual del panel).
// Si se agrega un ícono nuevo, agregarlo en los 3 lugares.
const IconKey = z.enum([
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
  "subte",
  "salud",
  "ubicacion",
  "reloj",
  "estrella",
  "corazon",
  "sol",
  "cama",
  "ducha",
  "telefono",
  "descuento",
  "candado",
  "familia",
  "mascota",
  "cafe",
  "avion",
  "maleta",
]);

// Catálogos chicos y "creativos" (referencia): Sveltia no tiene un select
// con "agregar opción nueva" (a diferencia de un combobox tipo react-select
// en un sitio armado a mano), así que la forma estándar de lograr un
// desplegable que el cliente pueda ir ampliando es un widget "relation"
// apuntando a una colección chica como esta. Agregar una entrada nueva acá
// (ej. una zona nueva) la deja disponible como opción en el próximo
// departamento que se edite, sin tocar código ni schema.
const zonasDisponibles = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/data/zonas-disponibles" }),
  schema: z.object({
    nombre: z.string(),
  }),
});

const serviciosDisponibles = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/data/servicios-disponibles" }),
  schema: z.object({
    nombre: z.string(),
    icono: IconKey,
  }),
});

const departamentos = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/data/departamentos" }),
  schema: z.object({
    nombre: z.string(),
    // Antes un enum fijo (Recoleta/Palermo/Balvanera en código) - ahora
    // texto libre en los datos, pero en el panel se elige de la colección
    // "Zonas disponibles" (widget relation), así el cliente puede sumar
    // una zona nueva ahí y que quede disponible para elegir en el próximo
    // departamento, sin que nadie tenga que tocar el schema.
    zona: z.string(),
    direccion: z.string(),
    coords: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    capacidadMin: z.number().int().min(1),
    capacidadMax: z.number().int().min(1),
    // El orden se arrastra en el panel (reorder: { key: orden }, mismo
    // patrón que Reseñas) - nunca se escribe a mano.
    orden: z.number(),
    descripcionBreve: z.string(),
    // Ídem zona: antes un enum fijo, ahora texto libre que en el panel se
    // elige (multiple) de la colección "Servicios disponibles" (relation).
    // Agregar un servicio nuevo ahí (con su ícono) lo deja disponible para
    // marcar en cualquier depto, sin tocar código.
    servicios: z.array(z.string()),
    // Fotos y videos en UNA sola lista ordenable (mismo patrón que
    // heroSlides de la Portada): antes "fotos" (lista de imágenes) y un
    // único "video"/"videoPoster" sueltos, que SIEMPRE quedaban al final
    // de la galería sin poder intercalarse ni haber más de uno. Ahora
    // "media" admite cualquier cantidad de fotos Y videos, en el orden
    // que el cliente arrastre - el tipo (foto/video) se detecta solo por
    // la extensión del archivo al mostrarlo. "poster" solo se usa cuando
    // ese ítem es un video (frame fijo para la miniatura del carrusel).
    media: z.array(
      z.object({
        archivo: z.string(),
        poster: sinVacios(z.string()),
        // Descripción para SEO/lectores de pantalla (alt de la foto, o de
        // qué se ve en el video). Vacío por ahora en los datos existentes
        // no rompe nada (fallback a un texto genérico en el componente),
        // pero conviene completarlo.
        alt: sinVacios(z.string()),
      }),
    ),
    // Portada de la TARJETA (carrusel de la home, listado de deptos) -
    // sin esto, la tarjeta usa el primer ítem de "media" por default. Se
    // usa este campo para forzar algo puntual (ej. que la tarjeta
    // muestre un video en vez de una foto). Admite foto o video (se
    // detecta por la extensión del archivo al mostrarla).
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
    // Texto de los 2 botones debajo del párrafo. El destino de cada uno
    // queda fijo en el componente (WhatsApp / listado de departamentos) -
    // no tiene sentido que el cliente pueda romper el link, solo el texto.
    botonWhatsappTexto: z.string(),
    botonDeptosTexto: z.string(),
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
        // Descripción para SEO/lectores de pantalla (qué se ve en la foto
        // o el video) - ver mismo criterio en "media" de departamentos.
        alt: sinVacios(z.string()),
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
    fotoAlt: sinVacios(z.string()),
    // Destino fijo en el componente (listado de departamentos), solo el
    // texto es editable.
    botonTexto: z.string(),
  }),
});

const configNosotros = defineCollection({
  loader: file("./src/content/config/nosotros.yaml"),
  schema: z.object({
    id: z.string(),
    // Ver comentario en ctaFoto (configInicio) sobre por qué es un path a
    // /public y no astro:assets.
    foto: z.string(),
    fotoAlt: sinVacios(z.string()),
    titulo: z.string(),
    texto1: z.string(),
    texto2: z.string(),
    // Lista dinámica (agregar/borrar/reordenar) en vez de 3 puntos fijos
    // (punto1/2/3 antes). El ícono es un campo elegible (con el mismo
    // selector visual que Qué incluye/Zonas), no decorativo.
    puntos: z.array(z.object({ icono: IconKey, titulo: z.string(), texto: z.string() })),
  }),
});

const configDiferenciales = defineCollection({
  loader: file("./src/content/config/diferenciales.yaml"),
  schema: z.object({
    id: z.string(),
    // Foto de fondo de toda la sección (path a /public, mismo criterio que
    // foto/configInicioCta: ver comentario ahí).
    fotoFondo: z.string(),
    fotoFondoAlt: sinVacios(z.string()),
    titulo: z.string(),
    texto: z.string(),
    // Lista dinámica (agregar/borrar/reordenar) en vez de 3 campos fijos
    // (secundario1/2/3 antes). El ícono ahora SÍ es elegible (antes rotaba
    // decorativo, sin selector) - el cliente prefirió poder elegirlo
    // siempre, igual que en Qué incluye/Zonas/Nosotros.
    cards: z.array(z.object({ icono: IconKey, titulo: z.string(), texto: z.string() })),
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
    // wifi/cocina/etc.), así que es un campo elegible de la biblioteca
    // compartida (IconKey, ver arriba) en vez de texto libre.
    items: z.array(z.object({ icono: IconKey, titulo: z.string(), texto: z.string() })),
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
    // El ícono acá SÍ es elegible (a diferencia de las cards de
    // Diferenciales, que son decorativas): representa algo puntual
    // (subte, salud, seguridad, etc.), así que usa la biblioteca
    // compartida con un selector visual en el panel.
    accesos: z.array(z.object({ icono: IconKey, texto: z.string() })),
  }),
});

// Colección chica y APARTE (no un campo más de configZonas) a pedido del
// cliente: qué departamentos se ven como pin en el mapa de la sección
// Zonas de la home. Antes el mapa mostraba TODOS los departamentos
// siempre - con 40+ quedaba saturado de pines. En el panel real
// (Sveltia) es su propia colección, pero en el menú /editor se muestra
// pegada a "Zonas" (mismo prefijo de nombre) para que quede claro que es
// parte de ese mismo bloque de la página.
const configZonasMapa = defineCollection({
  loader: file("./src/content/config/zonas-mapa.yaml"),
  schema: z.object({
    id: z.string(),
    deptos: z.array(z.string()),
  }),
});

export const collections = {
  departamentos,
  zonasDisponibles,
  serviciosDisponibles,
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
  configZonasMapa,
};
