/**
 * Tipos propios del sitio. Los componentes reciben SOLO estos tipos:
 * nada aguas abajo del adaptador sabe que el CMS es Sanity
 * (condición no negociable §3.1 del plan maestro).
 */

/** Referencia a una imagen del CMS, ya normalizada. Fase 3 la resuelve a assets locales. */
export interface Imagen {
  ref: string
  alt: string
  /** Punto focal 0–1 → object-position. */
  focal?: {x: number; y: number}
}

export interface FotoProducto extends Imagen {
  tipo: 'macro' | 'ambiente'
  esEjemplo: boolean
}

export interface Producto {
  id: string
  nombre: string
  slug: string
  serie: 'Regular' | 'Venezuela'
  materia?: string
  materiaOrigen?: string
  formato: string
  formatoReal?: string
  brillo: string[]
  textura?: string
  uso?: string
  pei?: string
  mohs?: number
  mtsCaja?: number
  fotos: FotoProducto[]
}

export interface Distribuidor {
  id: string
  nombre: string
  estado: string
  ciudad: string
  direccion: string
  telefono?: string
  whatsapp?: string
  correo?: string
  horario?: string
  ubicacion?: {lat: number; lng: number}
}

export interface Materia {
  id: string
  nombre: string
  claim?: string
  fotoTextura?: Imagen
  fotoAmbiente?: Imagen
}

/**
 * Video de una sección, ya resuelto por el adaptador. El componente no sabe de
 * dónde salió: recibe `tipo` y, según él, `url` o `youtubeId` listos para usar.
 *
 * Precedencia (misma regla que el schema): con archivo propio y URL de YouTube
 * cargados a la vez gana el archivo, porque se sirve desde nuestro dominio y no
 * mete a un tercero en la página.
 */
export interface Video {
  /** 'archivo' = mp4 servido por nosotros; 'youtube' = fachada + iframe al pulsar. */
  tipo: 'archivo' | 'youtube'
  /** Solo en 'archivo': la URL local del mp4. */
  url?: string
  /** Solo en 'youtube': el id extraído de la URL (el componente no parsea nada). */
  youtubeId?: string
  /** Imagen fija del tile. Siempre nuestra: nunca la miniatura remota de YouTube. */
  portada?: Imagen
  /** Título real del video: nombra el botón de play y titula el reproductor. */
  titulo?: string
  /** Texto corto sobre la imagen, ej. "Video · 1:36". */
  etiqueta?: string
}

export interface HeroCapa {
  etiqueta?: string
  imagen?: Imagen
}

/** Un lado del comparador: lo del producto se lee, la foto de ambiente se carga por par. */
export interface LadoComparado {
  nombre?: string
  slug?: string
  /** "60×60 · Mate", compuesta con formato y brillo del producto. */
  spec?: string
  macro?: Imagen
  ambiente?: Imagen
}

export interface Home {
  hero: {
    eyebrow?: string
    titular?: string
    videoUrl?: string
    poster?: Imagen
    capas: HeroCapa[]
  }
  ambientes: {
    etiqueta?: string
    titulo?: string
    pestanas: {label: string; fichas: {nombre?: string; slug?: string; spec?: string; foto?: Imagen}[]}[]
  }
  cita?: string
  /**
   * 02 · Compara. Cada par superpone DOS fotos del mismo ambiente, una por
   * diseño: por eso las fotos van en el par y no en el producto. El nombre, la
   * spec y la macro sí se leen del producto (regla del handoff: las
   * especificaciones no se redactan). Un par al que le falte cualquiera de las
   * dos fotos no se puede componer y se descarta.
   */
  comparador: {
    etiqueta?: string
    titulo?: string
    intro?: string
    pares: {encima: LadoComparado; base: LadoComparado}[]
  }
  /**
   * Banda de obra: la franja a sangre entre Compara e Historia. Sin macro no
   * hay banda — la sección desaparece entera.
   */
  banda: {nombre?: string; spec?: string; macro?: Imagen}
  /**
   * Proyectos ya NO se muestra en el home (tramo v2, 2026-09-04). El dato se
   * conserva: la sección salió por falta de material de obra, no porque sobre.
   */
  proyectos: {
    etiqueta?: string
    titulo?: string
    bajada?: string
    obras: {nombre: string; ciudad?: string; credito?: string; diseno?: string; disenoSlug?: string; formato?: string; foto?: Imagen}[]
  }
  historia: {etiqueta?: string; titulo?: string; hitos: {anio: number; titulo: string; texto?: string; imagen?: Imagen}[]}
  profesionales: {
    etiqueta?: string
    titulo?: string
    texto?: string
    imagen?: Imagen
    /** Video del tile izquierdo. Sin él no hay play ni etiqueta: queda la foto sola. */
    video?: Video
  }
  encuentranos: {
    etiqueta?: string
    titulo?: string
    texto?: string
    /** Ambiente del panel derecho. Sin ella el panel se compone solo con los datos. */
    foto?: Imagen
    /**
     * Estados que se listan en el home, en orden. Decisión editorial (el
     * prototipo lista seis de veinte); vacío = todos los que tengan puntos.
     */
    estadosDestacados?: string[]
  }
}

/**
 * Textos propios de la página de Catálogo. La grilla y los filtros NO salen de
 * acá: se derivan de los productos. Sin `cierre.titulo` no se dibuja la banda
 * de cierre (contenido defensivo, §3.8 del contrato de implementación).
 */
export interface PaginaCatalogo {
  hero: {eyebrow?: string; titular?: string; bajada?: string; imagen?: Imagen}
  cierre: {etiqueta?: string; titulo?: string; texto?: string}
}

export interface Sede {
  nombre: string
  /** Rotula el bloque de dirección y el pin del mapa. */
  ciudad?: string
  direccion: string
  /** Tal como se lee, ej. "0241-8134131". */
  telefono?: string
  /** Listo para un `href="tel:"`: normalizado a +58… en la capa de datos. */
  telefonoMarcar?: string
  /** Ruta en Google Maps: la del CMS o, si no hay, una búsqueda por dirección. */
  enlaceMapa?: string
  ubicacion?: {lat: number; lng: number}
}

export interface Contacto {
  hero: {eyebrow?: string; titular?: string; bajada?: string; imagen?: Imagen}
  /** Encabeza la columna de datos. */
  visitaTitulo?: string
  /** Puede traer varias líneas: se respetan los saltos. */
  horario?: string
  /** La línea que introduce la dirección de correo. */
  correoTexto?: string
  correo?: string
  sedes: Sede[]
  /** Aclaración bajo el mapa; vacía, no se dibuja. */
  mapaNota?: string
  formulario: {etiqueta?: string; titulo?: string; texto?: string; privacidad?: string; gracias?: string}
}

export interface DondeComprar {
  hero: {eyebrow?: string; titular?: string; bajada?: string; imagen?: Imagen}
  /** Solo dígitos con código de país. Manda sobre `ajustes.whatsapp`. */
  whatsappCentral?: string
  /** Explicación única del estado vacío: sirve al estado sin puntos y a la
   *  búsqueda sin resultados; el rótulo de arriba lo escribe la página. */
  textoEstadoVacio?: string
  cierre?: {etiqueta?: string; titulo?: string; texto?: string}
}

/** Perfil de red social del cliente. `nombre` sale de la lista cerrada del CMS. */
export interface Red {
  nombre: string
  url: string
}

export interface Ajustes {
  titulo: string
  descripcion?: string
  imagenOG?: Imagen
  textoPie?: string
  direccion?: string
  telefono?: string
  correo?: string
  whatsapp?: string
  redes: Red[]
  anioFundacion?: number
}
