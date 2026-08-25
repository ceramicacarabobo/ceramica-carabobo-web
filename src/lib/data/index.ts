/**
 * Capa de datos del sitio (patrón adaptador, §3.1 del plan maestro).
 *
 * Los componentes importan SOLO de aquí y reciben tipos propios.
 * Cambiar de CMS = reescribir este archivo y `src/lib/queries/`, nada más.
 */
import * as Q from '../queries'
import {consultar} from './cliente'
import medios from '../medios.json'
import type {Ajustes, Contacto, Distribuidor, DondeComprar, Home, Imagen, Materia, PaginaCatalogo, Producto, Video} from './types'

export type * from './types'
export {sanityConfigurado, visualEditingHabilitado} from './cliente'

const HOME_VACIA: HomeCruda = {
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
  redes: [],
  anioFundacion: 1956,
}

/**
 * Autosuficiencia (plan maestro §3.3): los videos se sirven desde el propio
 * sitio, no desde el CDN de Sanity. El manifiesto lo genera
 * `scripts/descargar-medios.mjs` en el build; si un archivo no está en él, se
 * deja la URL original para no romper la página.
 */
const videoLocal = (url?: string) => (url ? ((medios as Record<string, string>)[url] ?? url) : undefined)

/** Lo que devuelve el CMS para un video, antes de normalizar. */
interface VideoCrudo {
  archivoUrl?: string | null
  youtubeUrl?: string | null
  portada?: Imagen | null
  titulo?: string | null
  etiqueta?: string | null
}

/**
 * Id de un video de YouTube a partir de cualquiera de sus direcciones:
 * `watch?v=ID`, `youtu.be/ID`, `/embed/ID` y `/shorts/ID`, con o sin parámetros.
 * Vive aquí y no en el componente: los componentes reciben datos listos
 * (patrón adaptador, §3.1 del plan maestro).
 */
export function idDeYoutube(url?: string | null): string | undefined {
  if (!url) return undefined
  try {
    const {hostname, pathname, searchParams} = new URL(url)
    if (!/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(hostname)) return undefined
    const candidato =
      hostname.endsWith('youtu.be')
        ? pathname.slice(1)
        : (searchParams.get('v') ?? pathname.replace(/^\/(embed|shorts|v|live)\//, ''))
    const id = candidato.split('/')[0]
    return /^[\w-]{11}$/.test(id) ? id : undefined
  } catch {
    return undefined
  }
}

/**
 * Video del CMS → tipo propio. Regla de precedencia (la misma del schema):
 * con los dos cargados GANA EL ARCHIVO, porque lo servimos nosotros y no mete a
 * un tercero en la página; YouTube es la alternativa y se dibuja como fachada.
 * Sin ninguno de los dos no hay video: la sección lo trata como foto sola.
 */
function normalizarVideo(crudo?: VideoCrudo | null): Video | undefined {
  if (!crudo) return undefined
  const comunes = {
    portada: crudo.portada ?? undefined,
    titulo: crudo.titulo ?? undefined,
    etiqueta: crudo.etiqueta ?? undefined,
  }
  const url = videoLocal(crudo.archivoUrl ?? undefined)
  if (url) return {tipo: 'archivo', url, ...comunes}
  const youtubeId = idDeYoutube(crudo.youtubeUrl)
  if (youtubeId) return {tipo: 'youtube', youtubeId, ...comunes}
  return undefined
}

/** La home tal como llega del CMS: el video todavía sin normalizar. */
type HomeCruda = Omit<Home, 'profesionales'> & {
  profesionales: Omit<Home['profesionales'], 'video'> & {video?: VideoCrudo | null}
}

export const getProductos = () => consultar<Producto[]>(Q.PRODUCTOS, {}, [])

export const getProducto = (slug: string) => consultar<Producto | null>(Q.PRODUCTO_POR_SLUG, {slug}, null)

export const getDistribuidores = () => consultar<Distribuidor[]>(Q.DISTRIBUIDORES, {}, [])

export const getMaterias = () => consultar<Materia[]>(Q.MATERIAS, {}, [])

export const getHome = async (): Promise<Home> => {
  const home = await consultar<HomeCruda>(Q.HOME, {}, HOME_VACIA)
  return {
    ...home,
    hero: {...home.hero, videoUrl: videoLocal(home.hero.videoUrl)},
    profesionales: {...home.profesionales, video: normalizarVideo(home.profesionales.video)},
  }
}

/** Textos de la página de Catálogo. Sin documento cargado, todo vacío: el hero
 * se queda con la ruta y el nombre de la página, y la banda de cierre no se dibuja. */
export const getPaginaCatalogo = () =>
  consultar<PaginaCatalogo>(Q.CATALOGO, {}, {hero: {}, cierre: {}})

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
 *
 * `destacados` recorta y ORDENA el resultado: es la selección editorial del
 * home (el prototipo lista seis estados, no los veinte de la red) y respeta el
 * orden en que viene del CMS. Un estado sin puntos de venta se cae solo, para
 * que una selección vieja no muestre un "0 puntos". Sin `destacados` devuelve
 * la red entera ordenada por cantidad.
 */
export function contarPorEstado(
  distribuidores: Distribuidor[],
  destacados?: string[],
): {estado: string; total: number}[] {
  const conteo = new Map<string, number>()
  for (const d of distribuidores) conteo.set(d.estado, (conteo.get(d.estado) ?? 0) + 1)
  if (destacados && destacados.length > 0) {
    return destacados
      .filter((estado, i) => conteo.has(estado) && destacados.indexOf(estado) === i)
      .map((estado) => ({estado, total: conteo.get(estado) as number}))
  }
  return [...conteo.entries()]
    .map(([estado, total]) => ({estado, total}))
    .sort((a, b) => b.total - a.total || a.estado.localeCompare(b.estado, 'es'))
}
