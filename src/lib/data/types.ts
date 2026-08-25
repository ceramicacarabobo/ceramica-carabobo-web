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
  proyectos: {
    etiqueta?: string
    titulo?: string
    bajada?: string
    obras: {nombre: string; ciudad?: string; credito?: string; diseno?: string; disenoSlug?: string; formato?: string; foto?: Imagen}[]
  }
  historia: {titulo?: string; hitos: {anio: number; titulo: string; texto?: string; imagen?: Imagen}[]}
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
  direccion: string
  telefono?: string
  ubicacion?: {lat: number; lng: number}
}

export interface Contacto {
  hero: {titular?: string; bajada?: string; imagen?: Imagen}
  horario?: string
  correo?: string
  sedes: Sede[]
  formulario: {titulo?: string; texto?: string; gracias?: string}
}

export interface DondeComprar {
  hero: {titular?: string; bajada?: string; imagen?: Imagen}
  whatsappCentral?: string
  textoEstadoVacio?: string
  cierre?: string
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
