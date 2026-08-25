import {chromium} from 'playwright'
const url = process.argv[2]
const w = 1440, h = 900
const b = await chromium.launch()
const p = await (await b.newContext({viewport:{width:w,height:h}})).newPage()
await p.goto(url, {waitUntil:'networkidle'})
await p.waitForTimeout(3200)
await p.evaluate(() => { document.documentElement.removeAttribute('data-telon'); document.querySelectorAll('#telon,[data-screen-label="Telon"]').forEach(e=>e.remove()) })
await p.evaluate(async () => {
  const paso = window.innerHeight * 0.8
  for (let y = 0; y < document.body.scrollHeight; y += paso) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 220))
  }
})
const sel = process.argv[3]
const el = p.locator(sel).first()
await el.scrollIntoViewIfNeeded()
await p.waitForTimeout(1200)
const info = await p.evaluate(() => {
  const scrollY = window.scrollY
  const proto = document.querySelector('[data-pin-titulo]')
  const nuestroActivo = document.querySelector('.historia__hito[data-activo] .historia__titulo')
  const nuestroCapas = [...document.querySelectorAll('.historia__capa')].map(c => c.style.opacity)
  return {
    scrollY,
    protoTitulo: proto ? proto.textContent : null,
    nuestroTitulo: nuestroActivo ? nuestroActivo.textContent : null,
    nuestroCapas,
  }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
