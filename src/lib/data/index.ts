/**
 * Capa de datos del sitio (patrón adaptador, §3.1 del plan maestro).
 *
 * Los componentes importan SOLO de aquí y reciben tipos propios.
 * Cambiar de CMS = reescribir este archivo y `src/lib/queries/`, nada más.
 */
import * as Q from '../queries'
import {consultar} from './cliente'
import medios from '../medios.json'
import type {Ajustes, Contacto, Distribuidor, DondeComprar, Home, Materia, Producto} from './types'

export type * from './types'
export {sanityConfigurado, visualEditingHabilitado} from './cliente'

const HOME_VACIA: Home = {
  hero: {capas: []},
  ambientes: {pestanas: []},
  proyectos: {obras: []},
  historia: {hitos: []},
  profesionales: {},
  encuentranos: {},
}

const AJUSTES_POR_DEFECTO: Ajustes = {
  titulo: 'Cerámica Carabobo',
  descripcion: 'Fabricantes venezolanos de gres porcelánico y cerámica.',
  anioFundacion: 1956,
}

export const getProductos = () => consultar<Producto[]>(Q.PRODUCTOS, {}, [])

export const getProducto = (slug: string) => consultar<Producto | null>(Q.PRODUCTO_POR_SLUG, {slug}, null)

export const getDistribuidores = () => consultar<Distribuidor[]>(Q.DISTRIBUIDORES, {}, [])

export const getMaterias = () => consultar<Materia[]>(Q.MATERIAS, {}, [])

export const getHome = async () => {
  const home = await consultar<Home>(Q.HOME, {}, HOME_VACIA)
  // Autosuficiencia: el video se sirve desde el propio sitio, no desde el CDN
  // de Sanity. El manifiesto lo genera `scripts/descargar-medios.mjs` en el build.
  const local = (medios as Record<string, string>)[home.hero.videoUrl ?? '']
  return local ? {...home, hero: {...home.hero, videoUrl: local}} : home
}

export const getContacto = () =>
  consultar<Contacto>(Q.CONTACTO, {}, {hero: {}, sedes: [], formulario: {}})

export const getDondeComprar = () => consultar<DondeComprar>(Q.DONDE_COMPRAR, {}, {hero: {}})

export const getAjustes = async () => {
  const ajustes = await consultar<Ajustes | null>(Q.AJUSTES, {}, null)
  return {...AJUSTES_POR_DEFECTO, ...(ajustes ?? {})}
}

/**
 * Conteo de distribuidores por estado — DERIVADO, nunca escrito a mano
 * (regla del prototipo para la sección Encuéntranos).
 */
export function contarPorEstado(distribuidores: Distribuidor[]): {estado: string; total: number}[] {
  const conteo = new Map<string, number>()
  for (const d of distribuidores) conteo.set(d.estado, (conteo.get(d.estado) ?? 0) + 1)
  return [...conteo.entries()]
    .map(([estado, total]) => ({estado, total}))
    .sort((a, b) => b.total - a.total || a.estado.localeCompare(b.estado, 'es'))
}
