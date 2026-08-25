/**
 * Prueba 05 del checklist de aceptación (`design/Requisitos tecnicos v0`):
 *
 *   "Filtrar el catálogo quince veces y apretar atrás una vez devuelve a la
 *    página anterior, no al filtro anterior."
 *
 * Corre suelta mientras el catálogo está en construcción; el bloque 3.6 la
 * pliega a `scripts/qa/aceptacion.mjs` junto con la 06, la 07 y la 10.
 *
 *   NUESTRO=http://localhost:4600 node scripts/qa/prueba-05.mjs
 *
 * Comprueba tres cosas, no una:
 *   1. quince filtrados NO agregan entradas al historial (la dirección igual
 *      cambia: es `replaceState`, para que el enlace siga siendo compartible);
 *   2. un solo "atrás" devuelve a la página anterior — el inicio;
 *   3. lo que se abre encima (la hoja de filtros en teléfono) SÍ deja entrada
 *      propia y el mismo gesto la cierra sin salir del catálogo.
 */
import {chromium} from 'playwright'

const BASE = (process.env.NUESTRO || 'http://localhost:4600').replace(/\/$/, '')

const fallas = []
const anotar = (ok, titulo, detalle) => {
  console.log(`${ok ? '  OK  ' : ' FALLA'} · ${titulo}${detalle ? ` — ${detalle}` : ''}`)
  if (!ok) fallas.push(titulo)
}

const navegador = await chromium.launch()

// ───────────────────────────────────────────────────────────────────────────
// 1 y 2 · Escritorio: quince filtrados y un atrás
// ───────────────────────────────────────────────────────────────────────────
{
  const contexto = await navegador.newContext({viewport: {width: 1440, height: 900}})
  const pagina = await contexto.newPage()
  await pagina.goto(`${BASE}/`, {waitUntil: 'load', timeout: 60000})
  await pagina.waitForTimeout(2600) // el telón de entrada

  // Se llega al catálogo NAVEGANDO con el enrutador de la cáscara, que es lo que
  // deja la entrada anterior — y de paso ejercita el re-enganche del script.
  await pagina.click('[data-abre-megamenu]')
  await pagina.waitForTimeout(300)
  await pagina.click('.megamenu a[href="/catalogo"]')
  await pagina.waitForFunction(() => !!document.querySelector('[data-catalogo][data-enganchada]'), null, {timeout: 15000})

  const largoInicial = await pagina.evaluate(() => history.length)
  const urlCatalogo = pagina.url()

  // Quince filtrados de verdad: casillas de los cinco ejes, cambios de serie y
  // de orden. Se recorre la lista dos veces para llegar a quince gestos.
  const gestos = []
  let vuelta = 0
  while (gestos.length < 15 && vuelta < 40) {
    vuelta += 1
    if (gestos.length % 5 === 4) {
      const serie = ['Todas', 'Regular', 'Venezuela'][(gestos.length / 5) | 0]
      await pagina.click(`[data-serie="${serie}"]`)
      gestos.push(`serie=${serie}`)
    } else {
      // Se vuelven a buscar en cada vuelta: filtrar apaga y enciende casillas.
      const casillas = await pagina.$$('aside input[data-eje]:not([disabled])')
      const casilla = casillas[vuelta % casillas.length]
      if (!casilla || (await casilla.isDisabled())) continue
      await casilla.click()
      gestos.push(await casilla.getAttribute('data-valor'))
    }
    await pagina.waitForTimeout(120)
  }

  const largoTrasFiltrar = await pagina.evaluate(() => history.length)
  const urlTrasFiltrar = pagina.url()

  anotar(
    largoTrasFiltrar === largoInicial,
    'quince filtrados no ensucian el historial',
    `${gestos.length} gestos · history.length ${largoInicial} → ${largoTrasFiltrar}`,
  )
  anotar(
    urlTrasFiltrar !== urlCatalogo && urlTrasFiltrar.includes('#'),
    'la dirección sí refleja los filtros (replaceState)',
    urlTrasFiltrar.slice(urlTrasFiltrar.indexOf('#')) || '(sin hash)',
  )

  await pagina.goBack()
  await pagina.waitForTimeout(1200)
  const destino = new URL(pagina.url()).pathname.replace(/\/$/, '') || '/'
  anotar(destino === '/', 'un atrás devuelve a la página anterior', `quedó en ${pagina.url()}`)

  await contexto.close()
}

// ───────────────────────────────────────────────────────────────────────────
// 3 · Teléfono: la hoja de filtros sí deja entrada propia y atrás la cierra
// ───────────────────────────────────────────────────────────────────────────
{
  const contexto = await navegador.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true})
  const pagina = await contexto.newPage()
  await pagina.goto(`${BASE}/catalogo`, {waitUntil: 'load', timeout: 60000})
  await pagina.waitForFunction(() => !!document.querySelector('[data-catalogo][data-enganchada]'), null, {timeout: 15000})
  await pagina.waitForTimeout(2600)

  const antes = await pagina.evaluate(() => history.length)
  await pagina.click('.filtrar[data-abre-filtros]')
  await pagina.waitForTimeout(400)
  const abierta = await pagina.evaluate(() => !document.querySelector('[data-hoja-filtros]').hidden)
  const despues = await pagina.evaluate(() => history.length)
  anotar(abierta && despues === antes + 1, 'abrir la hoja de filtros agrega una entrada', `history.length ${antes} → ${despues}`)

  // Con un filtro puesto DENTRO de la hoja: atrás la cierra y NO deshace el
  // filtro. El acordeón abre con Materia desplegada, así que no hay que tocarlo.
  const primera = await pagina.$('.hoja input[data-eje="materia"]:not([disabled])')
  await primera.click()
  await pagina.waitForTimeout(300)
  const elegido = await primera.getAttribute('data-valor')

  await pagina.goBack()
  await pagina.waitForTimeout(600)
  const cerrada = await pagina.evaluate(() => document.querySelector('[data-hoja-filtros]').hidden)
  const sigueFiltrado = await pagina.evaluate(
    (valor) => location.hash.includes(encodeURIComponent(valor)),
    elegido,
  )
  const enCatalogo = new URL(pagina.url()).pathname.replace(/\/$/, '') === '/catalogo'
  anotar(cerrada && enCatalogo, 'atrás cierra la hoja sin salir del catálogo')
  anotar(sigueFiltrado, 'el filtro puesto dentro de la hoja sobrevive al cierre', `materia=${elegido}`)

  await contexto.close()
}

await navegador.close()

console.log('')
if (fallas.length) {
  console.log(`Prueba 05: FALLA (${fallas.length})`)
  process.exit(1)
}
console.log('Prueba 05: OK')
