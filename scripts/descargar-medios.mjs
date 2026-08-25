/**
 * Descarga en el build los archivos (video, PDF) que viven en Sanity y los deja
 * dentro de `public/medios/`, junto con un manifiesto que traduce la URL del CDN
 * a la ruta local.
 *
 * Por qué: la condición de autosuficiencia del proyecto (plan maestro §3.3) prohíbe
 * que producción dependa de un CDN externo. Las imágenes ya las procesa astro:assets;
 * los archivos no pasan por ahí, así que se bajan acá.
 *
 * Corre solo, antes de `astro build`, por el script `prebuild` de package.json.
 */
import {mkdir, writeFile, readFile, access} from 'node:fs/promises'
import {join} from 'node:path'

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.PUBLIC_SANITY_DATASET || 'production'

const DESTINO = 'public/medios'
const MANIFIESTO = 'src/lib/medios.json'

async function existe(ruta) {
  try {
    await access(ruta)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!projectId || projectId === 'placeholder') {
    await writeFile(MANIFIESTO, '{}\n')
    return
  }

  // Solo los archivos que algún documento referencia: los huérfanos (versiones
  // viejas que quedaron en la librería) no tienen por qué bajarse en cada build.
  const query = encodeURIComponent(
    '*[_type == "sanity.fileAsset" && count(*[references(^._id)]) > 0]{_id, url, extension}',
  )
  const respuesta = await fetch(`https://${projectId}.api.sanity.io/v2026-08-01/data/query/${dataset}?query=${query}`)

  if (!respuesta.ok) {
    // Sin red o sin permisos: el build no se cae, pero queda constancia.
    console.warn('[medios] no se pudo consultar Sanity, se sigue sin archivos locales')
    await writeFile(MANIFIESTO, '{}\n')
    return
  }

  const {result: archivos = []} = await respuesta.json()
  await mkdir(DESTINO, {recursive: true})

  const manifiesto = {}
  let descargados = 0

  for (const archivo of archivos) {
    const nombre = `${archivo._id}.${archivo.extension}`
    const ruta = join(DESTINO, nombre)
    manifiesto[archivo.url] = `/medios/${nombre}`

    if (await existe(ruta)) continue

    const datos = await fetch(archivo.url)
    if (!datos.ok) {
      console.warn(`[medios] no se pudo descargar ${archivo.url}`)
      delete manifiesto[archivo.url]
      continue
    }
    await writeFile(ruta, Buffer.from(await datos.arrayBuffer()))
    descargados += 1
  }

  await writeFile(MANIFIESTO, `${JSON.stringify(manifiesto, null, 2)}\n`)
  console.log(`[medios] ${archivos.length} archivos en Sanity · ${descargados} descargados en esta corrida`)
}

main().catch((error) => {
  console.error('[medios]', error)
  process.exitCode = 1
})
