import {chromium} from 'playwright'
const DESTINO = process.env.DESTINO || '.'
const ancho = Number(process.env.ANCHO || 1440)
const alto = Number(process.env.ALTO || 900)
const escala = Number(process.env.ESCALA || 0.45)
const sufijo = process.env.SUFIJO || 'desktop'

const secciones = [
  ['hero', '.hero'],
  ['ambientes', '#ambientes'],
  ['proyectos', '#proyectos'],
  ['historia', '#historia, .historia'],
  ['profesionales', '#profesionales'],
  ['encuentranos', '#encuentranos, [id^="encuentranos"]'],
]

const navegador = await chromium.launch()
const contexto = await navegador.newContext({viewport: {width: ancho, height: alto}, deviceScaleFactor: escala})
const pagina = await contexto.newPage()
await pagina.goto('http://localhost:4600/index.html', {waitUntil: 'networkidle', timeout: 60000})
await pagina.evaluate(() => {
  document.documentElement.removeAttribute('data-telon')
  document.querySelector('#telon')?.remove()
})
await pagina.evaluate(async () => {
  const paso = window.innerHeight * 0.8
  for (let y = 0; y < document.body.scrollHeight; y += paso) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 250))
  }
  window.scrollTo(0, 0)
})
await pagina.waitForTimeout(800)

for (const [nombre, selector] of secciones) {
  const el = pagina.locator(selector).first()
  if (!(await el.count())) { console.log(`${nombre}: no encontrado`); continue }
  await el.scrollIntoViewIfNeeded()
  await pagina.waitForTimeout(700)
  await el.screenshot({path: `${DESTINO}/n-${nombre}-${sufijo}.png`})
  const c = await el.boundingBox()
  console.log(`${nombre}: ${Math.round(c.width)}×${Math.round(c.height)}`)
}
await navegador.close()
