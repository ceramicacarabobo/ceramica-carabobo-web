#!/usr/bin/env node
/**
 * Carga en Sanity el contenido del tramo central v2 del home
 * (`design/handoff-p1-v2/README.md`): la sección 02 · Compara, la banda de obra
 * y la etiqueta de 03 · Historia.
 *
 * Es QUIRÚRGICO a propósito: usa `patch().set()` sobre los tres campos nuevos y
 * NO toca el resto del singleton `home`. `importar-contenido.mjs` hace
 * `createOrReplace` del documento entero, que acá borraría todo lo cargado
 * después (distribuidores reales, fotos del cliente, textos corregidos).
 *
 * Fuente de los datos: la constante `CMPS` del `<script>` final de
 * `design/publicar/Propuesta 1 v2.dc.html` (pares y textos) y el catálogo ya
 * cargado (nombres, specs y macros: no se escriben, se referencian).
 *
 * Las DOS fotos de ambiente de cada par se cargan acá porque necesitan el mismo
 * encuadre entre sí — la foto de ambiente que cada producto trae en su ficha
 * está tomada desde otro ángulo y superpuesta no compara nada.
 *
 * Idempotente: reusa `scripts/.assets-subidos.json` para no volver a subir
 * binarios y vuelve a escribir los mismos valores.
 *
 * Uso:  node scripts/importar-tramo-v2.mjs [--dry]
 */
import {createClient} from '@sanity/client'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DESIGN = path.join(ROOT, 'design', 'publicar')
const MAPA_ASSETS_PATH = path.join(ROOT, 'scripts', '.assets-subidos.json')
const SECO = process.argv.includes('--dry')

function cargarEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  for (const linea of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const igual = l.indexOf('=')
    if (igual === -1) continue
    const clave = l.slice(0, igual).trim()
    let valor = l.slice(igual + 1).trim()
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1)
    }
    if (!(clave in process.env)) process.env[clave] = valor
  }
}
cargarEnv()

const {PUBLIC_SANITY_PROJECT_ID: PROJECT_ID, PUBLIC_SANITY_DATASET: DATASET, SANITY_API_WRITE_TOKEN: TOKEN} = process.env
if (!PROJECT_ID || !DATASET || !TOKEN) {
  console.error('Faltan PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET o SANITY_API_WRITE_TOKEN en .env.')
  process.exit(1)
}

const client = createClient({projectId: PROJECT_ID, dataset: DATASET, token: TOKEN, apiVersion: '2026-08-01', useCdn: false})

// ---------------------------------------------------------------------------
// Datos del handoff. Los pares nombran productos por su NOMBRE en el catálogo:
// el script resuelve la referencia y aborta si alguno no existe, en vez de
// dejar una fila a medias.
// ---------------------------------------------------------------------------
const COMPARADOR = {
  etiqueta: 'Compara',
  titulo: 'El mismo espacio, dos materias.',
  // Verbatim del prototipo (`cmpIntro`): los textos del tramo están decididos.
  intro: 'Un ambiente, dos revestimientos. Arrastra el divisor para cambiarle el piso.',
  pares: [
    {
      encima: {producto: 'Ávila Gris', foto: 'assets/catalogo/ambientes/avila-gris-2.webp', alt: 'Ambiente con piso símil cemento Ávila Gris'},
      base: {producto: 'Ávila Geométrico', foto: 'assets/catalogo/ambientes/avila-geometrico-cliente-espejo.jpg', alt: 'El mismo ambiente con piso símil cemento Ávila Geométrico'},
    },
    {
      encima: {producto: 'Macuto Boreal', foto: 'assets/catalogo/ambientes/macuto-boreal-2.webp', alt: 'Ambiente con piso símil piedra Macuto Boreal'},
      base: {producto: 'Baruta Terra', foto: 'assets/catalogo/ambientes/baruta-terra-cliente.jpg', alt: 'El mismo ambiente con piso símil travertino Baruta Terra'},
    },
  ],
}

/**
 * Archivos del bundle que NO son material del cliente sino un sustituto local.
 * Nunca suben al CMS: un par que dependa de uno se salta entero, con aviso. Un
 * sustituto existe solo para que el prototipo de referencia corra y se pueda
 * medir la composición; subirlo metería una foto fabricada en el contenido del
 * cliente, que es peor que dejar la fila sin cargar.
 *
 * Vacío desde el 2026-09-04: llegó `avila-geometrico-cliente-espejo.jpg` real.
 */
const SUSTITUTOS = new Set()

/** Diseño de la banda a sangre. Su macro y su rótulo salen del producto. */
const BANDA_PRODUCTO = 'Sanare Marrón'

/**
 * Historia estrena rótulo numerado. Hasta v2 la sección no tenía numeral y su
 * `titulo` hacía de rótulo ("Historia"): ese texto pasa a `etiqueta` y el
 * `titulo` toma el h2 del diseño. Verbatim del prototipo.
 */
const HISTORIA = {etiqueta: 'Historia', titulo: 'Setenta años en Valencia.'}

// ---------------------------------------------------------------------------
const mapaAssets = fs.existsSync(MAPA_ASSETS_PATH) ? JSON.parse(fs.readFileSync(MAPA_ASSETS_PATH, 'utf8')) : {}
let subidos = 0
let reusados = 0

async function subirImagen(rutaRelativa) {
  const rutaAbsoluta = path.join(DESIGN, rutaRelativa)
  const clave = `image:${rutaAbsoluta}`
  if (mapaAssets[clave]) {
    reusados++
    return mapaAssets[clave]
  }
  if (!fs.existsSync(rutaAbsoluta)) throw new Error(`Falta el archivo: ${rutaRelativa}`)
  if (SECO) return 'image-DRY'
  const resultado = await client.assets.upload('image', fs.createReadStream(rutaAbsoluta), {filename: path.basename(rutaRelativa)})
  mapaAssets[clave] = resultado._id
  fs.writeFileSync(MAPA_ASSETS_PATH, JSON.stringify(mapaAssets, null, 2))
  subidos++
  return resultado._id
}

async function idDeProducto(nombre) {
  const id = await client.fetch('*[_type == "producto" && nombre == $nombre][0]._id', {nombre})
  if (!id) throw new Error(`No existe el producto "${nombre}" en el catálogo.`)
  return id
}

async function lado({producto, foto, alt}) {
  return {productoId: await idDeProducto(producto), assetId: await subirImagen(foto), alt}
}

// ---------------------------------------------------------------------------
const home = await client.fetch('*[_type == "home"][0]{_id}')
if (!home?._id) {
  console.error('No existe el documento `home`. Correr antes `node scripts/importar-contenido.mjs`.')
  process.exit(1)
}

// Se resuelve TODO antes de escribir: si falta un producto o un archivo, no se
// deja el tramo a medio cargar.
const pares = []
const saltados = []
for (const par of COMPARADOR.pares) {
  const sustituto = [par.encima.foto, par.base.foto].find((foto) => SUSTITUTOS.has(foto))
  if (sustituto) {
    saltados.push({par: `${par.encima.producto} / ${par.base.producto}`, archivo: sustituto})
    continue
  }
  pares.push({encima: await lado(par.encima), base: await lado(par.base)})
}
if (pares.length === 0) {
  console.error('Ningún par cargable: todos dependen de un sustituto local. No se escribe nada.')
  process.exit(1)
}
const bandaId = await idDeProducto(BANDA_PRODUCTO)

const imagen = (assetId, alt) => ({_type: 'image', asset: {_type: 'reference', _ref: assetId}, alt})
const referencia = (id) => ({_type: 'reference', _ref: id})

const parche = {
  comparador: {
    etiqueta: COMPARADOR.etiqueta,
    titulo: COMPARADOR.titulo,
    intro: COMPARADOR.intro,
    pares: pares.map((par, i) => ({
      _type: 'comparacion',
      _key: `par-${i + 1}`,
      productoEncima: referencia(par.encima.productoId),
      fotoEncima: imagen(par.encima.assetId, par.encima.alt),
      productoBase: referencia(par.base.productoId),
      fotoBase: imagen(par.base.assetId, par.base.alt),
    })),
  },
  banda: {producto: referencia(bandaId)},
  'historia.etiqueta': HISTORIA.etiqueta,
  'historia.titulo': HISTORIA.titulo,
}

if (SECO) {
  console.log(JSON.stringify(parche, null, 2))
  console.log('\n--dry: no se escribió nada.')
  process.exit(0)
}

await client.patch(home._id).set(parche).commit()

console.log(`Tramo v2 cargado en ${PROJECT_ID}/${DATASET}.`)
console.log(`  pares del comparador: ${pares.length}`)
console.log(`  banda: ${BANDA_PRODUCTO}`)
console.log(`  assets subidos: ${subidos} · reutilizados: ${reusados}`)
for (const s of saltados) {
  console.log(`\n  ⚠ PAR SIN CARGAR: ${s.par}`)
  console.log(`    depende de un sustituto local (${s.archivo}).`)
  console.log('    Hay que bajar el archivo real del proyecto de diseño, quitarlo de SUSTITUTOS y volver a correr esto.')
}
