/**
 * Listas cerradas del catálogo y del país.
 *
 * Regla dura del handoff: los ejes de filtro son listas cerradas — un valor
 * inventado deja al producto fuera de los filtros. Por eso todos estos campos
 * son `select` en el Studio y nunca texto libre.
 * Fuente: docs/modelo-de-contenido.md §1 y design/publicar/data/catalogo.json (`ejes`).
 */

export const SERIES = ['Regular', 'Venezuela'] as const

export const MATERIAS = ['Madera', 'Mármol', 'Cemento', 'Piedra', 'Terrazo', 'Otros'] as const

/** Auditoría del dato deducido. Al editarlo un admin, pasa a `cliente`. */
export const MATERIA_ORIGEN = [
  'cliente',
  'tipología',
  'formato',
  'nombre',
  'supuesto',
  'pendiente',
] as const

/** 30×60 NO existe en el portafolio — no reintroducir. */
export const FORMATOS = ['60×60', '60×120', '25×120'] as const

export const BRILLOS = ['Mate', 'Brillante', 'Satinado'] as const

export const TEXTURAS = ['Liso', 'Estructurado', 'Rústico'] as const

export const USOS = ['Interiores', 'Alto tránsito'] as const

export const PEI = ['I', 'II', 'III', 'IV', 'V'] as const

/**
 * Redes sociales del cliente. Lista cerrada porque cada nombre tiene su icono
 * dibujado en el código del sitio: un valor fuera de la lista saldría sin icono.
 * Orden del diseño en la home: Instagram, YouTube, TikTok.
 */
export const REDES = ['Instagram', 'YouTube', 'TikTok', 'Facebook', 'LinkedIn'] as const

/**
 * Estados de Venezuela, con los nombres del GeoJSON del sitio
 * (design/publicar/data/venezuela.geojson · NAME_1) para que el mapa case.
 * Alias históricos: Vargas → La Guaira, Distrito Federal → Distrito Capital.
 */
export const ESTADOS = [
  'Amazonas',
  'Anzoátegui',
  'Apure',
  'Aragua',
  'Barinas',
  'Bolívar',
  'Carabobo',
  'Cojedes',
  'Delta Amacuro',
  'Distrito Capital',
  'Falcón',
  'Guárico',
  'La Guaira',
  'Lara',
  'Mérida',
  'Miranda',
  'Monagas',
  'Nueva Esparta',
  'Portuguesa',
  'Sucre',
  'Táchira',
  'Trujillo',
  'Yaracuy',
  'Zulia',
] as const

/** Alias de entrada → nombre canónico (para importar datos del cliente). */
export const ALIAS_ESTADOS: Record<string, string> = {
  Vargas: 'La Guaira',
  'Distrito Federal': 'Distrito Capital',
}

export const opciones = (valores: readonly string[]) => valores.map((value) => ({title: value, value}))
