import type {APIRoute} from 'astro'

/**
 * robots.txt. Mientras el sitio no sea el despliegue de producción, se bloquea
 * entero: QA y preview muestran contenido de ejemplo que no debe indexarse.
 */
export const GET: APIRoute = ({site}) => {
  const esProduccion = import.meta.env.PUBLIC_ENTORNO === 'produccion'

  const cuerpo = esProduccion
    ? ['User-agent: *', 'Allow: /', 'Disallow: /admin', site ? `Sitemap: ${new URL('sitemap.xml', site).href}` : '']
        .filter(Boolean)
        .join('\n')
    : ['User-agent: *', 'Disallow: /'].join('\n')

  return new Response(`${cuerpo}\n`, {headers: {'Content-Type': 'text/plain; charset=utf-8'}})
}
