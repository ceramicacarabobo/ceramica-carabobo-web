#!/usr/bin/env node
/**
 * Extrae la red de distribuidores del WordPress que estamos sustituyendo
 * (https://ceramica-carabobo.com) y la deja en JSON, lista para revisar antes
 * de cargarla al CMS con `scripts/cargar-distribuidores.mjs`.
 *
 *   node scripts/extraer-distribuidores.mjs [--salida ruta.json] [--limite N]
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 * El CMS tiene hoy 24 distribuidores: los de ejemplo del handoff, con
 * teléfonos correlativos y correos `@placeholder.com`. La red real del cliente
 * son ~247 puntos, y el dato está publicado en su propio sitio.
 *
 * ── Dónde vive cada cosa en el sitio viejo ─────────────────────────────────
 * El WordPress no usa un tipo propio para los puntos de venta: usa `post`, el
 * de las entradas, y las taxonomías del blog para ubicarlos.
 *
 *   - `post`      → el distribuidor. El título es el nombre y el CUERPO es la
 *                   dirección, sin más campos.
 *   - `category`  → el ESTADO (`category/zulia/`, `category/carabobo/`…).
 *   - `post_tag`  → la CIUDAD (`tag/valencia/`, `tag/barquisimeto/`…).
 *   - `project`   → un segundo listado, incompleto, de los mismos comercios:
 *                   solo nombre y estado, sin dirección. 97 de sus 118 fichas
 *                   repiten un `post`. Se usa únicamente para los 21 nombres
 *                   que no están en `post`, y quedan marcados `parcial: true`.
 *
 * El teléfono NO viaja por la API: lo pinta un widget de Elementor detrás del
 * encabezado "Teléfono". Por eso, además de la API, se pide cada página y se
 * lee de ahí. Es la única razón por la que este script baja HTML.
 *
 * ── Trato con el servidor ajeno ────────────────────────────────────────────
 * Es el sitio en producción del cliente: se piden como mucho TANDA páginas a
 * la vez con una pausa entre tandas, y se reintenta una sola vez. No hay prisa
 * — esto se corre una vez.
 */
import {writeFileSync} from 'node:fs'

const SITIO = 'https://ceramica-carabobo.com'
const API = `${SITIO}/wp-json/wp/v2`
const TANDA = 3
const PAUSA = 400
const args = process.argv.slice(2)
const opcion = (n, def) => {
  const i = args.indexOf(n)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const SALIDA = opcion('--salida', 'scripts/datos/distribuidores-wp.json')
const LIMITE = Number(opcion('--limite', '0')) || Infinity

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function pedir(url, {texto = false, intento = 1} = {}) {
  try {
    const r = await fetch(url, {headers: {'User-Agent': 'ceramica-carabobo-migracion/1.0'}})
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return texto ? await r.text() : await r.json()
  } catch (error) {
    if (intento < 2) {
      await dormir(1500)
      return pedir(url, {texto, intento: intento + 1})
    }
    throw error
  }
}

/** Trae una colección paginada completa (`per_page` tope de WordPress: 100). */
async function todo(base) {
  const salida = []
  for (let pagina = 1; ; pagina++) {
    const lote = await pedir(`${base}${base.includes('?') ? '&' : '?'}per_page=100&page=${pagina}`)
    if (!Array.isArray(lote) || lote.length === 0) break
    salida.push(...lote)
    if (lote.length < 100) break
    await dormir(PAUSA)
  }
  return salida
}

/** El texto de un campo `{rendered}`, sin etiquetas ni entidades. */
const limpio = (html = '') =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&#039;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/**
 * La ubicación que el cliente eligió en Google Maps. El tema incrusta un
 * `maps/embed/v1/place` cuyo parámetro `q` es lo que alguien escribió al
 * armar la ficha, y no es homogéneo: unas veces es un Plus Code con su
 * localidad (`M96F+29V, Puerto Ayacucho 7101, Amazonas`), otras una dirección
 * de calle, otras solo la ciudad. Se guarda crudo: clasificarlo y convertirlo
 * en coordenadas es trabajo aparte, y mezclar las dos cosas escondería de qué
 * calidad es cada punto.
 */
function mapaDe(html) {
  // Ojo con el separador: el tema escribe `&#038;` en vez de `&`, así que el
  // carácter que precede a `q=` es un `;`. Exigir `?` o `&` ahí no encuentra
  // nada. El valor termina en el siguiente `&` —o en el `&` de la entidad—.
  const m = html.match(/maps\/embed\/v1\/place\?[^"']*?q=([^"'&#]+)/)
  if (!m) return ''
  try {
    return decodeURIComponent(m[1]).trim()
  } catch (e) {
    return m[1]
  }
}

/**
 * El teléfono, del HTML de la ficha. El tema lo pinta como un encabezado
 * "Teléfono" seguido del widget de texto que lo contiene, así que se busca ese
 * par en vez de un número suelto — en la página hay otros (el del pie, por
 * ejemplo) que no son del comercio.
 */
function telefonoDe(html) {
  const i = html.search(/>\s*Tel[ée]fonos?\s*<\/(?:h\d|p|span|div)>/i)
  if (i < 0) return ''
  const despues = html.slice(i, i + 2000)
  const widget = despues.match(/widget_type="text-editor[^"]*"[\s\S]{0,400}?elementor-widget-container">([\s\S]{0,300}?)<\/div>/i)
  const crudo = widget ? limpio(widget[1]) : ''
  // Solo se acepta si parece un teléfono venezolano: evita quedarse con una
  // dirección o un texto cualquiera si el tema cambia de forma.
  return /\d{3,4}[-\s.]?\d{3}[-\s.]?\d{2,4}/.test(crudo) ? crudo : ''
}

console.log(`Leyendo ${SITIO} …`)

const [categorias, etiquetas] = await Promise.all([todo(`${API}/categories`), todo(`${API}/tags`)])
const estadoDe = new Map(categorias.map((c) => [c.id, limpio(c.name)]))
const ciudadDe = new Map(etiquetas.map((t) => [t.id, limpio(t.name)]))
console.log(`  ${estadoDe.size} estados (categorías) · ${ciudadDe.size} ciudades (etiquetas)`)

const entradas = await todo(`${API}/posts`)
const proyectos = await todo(`${API}/project`)
console.log(`  ${entradas.length} fichas en 'post' · ${proyectos.length} en 'project'`)

const porSlug = new Map()

for (const p of entradas) {
  porSlug.set(p.slug, {
    slug: p.slug,
    nombre: limpio(p.title?.rendered),
    direccion: limpio(p.content?.rendered),
    estado: (p.categories || []).map((id) => estadoDe.get(id)).filter(Boolean)[0] || '',
    ciudad: (p.tags || []).map((id) => ciudadDe.get(id)).filter(Boolean)[0] || '',
    telefono: '',
    mapa: '',
    url: p.link,
    origen: 'post',
    parcial: false,
  })
}

// `project` solo aporta los nombres que no están en `post`, y sin dirección.
let soloProyecto = 0
for (const p of proyectos) {
  if (porSlug.has(p.slug)) continue
  soloProyecto++
  porSlug.set(p.slug, {
    slug: p.slug,
    nombre: limpio(p.title?.rendered),
    direccion: '',
    estado: (p.categories || []).map((id) => estadoDe.get(id)).filter(Boolean)[0] || '',
    ciudad: '',
    telefono: '',
    url: p.link,
    origen: 'project',
    parcial: true,
  })
}
console.log(`  ${porSlug.size} comercios distintos (${soloProyecto} solo en 'project', sin dirección)`)

// El teléfono, ficha por ficha. Es lo único que obliga a bajar HTML.
const lista = [...porSlug.values()].slice(0, LIMITE)
console.log(`Pidiendo el teléfono de ${lista.length} fichas, de ${TANDA} en ${TANDA} …`)

let hechas = 0
for (let i = 0; i < lista.length; i += TANDA) {
  const tanda = lista.slice(i, i + TANDA)
  await Promise.all(
    tanda.map(async (d) => {
      try {
        const html = await pedir(d.url, {texto: true})
        d.telefono = telefonoDe(html)
        d.mapa = mapaDe(html)
      } catch (error) {
        d.error = String(error.message || error)
      }
    }),
  )
  hechas += tanda.length
  if (hechas % 30 < TANDA || hechas === lista.length) console.log(`  ${hechas}/${lista.length}`)
  await dormir(PAUSA)
}

lista.sort((a, b) => (a.estado + a.ciudad + a.nombre).localeCompare(b.estado + b.ciudad + b.nombre, 'es'))

const cuenta = (f) => lista.filter(f).length
const resumen = {
  total: lista.length,
  conDireccion: cuenta((d) => d.direccion),
  conTelefono: cuenta((d) => d.telefono),
  conEstado: cuenta((d) => d.estado),
  conCiudad: cuenta((d) => d.ciudad),
  conMapa: cuenta((d) => d.mapa),
  conPlusCode: cuenta((d) => /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i.test(d.mapa || '')),
  parciales: cuenta((d) => d.parcial),
  conError: cuenta((d) => d.error),
}

writeFileSync(SALIDA, JSON.stringify({fuente: SITIO, extraido: new Date().toISOString(), resumen, distribuidores: lista}, null, 2))

console.log('')
console.log(`  ${resumen.total} distribuidores → ${SALIDA}`)
console.log(`  con dirección ${resumen.conDireccion} · con teléfono ${resumen.conTelefono} · con estado ${resumen.conEstado} · con ciudad ${resumen.conCiudad}`)
console.log(`  con ubicación de Maps ${resumen.conMapa}, de las cuales ${resumen.conPlusCode} traen Plus Code`)
if (resumen.parciales) console.log(`  ${resumen.parciales} parciales (solo nombre y estado, de 'project')`)
if (resumen.conError) console.log(`  ${resumen.conError} con error al pedir la ficha`)
