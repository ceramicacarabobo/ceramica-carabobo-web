#!/usr/bin/env node
/**
 * Actualiza los 126 productos del CMS contra el «Portafolio REVISADO» del
 * cliente, que es la fuente de verdad de la clasificación.
 *
 *   node scripts/actualizar-productos-portafolio.mjs --ensayo   # no escribe
 *   node scripts/actualizar-productos-portafolio.mjs            # escribe
 *   ENV_FILE=.env.bak-qa node scripts/actualizar-productos-portafolio.mjs --ensayo   # QA
 *
 * Fuente: `scripts/datos/portafolio.json` (lo genera `extraer-portafolio.py`).
 * El cruce con el CMS es por NOMBRE + FORMATO (hay diseños en dos formatos).
 * Los 126 cuadran 1:1: no hay altas ni bajas, solo datos.
 *
 * ── Reglas de clasificación (cerradas con el cliente, 2026-09-13) ────────────
 * materia, brillo y textura salen SÓLO del campo TIPOLOGÍA. Lo que la tipología
 * no diga, queda vacío — no se deduce ni se inventa.
 *   - Regular: la tipología es «brillo / textura» (nunca materia).
 *   - Venezuela: la tipología es «materia + acabado» (nunca textura).
 *   - «Rústico / Estructurado» = dos texturas: textura es multivalor.
 * MATERIA que la tipología no da  -> «Otros» con materiaOrigen «pendiente»,
 * para poder filtrar después los que faltan por clasificar. «Otros» es el único
 * cajón de ese tipo: brillo y textura sin dato quedan literalmente vacíos.
 * El respaldo previo vive en `backups/clasificacion-productos-*.json`.
 */
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENSAYO = process.argv.includes('--ensayo')
const ENV_FILE = process.env.ENV_FILE || '.env'

// --- credenciales -----------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(join(RAIZ, ENV_FILE), 'utf8')
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
if (!PROYECTO || !TOKEN) throw new Error(`Faltan PUBLIC_SANITY_PROJECT_ID o SANITY_API_WRITE_TOKEN en ${ENV_FILE}`)
const API = `https://${PROYECTO}.api.sanity.io/v2023-05-03`
const ENTORNO = PROYECTO === 'dnjm4k7p' ? 'PRODUCCIÓN (cliente)' : PROYECTO === 'egpui9al' ? 'QA' : PROYECTO

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

// --- normalización ----------------------------------------------------------
const norm = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const fmtKey = (s = '') => s.toLowerCase().replace(/×/g, 'x').replace(/[^0-9x]+/g, '')
const clave = (nombre, formato) => `${norm(nombre)}|${fmtKey(formato)}`

// diccionarios término -> valor canónico de las listas cerradas
const MATERIA = {marmol: 'Mármol', cemento: 'Cemento', piedra: 'Piedra', terrazo: 'Terrazo', madera: 'Madera'}
const BRILLO = {mate: 'Mate', brillante: 'Brillante', satinado: 'Satinado'}
const TEXTURA = {liso: 'Liso', estructurado: 'Estructurado', rustico: 'Rústico'}

/** Tipología -> {materia, brillo[], textura[]}, tomando SÓLO lo que aparece. */
function clasificar(tipologia) {
  let materia = null
  const brillo = []
  const textura = []
  for (const tok of (tipologia || '').split(/[\/\s]+/)) {
    const t = norm(tok)
    if (!t) continue
    if (MATERIA[t]) materia = MATERIA[t]
    else if (BRILLO[t] && !brillo.includes(BRILLO[t])) brillo.push(BRILLO[t])
    else if (TEXTURA[t] && !textura.includes(TEXTURA[t])) textura.push(TEXTURA[t])
  }
  return {materia, brillo, textura}
}

const aNumero = (v) => {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(String(v).replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0])
  return Number.isFinite(n) ? n : undefined
}
/** «3 - 6» / «3-6» -> «3–6 %»; un solo número -> «N %». */
function absorcion(raw) {
  if (!raw) return undefined
  const nums = String(raw).match(/\d+(?:[.,]\d+)?/g)
  if (!nums || !nums.length) return undefined
  return (nums.length >= 2 ? `${nums[0]}–${nums[1]}` : nums[0]) + ' %'
}
function rectificado(raw) {
  const t = norm(raw)
  if (t === 'si') return true
  if (t === 'no') return false
  return undefined
}

/** Objetivo del producto según el portafolio. */
function objetivo(fila) {
  const {materia, brillo, textura} = clasificar(fila.tipologia)
  return {
    itemCliente: fila.item,
    materia: materia ?? 'Otros',
    materiaOrigen: materia ? 'cliente' : 'pendiente',
    brillo,
    textura,
    pei: fila.pei || undefined,
    mohs: aNumero(fila.dureza),
    rectificado: rectificado(fila.rectificado),
    absorcionAgua: absorcion(fila.absorcion),
    mtsCaja: aNumero(fila.rendimiento),
  }
}

// --- comparación (para el diff y para no escribir de más) --------------------
const mismaLista = (a = [], b = []) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')
const val = (v) => (Array.isArray(v) ? (v.length ? `[${v.join(', ')}]` : '∅') : v === undefined || v === null || v === '' ? '∅' : String(v))

/** Devuelve {set, unset, cambios[]} comparando el objetivo con lo que hay hoy. */
function planDe(obj, cms) {
  const set = {}
  const unset = []
  const cambios = []
  const campo = (k, nuevo, actual, {lista = false} = {}) => {
    const igual = lista ? mismaLista(nuevo, actual) : nuevo === actual || (nuevo == null && actual == null)
    const vacio = lista ? !nuevo?.length : nuevo === undefined
    if (vacio) {
      if (actual !== undefined && actual !== null && !(lista && !actual?.length)) {
        unset.push(k)
        cambios.push(`${k}: ${val(actual)} → ∅`)
      }
      return
    }
    if (!igual) {
      set[k] = nuevo
      cambios.push(`${k}: ${val(actual)} → ${val(nuevo)}`)
    }
  }
  campo('itemCliente', obj.itemCliente, cms.itemCliente)
  campo('materia', obj.materia, cms.materia)
  campo('materiaOrigen', obj.materiaOrigen, cms.materiaOrigen)
  campo('brillo', obj.brillo, cms.brillo, {lista: true})
  campo('textura', obj.textura, cms.textura, {lista: true})
  campo('pei', obj.pei, cms.pei)
  campo('mohs', obj.mohs, cms.mohs)
  campo('rectificado', obj.rectificado, cms.rectificado)
  campo('absorcionAgua', obj.absorcionAgua, cms.absorcionAgua)
  campo('mtsCaja', obj.mtsCaja, cms.mtsCaja)
  return {set, unset, cambios}
}

// --- ejecución --------------------------------------------------------------
const portafolio = JSON.parse(readFileSync(join(RAIZ, 'scripts/datos/portafolio.json'), 'utf8'))
const porClave = new Map(portafolio.map((f) => [clave(f.nombre, f.formato), f]))

const productos = await consultar(
  '*[_type=="producto"]{_id,nombre,formato,itemCliente,materia,materiaOrigen,"brillo":coalesce(brillo,[]),"textura":coalesce(textura,[]),pei,mohs,rectificado,absorcionAgua,mtsCaja}',
)

console.log(`\nEntorno: ${ENTORNO}  (${ENV_FILE} → ${PROYECTO})`)
console.log(`Portafolio: ${portafolio.length} · CMS: ${productos.length}\n`)

const mutaciones = []
const sinCruce = []
let conCambios = 0
const usados = new Set()
for (const p of productos) {
  const fila = porClave.get(clave(p.nombre, p.formato))
  if (!fila) {
    sinCruce.push(`${p.nombre} — ${p.formato}`)
    continue
  }
  usados.add(clave(p.nombre, p.formato))
  const {set, unset, cambios} = planDe(objetivo(fila), p)
  if (!cambios.length) continue
  conCambios++
  const patch = {id: p._id}
  if (Object.keys(set).length) patch.set = set
  if (unset.length) patch.unset = unset
  mutaciones.push({patch})
  if (ENSAYO) {
    console.log(`• ${p.nombre} — ${p.formato}`)
    for (const c of cambios) console.log(`    ${c}`)
  }
}
const noEnCms = [...porClave.keys()].filter((k) => !usados.has(k))

console.log(`\nProductos con cambios: ${conCambios}/${productos.length}`)
if (sinCruce.length) {
  console.log(`\n⚠ ${sinCruce.length} del CMS no cruzaron con el portafolio (no se tocan):`)
  sinCruce.forEach((s) => console.log(`   ${s}`))
}
if (noEnCms.length) {
  console.log(`\n⚠ ${noEnCms.length} del portafolio no existen en el CMS:`)
  noEnCms.forEach((k) => console.log(`   ${k}`))
}

if (ENSAYO) {
  console.log('\n--ensayo: no se escribió nada.')
  process.exit(0)
}
if (!mutaciones.length) {
  console.log('\nNada que actualizar.')
  process.exit(0)
}

const TANDA = 25
for (let i = 0; i < mutaciones.length; i += TANDA) {
  await mutar(mutaciones.slice(i, i + TANDA))
  console.log(`  actualizados ${Math.min(i + TANDA, mutaciones.length)}/${mutaciones.length}`)
}
console.log('\nListo.')
