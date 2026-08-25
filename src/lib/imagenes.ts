import {createImageUrlBuilder} from '@sanity/image-url'
import type {Imagen} from './data/types'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production'

const builder = createImageUrlBuilder({projectId, dataset})

/**
 * URL de origen de una imagen del CMS. Solo se usa en build (astro:assets la
 * descarga y la reprocesa) o en el preview: en el HTML de producción nunca
 * aparece `cdn.sanity.io`.
 */
export function urlOrigen(imagen: Imagen, ancho = 2400): string {
  return builder.image(imagen.ref).width(ancho).auto('format').url()
}

/** Punto focal → `object-position`. Sin hotspot, el centro. */
export function posicionFocal(imagen?: Imagen): string {
  if (!imagen?.focal) return '50% 50%'
  return `${Math.round(imagen.focal.x * 100)}% ${Math.round(imagen.focal.y * 100)}%`
}

/** Dimensiones declaradas en la referencia del asset (…-2400x1600-jpg). */
export function dimensiones(imagen: Imagen): {ancho: number; alto: number} | null {
  const m = /-(\d+)x(\d+)-[a-z]+$/.exec(imagen.ref)
  if (!m) return null
  return {ancho: Number(m[1]), alto: Number(m[2])}
}
