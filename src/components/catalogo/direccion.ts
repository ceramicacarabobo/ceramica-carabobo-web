/**
 * Contrato de URL e historial del catálogo (bloque 3.3).
 *
 * La regla, tal como la fija el prototipo y la recoge `modelo-de-contenido.md`
 * §3.3, distingue DOS clases de cambio:
 *
 *  1. **Lo que filtra** (serie, los cinco ejes, el orden) se escribe con
 *     `replaceState`: la dirección siempre refleja lo que se está viendo y es
 *     compartible, pero NO deja rastro en el historial. Quince clics de filtro
 *     siguen siendo una sola entrada, así que "atrás" devuelve a la página
 *     anterior y no deshace el filtro anterior — prueba 05 del checklist.
 *  2. **Lo que se abre encima** (la hoja de filtros en teléfono, la ficha de
 *     producto) se escribe con `pushState`: ahí sí queremos una entrada propia,
 *     para que el gesto de volver del sistema la cierre en vez de sacar al
 *     visitante de la página.
 *
 * El bloque visible de la grilla (24, 48, …) NO viaja en la dirección: un
 * enlace compartido abre siempre en el primer bloque.
 *
 * `capa=menu` no está acá: el menú móvil es de la cáscara (`shell/Header.astro`)
 * y su entrada de historial le toca a quien lo mantenga.
 */
import {EJES, ORDENES, SERIE_TODAS, normalizar, seleccionVacia} from './filtrar'
import type {Eje, Orden, ProductoFiltrable, Seleccion} from './filtrar'

/** Capas a pantalla completa que el catálogo abre por su cuenta. */
export type Capa = 'filtros' | null

export interface EstadoCatalogo {
  serie: string
  orden: Orden
  f: Seleccion
  /** Id del producto con la ficha abierta. Lo escribe este módulo; lo dibuja el bloque 3.4. */
  ficha: string | null
  capa: Capa
}

const SERIES_VALIDAS = ['Regular', 'Venezuela']

export const estadoInicial = (): EstadoCatalogo => ({
  serie: SERIE_TODAS,
  orden: 'materia',
  f: seleccionVacia(),
  ficha: null,
  capa: null,
})

/** Estado → texto de hash. Sin nada que decir, cadena vacía (la dirección queda limpia). */
export function hashDeEstado(st: EstadoCatalogo): string {
  const partes: string[] = []
  if (st.serie && st.serie !== SERIE_TODAS) partes.push(`serie=${encodeURIComponent(st.serie)}`)
  for (const eje of EJES) {
    const valores = st.f[eje.key]
    if (valores && valores.length) partes.push(`${eje.key}=${valores.map(encodeURIComponent).join(',')}`)
  }
  if (st.orden && st.orden !== 'materia') partes.push(`orden=${st.orden}`)
  if (st.ficha) partes.push(`diseno=${encodeURIComponent(st.ficha)}`)
  if (st.capa) partes.push(`capa=${st.capa}`)
  return partes.length ? `#${partes.join('&')}` : ''
}

/**
 * Texto de hash → estado. Todo valor que no esté en las listas cerradas se
 * ignora: una dirección manipulada no puede meter un filtro inventado.
 */
export function estadoDeHash(hash: string): EstadoCatalogo {
  const out = estadoInicial()
  const h = (hash || '').replace(/^#/, '')
  if (!h) return out

  // Compatibilidad con el enlace del megamenú de la cáscara: `#materia-madera`.
  if (h.startsWith('materia-') && !h.includes('=')) {
    const pedido = normalizar(decodeURIComponent(h.slice(8)))
    const opcion = EJES[0].opciones.find((o) => normalizar(o) === pedido)
    if (opcion) out.f.materia = [opcion]
    return out
  }

  for (const par of h.split('&')) {
    const i = par.indexOf('=')
    if (i < 0) continue
    const clave = par.slice(0, i)
    let valor: string
    try {
      valor = decodeURIComponent(par.slice(i + 1))
    } catch {
      continue
    }
    if (clave === 'orden') {
      if (ORDENES.some((o) => o.valor === valor)) out.orden = valor as Orden
      continue
    }
    if (clave === 'serie') {
      if (SERIES_VALIDAS.includes(valor)) out.serie = valor
      continue
    }
    // La ficha viaja por id, no por nombre: hay 13 nombres repetidos en dos formatos.
    if (clave === 'diseno') {
      out.ficha = valor
      continue
    }
    if (clave === 'capa') {
      out.capa = valor === 'filtros' ? 'filtros' : null
      continue
    }
    const eje = EJES.find((g) => g.key === clave)
    if (!eje) continue
    for (const bruto of valor.split(',')) {
      const opcion = eje.opciones.find((o) => normalizar(o) === normalizar(bruto))
      if (opcion && !out.f[eje.key as Eje].includes(opcion)) out.f[eje.key as Eje].push(opcion)
    }
  }
  return out
}

/**
 * Firma de "lo que hay abierto encima", leída del TEXTO de la dirección y no de
 * una copia del estado: comparar la dirección vieja con la nueva es
 * autocorrectivo — no hay variable paralela que se pueda desincronizar.
 */
export function firmaDeCapa(hash: string): string {
  const leer = (k: string) => {
    const m = new RegExp(`(?:^|[#&])${k}=([^&]*)`).exec(hash || '')
    return m ? m[1] : ''
  }
  return `${leer('diseno')}|${leer('capa')}`
}

const SIN_CAPA = '|'

/**
 * Escribe el estado en la dirección con la regla de arriba. Idempotente: si la
 * dirección ya dice lo mismo, no toca el historial.
 */
export function sincronizarURL(st: EstadoCatalogo): void {
  const nuevo = hashDeEstado(st)
  const actual = location.hash || ''
  if (nuevo === actual) return
  const antes = firmaDeCapa(actual)
  const ahora = firmaDeCapa(nuevo)
  const destino = nuevo || location.pathname + location.search
  if (ahora !== SIN_CAPA && ahora !== antes) {
    // Se abrió algo encima: entrada propia, para que "atrás" la cierre.
    history.pushState({capaCatalogo: true}, '', destino)
  } else {
    // Cambió un filtro: se reescribe CONSERVANDO la marca, así "atrás" sigue
    // cerrando la capa que estuviera abierta en vez de deshacer el filtro.
    history.replaceState(history.state, '', destino)
  }
}

/**
 * Cerrar es volver atrás cuando la capa dejó entrada propia: así el historial no
 * se llena de pares abrir/cerrar y el botón del sistema hace lo mismo que el aspa.
 * Devuelve `true` si delegó en el historial (el cierre llegará por `popstate`).
 */
export function cerrarPorHistorial(): boolean {
  if (history.state && history.state.capaCatalogo) {
    history.back()
    return true
  }
  return false
}

/**
 * ── Enganche para la ficha de producto (bloque 3.4) ────────────────────────
 *
 * Este bloque implementa el CONTRATO (entrada de historial, dirección
 * compartible, cierre con "atrás" y con Escape) pero NO dibuja la ficha. Quien
 * la implemente sólo tiene que:
 *
 *   1. escuchar `document.addEventListener('catalogo:capa', …)` — o
 *      `window.catalogo.alCambiarCapa(cb)` — y abrir/cerrar su overlay según
 *      `detalle.ficha` (id de producto o `null`);
 *   2. interceptar el clic en la tarjeta (`a[data-abre-ficha]`) con
 *      `evento.preventDefault()` y llamar a `window.catalogo.abrirFicha(id)`;
 *      sin JavaScript, y con clic medio o "abrir en pestaña nueva", el mismo
 *      enlace lleva a la página propia del producto, que es indexable;
 *   3. llamar a `window.catalogo.cerrar()` desde su aspa y desde el arrastre.
 *
 * El id que viaja es el `_id` del producto (no el nombre: hay 13 nombres
 * repetidos en dos formatos). Los datos de grilla de ese producto están en
 * `window.catalogo.productos`; la ficha completa la resuelve el bloque 3.4.
 */
export interface ApiCatalogo {
  productos: ProductoFiltrable[]
  estado(): EstadoCatalogo
  abrirFicha(id: string): void
  cerrar(): void
  alCambiarCapa(cb: (detalle: {ficha: string | null; capa: Capa}) => void): () => void
}

declare global {
  interface Window {
    catalogo?: ApiCatalogo
  }
}
