import type {APIRoute} from 'astro'
import {getProductos} from '~/lib/data'

/**
 * sitemap.xml — el índice de direcciones para los buscadores.
 *
 * Existe sobre todo por el catálogo: 126 de las 130 direcciones son fichas de
 * producto, y a una ficha casi no le apunta ningún enlace interno (se llega por
 * la grilla, que es una sola página). Sin este archivo, un buscador tarda meses
 * en descubrirlas o no las descubre.
 *
 * Se genera desde `site` (la variable `SITE_URL`), así que hasta el día del
 * lanzamiento sale con la dirección del QA — que además está bloqueado por
 * `robots.txt`. Cambiar `SITE_URL` es lo único que hace falta.
 *
 * NO lleva `lastmod`, `changefreq` ni `priority`:
 *  - `changefreq` y `priority` los ignora Google desde hace años.
 *  - `lastmod` solo sirve si es verdad. Como el sitio se construye entero de una
 *    vez, poner la fecha del build en las 130 direcciones diría que todas
 *    cambiaron a la vez, que es falso y hace que se ignore el campo. Si algún
 *    día se quiere de verdad, el dato es `_updatedAt` de cada documento de
 *    Sanity y hay que subirlo por el adaptador.
 *
 * Fuera del índice: `/admin` (privado, y `robots.txt` lo excluye) y la 404.
 */
export const GET: APIRoute = async ({site}) => {
  if (!site) {
    return new Response('Falta `site` en la configuración de Astro (SITE_URL).', {status: 500})
  }

  const productos = await getProductos()

  const rutas = [
    '/',
    '/catalogo',
    '/contacto',
    '/donde-comprar',
    ...productos.filter((producto) => producto.slug).map((producto) => `/catalogo/${producto.slug}`),
  ]

  const direcciones = rutas
    .map((ruta) => `  <url><loc>${new URL(ruta, site).href}</loc></url>`)
    .join('\n')

  const cuerpo = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${direcciones}
</urlset>
`

  return new Response(cuerpo, {headers: {'Content-Type': 'application/xml; charset=utf-8'}})
}
