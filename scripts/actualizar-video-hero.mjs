#!/usr/bin/env node
/**
 * Sube un archivo de video a Sanity y lo apunta como `hero.video` en el
 * documento `home`, sin tocar el resto del documento (a diferencia de
 * `importar-contenido.mjs`, que hace `createOrReplace` de la home completa).
 *
 * Por qué un script aparte y no extender el importador de contenido: el
 * importador reconstruye TODA la home a partir de constantes fijas cada vez
 * que corre — si para entonces alguien ya editó otros campos de `home` desde
 * el Studio, un `createOrReplace` los pisaría. Este script solo toca
 * `hero.video`, así que reutiliza el mismo patrón de carga de entorno y de
 * subida de asset que `importar-contenido.mjs` (ver ese archivo) sin arrastrar
 * el resto de su lógica de contenido.
 *
 * Uso: node scripts/actualizar-video-hero.mjs <ruta-al-mp4>
 */

import {createClient} from '@sanity/client'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

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

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.PUBLIC_SANITY_DATASET
const TOKEN = process.env.SANITY_API_WRITE_TOKEN

if (!PROJECT_ID || !DATASET || !TOKEN) {
  console.error(
    'Faltan variables de entorno. Se necesitan PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET y SANITY_API_WRITE_TOKEN en .env.',
  )
  process.exit(1)
}

const rutaArgumento = process.argv[2]
if (!rutaArgumento) {
  console.error('Uso: node scripts/actualizar-video-hero.mjs <ruta-al-mp4>')
  process.exit(1)
}
const rutaAbsoluta = path.resolve(rutaArgumento)
if (!fs.existsSync(rutaAbsoluta)) {
  console.error(`No existe el archivo: ${rutaAbsoluta}`)
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2026-08-01',
  useCdn: false,
})

async function main() {
  const {size} = fs.statSync(rutaAbsoluta)
  console.log(`Subiendo ${rutaAbsoluta} (${(size / 1024).toFixed(0)} KB)…`)
  const asset = await client.assets.upload('file', fs.createReadStream(rutaAbsoluta), {
    filename: path.basename(rutaAbsoluta),
  })
  console.log(`Asset subido: ${asset._id}`)

  await client
    .patch('home')
    .set({'hero.video': {_type: 'file', asset: {_type: 'reference', _ref: asset._id}}})
    .commit()

  console.log('home.hero.video actualizado.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
