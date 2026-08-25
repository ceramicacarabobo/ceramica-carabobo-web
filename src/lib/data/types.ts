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
    pestanas: {label: string; fichas: {nombre?: string; spec?: string; foto?: Imagen}[]}[]
  }
  cita?: string
  proyectos: {
    etiqueta?: string
    titulo?: string
    bajada?: string
    obras: {nombre: string; ciudad?: string; credito?: string; diseno?: string; formato?: string; foto?: Imagen}[]
  }
  historia: {titulo?: string; hitos: {anio: number; titulo: string; texto?: string; imagen?: Imagen}[]}
  profesionales: {etiqueta?: string; titulo?: string; texto?: string; imagen?: Imagen}
  encuentranos: {etiqueta?: string; titulo?: string; texto?: string}
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

export interface Ajustes {
  titulo: string
  descripcion?: string
  imagenOG?: Imagen
  textoPie?: string
  direccion?: string
  telefono?: string
  correo?: string
  whatsapp?: string
  anioFundacion?: number
}
