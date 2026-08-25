import {chromium} from 'playwright'
import pixelmatch from 'pixelmatch'
import {PNG} from 'pngjs'
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs'

/**
 * Comparador de fidelidad. Captura la misma sección en el prototipo del handoff
 * y en nuestro sitio, al mismo ancho, y reporta cuántos píxeles difieren.
 *
 *   node scripts/qa/diff.mjs '<selector-proto>' '<selector-nuestro>' <nombre> [ancho] [alto]
 *
 * Deja tres PNG en DESTINO: -proto, -nuestro y -diff (los píxeles distintos en rojo).
 */
const DESTINO = process.env.DESTINO || 'capturas'
const PROTO = process.env.PROTO || 'http://localhost:4500/index.html'
const NUESTRO = process.env.NUESTRO || 'http://localhost:4600/index.html'

const [, , selProto, selNuestro, nombre = 'seccion', ancho = '1440', alto = '900'] = process.argv
mkdirSync(DESTINO, {recursive: true})

async function capturar(url, selector, salida) {
  const navegador = await chromium.launch()
  const contexto = await navegador.newContext({viewport: {width: +ancho, height: +alto}, deviceScaleFactor: 1})
  const pagina = await contexto.newPage()
  await pagina.goto(url, {waitUntil: 'networkidle', timeout: 60000})
  // Modo PLANO: apaga la imagen para medir SOLO composición y tipografía. Sin esto,
  // una foto distinta o un carrusel en otro estado ensucian el número y esconden
  // los desajustes de maquetación, que es lo que interesa comparar.
  if (process.env.PLANO === '1') {
    await pagina.addStyleTag({
      content: `img, video, picture, svg { opacity: 0 !important; }
                [style*="background-image"], [data-bg] { background-image: none !important; }
                * { background-color: transparent !important; }
                body, html { background: #FFFFFF !important; }`,
    })
  }
  // El telón de entrada tapa la pantalla 2,2s; se deja terminar y se retira.
  await pagina.waitForTimeout(3200)
  await pagina.evaluate(() => {
    document.documentElement.removeAttribute('data-telon')
    document.querySelectorAll('#telon, [data-screen-label="Telon"]').forEach((el) => el.remove())
  })
  // Recorrer dispara las apariciones al entrar en pantalla.
  await pagina.evaluate(async () => {
    const paso = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += paso) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 220))
    }
  })
  // El recorrido deja el scroll donde terminó (cerca del pie). Si el elemento
  // a capturar queda justo debajo de una cabecera sticky (páginas más cortas
  // que el recorrido, p. ej. la 404), `scrollIntoViewIfNeeded` de más abajo
  // lo alinea al ras contra esa cabecera y la tapa en la captura. Se vuelve
  // arriba antes de buscarlo: para secciones más abajo en la página no cambia
  // nada (igual hace falta bajar), y evita ese solape para las que están cerca
  // del tope.
  await pagina.evaluate(() => window.scrollTo(0, 0))
  const elemento = pagina.locator(selector).first()
  if (!(await elemento.count())) {
    await navegador.close()
    throw new Error(`no encontré ${selector} en ${url}`)
  }
  await elemento.scrollIntoViewIfNeeded()
  await pagina.waitForTimeout(1200)
  await elemento.screenshot({path: salida})
  const caja = await elemento.boundingBox()
  await navegador.close()
  return caja
}

const rutaProto = `${DESTINO}/${nombre}-${ancho}-proto.png`
const rutaNuestro = `${DESTINO}/${nombre}-${ancho}-nuestro.png`

const cajaProto = await capturar(PROTO, selProto, rutaProto)
const cajaNuestro = await capturar(NUESTRO, selNuestro, rutaNuestro)

const a = PNG.sync.read(readFileSync(rutaProto))
const b = PNG.sync.read(readFileSync(rutaNuestro))

console.log(`prototipo: ${Math.round(cajaProto.width)}×${Math.round(cajaProto.height)}`)
console.log(`nuestro:   ${Math.round(cajaNuestro.width)}×${Math.round(cajaNuestro.height)}`)

if (a.width !== b.width || a.height !== b.height) {
  const dif = Math.abs(a.height - b.height)
  console.log(`ALTOS DISTINTOS: difieren ${dif}px (${((dif / a.height) * 100).toFixed(1)}%). Sin diff de píxeles hasta igualar la caja.`)
  process.exit(0)
}

const diff = new PNG({width: a.width, height: a.height})
const distintos = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {threshold: 0.12})
writeFileSync(`${DESTINO}/${nombre}-${ancho}-diff.png`, PNG.sync.write(diff))
const total = a.width * a.height
console.log(`píxeles distintos: ${distintos} de ${total} (${((distintos / total) * 100).toFixed(2)}%)`)
