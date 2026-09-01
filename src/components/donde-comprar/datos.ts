/**
 * Agrupación de la red por estado y puente con la geometría del mapa.
 *
 * Los nombres de estado llegan por dos vías que no coinciden letra a letra: el
 * CMS (lista cerrada del schema `distribuidor`, con "La Guaira") y el GeoJSON
 * (Natural Earth, que todavía dice "Vargas" y escribe "Distrito Capital" con
 * variantes). Se comparan por CLAVE normalizada —minúsculas, sin acentos, con
 * guiones— y no por el texto visible; los dos alias históricos están en `ALIAS`,
 * los mismos que declara el schema y el prototipo.
 *
 * La clave también es la dirección de la página (`#estado=carabobo`) y el `id`
 * del grupo de tarjetas, así que tiene que ser ASCII y sin espacios.
 */
import type {Distribuidor} from '~/lib/data'

const ALIAS: Record<string, string> = {
  vargas: 'la-guaira',
  'distrito-federal': 'distrito-capital',
  'dtto-capital': 'distrito-capital',
}

/** Nombre de estado → clave estable (dirección, `id`, comparación). */
export function clave(nombre: string): string {
  const base = (nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return ALIAS[base] ?? base
}

/** Texto de búsqueda de un punto de venta, ya normalizado. */
export function textoBuscable(d: Distribuidor): string {
  return [d.nombre, d.ciudad, d.estado]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export interface GrupoEstado {
  clave: string
  /** Nombre tal como lo escribe el CMS: es el que se muestra. */
  nombre: string
  ciudades: string[]
  puntos: Distribuidor[]
}

/**
 * La red agrupada por estado, en orden alfabético (el del prototipo).
 *
 * Un punto SIN estado se descarta en vez de agruparse aparte. El schema lo
 * exige, así que ningún documento publicado llega sin él; pero el preview lee
 * BORRADORES, y un borrador a medias sí puede venir sin estado. Sin estado no
 * hay grupo, no hay dirección `#estado=…` y el filtro del localizador no lo
 * alcanza: mostrarlo sería un punto inalcanzable. Descartarlo, además, evita
 * que una ficha a medio escribir tumbe la página entera — que es lo que pasaba:
 * el orden llamaba a `localeCompare` sobre un `null`.
 */
export function agruparPorEstado(distribuidores: Distribuidor[]): GrupoEstado[] {
  const mapa = new Map<string, GrupoEstado>()
  for (const d of distribuidores) {
    if (!d.estado) continue
    const k = clave(d.estado)
    const grupo = mapa.get(k) ?? {clave: k, nombre: d.estado, ciudades: [], puntos: []}
    grupo.puntos.push(d)
    if (d.ciudad && !grupo.ciudades.includes(d.ciudad)) grupo.ciudades.push(d.ciudad)
    mapa.set(k, grupo)
  }
  return [...mapa.values()].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'))
}

export interface Ciudad {
  claveEstado: string
  nombre: string
  lat: number
  lng: number
}

/** Una marca por ciudad con coordenada (los dos puntos de Caracas comparten pin). */
export function ciudadesConPin(distribuidores: Distribuidor[]): Ciudad[] {
  const mapa = new Map<string, Ciudad>()
  for (const d of distribuidores) {
    if (!d.ubicacion) continue
    const k = `${clave(d.estado)}|${clave(d.ciudad)}`
    if (mapa.has(k)) continue
    mapa.set(k, {claveEstado: clave(d.estado), nombre: d.ciudad, lat: d.ubicacion.lat, lng: d.ubicacion.lng})
  }
  return [...mapa.values()]
}

/** "2 puntos" / "1 punto" — rótulo de UI, no texto de marca. */
export const plural = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`
