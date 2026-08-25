#!/usr/bin/env node
/**
 * Carga el singleton `dondeComprar` con el contenido del handoff.
 *
 * Fuente: `design/publicar/donde-comprar.html` — el hero, el texto del estado
 * vacío (función `vacio()`), la banda de cierre y la foto `uploads/living.png`.
 * No se inventa ningún texto.
 *
 * El número de WhatsApp central que trae el prototipo (584140000000) es
 * PLACEHOLDER y sigue pendiente del cliente (docs/modelo-de-contenido.md §6.7).
 * Se carga igual porque sin él la página no puede dibujar su acción principal;
 * reemplazarlo es condición de lanzamiento público.
 *
 * Idempotente: `_id` fijo y `createOrReplace`. El asset se registra en
 * `scripts/.assets-subidos.json`, el mismo caché de `importar-contenido.mjs`.
 *
 *   node scripts/importar-donde-comprar.mjs
 */
import {createClient} from '@sanity/client'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DESIGN = path.join(ROOT, 'design', 'publicar')
const MAPA_ASSETS_PATH = path.join(ROOT, 'scripts', '.assets-subidos.json')

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

const mapaAssets = fs.existsSync(MAPA_ASSETS_PATH) ? JSON.parse(fs.readFileSync(MAPA_ASSETS_PATH, 'utf8')) : {}

async function imagen(rutaRelativa, alt) {
  const ruta = path.join(DESIGN, rutaRelativa)
  const clave = `image:${ruta}`
  let assetId = mapaAssets[clave]
  if (!assetId) {
    if (!fs.existsSync(ruta)) throw new Error(`No existe el archivo de origen: ${ruta}`)
    const subido = await client.assets.upload('image', fs.createReadStream(ruta), {filename: path.basename(rutaRelativa)})
    assetId = subido._id
    mapaAssets[clave] = assetId
    fs.writeFileSync(MAPA_ASSETS_PATH, JSON.stringify(mapaAssets, null, 2))
    console.log(`  subida ${rutaRelativa}`)
  } else {
    console.log(`  reutilizada ${rutaRelativa}`)
  }
  return {_type: 'image', asset: {_type: 'reference', _ref: assetId}, alt}
}

const doc = {
  _id: 'dondeComprar',
  _type: 'dondeComprar',
  hero: {
    eyebrow: 'Red de distribuidores',
    titular: 'Dónde comprar',
    bajada:
      'No vendemos en línea. Elige tu estado en el mapa y habla directo con el distribuidor que tiene el material a la vista.',
    imagen: await imagen('uploads/living.png', 'Sala con piso de porcelanato Cerámica Carabobo'),
  },
  whatsappCentral: '584140000000',
  textoEstadoVacio:
    'Escríbenos con tu ubicación y los metros que necesitas: te decimos desde qué estado podemos despacharte.',
  cierre: {
    etiqueta: '¿No ves tu ciudad?',
    titulo: 'Te decimos quién te puede atender más cerca.',
    texto:
      'Escríbenos con tu ubicación y los metros que necesitas; te conectamos con el distribuidor correspondiente.',
  },
}

await client.createOrReplace(doc)
console.log('dondeComprar cargado.')
console.log('PENDIENTE DEL CLIENTE: el WhatsApp central sigue siendo el placeholder 584140000000.')
