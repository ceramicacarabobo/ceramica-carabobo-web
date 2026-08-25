import {chromium} from 'playwright'

/**
 * Captura una sección concreta de cada sitio, al mismo ancho, para comparar
 * fidelidad. El prototipo marca sus secciones con data-screen-label; el nuestro
 * usa etiquetas de sección propias.
 */
const DESTINO = process.env.DESTINO || '.'
const ancho = Number(process.env.ANCHO || 1440)
const alto = Number(process.env.ALTO || 900)
const escala = Number(process.env.ESCALA || 0.5)

const objetivos = [
  {sitio: 'proto', url: 'http://localhost:4500/index.html', selector: process.argv[2]},
  {sitio: 'nuestro', url: 'http://localhost:4600/index.html', selector: process.argv[3]},
]
const nombre = process.argv[4] || 'seccion'

const navegador = await chromium.launch()
for (const objetivo of objetivos) {
  const contexto = await navegador.newContext({viewport: {width: ancho, height: alto}, deviceScaleFactor: escala})
  const pagina = await contexto.newPage()
  await pagina.goto(objetivo.url, {waitUntil: 'networkidle', timeout: 60000})
  // El telón de entrada tapa la pantalla los primeros 2,2s. En headless el reloj
  // puede quedar estrangulado, así que se espera y después se retira a mano.
  await pagina.waitForTimeout(3200)
  await pagina.evaluate(() => {
    document.documentElement.removeAttribute('data-telon')
    document.querySelectorAll('[data-screen-label="Telon"], #telon').forEach((el) => el.remove())
  })
  await pagina.waitForTimeout(400)
  await pagina.evaluate(async () => {
    const paso = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += paso) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 200))
    }
  })
  const elemento = pagina.locator(objetivo.selector).first()
  const cuenta = await elemento.count()
  if (!cuenta) {
    console.log(`${objetivo.sitio}: no encontré ${objetivo.selector}`)
    await contexto.close()
    continue
  }
  await elemento.scrollIntoViewIfNeeded()
  await pagina.waitForTimeout(1200)
  await elemento.screenshot({path: `${DESTINO}/${nombre}-${objetivo.sitio}.png`})
  const caja = await elemento.boundingBox()
  console.log(`${objetivo.sitio}: ${Math.round(caja.width)}×${Math.round(caja.height)}`)
  await contexto.close()
}
await navegador.close()
