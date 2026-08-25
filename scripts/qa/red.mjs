import {chromium} from 'playwright'

/**
 * Prueba de autosuficiencia (plan maestro §3.3): al cargar una página del sitio
 * NO puede salir ni una petición fuera de nuestro origen. Registra todo el
 * tráfico, y después pulsa la fachada de video para comprobar lo contrario:
 * que ahí sí, y solo ahí, aparece el reproductor de YouTube.
 *
 *   node scripts/qa/red.mjs [url]
 *
 * Sale con código 1 si encuentra tráfico a terceros antes del clic.
 */
const URL_SITIO = process.argv[2] || process.env.NUESTRO || 'http://localhost:4600/index.html'
const propia = (u) => u.startsWith(new URL(URL_SITIO).origin) || u.startsWith('data:') || u.startsWith('blob:')

const navegador = await chromium.launch()
const contexto = await navegador.newContext({viewport: {width: 1440, height: 900}})
const pagina = await contexto.newPage()

const peticiones = []
pagina.on('request', (r) => peticiones.push(r.url()))

await pagina.goto(URL_SITIO, {waitUntil: 'networkidle', timeout: 60000})
await pagina.waitForTimeout(3500)
await pagina.evaluate(() => {
  document.documentElement.removeAttribute('data-telon')
  document.querySelectorAll('#telon').forEach((el) => el.remove())
})
// Recorrer la página entera: así se dispara todo lo diferido (lazy, reveals).
await pagina.evaluate(async () => {
  const paso = window.innerHeight * 0.8
  for (let y = 0; y < document.body.scrollHeight; y += paso) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 250))
  }
})
await pagina.waitForTimeout(1500)

const antes = [...peticiones]
const ajenas = antes.filter((u) => !propia(u))
console.log(`ANTES DEL CLIC — ${antes.length} peticiones, ${ajenas.length} fuera de nuestro origen`)
ajenas.forEach((u) => console.log('   ! ' + u))

const boton = pagina.locator('.profesionales__fachada')
const hayFachada = (await boton.count()) > 0
if (hayFachada) {
  console.log(`\nfachada: <${await boton.evaluate((el) => el.tagName.toLowerCase())}> · aria-label ${JSON.stringify(await boton.getAttribute('aria-label'))}`)
  await boton.scrollIntoViewIfNeeded()
  peticiones.length = 0
  await boton.click()
  await pagina.waitForTimeout(6000)
  const despues = [...peticiones].filter((u) => !propia(u))
  console.log(`DESPUÉS DEL CLIC — ${despues.length} peticiones a terceros (así tiene que ser: el video se pidió)`)
  ;[...new Set(despues.map((u) => new URL(u).hostname))].forEach((h) => console.log('   → ' + h))
  const iframe = pagina.locator('iframe.profesionales__reproductor')
  console.log(`iframe del reproductor: ${await iframe.count()} · src ${await iframe.getAttribute('src')}`)
} else {
  console.log('\n(no hay fachada de video en esta página)')
}

await navegador.close()
if (ajenas.length > 0) {
  console.error('\nFALLA: la página pidió recursos a terceros sin que nadie pulsara nada.')
  process.exit(1)
}
console.log('\nOK: sin tráfico a terceros hasta que el visitante pulsa.')
