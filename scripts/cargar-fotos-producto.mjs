#!/usr/bin/env node
/**
 * Carga al CMS las fotos definitivas del cliente y limpia las de ejemplo.
 *
 *   node scripts/cargar-fotos-producto.mjs --ensayo   # no escribe: dice qué haría
 *   node scripts/cargar-fotos-producto.mjs            # escribe de verdad
 *
 * Fuente: `/root/fotos-cliente/inventario.json`, que produce el inventario de
 * los ZIP que entregó el cliente (375 archivos, 76 carpetas de producto).
 *
 * ── La regla, producto por producto ────────────────────────────────────────
 * No hay criterio por serie ni por lote: se compara cada producto con lo que
 * le llega.
 *
 *   1. Llega foto nueva y la actual es DUMMY o no hay → se carga la nueva.
 *      Una foto nítida del azulejo equivocado es peor que una blanda del
 *      correcto: la corrección manda sobre la resolución.
 *   2. Llega foto nueva, la actual es REAL y la nueva es igual o mejor → se
 *      carga la nueva.
 *   3. Llega foto nueva, la actual es REAL y la nueva es PEOR → NO se toca.
 *      Son los 21 de la Serie Venezuela que salieron del catálogo PDF, que
 *      traía mejores imágenes que estos renders. Quedan para preguntarle al
 *      cliente si las tiene en alta.
 *   4. No llega nada y la actual es DUMMY → se VACÍA. Es la decisión de fondo:
 *      preferimos el hueco declarado del diseño ("sin foto no se inventa una")
 *      a una foto prestada, y así nadie tiene que adivinar más adelante cuáles
 *      eran reales.
 *   5. No llega nada y la actual es REAL → no se toca.
 *
 * El HOME no se toca: el hero y las fichas de Ambientes tienen su propia
 * imagen en el schema, separada de `producto.fotos`.
 *
 * ── Dos detalles del material ──────────────────────────────────────────────
 * - Trece diseños existen en dos formatos (Kos, Duna, Hydra…) y el archivo no
 *   dice cuál es. Es el MISMO diseño, así que la foto va a los dos; el asset
 *   se sube una sola vez y se referencia dos veces.
 * - Tres nombres de carpeta vienen mal escritos respecto al catálogo
 *   (`ARAGON GRIGGIO`, `GRANITE STONE GREY`, `CATABUMBO`). Van en ALIAS.
 *
 * Las fotos se suben TAL CUAL, sin recortar: Sanity guarda el original y el
 * build genera las variantes que necesita, sin pedir nunca un ancho mayor que
 * el del archivo. Si mañana se sube el techo de resolución, se regenera sin
 * volver a pedirle nada al cliente.
 */
import {readFileSync, existsSync} from 'node:fs'
import {basename} from 'node:path'

const INVENTARIO = '/root/fotos-cliente/inventario.json'
const RAIZ = '/root/fotos-cliente/extraido'
const ENSAYO = process.argv.includes('--ensayo')

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
const API = `https://${PROYECTO}.api.sanity.io/v2023-05-03`

const consultar = async (groq) => {
  const r = await fetch(`${API}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`, {
    headers: {Authorization: `Bearer ${TOKEN}`},
  })
  if (!r.ok) throw new Error(`consulta: HTTP ${r.status}`)
  return (await r.json()).result
}
const mutar = async (mutations) => {
  const r = await fetch(`${API}/data/mutate/${DATASET}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`},
    body: JSON.stringify({mutations}),
  })
  const c = await r.json()
  if (!r.ok) throw new Error(`mutación: HTTP ${r.status} — ${JSON.stringify(c).slice(0, 300)}`)
  return c
}
async function subir(ruta) {
  const cuerpo = readFileSync(ruta)
  const tipo = ruta.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
  const r = await fetch(`${API}/assets/images/${DATASET}?filename=${encodeURIComponent(basename(ruta))}`, {
    method: 'POST',
    headers: {'Content-Type': tipo, Authorization: `Bearer ${TOKEN}`},
    body: cuerpo,
  })
  if (!r.ok) throw new Error(`subida: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`)
  return (await r.json()).document._id
}

const norm = (s = '') =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Erratas del nombre de carpeta respecto al catálogo. */
const ALIAS = {
  'aragon griggio': 'aragon grigio',
  'granite stone grey': 'granite stone gray',
  catabumbo: 'catatumbo',
}
const clave = (s) => {
  const k = norm(s)
  return ALIAS[k] ?? k
}

// --- El material -----------------------------------------------------------
const inventario = JSON.parse(readFileSync(INVENTARIO, 'utf8'))
const porProducto = new Map()
for (const f of inventario) {
  if (f.tipo !== 'pieza' && f.tipo !== 'ambiente') continue // las 3 sueltas quedan fuera
  if (!f.w) continue
  const k = clave(f.producto)
  if (!porProducto.has(k)) porProducto.set(k, [])
  porProducto.get(k).push(f)
}
/**
 * ORDEN: una macro primero, después los ambientes, y al final las macros que
 * sobren. Lo manda `modelo-de-contenido.md` ("foto 1 = macro de la baldosa;
 * 2+ = ambientes") y tiene su razón: la ficha muestra solo las CUATRO
 * primeras, y en una grilla de 126 tarjetas pequeñas la macro deja ver el
 * material mientras el ambiente se vuelve una foto de decoración donde el
 * producto casi no se distingue.
 *
 * Con este orden los cuatro huecos quedan en 1 macro + 3 ambientes: ningún
 * ambiente se pierde y lo que cae fuera son macros casi idénticas entre sí —
 * hay productos que trajeron hasta cinco de la misma baldosa.
 */
for (const [, fs] of porProducto) {
  const porAncho = (a, b) => b.w - a.w
  const macros = fs.filter((f) => f.tipo === 'pieza').sort(porAncho)
  const ambientes = fs.filter((f) => f.tipo !== 'pieza').sort(porAncho)
  fs.length = 0
  fs.push(...macros.slice(0, 1), ...ambientes, ...macros.slice(1))
}

const ambienteDe = (f) => {
  const t = norm(f.base)
  for (const [k, v] of [
    ['sala', 'Sala'], ['comedor', 'Comedor'], ['cocina', 'Cocina'], ['bano', 'Baño'],
    ['habitacion', 'Habitación'], ['hab', 'Habitación'], ['homeoffice', 'Home office'],
    ['home office', 'Home office'], ['balcon', 'Balcón'], ['lavadero', 'Lavadero'],
    ['patio', 'Patio'], ['paio', 'Patio'], ['garage', 'Garage'], ['pared', 'Pared'],
  ]) {
    if (new RegExp(`\\b${k}\\b`).test(t)) return v
  }
  return ''
}
const altBase = (f, nombre) => {
  // El inventario dice `pieza`; `macro` es el nombre que usa el CMS. Comparar
  // contra el del CMS acá dejaba todas las macros con el alt de ambiente.
  if (f.tipo === 'pieza') return `Detalle de la baldosa ${nombre}`
  const a = ambienteDe(f)
  return a ? `${a} con ${nombre}` : `Ambiente con ${nombre}`
}
/**
 * Los `alt` de un mismo producto se numeran cuando se repiten: un producto
 * puede traer tres tomas del mismo ambiente y "Pared con Aragon Cotto" tres
 * veces no le sirve a nadie que use lector de pantalla.
 */
function altsDe(fotos, nombre) {
  const veces = new Map()
  for (const f of fotos) {
    const b = altBase(f, nombre)
    veces.set(b, (veces.get(b) || 0) + 1)
  }
  const visto = new Map()
  return fotos.map((f) => {
    const b = altBase(f, nombre)
    if (veces.get(b) === 1) return b.slice(0, 120)
    const i = (visto.get(b) || 0) + 1
    visto.set(b, i)
    return `${b} (${i})`.slice(0, 120)
  })
}

// --- Decisión --------------------------------------------------------------
const productos = await consultar(
  '*[_type=="producto"]{_id,nombre,serie,formato,"n":coalesce(count(fotos),0),"ej":coalesce(count(fotos[esEjemplo==true]),0),"refs":fotos[].asset._ref}',
)
const anchoDe = (refs) => {
  const ws = (refs || []).map((r) => Number((/-(\d+)x\d+-/.exec(r || '') || [])[1] || 0))
  return ws.length ? Math.max(...ws) : 0
}

const cargar = []
const vaciar = []
const conservar = {pdf: 0, real: 0, vacio: 0}
for (const p of productos) {
  const k = clave(p.nombre)
  const nuevas = porProducto.get(k)
  const dummy = p.n > 0 && p.ej === p.n
  if (!nuevas) {
    if (dummy) vaciar.push(p)
    else if (p.n === 0) conservar.vacio++
    else conservar.real++
    continue
  }
  const mejor = Math.max(...nuevas.map((f) => f.w))
  if (p.n === 0 || dummy) cargar.push({p, nuevas, motivo: p.n === 0 ? 'no tenía' : 'era dummy'})
  else if (mejor >= anchoDe(p.refs)) cargar.push({p, nuevas, motivo: 'nueva mejor o igual'})
  else conservar.pdf++
}

console.log(`productos: ${productos.length}`)
console.log(`  CARGAR   : ${cargar.length}`)
console.log(`  VACIAR   : ${vaciar.length}`)
console.log(`  conservar: ${conservar.pdf} del PDF (la nueva es peor) · ${conservar.real} reales sin reemplazo · ${conservar.vacio} ya vacíos`)
console.log(`  archivos a subir: ${new Set(cargar.flatMap((c) => c.nuevas.map((f) => f.rel))).size} distintos`)

if (ENSAYO) {
  console.log('\n--ensayo: no se escribió nada. Muestra:\n')
  for (const {p, nuevas, motivo} of cargar.slice(0, 6)) {
    console.log(`  ${p.nombre} (${p.serie}, ${motivo}) — ${nuevas.length} fotos`)
    const alts = altsDe(nuevas, p.nombre)
    nuevas.slice(0, 3).forEach((f, i) => console.log(`      [${f.tipo}] ${f.w}×${f.h}  ${alts[i]}`))
  }
  console.log(`\n  se vaciarían: ${vaciar.map((p) => p.nombre).slice(0, 8).join(' · ')}${vaciar.length > 8 ? ' …' : ''}`)
  process.exit(0)
}

// --- Ejecutar --------------------------------------------------------------
// Se comprueba que TODO el material exista antes de subir el primer archivo.
// Una ruta muerta a mitad de camino dejaba medio lote subido y ningún producto
// actualizado: es peor que no empezar. Pasó con una foto renombrada a mano cuyo
// nombre viejo seguía en el inventario.
const faltantes = [...new Set(cargar.flatMap((c) => c.nuevas.map((f) => f.rel)))].filter(
  (rel) => !existsSync(`${RAIZ}/${rel}`),
)
if (faltantes.length) {
  console.error(`\n${faltantes.length} archivos del inventario no existen en el disco:`)
  for (const f of faltantes.slice(0, 10)) console.error(`   ${f}`)
  console.error('\nActualizá el inventario antes de cargar. No se subió nada.')
  process.exit(1)
}

// Un archivo puede servir a dos productos (los 13 diseños con dos formatos):
// se sube UNA vez y se referencia las veces que haga falta.
const assets = new Map()
let subidas = 0
const total = new Set(cargar.flatMap((c) => c.nuevas.map((f) => f.rel))).size
for (const {nuevas} of cargar) {
  for (const f of nuevas) {
    if (assets.has(f.rel)) continue
    assets.set(f.rel, await subir(`${RAIZ}/${f.rel}`))
    subidas++
    if (subidas % 25 === 0 || subidas === total) console.log(`  subidas ${subidas}/${total}`)
  }
}

const muts = []
for (const {p, nuevas} of cargar) {
  const alts = altsDe(nuevas, p.nombre)
  muts.push({
    patch: {
      id: p._id,
      set: {
        fotos: nuevas.map((f, i) => ({
          _key: `foto${i}${Math.abs([...f.rel].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36)}`,
          _type: 'fotoProducto',
          asset: {_type: 'reference', _ref: assets.get(f.rel)},
          alt: alts[i],
          tipo: f.tipo === 'pieza' ? 'macro' : 'ambiente',
          esEjemplo: false,
        })),
      },
    },
  })
}
for (const p of vaciar) muts.push({patch: {id: p._id, set: {fotos: []}}})

const TANDA = 25
for (let i = 0; i < muts.length; i += TANDA) {
  await mutar(muts.slice(i, i + TANDA))
  console.log(`  productos actualizados ${Math.min(i + TANDA, muts.length)}/${muts.length}`)
}

const fin = await consultar(
  '{"conFoto":count(*[_type=="producto" && count(fotos)>0]),"vacios":count(*[_type=="producto" && coalesce(count(fotos),0)==0]),"dummy":count(*[_type=="producto" && count(fotos[esEjemplo==true])>0])}',
)
console.log('')
console.log(`  en el CMS: ${fin.conFoto} con foto · ${fin.vacios} en blanco · ${fin.dummy} con foto de ejemplo`)
