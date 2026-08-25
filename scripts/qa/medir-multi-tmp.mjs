import {chromium} from 'playwright'

const [, , url, ancho = '1440', alto = '900', ...selectores] = process.argv

async function medir() {
  const navegador = await chromium.launch()
  const contexto = await navegador.newContext({viewport: {width: +ancho, height: +alto}, deviceScaleFactor: 1})
  const pagina = await contexto.newPage()
  await pagina.goto(url, {waitUntil: 'networkidle', timeout: 60000})
  await pagina.waitForTimeout(3200)
  await pagina.evaluate(() => {
    document.documentElement.removeAttribute('data-telon')
    document.querySelectorAll('#telon, [data-screen-label="Telon"]').forEach((el) => el.remove())
  })
  await pagina.evaluate(async () => {
    const paso = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += paso) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 150))
    }
    window.scrollTo(0, 0)
  })
  await pagina.waitForTimeout(500)
  for (const sel of selectores) {
    const datos = await pagina.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        marginTop: cs.marginTop, marginBottom: cs.marginBottom, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom,
        lineHeight: cs.lineHeight, fontSize: cs.fontSize,
      }
    }, sel)
    console.log(sel, '->', JSON.stringify(datos))
  }
  await navegador.close()
}

await medir()
