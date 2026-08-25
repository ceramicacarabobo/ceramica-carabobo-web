/**
 * Lógica de filtrado y orden del catálogo — la MISMA en el build y en el navegador.
 *
 * Vive en un módulo aparte a propósito: la página renderiza la grilla ya
 * filtrada y ordenada (para que el catálogo se vea sin JavaScript y para que la
 * primera pantalla no dependa de un script), y el script del cliente vuelve a
 * derivar exactamente lo mismo cuando el visitante toca un filtro. Si las dos
 * puntas no compartieran este archivo, la grilla saltaría al cargar.
 *
 * Los cinco ejes son LISTAS CERRADAS (`sanity/lib/listas.ts`): un valor fuera de
 * la lista deja al producto fuera de ese filtro, nunca lo cuela.
 */
import {BRILLOS, FORMATOS, MATERIAS, TEXTURAS, USOS} from '../../../sanity/lib/listas'

/** Lo mínimo que la grilla y los filtros necesitan de un producto. Es EXACTAMENTE
 *  lo que se embebe en el HTML: ni las fotos ni la ficha viajan al navegador. */
export interface ProductoFiltrable {
  id: string
  nombre: string
  serie: string
  materia?: string
  formato: string
  uso?: string
  textura?: string
  brillo: string[]
}

export type Eje = 'materia' | 'formato' | 'uso' | 'textura' | 'brillo'

export type Seleccion = Record<Eje, string[]>

export type Orden = 'materia' | 'az' | 'formato'

/**
 * Los cinco ejes filtrables, en el orden en que se dibujan.
 *
 * La serie NO es un eje: es la barra de navegación de arriba, porque las dos
 * series traen metadatos distintos (Venezuela declara materia y no textura,
 * Regular al revés) y mezclarlas como faceta daría cruces vacíos.
 */
export const EJES: {key: Eje; label: string; opciones: readonly string[]}[] = [
  {key: 'materia', label: 'Materia', opciones: MATERIAS},
  {key: 'formato', label: 'Formato', opciones: FORMATOS},
  {key: 'uso', label: 'Uso', opciones: USOS},
  {key: 'textura', label: 'Textura', opciones: TEXTURAS},
  {key: 'brillo', label: 'Brillo', opciones: BRILLOS},
]

export const ORDENES: {valor: Orden; label: string}[] = [
  {valor: 'az', label: 'A–Z'},
  {valor: 'formato', label: 'Formato mayor'},
  {valor: 'materia', label: 'Materia'},
]

export const ORDEN_INICIAL: Orden = 'materia'
export const SERIE_TODAS = 'Todas'
export const POR_BLOQUE = 24

export const seleccionVacia = (): Seleccion => ({materia: [], formato: [], uso: [], textura: [], brillo: []})

export const totalSeleccionado = (f: Seleccion) => (Object.keys(f) as Eje[]).reduce((n, k) => n + f[k].length, 0)

/** Sin acentos y en minúsculas: para leer valores de la dirección sin exigir tildes. */
export const normalizar = (v: string) =>
  String(v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/**
 * Un producto SIN dato en un eje no coincide con ese filtro: queda fuera, en vez
 * de aparecer como si cumpliera (29 productos no tienen materia todavía).
 * `brillo` es el único eje multivalor.
 */
export function coincide(p: ProductoFiltrable, f: Seleccion): boolean {
  return (
    (!f.materia.length || (!!p.materia && f.materia.includes(p.materia))) &&
    (!f.formato.length || f.formato.includes(p.formato)) &&
    (!f.uso.length || (!!p.uso && f.uso.includes(p.uso))) &&
    (!f.textura.length || (!!p.textura && f.textura.includes(p.textura))) &&
    (!f.brillo.length || f.brillo.some((b) => (p.brillo || []).includes(b)))
  )
}

/** La serie recorta el universo ANTES de que las facetas cuenten: es navegación. */
export const enSerie = (productos: ProductoFiltrable[], serie: string) =>
  serie === SERIE_TODAS ? productos : productos.filter((p) => p.serie === serie)

const porNombre = (a: ProductoFiltrable, b: ProductoFiltrable) =>
  a.nombre.localeCompare(b.nombre, 'es') || a.formato.localeCompare(b.formato, 'es')

/** Sin materia se ordena al final ('zzz'), no primero: los 29 pendientes no encabezan la grilla. */
export function ordenar(lista: ProductoFiltrable[], orden: Orden): ProductoFiltrable[] {
  const copia = lista.slice()
  if (orden === 'formato') return copia.sort((a, b) => b.formato.localeCompare(a.formato, 'es') || porNombre(a, b))
  if (orden === 'materia')
    return copia.sort((a, b) => (a.materia || 'zzz').localeCompare(b.materia || 'zzz', 'es') || porNombre(a, b))
  return copia.sort(porNombre)
}

/** Resultado completo: universo de la serie, coincidencias y orden aplicado. */
export function resolver(productos: ProductoFiltrable[], serie: string, f: Seleccion, orden: Orden) {
  const universo = enSerie(productos, serie)
  return {universo, resultado: ordenar(universo.filter((p) => coincide(p, f)), orden)}
}

/**
 * Cuántos productos quedarían si además se marcara esta opción. Es el conteo que
 * va al lado de cada casilla: DERIVADO del catálogo, nunca escrito a mano.
 */
export const conteoDeOpcion = (universo: ProductoFiltrable[], f: Seleccion, eje: Eje, valor: string) =>
  universo.filter((p) => coincide(p, {...f, [eje]: [valor]})).length

/**
 * Un eje que nadie declara en la vista actual se oculta entero (regla del
 * handoff: sección bajo su mínimo desaparece). Es el caso de Textura dentro de
 * la Serie Venezuela, donde ningún producto la trae.
 */
export const ejeConDato = (universo: ProductoFiltrable[], eje: Eje) =>
  universo.some((p) => (eje === 'brillo' ? p.brillo.length > 0 : p[eje] != null && p[eje] !== ''))
