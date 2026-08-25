/**
 * Pruebas 06 y 07 del checklist de aceptación (`design/Requisitos tecnicos v0`):
 *
 *   06 · "Con un diseño abierto, el gesto de volver del sistema cierra la ficha
 *         y conserva los filtros que estaban puestos."
 *   07 · "Compartir un diseño y abrir ese enlace en otro teléfono muestra el
 *         catálogo con la ficha abierta."
 *
 * Corren sueltas mientras dura la fase 3; el bloque 3.6 las pliega a
 * `scripts/qa/aceptacion.mjs` junto con la 05 y la 10.
 *
 *   NUESTRO=http://localhost:4600 node scripts/qa/prueba-06-07.mjs
 *
 * De paso comprueban lo que sostiene a las dos: que la página propia del
 * producto existe y es indexable, y que el overlay muestra exactamente esa
 * misma ficha (el overlay se la trae por `fetch`, así que si divergen es que
 * algo se rompió).
 */
import {chromium} from 'playwright'

const BASE = (process.env.NUESTRO || 'http://localhost:4600').replace(/\/$/, '')
const TELEFONO = {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}

const fallas = []
const anotar = (ok, titulo, detalle) => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} · ${titulo}${detalle ? ` — ${detalle}` : ''}`)
  if (!ok) fallas.push(titulo)
}

const listo = (pagina) =>
  pagina.waitForFunction(() => !!document.querySelector('[data-capa-ficha][data-enganchada]'), null, {timeout: 20000})

const fichaAbierta = (pagina) =>
  pagina.waitForFunction(
    () => {
      const capa = document.querySelector('[data-capa-ficha]')
      return !!capa && !capa.hidden && !!capa.querySelector('[data-ficha]')
    },
    null,
    {timeout: 20000},
  )

const navegador = await chromium.launch()

// ───────────────────────────────────────────────────────────────────────────
// Base · la página propia del producto existe, es indexable y trae la ficha
// ───────────────────────────────────────────────────────────────────────────
let slugElegido = ''
let idElegido = ''
{
  const contexto = await navegador.newContext(TELEFONO)
  const pagina = await contexto.newPage()
  await pagina.goto(`${BASE}/catalogo`, {waitUntil: 'load', timeout: 60000})
  await listo(pagina)

  const tarjeta = pagina.locator('a[data-abre-ficha]').first()
  slugElegido = (await tarjeta.getAttribute('href')) || ''
  idElegido = (await tarjeta.getAttribute('data-abre-ficha')) || ''

  const respuesta = await pagina.goto(`${BASE}${slugElegido}`, {waitUntil: 'load', timeout: 60000})
  anotar(respuesta?.status() === 200, 'la página propia del producto responde', `${slugElegido} → ${respuesta?.status()}`)

  const canonical = await pagina.getAttribute('link[rel=canonical]', 'href')
  anotar(!!canonical && canonical.endsWith(slugElegido), 'canonical propio', canonical || '(sin canonical)')

  const og = await pagina.getAttribute('meta[property="og:url"]', 'content')
  anotar(!!og && og.endsWith(slugElegido), 'og:url propio', og || '(sin og:url)')

  const filas = await pagina.locator('[data-ficha] .ficha__fila').count()
  const vacias = await pagina.locator('[data-ficha] .ficha__v:empty').count()
  anotar(filas > 0 && vacias === 0, 'la ficha técnica tiene filas y ninguna vacía', `${filas} filas`)

  const ejemplo = await pagina.locator('.ficha__ejemplo').count()
  anotar(ejemplo === 0, 'sin avisos internos en un build que no es de preview')

  await contexto.close()
}

// ───────────────────────────────────────────────────────────────────────────
// 06 · Teléfono: con la ficha abierta, "atrás" la cierra y deja el filtro puesto
// ───────────────────────────────────────────────────────────────────────────
{
  const contexto = await navegador.newContext(TELEFONO)
  const pagina = await contexto.newPage()
  await pagina.goto(`${BASE}/catalogo`, {waitUntil: 'load', timeout: 60000})
  await listo(pagina)
  await pagina.waitForTimeout(2600) // el telón de entrada

  // Se pone un filtro DE VERDAD, por la hoja, que es lo que hay en teléfono.
  await pagina.click('.filtrar[data-abre-filtros]')
  await pagina.waitForTimeout(400)
  const casilla = pagina.locator('.hoja input[data-eje="materia"]:not([disabled])').first()
  const materia = await casilla.getAttribute('data-valor')
  await casilla.click()
  await pagina.waitForTimeout(300)
  await pagina.click('[data-ver-resultados]')
  await pagina.waitForTimeout(500)

  const filtrada = await pagina.evaluate(() => location.hash)
  anotar(filtrada.includes(encodeURIComponent(materia)), 'el filtro queda puesto antes de abrir la ficha', filtrada)

  const antes = await pagina.evaluate(() => history.length)
  const tarjeta = pagina.locator('.grilla a[data-abre-ficha]:not([hidden])').first()
  const id = await tarjeta.getAttribute('data-abre-ficha')
  await tarjeta.click()
  await fichaAbierta(pagina)
  const despues = await pagina.evaluate(() => history.length)

  anotar(despues === antes + 1, 'abrir la ficha deja entrada propia en el historial', `history.length ${antes} → ${despues}`)
  anotar(
    (await pagina.evaluate(() => location.hash)).includes(`diseno=${encodeURIComponent(id)}`),
    'la dirección nombra el diseño abierto',
  )
  anotar(
    await pagina.evaluate(() => document.documentElement.style.overflow === 'hidden'),
    'el documento no scrollea detrás de la hoja (el scroll es interno)',
  )
  anotar(
    await pagina.evaluate(() => {
      const b = document.querySelector('.capa-ficha__cerrar')
      if (!b) return false
      const r = b.getBoundingClientRect()
      return r.width >= 44 && r.height >= 44
    }),
    'el cierre de la hoja mide 44px',
  )

  // Arrastrar la hoja hacia abajo desde el asa también cierra
  // (`Responsividad v0` §03). El cuerpo NO arrastra: ahí manda el scroll.
  const asa = pagina.locator('.capa-ficha__asa')
  const caja = await asa.boundingBox()
  await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2)
  await pagina.mouse.down()
  for (let y = 20; y <= 200; y += 45) {
    await pagina.mouse.move(caja.x + caja.width / 2, caja.y + y)
    await pagina.waitForTimeout(60)
  }
  const corrida = await pagina.evaluate(() => document.querySelector('.capa-ficha__caja').style.transform)
  await pagina.mouse.up()
  await pagina.waitForTimeout(700)
  anotar(/translateY\(\d+/.test(corrida), 'la hoja sigue al dedo mientras se arrastra', corrida || '(sin transform)')
  anotar(await pagina.evaluate(() => document.querySelector('[data-capa-ficha]').hidden), 'arrastrar hacia abajo cierra la hoja')

  // Se vuelve a abrir para probar el gesto de volver del sistema.
  await pagina.locator('.grilla a[data-abre-ficha]:not([hidden])').first().click()
  await fichaAbierta(pagina)

  // El gesto de volver del sistema.
  await pagina.goBack()
  await pagina.waitForTimeout(600)

  const cerrada = await pagina.evaluate(() => document.querySelector('[data-capa-ficha]').hidden)
  const ruta = new URL(pagina.url()).pathname.replace(/\/$/, '')
  const hash = await pagina.evaluate(() => location.hash)

  anotar(cerrada && ruta === '/catalogo', 'PRUEBA 06 · atrás cierra la ficha sin salir del catálogo', pagina.url())
  anotar(hash.includes(encodeURIComponent(materia)), 'PRUEBA 06 · el filtro sobrevive al cierre', `materia=${materia}`)
  anotar(!hash.includes('diseno='), 'PRUEBA 06 · la dirección deja de nombrar el diseño', hash || '(sin hash)')

  await contexto.close()
}

// ───────────────────────────────────────────────────────────────────────────
// 07 · El enlace de un diseño, abierto en otro teléfono
// ───────────────────────────────────────────────────────────────────────────
{
  // Teléfono 1: se abre la ficha y se lee lo que compartiría (`location.href`,
  // que es exactamente lo que copian "Copiar enlace" y la hoja del sistema).
  const uno = await navegador.newContext(TELEFONO)
  const p1 = await uno.newPage()
  await p1.goto(`${BASE}/catalogo`, {waitUntil: 'load', timeout: 60000})
  await listo(p1)
  await p1.locator(`a[data-abre-ficha="${idElegido}"]`).first().click()
  await fichaAbierta(p1)
  const compartido = p1.url()
  const nombre = (await p1.locator('[data-capa-ficha] .ficha__nombre').first().textContent())?.trim()
  await uno.close()

  anotar(compartido.includes(`#diseno=${encodeURIComponent(idElegido)}`), 'el enlace a compartir nombra el diseño', compartido)

  // Teléfono 2: contexto nuevo, sin nada guardado.
  const dos = await navegador.newContext(TELEFONO)
  const p2 = await dos.newPage()
  await p2.goto(compartido, {waitUntil: 'load', timeout: 60000})
  await listo(p2)
  await fichaAbierta(p2)
  const nombre2 = (await p2.locator('[data-capa-ficha] .ficha__nombre').first().textContent())?.trim()
  const enCatalogo = new URL(p2.url()).pathname.replace(/\/$/, '') === '/catalogo'
  const grilla = await p2.locator('.grilla a[data-abre-ficha]:not([hidden])').count()

  anotar(enCatalogo && grilla > 0, 'PRUEBA 07 · el enlace abre el CATÁLOGO, no otra página', `${grilla} tarjetas detrás`)
  anotar(!!nombre2 && nombre2 === nombre, 'PRUEBA 07 · con la ficha de ese diseño abierta', nombre2 || '(vacía)')
  await dos.close()
}

// ───────────────────────────────────────────────────────────────────────────
// El overlay y la página propia son la MISMA ficha
// ───────────────────────────────────────────────────────────────────────────
{
  const contexto = await navegador.newContext({viewport: {width: 1440, height: 900}})
  const pagina = await contexto.newPage()

  await pagina.goto(`${BASE}${slugElegido}`, {waitUntil: 'load', timeout: 60000})
  const enPagina = await pagina.locator('[data-ficha]').first().evaluate((el) => el.outerHTML)

  await pagina.goto(`${BASE}/catalogo#diseno=${encodeURIComponent(idElegido)}`, {waitUntil: 'load', timeout: 60000})
  await listo(pagina)
  await fichaAbierta(pagina)
  const enOverlay = await pagina.locator('[data-capa-ficha] [data-ficha]').first().evaluate((el) => el.outerHTML)

  // El overlay destapa el compartir (lo hace el script), así que se compara sin
  // ese atributo: todo lo demás tiene que ser idéntico.
  const limpiar = (html) => html.replace(/ hidden=""/g, '').replace(/\s+/g, ' ')
  anotar(limpiar(enPagina) === limpiar(enOverlay), 'el overlay muestra la misma ficha que la página propia')

  // El diálogo de escritorio: 880px de ancho y cierre por clic fuera.
  const ancho = await pagina.locator('.capa-ficha__caja').evaluate((el) => el.getBoundingClientRect().width)
  anotar(Math.round(ancho) === 880, 'el diálogo de escritorio mide 880px', `${Math.round(ancho)}px`)

  await pagina.mouse.click(8, 8)
  await pagina.waitForTimeout(500)
  anotar(await pagina.evaluate(() => document.querySelector('[data-capa-ficha]').hidden), 'clic fuera cierra el diálogo')

  await pagina.locator(`a[data-abre-ficha="${idElegido}"]`).first().click()
  await fichaAbierta(pagina)
  await pagina.keyboard.press('Escape')
  await pagina.waitForTimeout(500)
  anotar(await pagina.evaluate(() => document.querySelector('[data-capa-ficha]').hidden), 'Escape cierra el diálogo')

  await contexto.close()
}

await navegador.close()

console.log('')
if (fallas.length) {
  console.log(`Pruebas 06 y 07: FALLA (${fallas.length})`)
  process.exit(1)
}
console.log('Pruebas 06 y 07: OK')
