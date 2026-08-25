/**
 * Procesado de las fotos del catálogo (tarjeta de grilla y ficha).
 *
 * Existe por una razón de build, no de estilo: `astro:assets` cachea por
 * (URL de origen, ancho, formato, calidad). La tarjeta y la ficha muestran la
 * MISMA foto en tamaños distintos, así que si cada una pidiera su propia URL de
 * origen el build bajaría el archivo dos veces y generaría dos juegos completos
 * de variantes. Pidiendo las dos la misma fuente (`FUENTE`), las variantes que
 * comparten (400 y 800) se generan una sola vez.
 *
 * `FUENTE` es 1200 porque ese es el ancho más grande que la ficha llega a
 * mostrar: pantalla completa en un teléfono de 390px con densidad 3×. Pedirle
 * más a Sanity no gana nitidez y sí agranda el build (`urlOrigen` además recorta
 * al ancho real del archivo, que en el catálogo casi siempre es menor).
 */
import {getImage} from 'astro:assets'
import type {GetImageResult} from 'astro'
import type {Imagen} from '~/lib/data'
import {dimensiones, urlOrigen} from '~/lib/imagenes'

export const FUENTE = 1200

/** Anchos del `<picture>` de la ficha. */
export const ANCHOS_FICHA = [400, 800, 1200]

export const SIZES_FICHA = '(min-width: 760px) 400px, 100vw'

/**
 * Las miniaturas de la galería NO tienen juego propio: reusan el de la foto
 * grande y solo cambian el `sizes`, así que el navegador elige el candidato más
 * chico. Con ancho propio serían 216 imágenes más en el build para un cuadro de
 * 100px, y encima el archivo que descargarían sería distinto del que ya bajó la
 * foto grande. Así no se genera ni se transfiere un byte extra.
 */
export const SIZES_MINIATURA = '100px'

export interface JuegoDeFoto {
  avif: GetImageResult
  webp: GetImageResult
  jpg: GetImageResult
}

/**
 * Las tres versiones de una foto. Mismas calidades que la primitiva
 * `base/Imagen.astro` (AVIF 60 · WebP 78 · JPG 52 de respaldo), calibradas
 * contra el tope de 400 KB de `Requisitos tecnicos v0`.
 */
export async function juegoDeFoto(imagen: Imagen, anchos: number[], sizes: string): Promise<JuegoDeFoto> {
  const dims = dimensiones(imagen)
  const real = Math.min(FUENTE, dims?.ancho ?? FUENTE)
  // **Nunca se pide un ancho mayor que el archivo.** `astro:assets` agranda sin
  // chistar si se lo piden, y agrandar no agrega un pixel de nitidez: solo pesa
  // más y alarga el build. En este catálogo importa — de los 72 archivos, 38
  // miden menos de 800px de ancho.
  const utiles = anchos.filter((w) => w <= real)
  const finales = utiles.length > 0 ? utiles : [real]
  // El ancho base coincide con el candidato más grande para que el respaldo sin
  // `srcset` sea ese mismo archivo y no uno más.
  const ancho = Math.max(...finales)
  const alto = dims ? Math.round((ancho * dims.alto) / dims.ancho) : Math.round(ancho * 0.75)
  const base = {src: urlOrigen(imagen, FUENTE), width: ancho, height: alto, widths: finales, sizes}
  const [avif, webp, jpg] = await Promise.all([
    getImage({...base, format: 'avif', quality: 60}),
    getImage({...base, format: 'webp', quality: 78}),
    getImage({...base, format: 'jpg', quality: 52}),
  ])
  return {avif, webp, jpg}
}

/** `srcset` con candidato único si el archivo es más chico que el ancho pedido. */
export const srcset = (r: GetImageResult): string =>
  r.srcSet.values.length > 0 ? r.srcSet.attribute : r.src
