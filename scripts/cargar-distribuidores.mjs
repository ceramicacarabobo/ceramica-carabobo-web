#!/usr/bin/env node
/**
 * Carga al CMS la red de distribuidores ubicada en
 * `scripts/datos/distribuidores-ubicados.json`.
 *
 *   node scripts/cargar-distribuidores.mjs --ensayo   # no escribe: dice qué haría
 *   node scripts/cargar-distribuidores.mjs            # escribe de verdad
 *
 * ── Qué hace, en orden ─────────────────────────────────────────────────────
 * 1. BORRA los distribuidores de ejemplo (`esEjemplo: true`): son los 24 del
 *    handoff, con teléfonos correlativos y correos `@placeholder.com`. Dejarlos
 *    mezclados con los reales sería peor que no tener ninguno.
 * 2. CREA los comercios con datos, publicados.
 * 3. CREA como BORRADOR los que solo tienen nombre. Un borrador de Sanity se ve
 *    en el Studio —con el aviso de qué le falta— y no sale al sitio hasta que
 *    alguien lo complete. Es la forma honesta de no perderlos: sin estado no
 *    se alcanzan con el filtro del localizador, así que publicarlos los
 *    volvería invisibles de todos modos, pero con la apariencia de estar bien.
 *
 * El `_id` se deriva del slug del sitio viejo, así que volver a correr esto
 * actualiza en vez de duplicar.
 *
 * ── Lo que se deja vacío a propósito ───────────────────────────────────────
 * WhatsApp, correo y horario no existen en el sitio viejo. No se inventan: la
 * regla de contenido del handoff dice que la fila sin dato se oculta, así que
 * un campo vacío se ve bien. Un dato falso, no.
 */
import {readFileSync} from 'node:fs'

const ENTRADA = 'scripts/datos/distribuidores-ubicados.json'
const ENSAYO = process.argv.includes('--ensayo')

// --- Entorno ---------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]
    }),
)
const PROYECTO = env.PUBLIC_SANITY_PROJECT_ID
const DATASET = env.PUBLIC_SANITY_DATASET || 'production'
const TOKEN = env.SANITY_API_WRITE_TOKEN
if (!PROYECTO || !TOKEN) throw new Error('Faltan PUBLIC_SANITY_PROJECT_ID o SANITY_API_WRITE_TOKEN en .env')

const API = `https://${PROYECTO}.api.sanity.io/v2023-05-03/data`

async function consultar(groq) {
  const r = await fetch(`${API}/query/${DATASET}?query=${encodeURIComponent(groq)}`, {
    headers: {Authorization: `Bearer ${TOKEN}`},
  })
  if (!r.ok) throw new Error(`consulta: HTTP ${r.status}`)
  return (await r.json()).result
}

async function mutar(mutations) {
  const r = await fetch(`${API}/mutate/${DATASET}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`},
    body: JSON.stringify({mutations}),
  })
  const cuerpo = await r.json()
  if (!r.ok) throw new Error(`mutación: HTTP ${r.status} — ${JSON.stringify(cuerpo).slice(0, 300)}`)
  return cuerpo
}

// --- Normalización ---------------------------------------------------------
/** Lista cerrada del schema (`sanity/lib/listas.ts`). */
const ESTADOS = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes',
  'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida',
  'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
  'Yaracuy', 'Zulia',
]
const sinTildes = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()
const ESTADO_POR_CLAVE = new Map(ESTADOS.map((e) => [sinTildes(e), e]))
// Alias del sitio viejo. `Vargas` y `Distrito Federal` ya estaban previstos en
// el schema; `CARACAS` y `BOLIVIA` salieron del dato real — la segunda es un
// error de tipeo: sus tres comercios están en Ciudad Guayana, que es Bolívar.
for (const [alias, real] of [
  ['VARGAS', 'La Guaira'],
  ['DISTRITO FEDERAL', 'Distrito Capital'],
  ['CARACAS', 'Distrito Capital'],
  ['BOLIVIA', 'Bolívar'],
]) {
  ESTADO_POR_CLAVE.set(alias, real)
}

/**
 * El sitio viejo guarda dos ranuras de teléfono y escribe la barra aunque la
 * segunda esté vacía: 95 fichas traen "0412-8754885 /". Se parte por la barra,
 * se tira lo vacío y se vuelve a unir.
 */
function telefonoLimpio(bruto = '') {
  const partes = bruto
    .split('/')
    .map((t) => t.trim())
    .filter((t) => /\d/.test(t))
  return partes.join(' / ')
}

/** "C A" y "C.A" sueltos al final de un nombre son la sigla societaria. */
const normalizarSigla = (nombre) => nombre.replace(/[,\s]+C\.?\s*A\.?\s*$/i, ', C.A.')

const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a', 'al'])
/** Siglas societarias y de vía que no deben quedar en Mayúscula Inicial. */
const TAL_CUAL = new Map([
  ['CA', 'C.A.'], ['C.A', 'C.A.'], ['C.A.', 'C.A.'],
  ['SA', 'S.A.'], ['S.A', 'S.A.'], ['S.A.', 'S.A.'],
  ['SRL', 'S.R.L.'], ['S.R.L', 'S.R.L.'], ['S.R.L.', 'S.R.L.'],
  ['RL', 'R.L.'], ['SC', 'S.C.'],
])

/** "MIGO TEJERIAS, C.A." → "Migo Tejerias, C.A." */
function titulo(texto = '') {
  return texto
    .trim()
    .split(/(\s+)/)
    .map((trozo) => {
      if (/^\s+$/.test(trozo)) return trozo
      const [, izq = '', nucleo = '', der = ''] = trozo.match(/^([("']*)(.*?)([),.;:"']*)$/s) || []
      const clave = nucleo.toUpperCase()
      if (TAL_CUAL.has(clave)) return izq + TAL_CUAL.get(clave) + (der === '.' ? '' : der)
      if (TAL_CUAL.has(clave + der)) return izq + TAL_CUAL.get(clave + der)
      if (/^\d/.test(nucleo)) return trozo
      const bajo = nucleo.toLowerCase()
      if (MINUSCULAS.has(bajo)) return izq + bajo + der
      return izq + bajo.charAt(0).toUpperCase() + bajo.slice(1) + der
    })
    .join('')
    .replace(/^./, (c) => c.toUpperCase())
}

// --- Preparar --------------------------------------------------------------
const datos = JSON.parse(readFileSync(ENTRADA, 'utf8'))
const conDatos = datos.distribuidores.filter((d) => d.origen === 'post')
const soloNombre = datos.distribuidores.filter((d) => d.origen !== 'post')

const sinEstado = []
const documentos = []

for (const d of conDatos) {
  const estado = ESTADO_POR_CLAVE.get(sinTildes(d.estado || ''))
  if (!estado) {
    sinEstado.push(d)
    continue
  }
  const doc = {
    _id: `distribuidor-${d.slug}`,
    _type: 'distribuidor',
    nombre: normalizarSigla(titulo(d.nombre)),
    estado,
    ciudad: titulo(d.ciudad) || estado,
    direccion: d.direccion,
    esEjemplo: false,
  }
  const telefono = telefonoLimpio(d.telefono || '')
  if (telefono) doc.telefono = telefono
  if (d.ubicacion) doc.ubicacion = {_type: 'geopoint', lat: d.ubicacion.lat, lng: d.ubicacion.lng}
  documentos.push(doc)
}

// Los que solo tienen nombre van como BORRADOR: visibles en el Studio, fuera
// del sitio. No se les inventa estado ni ciudad, que es justo lo que falta.
const borradores = soloNombre.map((d) => ({
  _id: `drafts.distribuidor-${d.slug}`,
  _type: 'distribuidor',
  nombre: normalizarSigla(titulo(d.nombre)),
  esEjemplo: false,
}))

const conCoordenada = documentos.filter((d) => d.ubicacion).length
console.log(`A cargar: ${documentos.length} publicados (${conCoordenada} con coordenada) · ${borradores.length} borradores`)
if (sinEstado.length) console.log(`  ${sinEstado.length} descartados por estado no reconocido: ${sinEstado.map((d) => d.estado).join(', ')}`)

const ejemplos = await consultar('*[_type=="distribuidor" && esEjemplo==true]{_id,nombre}')
console.log(`Ejemplos a borrar: ${ejemplos.length}`)

if (ENSAYO) {
  console.log('\n--ensayo: no se escribió nada. Muestra de lo que se crearía:\n')
  for (const d of documentos.slice(0, 5)) {
    console.log(`  ${d.nombre}`)
    console.log(`    ${d.ciudad}, ${d.estado} · ${d.telefono || '(sin teléfono)'} · ${d.ubicacion ? `${d.ubicacion.lat.toFixed(5)}, ${d.ubicacion.lng.toFixed(5)}` : '(sin coordenada)'}`)
    console.log(`    ${d.direccion.slice(0, 78)}`)
  }
  console.log(`\n  borradores: ${borradores.slice(0, 4).map((b) => b.nombre).join(' · ')}`)
  process.exit(0)
}

// --- Escribir --------------------------------------------------------------
// En tandas: una mutación con 250 documentos puede pasarse del límite de la API.
const TANDA = 40
const enTandas = (xs) => Array.from({length: Math.ceil(xs.length / TANDA)}, (_, i) => xs.slice(i * TANDA, i * TANDA + TANDA))

if (ejemplos.length) {
  await mutar(ejemplos.map((e) => ({delete: {id: e._id}})))
  console.log(`  borrados ${ejemplos.length} de ejemplo`)
}

let hechos = 0
for (const tanda of enTandas(documentos)) {
  await mutar(tanda.map((doc) => ({createOrReplace: doc})))
  hechos += tanda.length
  console.log(`  publicados ${hechos}/${documentos.length}`)
}

for (const tanda of enTandas(borradores)) {
  await mutar(tanda.map((doc) => ({createOrReplace: doc})))
}
console.log(`  borradores ${borradores.length}/${borradores.length}`)

const total = await consultar('{"publicados":count(*[_type=="distribuidor" && !(_id in path("drafts.**"))]),"borradores":count(*[_type=="distribuidor" && _id in path("drafts.**")]),"ejemplos":count(*[_type=="distribuidor" && esEjemplo==true])}')
console.log('')
console.log(`  en el CMS: ${total.publicados} publicados · ${total.borradores} borradores · ${total.ejemplos} de ejemplo`)
