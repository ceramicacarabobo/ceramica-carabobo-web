import {sanityClient} from 'sanity:client'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID

/**
 * Con `placeholder` (proyecto de Sanity aún no creado) el sitio compila
 * igual: el adaptador devuelve contenido vacío y las secciones bajo su
 * mínimo se ocultan solas.
 */
export const sanityConfigurado = Boolean(projectId) && projectId !== 'placeholder'

export const visualEditingHabilitado = import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === 'true'

const token = import.meta.env.SANITY_API_READ_TOKEN

/** En preview se leen borradores; en producción, solo lo publicado. */
const cliente =
  visualEditingHabilitado && token
    ? sanityClient.withConfig({token, perspective: 'drafts', useCdn: false, stega: {enabled: true, studioUrl: import.meta.env.PUBLIC_SANITY_STUDIO_URL || '/admin'}})
    : sanityClient

let avisoEmitido = false

export async function consultar<T>(query: string, params: Record<string, unknown> = {}, vacio: T): Promise<T> {
  if (!sanityConfigurado) {
    if (!avisoEmitido) {
      avisoEmitido = true
      console.warn('[ceramica] Sin proyecto de Sanity configurado: se sirve contenido vacío. Ver docs/fase-1-esqueleto.md')
    }
    return vacio
  }
  const resultado = await cliente.fetch<T>(query, params)
  return (resultado ?? vacio) as T
}
