#!/usr/bin/env node
/**
 * Escribe `public/_redirects`: las 301 desde las direcciones del WordPress que
 * sustituimos hacia sus equivalentes en el sitio nuevo.
 *
 *   node scripts/generar-redirects.mjs [--informe]
 *
 * ── Por qué importan ───────────────────────────────────────────────────────
 * El dominio NO cambia: producción queda en https://ceramica-carabobo.com, el
 * mismo de hoy (plan maestro §7). El día que los DNS apunten a Cloudflare,
 * cada dirección que Google tiene indexada desde hace años deja de existir. Un
 * 301 le dice "esto se mudó para siempre" y le pasa a la nueva el prestigio
 * que la vieja acumuló. Sin eso, el buscador las saca de sus resultados y el
 * tráfico cae — a las semanas, cuando ya es caro arreglarlo.
 *
 * Como el dominio es el mismo, cada regla es ruta → ruta: el caso más simple.
 *
 * ── De dónde sale el inventario ────────────────────────────────────────────
 * `scripts/datos/urls-wp.json`, sacado del sitemap del sitio viejo. Son 577
 * direcciones, y el reparto no es el que uno esperaría de un WordPress: no hay
 * blog. El sitio usa el tipo `post` para los PUNTOS DE VENTA y las taxonomías
 * del blog para ubicarlos — `category` es el estado y `post_tag` la ciudad.
 *
 * ── A dónde va cada una ────────────────────────────────────────────────────
 *   /producto/<slug>/      → /catalogo/<slug> si ese diseño sigue existiendo.
 *                            64 coinciden exactas. 6 son duplicados de
 *                            WordPress (`-2`) y van al original. 15 eran
 *                            genéricas donde ahora hay una ficha por formato
 *                            (`/producto/kos/` → tenemos kos-60x60 y
 *                            kos-60x120): van a la primera. Las 36 que ya no
 *                            están en el catálogo van a /catalogo.
 *   /project/<slug>/       → el localizador, en el estado de ese comercio si
 *   /<slug-de-comercio>/     lo sabemos: /donde-comprar#estado=<estado>. Son
 *                            las 344 fichas de distribuidor del sitio viejo.
 *   /category/<estado>/    → /donde-comprar#estado=<estado>. Encajan exactas
 *                            con el contrato del localizador.
 *   /tag/<ciudad>/         → /donde-comprar. No filtramos por ciudad.
 *   /categoria-producto/x/ → /catalogo con el filtro que corresponda: `mate` y
 *                            `brillante` son brillo; `liso`, `rustico` y
 *                            `estructurado` son textura. `rectificado` no
 *                            existe en nuestro modelo y va al catálogo.
 *   las páginas            → su equivalente directo.
 *
 * NADA va a la portada en masa. Un 301 masivo a la home Google lo trata como
 * un 404 blando y tira a la basura justo lo que se quería conservar. Lo que no
 * tiene destino exacto va a la SECCIÓN más cercana, que sí es una respuesta.
 */
import {readFileSync, writeFileSync, readdirSync, existsSync} from 'node:fs'

const INVENTARIO = 'scripts/datos/urls-wp.json'
const DISTRIBUIDORES = 'scripts/datos/distribuidores-ubicados.json'
const SALIDA = 'public/_redirects'
const INFORME = process.argv.includes('--informe')

const inv = JSON.parse(readFileSync(INVENTARIO, 'utf8'))
const dist = JSON.parse(readFileSync(DISTRIBUIDORES, 'utf8'))

/** La clave de estado del localizador: minúsculas, sin tildes, con guiones. */
const clave = (s = '') =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const ALIAS_ESTADO = {vargas: 'la-guaira', caracas: 'distrito-capital', bolivia: 'bolivar', 'distrito-federal': 'distrito-capital'}
const estadoClave = (e) => ALIAS_ESTADO[clave(e)] || clave(e)

// --- Los diseños que existen hoy -------------------------------------------
const slugsNuevos = existsSync('dist/client/catalogo')
  ? new Set(readdirSync('dist/client/catalogo').filter((n) => !n.endsWith('.html')))
  : new Set()
if (!slugsNuevos.size) {
  console.error('No hay dist/client/catalogo: corré `npm run build` antes, que de ahí salen los slugs reales.')
  process.exit(1)
}

// --- El estado de cada comercio, por su slug del sitio viejo ---------------
const estadoPorSlug = new Map()
for (const d of dist.distribuidores) {
  if (d.slug && d.estado && d.estado !== 'Sin categoría') estadoPorSlug.set(d.slug, estadoClave(d.estado))
}

// --- Reglas ----------------------------------------------------------------
const reglas = []
const notas = {exacto: 0, duplicado: 0, porFormato: 0, aCatalogo: 0, comercioConEstado: 0, comercioSinEstado: 0}
const agregar = (de, a) => reglas.push({de, a})

// Páginas. `/contacto/` y `/` ya existen con la misma ruta: no se redirigen.
const PAGINAS = {
  '/productos/': '/catalogo',
  '/encuentranos/': '/donde-comprar',
  '/nosotros/': '/',
}
for (const url of inv.sitemaps['posts-page'] || []) {
  const destino = PAGINAS[url]
  if (destino) agregar(url, destino)
}

// Productos.
const sinSufijo = (s) => s.replace(/-\d+$/, '')
for (const url of inv.sitemaps['posts-product'] || []) {
  const slug = url.replace(/^\/producto\//, '').replace(/\/$/, '')
  if (!slug || url === '/shop/') continue
  if (slugsNuevos.has(slug)) {
    agregar(url, `/catalogo/${slug}`)
    notas.exacto++
  } else if (slugsNuevos.has(sinSufijo(slug))) {
    agregar(url, `/catalogo/${sinSufijo(slug)}`)
    notas.duplicado++
  } else {
    // El viejo era genérico y ahora hay una ficha por formato: se manda a la
    // primera en orden, que es la de menor formato.
    const porFormato = [...slugsNuevos].filter((n) => n.startsWith(slug + '-')).sort()
    if (porFormato.length) {
      agregar(url, `/catalogo/${porFormato[0]}`)
      notas.porFormato++
    } else {
      agregar(url, '/catalogo')
      notas.aCatalogo++
    }
  }
}

// Fichas de distribuidor: las de `project/` y las que cuelgan de la raíz.
const paginasReservadas = new Set(Object.keys(PAGINAS).concat(['/', '/contacto/']))
const fichasComercio = [
  ...(inv.sitemaps['posts-project'] || []).map((u) => [u, u.replace(/^\/project\//, '').replace(/\/$/, '')]),
  ...(inv.sitemaps['posts-post'] || []).filter((u) => !paginasReservadas.has(u)).map((u) => [u, u.replace(/^\//, '').replace(/\/$/, '')]),
]
for (const [url, slug] of fichasComercio) {
  const estado = estadoPorSlug.get(slug)
  if (estado) {
    agregar(url, `/donde-comprar#estado=${estado}`)
    notas.comercioConEstado++
  } else {
    agregar(url, '/donde-comprar')
    notas.comercioSinEstado++
  }
}

// Estados y ciudades.
for (const url of inv.sitemaps['taxonomies-category'] || []) {
  const slug = url.replace(/^\/category\//, '').replace(/\/$/, '')
  if (slug === 'sin-categoria') {
    agregar(url, '/donde-comprar')
    continue
  }
  agregar(url, `/donde-comprar#estado=${ALIAS_ESTADO[slug] || slug}`)
}
for (const url of inv.sitemaps['taxonomies-post_tag'] || []) agregar(url, '/donde-comprar')

// Acabados del catálogo viejo → el filtro que les corresponde.
const ACABADOS = {
  mate: '#brillo=Mate',
  brillante: '#brillo=Brillante',
  liso: '#textura=Liso',
  rustico: '#textura=R%C3%BAstico',
  estructurado: '#textura=Estructurado',
}
for (const url of inv.sitemaps['taxonomies-product_cat'] || []) {
  const slug = url.replace(/^\/categoria-producto\//, '').replace(/\/$/, '')
  agregar(url, `/catalogo${ACABADOS[slug] || ''}`)
}

// Páginas de autor: no tienen equivalente y no aportan nada al visitante.
for (const url of inv.sitemaps['users'] || []) agregar(url, '/')

// --- Escribir ---------------------------------------------------------------
reglas.sort((a, b) => a.de.localeCompare(b.de))
const ancho = Math.min(60, Math.max(...reglas.map((r) => r.de.length)) + 2)
const cabecera = `# GENERADO por scripts/generar-redirects.mjs — no editar a mano.
#
# 301 desde el WordPress que sustituimos. El dominio no cambia
# (https://ceramica-carabobo.com), así que cada regla es ruta → ruta.
#
# Sin esto, el día del cambio de DNS las ${inv.total} direcciones que Google tiene
# indexadas devuelven 404 y se pierde el posicionamiento acumulado.
#
# ${reglas.length} reglas. Ninguna manda a la portada en masa: lo que no tiene destino
# exacto va a la sección más cercana, que sí es una respuesta.
`
const cuerpo = reglas.map((r) => `${r.de.padEnd(ancho)}${r.a}  301`).join('\n')
if (!INFORME) writeFileSync(SALIDA, `${cabecera}\n${cuerpo}\n`)

console.log(`${reglas.length} reglas${INFORME ? ' (informe: no se escribió)' : ` → ${SALIDA}`}`)
console.log('')
console.log('  productos:')
console.log(`    ${notas.exacto} a su ficha, con el mismo slug`)
console.log(`    ${notas.duplicado} duplicados de WordPress, al original`)
console.log(`    ${notas.porFormato} genéricos, a la ficha del primer formato`)
console.log(`    ${notas.aCatalogo} descontinuados, al catálogo`)
console.log('  distribuidores:')
console.log(`    ${notas.comercioConEstado} al localizador en su estado`)
console.log(`    ${notas.comercioSinEstado} al localizador sin estado (no lo sabemos)`)
console.log(`  ${(inv.sitemaps['taxonomies-category'] || []).length} estados · ${(inv.sitemaps['taxonomies-post_tag'] || []).length} ciudades · ${(inv.sitemaps['taxonomies-product_cat'] || []).length} acabados · ${(inv.sitemaps['users'] || []).length} autores`)
console.log('')
console.log(`  ${inv.total} direcciones en el sitemap · ${inv.total - reglas.length} sin regla (las que ya tienen la misma ruta: / y /contacto/)`)
