/**
 * Datos de la ficha de producto (bloque 3.4).
 *
 * Vive aparte del componente porque lo consumen las DOS formas de la ficha —la
 * página propia `/catalogo/<slug>` y el overlay del catálogo— y porque la regla
 * que gobierna la tabla no es de maquetación sino de contenido:
 *
 *   **Una fila sin dato DESAPARECE.** Ni en blanco ni con "no especificado".
 *
 * Es la misma regla del prototipo (`catalogo-c5.dc.html`, función `add`) y del
 * contrato de implementación (`modelo-de-contenido.md` §3.8). Con el dato real
 * pesa: 29 productos no tienen materia, 29 no tienen MOHS ni textura y 97 no
 * tienen metros por caja ni medida real.
 */
import type {Producto} from '~/lib/data'

export interface FilaFicha {
  k: string
  v: string
}

/**
 * Metros cuadrados por caja. El modelo los guarda como número (`mtsCaja`), así
 * que la unidad la pone el sitio y el separador decimal es el de es-VE: la
 * planilla del cliente traía el texto "1,77 MT2" y el prototipo lo repetía tal
 * cual, pero eso era notación de hoja de cálculo, no del sitio.
 */
const metros = new Intl.NumberFormat('es-VE', {maximumFractionDigits: 2})

/**
 * Filas de la ficha técnica, en el orden del prototipo. `agregar` es el único
 * lugar donde se decide si una fila existe: vacío, nulo o lista vacía no entran.
 */
export function filasDeFicha(producto: Producto): FilaFicha[] {
  const filas: FilaFicha[] = []
  const agregar = (k: string, v: string | number | string[] | undefined | null) => {
    if (v === null || v === undefined || v === '') return
    if (Array.isArray(v)) {
      if (v.length === 0) return
      filas.push({k, v: v.join(' · ')})
      return
    }
    filas.push({k, v: String(v)})
  }

  agregar('Materia', producto.materia)
  agregar('Serie', `Serie ${producto.serie}`)
  agregar('Formato', `${producto.formato} cm`)
  agregar('Medida real', producto.formatoReal)
  agregar('Brillo', producto.brillo)
  agregar('Textura', producto.textura)
  agregar('Uso', producto.uso)
  agregar('Resistencia PEI', producto.pei)
  agregar('Dureza MOHS', producto.mohs)
  agregar('Rendimiento', producto.mtsCaja ? `${metros.format(producto.mtsCaja)} m²` : undefined)

  return filas
}

/**
 * Antetítulo de la ficha: la materia cuando existe y, si no, el formato. Los 29
 * productos sin materia no pueden quedarse con la línea vacía.
 */
export const antetituloDeFicha = (producto: Producto): string =>
  producto.materia || `${producto.formato} cm`

/** Nombre completo con el que se anuncia el producto (aria, título, compartir). */
export const nombreLargo = (producto: Producto): string =>
  `${producto.nombre} ${producto.formato} cm`

/**
 * Descripción para el buscador y para las tarjetas de OG. Se arma con el dato
 * técnico, nunca con texto de marca: si el CMS no lo trae, no aparece.
 */
export function descripcionDeFicha(producto: Producto): string {
  const filas = filasDeFicha(producto)
  return `${nombreLargo(producto)}. ${filas.map((f) => `${f.k}: ${f.v}`).join('. ')}.`
}
