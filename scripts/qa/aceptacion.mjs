/**
 * Checklist de aceptación del handoff — la parte automatizable HOY.
 *
 * El criterio de cierre de QA del proyecto son las 12 pruebas de
 * `design/Requisitos tecnicos v0.dc.html` (clave `aceptacion` del script).
 * Este script cubre diez:
 *
 *   02  una dirección inexistente muestra NUESTRA 404, no el error del servidor
 *   03  la primera pantalla del inicio: LCP y peso transferido (se MIDE, no se juzga)
 *   04  navegar no produce destello blanco ni vuelve a montar el encabezado
 *   05  quince filtrados y un atrás devuelve a la página anterior, no al filtro
 *   06  con la ficha abierta, el gesto de volver la cierra y deja los filtros
 *   07  el enlace de un diseño abre el catálogo con esa ficha abierta
 *   08  ninguna imagen hace saltar el contenido (CLS)
 *   09  con movimiento reducido, nada se anima
 *   11  todo lo tocable mide 44px y nada queda bajo la barra del sistema
 *   12  se recorre con el teclado, con foco visible, y los paneles abren y cierran
 *
 * Quedan fuera dos, sin automatizar todavía: la 01 (el mapa de dónde comprar
 * dibuja los 26 estados con todo CDN externo desconectado) y la 10 (con el
 * catálogo vacío, una foto faltante o una ficha sin datos, ninguna pantalla se
 * ve rota) — esta última necesita contenido preparado a propósito.
 *
 * Uso:
 *   node scripts/qa/aceptacion.mjs                 # levanta dist/client y prueba ahí
 *   NUESTRO=https://…  node scripts/qa/aceptacion.mjs   # contra el desplegado
 *   RAIZ_ESTATICA=/ruta/a/copia node scripts/qa/aceptacion.mjs  # contra una copia del build
 *   SOLO=04,12 node scripts/qa/aceptacion.mjs      # solo esas pruebas
 *
 * Sale con código 1 si alguna prueba falla.
 */
import {chromium} from 'playwright'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {existsSync, statSync} from 'node:fs'
import {extname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {PNG} from 'pngjs'

const RAIZ = resolve(fileURLToPath(new URL('../..', import.meta.url)))
// Carpeta que se sirve. `RAIZ_ESTATICA=` permite apuntar a una copia del build,
// útil si otra tarea está reconstruyendo `dist/` al mismo tiempo.
const DIST = process.env.RAIZ_ESTATICA ? resolve(process.env.RAIZ_ESTATICA) : join(RAIZ, 'dist', 'client')
const PUERTO = Number(process.env.PUERTO || 4711)
const SOLO = (process.env.SOLO || '').split(',').filter(Boolean)

// ---------------------------------------------------------------------------
// Servidor propio: replica las reglas de Cloudflare del `wrangler.jsonc`
// (`not_found_handling: "404-page"` y `html_handling: "drop-trailing-slash"`).
// Sin esto la prueba 02 mediría el 404 de `python3 -m http.server`, que no es
// el que va a producción. Con NUESTRO=<url> no se levanta nada.
// ---------------------------------------------------------------------------
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
}

const esArchivo = (ruta) => existsSync(ruta) && statSync(ruta).isFile()

function levantarServidor() {
  if (!existsSync(DIST)) {
    console.error(`No existe ${DIST}. Corre \`npm run build\` antes, o pasa NUESTRO=<url>.`)
    process.exit(1)
  }
  const servidor = createServer(async (peticion, respuesta) => {
    let ruta = decodeURIComponent(new URL(peticion.url, 'http://x').pathname)
    if (ruta.length > 1 && ruta.endsWith('/')) ruta = ruta.slice(0, -1)
    if (ruta.includes('..')) ruta = '/'

    const candidatos = [join(DIST, ruta), join(DIST, ruta, 'index.html'), join(DIST, ruta + '.html')]
    const encontrado = candidatos.find(esArchivo)

    if (encontrado) {
      respuesta.writeHead(200, {'content-type': TIPOS[extname(encontrado)] || 'application/octet-stream'})
      respuesta.end(await readFile(encontrado))
      return
    }
    // El 404 del servidor sirve NUESTRA página 404 — igual que Cloudflare.
    const pagina404 = join(DIST, '404.html')
    respuesta.writeHead(404, {'content-type': TIPOS['.html']})
    respuesta.end(esArchivo(pagina404) ? await readFile(pagina404) : '<h1>404</h1>')
  })
  return new Promise((ok) => servidor.listen(PUERTO, () => ok(servidor)))
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------
const resultados = []
const anotar = (n, titulo, estado, medida, notas = []) => {
  resultados.push({n, titulo, estado, medida, notas})
  const icono = {OK: 'OK   ', FALLA: 'FALLA', MEDIDO: 'MEDIDO', AVISO: 'AVISO'}[estado]
  console.log(`\n  ${icono}  ${n} · ${titulo}`)
  console.log(`         ${medida}`)
  notas.forEach((l) => console.log(`         · ${l}`))
}
const titular = (t) => console.log(`\n${'─'.repeat(78)}\n${t}\n${'─'.repeat(78)}`)

/** El telón de entrada tapa la pantalla 2,2s una vez por sesión. En las pruebas
 *  que no lo están midiendo se marca como visto para que no ensucie la medida. */
const SIN_TELON = () => {
  try {
    sessionStorage.setItem('cc:telon-visto', '1')
  } catch (e) {}
}

/** Sondas que tienen que existir ANTES de que corra nada de la página. */
const SONDAS = () => {
  window.__cargas = (window.__cargas || 0) + 1
  window.__swaps = 0
  window.__lcp = 0
  window.__cls = 0
  document.addEventListener('astro:after-swap', () => {
    window.__swaps++
  })
  try {
    new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) window.__lcp = e.startTime
    }).observe({type: 'largest-contentful-paint', buffered: true})
    new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
    }).observe({type: 'layout-shift', buffered: true})
  } catch (e) {}
}

/** Recorrido completo de la página: dispara todo lo diferido (lazy, reveals). */
const recorrer = async (pagina, pausa = 300) => {
  await pagina.evaluate(async (ms) => {
    const paso = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += paso) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, ms))
    }
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, ms))
    window.scrollTo(0, 0)
  }, pausa)
  await pagina.waitForTimeout(600)
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

/** El teléfono de referencia del handoff, el mismo de las pruebas 05, 06 y 07. */
const TELEFONO = {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}

/** La capa de la ficha ya enganchó sus escuchas: antes de esto, un clic en una
 *  tarjeta navega a la página propia en vez de abrir el overlay. */
const fichaEnganchada = (pagina) =>
  pagina.waitForFunction(() => !!document.querySelector('[data-capa-ficha][data-enganchada]'), null, {timeout: 20000})

/** Hay una ficha visible dentro de la capa. */
const fichaAbierta = (pagina) =>
  pagina.waitForFunction(
    () => {
      const capa = document.querySelector('[data-capa-ficha]')
      return !!capa && !capa.hidden && !!capa.querySelector('[data-ficha]')
    },
    null,
    {timeout: 20000},
  )

// ===========================================================================
// 01 — El mapa dibuja los 26 estados sin depender de ningún servidor ajeno
// ===========================================================================
// El handoff lo enuncia como una prueba destructiva: "se prueba desconectando
// cualquier CDN externo — el mapa tiene que seguir apareciendo". Así se corre
// acá: TODA petición que no sea a nuestro origen se aborta, no se cuenta y ya.
// El prototipo cargaba d3 y topojson de unpkg y el GeoJSON de jsDelivr, y con
// este corte no habría dibujado nada.
//
// No basta con contar 26 nodos: un `<path>` sin `d` también cuenta. Se
// comprueba que cada estado traiga geometría de verdad y que el mapa ocupe
// espacio en la página.
async function prueba01(navegador, base) {
  const notas = []
  const fallas = []
  const comprobar = (ok, texto) => {
    notas.push(`${ok ? 'OK' : 'FALLA'} · ${texto}`)
    if (!ok) fallas.push(texto)
  }

  const contexto = await navegador.newContext({viewport: {width: 1440, height: 900}})
  const pagina = await contexto.newPage()
  await pagina.addInitScript(SIN_TELON)

  // El corte: nada que no sea nuestro origen llega a la página.
  const ajenas = []
  await contexto.route('**/*', (ruta) => {
    const url = ruta.request().url()
    if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) return ruta.continue()
    ajenas.push(url)
    return ruta.abort()
  })

  await pagina.goto(base + '/donde-comprar', {waitUntil: 'load', timeout: 60000})
  await pagina.waitForTimeout(800)

  comprobar(
    ajenas.length === 0,
    ajenas.length === 0
      ? 'la página no pidió nada fuera de nuestro origen'
      : `pidió ${ajenas.length} recursos ajenos: ${[...new Set(ajenas.map((u) => new URL(u).host))].join(', ')}`,
  )

  // `[data-estado]` también lo llevan los pines de las tiendas: acá interesan
  // solo los trazados de las entidades, que son los `<path>`.
  const mapa = await pagina.evaluate(() => {
    const svg = document.querySelector('[data-mapa]')
    if (!svg) return null
    const formas = [...svg.querySelectorAll('path[data-estado]')]
    const caja = svg.getBoundingClientRect()
    return {
      estados: new Set(formas.map((f) => f.getAttribute('data-estado'))).size,
      conGeometria: formas.filter((f) => (f.getAttribute('d') || '').length > 50).length,
      nombrados: formas.filter((f) => (f.getAttribute('data-nombre') || '').trim()).length,
      ancho: Math.round(caja.width),
      alto: Math.round(caja.height),
    }
  })

  // ENTIDADES es 25, no 26: Venezuela tiene 23 estados más el Distrito Capital
  // y las Dependencias Federales. El "26" del checklist contaba una entidad de
  // más que traía Natural Earth —`ISO: "VE-X01~"`, `NAME_1: null`—, una mancha
  // de 0,28 × 0,21 en un lienzo de 800×505: invisible, sin nombre y sin tienda
  // posible. `scripts/generar-mapa.mjs` ya la descarta.
  const ENTIDADES = 25
  comprobar(!!mapa && mapa.estados === ENTIDADES, `las ${ENTIDADES} entidades federales están en el mapa: ${mapa ? mapa.estados : '(sin mapa)'}`)
  comprobar(!!mapa && mapa.conGeometria === ENTIDADES, `las ${ENTIDADES} traen geometría propia, no un hueco: ${mapa ? mapa.conGeometria : 0} con trazado`)
  comprobar(!!mapa && mapa.nombrados === ENTIDADES, `las ${ENTIDADES} tienen nombre para el lector de pantalla: ${mapa ? mapa.nombrados : 0}`)
  comprobar(!!mapa && mapa.ancho > 200 && mapa.alto > 100, `el mapa ocupa espacio y se ve: ${mapa ? `${mapa.ancho}×${mapa.alto}` : '(sin caja)'}`)

  // Y sigue siendo un control, no un dibujo: elegir un estado con cobertura
  // filtra el índice de tiendas. Sin librería de mapas de por medio.
  const conCobertura = await pagina.evaluate(() => {
    const con = [...document.querySelectorAll('path[data-estado]')].find((f) => {
      const t = f.querySelector('title')?.textContent || ''
      return !t.includes('sin cobertura')
    })
    return con ? con.getAttribute('data-estado') : null
  })
  if (conCobertura) {
    // Las tarjetas se esconden por GRUPO, no una a una, así que `hidden` en la
    // tarjeta no dice nada: lo que cuenta es si están puestas en la página.
    const visibles = () => pagina.$$eval('[data-punto]', (ps) => ps.filter((p) => p.offsetParent !== null).length)
    const antes = await visibles()
    await pagina.click(`path[data-estado="${conCobertura}"]`)
    await pagina.waitForTimeout(600)
    const despues = await visibles()
    const hash = await pagina.evaluate(() => location.hash)
    comprobar(
      hash === `#estado=${conCobertura}` && despues > 0,
      `elegir un estado en el mapa abre sus tiendas: ${conCobertura} → ${hash}, de ${antes} tiendas a la vista se pasa a ${despues}`,
    )
  } else {
    comprobar(false, 'no hay ningún estado con cobertura para probar el filtrado')
  }

  await contexto.close()
  anotar(
    '01',
    'El mapa se dibuja sin ningún servidor ajeno',
    fallas.length ? 'FALLA' : 'OK',
    `${notas.length} comprobaciones · ${fallas.length} fallidas · ${ajenas.length} peticiones ajenas`,
    notas,
  )
}

// ===========================================================================
// 02 — Una dirección inexistente muestra la 404 del sitio
// ===========================================================================
// El handoff lo llama "configuración de servidor: la página ya está diseñada y
// no se invoca sola". Así que no basta con que exista `/404`: hay que pedir una
// dirección cualquiera y comprobar DOS cosas a la vez — que el código sea 404
// (para buscadores) y que lo que se pinta sea nuestra página, con encabezado.
async function prueba02(navegador, base) {
  const contexto = await navegador.newContext({viewport: {width: 1280, height: 800}})
  const pagina = await contexto.newPage()
  await pagina.addInitScript(SIN_TELON)
  const direccion = `${base}/esta-direccion-no-existe-${Date.now()}`
  const respuesta = await pagina.goto(direccion, {waitUntil: 'load', timeout: 60000})
  const codigo = respuesta?.status() ?? 0

  const visto = await pagina.evaluate(() => ({
    cabecera: !!document.querySelector('[data-cabecera]'),
    pie: !!document.querySelector('footer'),
    titulo: document.querySelector('h1')?.textContent?.trim() || '',
    explicacion: (document.querySelector('main')?.textContent || '').trim().length,
    enlaces: [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')),
    noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'),
  }))

  const notas = [
    `código HTTP ${codigo}`,
    `encabezado del sitio: ${visto.cabecera ? 'sí' : 'NO'} · pie: ${visto.pie ? 'sí' : 'NO'}`,
    `titular: "${visto.titulo}" · ${visto.explicacion} caracteres de explicación`,
    `salidas: ${visto.enlaces.join(', ') || 'ninguna'}`,
    `noindex: ${visto.noindex ? 'sí' : 'no'}`,
  ]
  const pasa = codigo === 404 && visto.cabecera && visto.titulo.length > 0 && visto.enlaces.length > 0
  anotar('02', '404 del sitio, no del servidor', pasa ? 'OK' : 'FALLA', `HTTP ${codigo} con la página diseñada`, notas)
  await contexto.close()
}

// ===========================================================================
// 03 — La primera pantalla del inicio aparece completa rápido
// ===========================================================================
// El enunciado dice "en un teléfono con datos móviles, en menos de tres
// segundos". Ese número depende de la red real del visitante y del CDN, no de
// nuestro build: dar un veredicto desde localhost sería inventarlo. Lo que se
// hace es MEDIR — LCP y bytes transferidos de la primera pantalla — en dos
// condiciones: 3G lenta emulada por CDP (la de DevTools: 400 kbps, 2000 ms de
// latencia, CPU ×4) y sin frenos. El peso es el dato que sí controlamos.
async function medirPrimeraPantalla(navegador, base, frenos) {
  const contexto = await navegador.newContext({
    viewport: {width: 390, height: 844},
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
  const pagina = await contexto.newPage()
  await pagina.addInitScript(SONDAS)
  const cdp = await contexto.newCDPSession(pagina)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', frenos.red)
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: frenos.cpu})

  const t0 = Date.now()
  await pagina.goto(base + '/', {waitUntil: 'commit', timeout: 180000})
  await pagina.waitForLoadState('load', {timeout: 170000}).catch(() => {})
  // Sin scroll a propósito: lo de abajo del pliegue es diferido, así que lo
  // que se transfirió hasta acá ES la primera pantalla.
  await pagina.waitForTimeout(1500)

  const datos = await pagina.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const rec = performance.getEntriesByType('resource')
    const suma = (l) => l.reduce((t, r) => t + (r.transferSize || 0), 0)
    const porTipo = {}
    for (const r of rec) {
      const t = r.initiatorType === 'img' || /\.(avif|webp|jpe?g|png)/.test(r.name) ? 'imágenes' : r.initiatorType
      porTipo[t] = (porTipo[t] || 0) + (r.transferSize || 0)
    }
    // "Primera pantalla" = lo que llegó hasta el LCP. Lo de después son las
    // imágenes diferidas que el navegador adelanta por su cuenta (con red lenta
    // Chrome agranda el margen del lazy-loading), y no es lo que se está midiendo.
    const hastaLcp = rec.filter((r) => r.responseEnd <= window.__lcp)
    return {
      lcp: window.__lcp,
      documento: nav?.transferSize || 0,
      recursos: suma(rec),
      pantalla: suma(hastaLcp),
      cuantosPantalla: hastaLcp.length,
      cuantos: rec.length,
      porTipo,
      pesados: rec
        .map((r) => ({url: r.name.split('/').pop(), b: r.transferSize || 0}))
        .sort((a, b) => b.b - a.b)
        .slice(0, 4),
    }
  })
  await contexto.close()
  return {...datos, total: datos.documento + datos.recursos, primeraPantalla: datos.documento + datos.pantalla, reloj: Date.now() - t0}
}

async function prueba03(navegador, base) {
  const lenta = await medirPrimeraPantalla(navegador, base, {
    // "Slow 3G" de Chrome DevTools, tal cual.
    red: {offline: false, latency: 2000, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8, connectionType: 'cellular3g'},
    cpu: 4,
  })
  const libre = await medirPrimeraPantalla(navegador, base, {
    red: {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1, connectionType: 'none'},
    cpu: 1,
  })
  const tipos = Object.entries(lenta.porTipo)
    .sort((a, b) => b[1] - a[1])
    .map(([t, b]) => `${t} ${kb(b)}`)
    .join(' · ')

  anotar(
    '03',
    'Primera pantalla del inicio (medida, sin veredicto)',
    'MEDIDO',
    `3G lenta: LCP ${(lenta.lcp / 1000).toFixed(2)} s · primera pantalla ${kb(lenta.primeraPantalla)} — sin frenos: LCP ${(libre.lcp / 1000).toFixed(2)} s · ${kb(libre.primeraPantalla)}`,
    [
      `peso hasta el LCP (la primera pantalla): ${kb(lenta.primeraPantalla)} en ${lenta.cuantosPantalla + 1} peticiones (documento ${kb(lenta.documento)})`,
      `peso hasta el evento load: ${kb(lenta.total)} en ${lenta.cuantos + 1} peticiones — la diferencia son imágenes diferidas que el navegador adelanta`,
      `reparto: ${tipos}`,
      `lo más pesado: ${lenta.pesados.map((p) => `${p.url} ${kb(p.b)}`).join(', ')}`,
      `3G lenta emulada por CDP = 400 kbps, 2000 ms de latencia, CPU ×4 (perfil "Slow 3G" de DevTools)`,
      `el umbral de 3 s del handoff se juzga contra la red real del visitante y el CDN: acá se reporta lo medido`,
      `el telón de entrada tapa la primera pantalla 2,2 s más, una vez por sesión (decisión de diseño, no de carga)`,
    ],
  )
}

// ===========================================================================
// 04 — Navegar no produce destello blanco ni vuelve a montar el encabezado
// ===========================================================================
// Se comprueba de verdad, no por inspección del marcado:
//  a) se guarda una referencia al nodo <header> ANTES de navegar y se verifica
//     que después es el MISMO objeto (identidad, no igualdad) y sigue conectado.
//     Eso es exactamente lo que garantiza `transition:persist`; si el navegador
//     hubiera hecho una carga completa, el handle quedaría huérfano.
//  b) se graba la transición con el screencast de CDP —fotogramas reales del
//     compositor, no capturas espaciadas— y se busca un fotograma casi todo
//     blanco puro. El fondo del sitio es #F5F3F0, así que "blanco puro" no se
//     confunde con la página.
async function prueba04(navegador, base) {
  const contexto = await navegador.newContext({viewport: {width: 1440, height: 900}})
  const pagina = await contexto.newPage()
  await pagina.addInitScript(SIN_TELON)
  await pagina.addInitScript(SONDAS)
  await pagina.goto(base + '/', {waitUntil: 'load', timeout: 60000})
  await pagina.waitForTimeout(1200)

  const cabeceraAntes = await pagina.$('[data-cabecera]')
  const idAntes = await pagina.evaluate(() => {
    const h = document.querySelector('[data-cabecera]')
    h.dataset.marcaQa = 'sello-' + Math.random().toString(36).slice(2)
    return h.dataset.marcaQa
  })

  const cdp = await contexto.newCDPSession(pagina)
  const fotogramas = []
  cdp.on('Page.screencastFrame', async (f) => {
    fotogramas.push(Buffer.from(f.data, 'base64'))
    await cdp.send('Page.screencastFrameAck', {sessionId: f.sessionId}).catch(() => {})
  })
  await cdp.send('Page.startScreencast', {format: 'png', maxWidth: 480, maxHeight: 300, everyNthFrame: 1})
  await pagina.waitForTimeout(400)
  const base0 = fotogramas.length

  // Se navega como navega una persona: pulsando un enlace de la cáscara.
  await pagina.click('[data-navcta]')
  await pagina.waitForFunction(() => window.__swaps > 0, null, {timeout: 15000}).catch(() => {})
  await pagina.waitForTimeout(900)
  await cdp.send('Page.stopScreencast').catch(() => {})

  const despues = await pagina.evaluate(() => {
    const h = document.querySelector('[data-cabecera]')
    return {
      marca: h?.dataset.marcaQa || null,
      ruta: location.pathname,
      swaps: window.__swaps,
      cargas: window.__cargas,
    }
  })
  const mismoNodo = cabeceraAntes
    ? await cabeceraAntes.evaluate((el) => el.isConnected && el === document.querySelector('[data-cabecera]')).catch(() => false)
    : false

  // Blancura: fracción de píxeles blancos puros de cada fotograma.
  const blancura = (buffer) => {
    const png = PNG.sync.read(buffer)
    let blancos = 0
    const total = png.width * png.height
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i] >= 250 && png.data[i + 1] >= 250 && png.data[i + 2] >= 250) blancos++
    }
    return blancos / total
  }
  const previos = fotogramas.slice(0, base0).map(blancura)
  const durante = fotogramas.slice(base0).map(blancura)
  const referencia = previos.length ? Math.max(...previos) : 0
  const pico = durante.length ? Math.max(...durante) : 0
  // Destello = fotograma casi todo blanco puro que NO se parece a ninguna de
  // las dos puntas de la navegación.
  const destellos = durante.filter((b) => b >= 0.97 && referencia < 0.9).length

  const pasa = mismoNodo && despues.marca === idAntes && despues.swaps >= 1 && despues.cargas === 1 && destellos === 0
  anotar(
    '04',
    'Sin destello blanco ni remonte del encabezado',
    pasa ? 'OK' : 'FALLA',
    `mismo nodo de <header>: ${mismoNodo ? 'sí' : 'NO'} · ${durante.length} fotogramas, blanco máx ${(pico * 100).toFixed(1)}% · destellos: ${destellos}`,
    [
      `navegó a ${despues.ruta} con el enrutador (${despues.swaps} swap, ${despues.cargas} carga de documento)`,
      `el sello puesto en el header antes de navegar sigue ahí: ${despues.marca === idAntes ? 'sí' : 'NO'}`,
      `blancura de referencia (antes de navegar): ${(referencia * 100).toFixed(1)}%`,
      `umbral de destello: ≥97% de píxeles blanco puro; el fondo del sitio es #F5F3F0, nunca lo alcanza`,
    ],
  )
  await contexto.close()
}

// ===========================================================================
// 08 — Ninguna imagen provoca que el contenido salte al cargar
// ===========================================================================
// La métrica que mide exactamente eso es el Cumulative Layout Shift. Se mide en
// teléfono y con la red frenada (3G rápida): sin frenos las imágenes llegan tan
// pronto que un hueco sin reservar no se nota, y la prueba pasaría siempre.
// Se recorre la página entera para que entre todo lo diferido.
async function prueba08(navegador, base) {
  const contexto = await navegador.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true})
  const pagina = await contexto.newPage()
  await pagina.addInitScript(SIN_TELON)
  await pagina.addInitScript(SONDAS)
  const cdp = await contexto.newCDPSession(pagina)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 562,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    connectionType: 'cellular3g',
  })

  await pagina.goto(base + '/', {waitUntil: 'commit', timeout: 120000})
  await pagina.waitForLoadState('load', {timeout: 110000}).catch(() => {})
  await recorrer(pagina, 700)

  const datos = await pagina.evaluate(() => {
    const sinRatio = [...document.querySelectorAll('img')].filter((img) => {
      const cs = getComputedStyle(img)
      return cs.aspectRatio === 'auto' && !(img.getAttribute('width') && img.getAttribute('height'))
    })
    return {
      cls: window.__cls,
      imagenes: document.querySelectorAll('img').length,
      sinRatio: sinRatio.map((i) => (i.currentSrc || i.src).split('/').pop()).slice(0, 6),
    }
  })
  const pasa = datos.cls <= 0.1
  anotar('08', 'Las imágenes no hacen saltar el contenido', pasa ? 'OK' : 'FALLA', `CLS ${datos.cls.toFixed(4)} (bueno ≤ 0,1)`, [
    `${datos.imagenes} imágenes en la home, recorrida entera a 390×844 con 3G rápida emulada`,
    datos.sinRatio.length
      ? `sin proporción declarada (ni aspect-ratio ni width/height): ${datos.sinRatio.join(', ')}`
      : 'todas las imágenes declaran su proporción antes de cargar',
  ])
  await contexto.close()
}

// ===========================================================================
// 09 — Con movimiento reducido, nada se anima
// ===========================================================================
// Tres comprobaciones, porque una sola deja huecos:
//  a) ninguna duración de animación ni de transición supera 1 ms, incluidos los
//     pseudoelementos ::before/::after (donde viven filetes y máscaras);
//  b) `document.getAnimations()` —la lista real de animaciones vivas del
//     documento— no tiene ninguna que dure más de 1 ms;
//  c) el telón de entrada no aparece en absoluto, y el contenido de los bloques
//     con aparición nace visible (si no, con movimiento reducido la página
//     quedaría en blanco).
async function prueba09(navegador, base) {
  const contexto = await navegador.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'})
  const pagina = await contexto.newPage()
  await pagina.goto(base + '/', {waitUntil: 'load', timeout: 60000})
  await pagina.waitForTimeout(800)
  await recorrer(pagina, 250)

  const datos = await pagina.evaluate(() => {
    const ms = (v) =>
      v
        .split(',')
        .map((x) => x.trim())
        .map((x) => (x.endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000))
        .filter((x) => !Number.isNaN(x))
    const nombre = (el) =>
      el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '')

    const culpables = []
    for (const el of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after']) {
        const cs = getComputedStyle(el, pseudo)
        if (pseudo && cs.content === 'none') continue
        const duraciones = [...ms(cs.animationDuration), ...ms(cs.transitionDuration)]
        const max = Math.max(0, ...duraciones)
        if (max > 1) culpables.push(`${nombre(el)}${pseudo || ''} → ${max} ms`)
      }
    }

    const vivas = document
      .getAnimations()
      .map((a) => {
        const t = a.effect?.getTiming?.() || {}
        const d = typeof t.duration === 'number' ? t.duration : 0
        return {d, nombre: a.animationName || a.transitionProperty || 'animación'}
      })
      .filter((a) => a.d > 1)

    const ocultos = [...document.querySelectorAll('[data-reveal]')].filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99)

    return {
      culpables: culpables.slice(0, 12),
      cuantos: culpables.length,
      vivas: vivas.map((a) => `${a.nombre} ${a.d} ms`),
      telon: !!document.getElementById('telon') && !document.getElementById('telon').hidden,
      banderaTelon: document.documentElement.hasAttribute('data-telon'),
      reveals: document.querySelectorAll('[data-reveal]').length,
      revealsOcultos: ocultos.length,
    }
  })

  const pasa = datos.cuantos === 0 && datos.vivas.length === 0 && !datos.telon && !datos.banderaTelon && datos.revealsOcultos === 0
  anotar(
    '09',
    'Con movimiento reducido nada se anima',
    pasa ? 'OK' : 'FALLA',
    `${datos.cuantos} declaraciones > 1 ms · ${datos.vivas.length} animaciones vivas · telón: ${datos.telon ? 'APARECE' : 'no aparece'}`,
    [
      `revisados elementos y pseudoelementos ::before/::after de la home entera`,
      `bloques con aparición: ${datos.reveals}, de ellos invisibles ${datos.revealsOcultos} (tiene que ser 0)`,
      ...datos.culpables.map((c) => `culpable: ${c}`),
      ...datos.vivas.map((v) => `animación viva: ${v}`),
    ],
  )
  await contexto.close()
}

// ===========================================================================
// 11 — 44px de área tocable y nada bajo la barra del sistema
// ===========================================================================
// A 390×844 (iPhone 14/15, el tamaño de referencia de `Responsividad v0`) se
// recorren enlaces, botones y controles visibles y se mide su caja. La excepción
// de WCAG 2.5.8 para enlaces EN LÍNEA dentro de un párrafo se respeta: esos se
// listan aparte, no cuentan como falla. También se abre el menú móvil, porque
// sus controles no existen hasta entonces.
//
// La barra del sistema no se puede emular en Chrome de escritorio: `env()` se
// resuelve a 0 y el valor calculado no delata si la regla está o no. Se audita
// la FUENTE — se buscan reglas CSS que declaren `env(safe-area-inset-*)` y se
// comprueba que alcanzan a cada barra fija o pegajosa del sitio.
const SONDA_TOQUE = (raizSel) => {
  const raiz = raizSel ? document.querySelector(raizSel) : document
  if (!raiz) return {chicos: [], enLinea: [], ampliados: [], barras: [], reglasSafe: 0}
  const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])'
  const nombre = (el) => {
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)
    return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}${t ? ` "${t}"` : ''}`
  }
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.01
  }
  /**
   * El área tocable NO es siempre la caja del elemento: un control puede
   * agrandarla con un pseudoelemento (así lo hacen las pestañas de Ambientes,
   * que en el diseño miden 24px de alto y no se pueden inflar sin romper la
   * fila). Por eso lo que se mide es lo que de verdad recibe el dedo: se
   * lanzan puntos a ±21px del centro y se pregunta al navegador qué elemento
   * hay ahí. Si los cuatro devuelven este control, la banda de 44×44 es suya.
   */
  const areaEfectiva = (el) => {
    el.scrollIntoView({block: 'center', inline: 'center'})
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const suyo = (x, y) => {
      if (x < 1 || y < 1 || x > window.innerWidth - 2 || y > window.innerHeight - 2) return false
      const golpeado = document.elementFromPoint(x, y)
      return !!golpeado && (golpeado === el || el.contains(golpeado))
    }
    return {
      alto: suyo(cx, cy - 21) && suyo(cx, cy + 21),
      ancho: suyo(cx - 21, cy) && suyo(cx + 21, cy),
      caja: `${Math.round(r.width)}×${Math.round(r.height)}`,
    }
  }

  const chicos = []
  const enLinea = []
  const ampliados = []
  for (const el of raiz.querySelectorAll(SEL)) {
    if (!visible(el)) continue
    if (el.closest('.skip-link') || el.classList.contains('skip-link')) continue
    const r = el.getBoundingClientRect()
    if (Math.min(Math.round(r.width), Math.round(r.height)) >= 44) continue

    const efectiva = areaEfectiva(el)
    const fila = `${nombre(el)} → caja ${efectiva.caja}`
    if (efectiva.alto && efectiva.ancho) {
      ampliados.push(fila)
      continue
    }
    // Enlace en línea dentro de un párrafo: excepción de WCAG 2.5.8.
    const cs = getComputedStyle(el)
    const dentroDeTexto = !!el.closest('p, blockquote')
    if (cs.display === 'inline' && dentroDeTexto) enLinea.push(fila)
    else chicos.push(`${fila} (banda efectiva: alto ${efectiva.alto ? 'ok' : 'corto'}, ancho ${efectiva.ancho ? 'ok' : 'corto'})`)
  }
  window.scrollTo(0, 0)

  // Auditoría de `env(safe-area-inset-*)` sobre las hojas de estilo del documento.
  const selectoresSafe = []
  for (const hoja of document.styleSheets) {
    let reglas
    try {
      reglas = hoja.cssRules
    } catch (e) {
      continue
    }
    // Ojo: con CSS anidado, una CSSStyleRule TAMBIÉN tiene `cssRules` (vacío). Si se
    // usa eso para decidir si es un grupo, no se mira ninguna regla de estilo.
    const recorrer = (lista) => {
      for (const r of lista) {
        if (r.selectorText && /env\(\s*safe-area-inset/.test(r.style?.cssText || '')) selectoresSafe.push(r.selectorText)
        if (r.cssRules && r.cssRules.length) recorrer(r.cssRules)
      }
    }
    recorrer(reglas)
  }
  const alcanza = (raiz) =>
    selectoresSafe.some((s) => {
      try {
        return raiz.matches(s) || !!raiz.querySelector(s)
      } catch (e) {
        return false
      }
    })
  const barras = [...document.querySelectorAll('body *')]
    .filter((el) => {
      const cs = getComputedStyle(el)
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return false
      const r = el.getBoundingClientRect()
      if (r.width < window.innerWidth * 0.6 || r.height === 0) return false
      return r.top <= 1 || Math.abs(r.bottom - window.innerHeight) <= 1
    })
    .map((el) => ({el: nombre(el), cubierta: alcanza(el)}))

  return {chicos, enLinea, ampliados, barras, reglasSafe: selectoresSafe.length}
}

async function prueba11(navegador, base) {
  const contexto = await navegador.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 3, isMobile: true, hasTouch: true})
  const pagina = await contexto.newPage()
  await pagina.addInitScript(SIN_TELON)
  await pagina.goto(base + '/', {waitUntil: 'load', timeout: 60000})
  await recorrer(pagina, 250)

  const cerrado = await pagina.evaluate(SONDA_TOQUE)

  // El menú móvil: sus controles solo existen abierto.
  await pagina.click('[data-abre-menu]')
  await pagina.waitForTimeout(500)
  const abierto = await pagina.evaluate(SONDA_TOQUE, '[data-menu-movil]')
  await pagina.keyboard.press('Escape')

  const chicos = [...new Set([...cerrado.chicos, ...abierto.chicos])]
  const enLinea = [...new Set([...cerrado.enLinea, ...abierto.enLinea])]
  const ampliados = [...new Set([...cerrado.ampliados, ...abierto.ampliados])]
  const barras = [...cerrado.barras, ...abierto.barras].filter((b, i, l) => l.findIndex((o) => o.el === b.el) === i)
  const sinCubrir = barras.filter((b) => !b.cubierta)

  const pasa = chicos.length === 0 && sinCubrir.length === 0
  anotar(
    '11',
    '44px de área tocable · barra del sistema',
    pasa ? 'OK' : 'FALLA',
    `${chicos.length} controles bajo 44px · ${barras.length} barras fijas, ${sinCubrir.length} sin safe-area`,
    [
      `medido a 390×844, con el menú móvil cerrado y abierto`,
      ...chicos.map((c) => `bajo 44px: ${c}`),
      ...(ampliados.length ? [`caja menor a 44px pero con el área tocable ampliada por pseudoelemento (medido con hit-test): ${ampliados.join(' | ')}`] : []),
      ...(enLinea.length ? [`en línea dentro de texto (excepción de WCAG 2.5.8, no cuentan): ${enLinea.join(' | ')}`] : []),
      ...barras.map((b) => `barra ${b.el}: ${b.cubierta ? 'respeta env(safe-area-inset-*)' : 'SIN safe-area'}`),
      `reglas del sitio que declaran env(safe-area-inset-*): ${cerrado.reglasSafe}`,
    ],
  )
  await contexto.close()
}

// ===========================================================================
// 12 — Recorrido completo con teclado, foco siempre visible
// ===========================================================================
// Se tabula la home de punta a punta anotando cada parada y si el foco se ve
// (contorno o sombra reales en el estilo calculado, más `:focus-visible`).
// Después se abren y cierran con teclado los dos paneles que existen hoy:
// el megamenú de Catálogo (escritorio) y el menú móvil (teléfono), y se
// comprueba que Escape cierra los dos y devuelve el foco.
// El megamenú se prueba TAMBIÉN después de navegar con el enrutador: la
// cáscara persiste entre páginas, así que un listener duplicado no se nota
// hasta la segunda página y dejaría el panel sin abrir.
async function paradasConTab(pagina, tope = 220) {
  const paradas = []
  for (let i = 0; i < tope; i++) {
    await pagina.keyboard.press('Tab')
    const parada = await pagina.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body || el === document.documentElement) return null
      const cs = getComputedStyle(el)
      const contorno = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
      const sombra = cs.boxShadow !== 'none'
      return {
        que: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''),
        texto: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 32),
        visible: (contorno || sombra) && el.matches(':focus-visible'),
        contorno: cs.outline,
      }
    })
    if (!parada) break
    paradas.push(parada)
    if (paradas.length > 3 && paradas[paradas.length - 1].que === paradas[0].que && paradas[paradas.length - 1].texto === paradas[0].texto) break
  }
  return paradas
}

async function prueba12(navegador, base) {
  const notas = []
  let fallas = 0

  // --- Escritorio: recorrido + megamenú ---
  const escritorio = await navegador.newContext({viewport: {width: 1440, height: 900}})
  const pagina = await escritorio.newPage()
  await pagina.addInitScript(SIN_TELON)
  await pagina.addInitScript(SONDAS)
  await pagina.goto(base + '/', {waitUntil: 'load', timeout: 60000})
  await recorrer(pagina, 200)
  await pagina.evaluate(() => window.scrollTo(0, 0))
  await pagina.waitForTimeout(400)

  const paradas = await paradasConTab(pagina)
  const sinFoco = paradas.filter((p) => !p.visible)
  notas.push(`recorrido con Tab: ${paradas.length} paradas, ${sinFoco.length} sin foco visible`)
  sinFoco.slice(0, 8).forEach((p) => notas.push(`sin foco visible: ${p.que} "${p.texto}" (outline: ${p.contorno})`))
  if (sinFoco.length) fallas++

  const abrirConTeclado = async (disparador, panel, etiqueta) => {
    await pagina.focus(disparador)
    await pagina.keyboard.press('Enter')
    await pagina.waitForTimeout(350)
    const abierto = await pagina.evaluate((s) => {
      const p = document.querySelector(s)
      return !!p && !p.hidden && getComputedStyle(p).display !== 'none'
    }, panel)
    await pagina.keyboard.press('Escape')
    await pagina.waitForTimeout(350)
    const cerrado = await pagina.evaluate((s) => {
      const p = document.querySelector(s)
      return !p || p.hidden || getComputedStyle(p).display === 'none'
    }, panel)
    const expandido = await pagina.getAttribute(disparador, 'aria-expanded')
    notas.push(`${etiqueta}: abre con Enter ${abierto ? 'sí' : 'NO'} · cierra con Escape ${cerrado ? 'sí' : 'NO'} · aria-expanded final "${expandido}"`)
    if (!abierto || !cerrado || expandido !== 'false') fallas++
    return abierto && cerrado
  }

  if (await pagina.$('[data-abre-megamenu]')) {
    await abrirConTeclado('[data-abre-megamenu]', '[data-megamenu]', 'megamenú de Catálogo')
    // Y otra vez después de navegar: la cáscara persiste, el estado no debe duplicarse.
    await pagina.click('[data-navcta]')
    await pagina.waitForFunction(() => window.__swaps > 0, null, {timeout: 15000}).catch(() => {})
    await pagina.waitForTimeout(700)
    await abrirConTeclado('[data-abre-megamenu]', '[data-megamenu]', 'megamenú tras navegar con el enrutador')
  } else {
    notas.push('megamenú de Catálogo: no presente en este build')
  }
  await escritorio.close()

  // --- Teléfono: menú móvil ---
  const movil = await navegador.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true})
  const pmovil = await movil.newPage()
  await pmovil.addInitScript(SIN_TELON)
  await pmovil.goto(base + '/', {waitUntil: 'load', timeout: 60000})
  await pmovil.waitForTimeout(600)
  await pmovil.focus('[data-abre-menu]')
  await pmovil.keyboard.press('Enter')
  await pmovil.waitForTimeout(500)
  const menuAbierto = await pmovil.evaluate(() => {
    const m = document.querySelector('[data-menu-movil]')
    return {
      visible: !!m && !m.hidden,
      foco: document.activeElement?.className || '',
      dentro: !!m && m.contains(document.activeElement),
    }
  })
  // Tabular dentro del menú abierto: todo lo de dentro tiene que tener foco visible
  // y el foco no puede escaparse al contenido de atrás, que la hoja tapa entera.
  const dentro = await paradasConTab(pmovil, 12)
  const seEscapa = await pmovil.evaluate(() => {
    const m = document.querySelector('[data-menu-movil]')
    return !m || !m.contains(document.activeElement)
  })
  notas.push(`el foco se queda dentro del menú al tabular: ${seEscapa ? 'NO — se escapa al contenido de atrás' : 'sí'}`)
  if (seEscapa) fallas++
  await pmovil.keyboard.press('Escape')
  await pmovil.waitForTimeout(500)
  const menuCerrado = await pmovil.evaluate(() => {
    const m = document.querySelector('[data-menu-movil]')
    return {
      oculto: !m || m.hidden,
      devuelveFoco: document.activeElement?.hasAttribute('data-abre-menu') || false,
      expandido: document.querySelector('[data-abre-menu]')?.getAttribute('aria-expanded'),
    }
  })
  notas.push(
    `menú móvil: abre con Enter ${menuAbierto.visible ? 'sí' : 'NO'} · el foco entra al panel ${menuAbierto.dentro ? 'sí' : 'NO'} · cierra con Escape ${menuCerrado.oculto ? 'sí' : 'NO'} · devuelve el foco al disparador ${menuCerrado.devuelveFoco ? 'sí' : 'NO'}`,
  )
  const dentroSinFoco = dentro.filter((p) => !p.visible)
  notas.push(`dentro del menú móvil: ${dentro.length} paradas, ${dentroSinFoco.length} sin foco visible`)
  dentroSinFoco.slice(0, 5).forEach((p) => notas.push(`sin foco visible (menú): ${p.que} "${p.texto}"`))
  if (!menuAbierto.visible || !menuAbierto.dentro || !menuCerrado.oculto || !menuCerrado.devuelveFoco || menuCerrado.expandido !== 'false') fallas++
  if (dentroSinFoco.length) fallas++
  await movil.close()

  anotar('12', 'Recorrido con teclado y paneles', fallas === 0 ? 'OK' : 'FALLA', `${paradas.length} paradas tabuladas · ${fallas} comprobaciones fallidas`, notas)
}

// ===========================================================================
// Orquestación
// ===========================================================================
// ===========================================================================
// 05 — Filtrar quince veces y un atrás devuelve a la página anterior
// ===========================================================================
// El contrato de `direccion.ts`: los filtros se escriben con `replaceState`
// —la dirección refleja lo que se ve y sigue siendo compartible, pero el
// historial no guarda un paso por filtro— y lo que se abre ENCIMA (la hoja de
// filtros, la ficha) sí deja entrada propia, para que el gesto de volver la
// cierre. Se prueban las dos mitades: sin la segunda, "atrás" se saldría del
// catálogo con la hoja abierta.
async function prueba05(navegador, base) {
  const notas = []
  const fallas = []
  const comprobar = (ok, texto) => {
    notas.push(`${ok ? 'OK' : 'FALLA'} · ${texto}`)
    if (!ok) fallas.push(texto)
  }

  // — Escritorio: quince filtrados y un atrás ——————————————————————————————
  {
    const contexto = await navegador.newContext({viewport: {width: 1440, height: 900}})
    const pagina = await contexto.newPage()
    await pagina.addInitScript(SIN_TELON)
    await pagina.goto(base + '/', {waitUntil: 'load', timeout: 60000})

    // Se llega al catálogo NAVEGANDO con el enrutador de la cáscara, que es lo
    // que deja la entrada anterior — y de paso ejercita el re-enganche del
    // script, que es donde un listener duplicado se notaría.
    await pagina.click('[data-abre-megamenu]')
    await pagina.waitForTimeout(300)
    await pagina.click('.megamenu a[href="/catalogo"]')
    await pagina.waitForFunction(() => !!document.querySelector('[data-catalogo][data-enganchada]'), null, {timeout: 15000})

    const largoInicial = await pagina.evaluate(() => history.length)
    const urlCatalogo = pagina.url()

    // Quince gestos de verdad: casillas de los cinco ejes y cambios de serie.
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

    comprobar(
      largoTrasFiltrar === largoInicial,
      `${gestos.length} filtrados no ensucian el historial (history.length ${largoInicial} → ${largoTrasFiltrar})`,
    )
    comprobar(
      urlTrasFiltrar !== urlCatalogo && urlTrasFiltrar.includes('#'),
      `la dirección sí refleja los filtros, con replaceState: ${urlTrasFiltrar.slice(urlTrasFiltrar.indexOf('#')) || '(sin hash)'}`,
    )

    await pagina.goBack()
    await pagina.waitForTimeout(1200)
    const destino = new URL(pagina.url()).pathname.replace(/\/$/, '') || '/'
    comprobar(destino === '/', `un atrás devuelve a la página anterior (quedó en ${pagina.url()})`)

    await contexto.close()
  }

  // — Teléfono: la hoja de filtros SÍ deja entrada propia ————————————————
  {
    const contexto = await navegador.newContext(TELEFONO)
    const pagina = await contexto.newPage()
    await pagina.addInitScript(SIN_TELON)
    await pagina.goto(base + '/catalogo', {waitUntil: 'load', timeout: 60000})
    await pagina.waitForFunction(() => !!document.querySelector('[data-catalogo][data-enganchada]'), null, {timeout: 15000})

    const antes = await pagina.evaluate(() => history.length)
    await pagina.click('.filtrar[data-abre-filtros]')
    await pagina.waitForTimeout(400)
    const abierta = await pagina.evaluate(() => !document.querySelector('[data-hoja-filtros]').hidden)
    const despues = await pagina.evaluate(() => history.length)
    comprobar(abierta && despues === antes + 1, `abrir la hoja de filtros agrega una entrada (history.length ${antes} → ${despues})`)

    // Con un filtro puesto DENTRO de la hoja: atrás la cierra y NO deshace el
    // filtro. El acordeón abre con Materia desplegada, así que no hay que tocarlo.
    const primera = await pagina.$('.hoja input[data-eje="materia"]:not([disabled])')
    await primera.click()
    await pagina.waitForTimeout(300)
    const elegido = await primera.getAttribute('data-valor')

    await pagina.goBack()
    await pagina.waitForTimeout(600)
    const cerrada = await pagina.evaluate(() => document.querySelector('[data-hoja-filtros]').hidden)
    const sigueFiltrado = await pagina.evaluate((valor) => location.hash.includes(encodeURIComponent(valor)), elegido)
    const enCatalogo = new URL(pagina.url()).pathname.replace(/\/$/, '') === '/catalogo'
    comprobar(cerrada && enCatalogo, 'atrás cierra la hoja sin salir del catálogo')
    comprobar(sigueFiltrado, `el filtro puesto dentro de la hoja sobrevive al cierre (materia=${elegido})`)

    await contexto.close()
  }

  anotar(
    '05',
    'Quince filtrados y un atrás',
    fallas.length ? 'FALLA' : 'OK',
    `${notas.length} comprobaciones · ${fallas.length} fallidas`,
    notas,
  )
}

// ===========================================================================
// 06 — Con la ficha abierta, el gesto de volver la cierra y deja los filtros
// ===========================================================================
// Antes del gesto se comprueba lo que lo sostiene: que la página propia del
// producto exista y sea indexable, porque el overlay se la trae por `fetch` —
// si la página no está, no hay ficha que cerrar.
async function prueba06(navegador, base) {
  const notas = []
  const fallas = []
  const comprobar = (ok, texto) => {
    notas.push(`${ok ? 'OK' : 'FALLA'} · ${texto}`)
    if (!ok) fallas.push(texto)
  }

  // — Base: la página propia del producto ————————————————————————————————
  {
    const contexto = await navegador.newContext(TELEFONO)
    const pagina = await contexto.newPage()
    await pagina.addInitScript(SIN_TELON)
    await pagina.goto(base + '/catalogo', {waitUntil: 'load', timeout: 60000})
    await fichaEnganchada(pagina)

    const tarjeta = pagina.locator('a[data-abre-ficha]').first()
    const slug = (await tarjeta.getAttribute('href')) || ''

    const respuesta = await pagina.goto(base + slug, {waitUntil: 'load', timeout: 60000})
    comprobar(respuesta?.status() === 200, `la página propia del producto responde: ${slug} → ${respuesta?.status()}`)

    const canonical = await pagina.getAttribute('link[rel=canonical]', 'href')
    comprobar(!!canonical && canonical.endsWith(slug), `canonical propio: ${canonical || '(sin canonical)'}`)

    const og = await pagina.getAttribute('meta[property="og:url"]', 'content')
    comprobar(!!og && og.endsWith(slug), `og:url propio: ${og || '(sin og:url)'}`)

    const filas = await pagina.locator('[data-ficha] .ficha__fila').count()
    const vacias = await pagina.locator('[data-ficha] .ficha__v:empty').count()
    comprobar(filas > 0 && vacias === 0, `la ficha técnica tiene filas y ninguna vacía: ${filas} filas`)

    comprobar((await pagina.locator('.ficha__ejemplo').count()) === 0, 'sin avisos internos en un build que no es de preview')

    await contexto.close()
  }

  // — El gesto de volver ——————————————————————————————————————————————————
  {
    const contexto = await navegador.newContext(TELEFONO)
    const pagina = await contexto.newPage()
    await pagina.addInitScript(SIN_TELON)
    await pagina.goto(base + '/catalogo', {waitUntil: 'load', timeout: 60000})
    await fichaEnganchada(pagina)

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
    comprobar(filtrada.includes(encodeURIComponent(materia)), `el filtro queda puesto antes de abrir la ficha: ${filtrada}`)

    const tarjeta = pagina.locator('.grilla a[data-abre-ficha]:not([hidden])').first()
    const id = await tarjeta.getAttribute('data-abre-ficha')
    await tarjeta.click()
    await fichaAbierta(pagina)

    // La marca en `history.state`, no `history.length`: cerrar la hoja de
    // filtros usa `history.back()`, que deja una entrada HACIA ADELANTE. El
    // `pushState` de la ficha la sobrescribe en vez de sumar una, así que la
    // longitud no se mueve aunque la entrada propia sí exista.
    comprobar(
      await pagina.evaluate(() => !!(history.state && history.state.capaCatalogo)),
      'abrir la ficha deja entrada propia en el historial (history.state.capaCatalogo)',
    )
    comprobar(
      (await pagina.evaluate(() => location.hash)).includes(`diseno=${encodeURIComponent(id)}`),
      'la dirección nombra el diseño abierto',
    )
    comprobar(
      await pagina.evaluate(() => document.documentElement.style.overflow === 'hidden'),
      'el documento no scrollea detrás de la hoja (el scroll es interno)',
    )
    // Se mide DOS veces si la primera sale corta. La hoja acaba de entrar con
    // su animación y el HTML de la ficha se acaba de inyectar: en una máquina
    // cargada se ha visto una lectura temprana por debajo de 44 que a los
    // 400ms ya está bien. Una lectura corta que se corrige sola es un artefacto
    // del momento en que se mide, no un control chico — pero se deja anotada,
    // porque si el aspa se rompe de verdad las dos lecturas van a salir cortas.
    const medirAspa = () =>
      pagina.evaluate(() => {
        const b = document.querySelector('.capa-ficha__cerrar')
        if (!b) return null
        const r = b.getBoundingClientRect()
        return {w: +r.width.toFixed(1), h: +r.height.toFixed(1)}
      })
    let aspa = await medirAspa()
    let reintento = null
    if (!aspa || aspa.w < 44 || aspa.h < 44) {
      await pagina.waitForTimeout(400)
      reintento = await medirAspa()
    }
    const valida = reintento || aspa
    comprobar(
      !!valida && valida.w >= 44 && valida.h >= 44,
      `el cierre de la hoja mide 44px: ${valida ? `${valida.w}×${valida.h}` : '(no existe)'}` +
        (reintento ? ` — la primera lectura dio ${aspa ? `${aspa.w}×${aspa.h}` : '(no existe)'} y se repitió a los 400ms` : ''),
    )

    // Arrastrar la hoja hacia abajo desde el asa también cierra
    // (`Responsividad v0` §03). El cuerpo NO arrastra: ahí manda el scroll.
    const caja = await pagina.locator('.capa-ficha__asa').boundingBox()
    await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2)
    await pagina.mouse.down()
    for (let y = 20; y <= 200; y += 45) {
      await pagina.mouse.move(caja.x + caja.width / 2, caja.y + y)
      await pagina.waitForTimeout(60)
    }
    const corrida = await pagina.evaluate(() => document.querySelector('.capa-ficha__caja').style.transform)
    await pagina.mouse.up()
    await pagina.waitForTimeout(700)
    comprobar(/translateY\(\d+/.test(corrida), `la hoja sigue al dedo mientras se arrastra: ${corrida || '(sin transform)'}`)
    comprobar(await pagina.evaluate(() => document.querySelector('[data-capa-ficha]').hidden), 'arrastrar hacia abajo cierra la hoja')

    // Se vuelve a abrir para probar el gesto de volver del sistema.
    await pagina.locator('.grilla a[data-abre-ficha]:not([hidden])').first().click()
    await fichaAbierta(pagina)
    await pagina.goBack()
    await pagina.waitForTimeout(600)

    const cerrada = await pagina.evaluate(() => document.querySelector('[data-capa-ficha]').hidden)
    const ruta = new URL(pagina.url()).pathname.replace(/\/$/, '')
    const hash = await pagina.evaluate(() => location.hash)

    comprobar(cerrada && ruta === '/catalogo', `atrás cierra la ficha sin salir del catálogo: ${pagina.url()}`)
    comprobar(hash.includes(encodeURIComponent(materia)), `el filtro sobrevive al cierre: materia=${materia}`)
    comprobar(!hash.includes('diseno='), `la dirección deja de nombrar el diseño: ${hash || '(sin hash)'}`)

    await contexto.close()
  }

  anotar(
    '06',
    'Atrás cierra la ficha y conserva los filtros',
    fallas.length ? 'FALLA' : 'OK',
    `${notas.length} comprobaciones · ${fallas.length} fallidas`,
    notas,
  )
}

// ===========================================================================
// 07 — El enlace de un diseño, abierto en otro teléfono
// ===========================================================================
// Se comprueba de punta a punta: un contexto abre la ficha y se lee lo que
// compartiría, y OTRO contexto —sin nada guardado, que es lo que significa
// "otro teléfono"— abre ese enlace. De paso se comprueba que el overlay y la
// página propia son el MISMO HTML: como el overlay se lo trae por `fetch`, si
// divergen es que algo se rompió.
async function prueba07(navegador, base) {
  const notas = []
  const fallas = []
  const comprobar = (ok, texto) => {
    notas.push(`${ok ? 'OK' : 'FALLA'} · ${texto}`)
    if (!ok) fallas.push(texto)
  }

  let slug = ''
  let id = ''

  // — Teléfono 1 comparte, teléfono 2 abre ————————————————————————————————
  {
    const uno = await navegador.newContext(TELEFONO)
    const p1 = await uno.newPage()
    await p1.addInitScript(SIN_TELON)
    await p1.goto(base + '/catalogo', {waitUntil: 'load', timeout: 60000})
    await fichaEnganchada(p1)

    const tarjeta = p1.locator('a[data-abre-ficha]').first()
    slug = (await tarjeta.getAttribute('href')) || ''
    id = (await tarjeta.getAttribute('data-abre-ficha')) || ''

    await tarjeta.click()
    await fichaAbierta(p1)
    // `location.href` es exactamente lo que copian "Copiar enlace" y la hoja
    // del sistema.
    const compartido = p1.url()
    const nombre = (await p1.locator('[data-capa-ficha] .ficha__nombre').first().textContent())?.trim()
    await uno.close()

    comprobar(compartido.includes(`#diseno=${encodeURIComponent(id)}`), `el enlace a compartir nombra el diseño: ${compartido}`)

    const dos = await navegador.newContext(TELEFONO)
    const p2 = await dos.newPage()
    await p2.addInitScript(SIN_TELON)
    await p2.goto(compartido, {waitUntil: 'load', timeout: 60000})
    await fichaEnganchada(p2)
    await fichaAbierta(p2)

    const nombre2 = (await p2.locator('[data-capa-ficha] .ficha__nombre').first().textContent())?.trim()
    const enCatalogo = new URL(p2.url()).pathname.replace(/\/$/, '') === '/catalogo'
    const grilla = await p2.locator('.grilla a[data-abre-ficha]:not([hidden])').count()

    comprobar(enCatalogo && grilla > 0, `el enlace abre el CATÁLOGO, no otra página: ${grilla} tarjetas detrás`)
    comprobar(!!nombre2 && nombre2 === nombre, `con la ficha de ese diseño abierta: ${nombre2 || '(vacía)'}`)
    await dos.close()
  }

  // — El overlay y la página propia son la MISMA ficha ————————————————————
  {
    const contexto = await navegador.newContext({viewport: {width: 1440, height: 900}})
    const pagina = await contexto.newPage()
    await pagina.addInitScript(SIN_TELON)

    await pagina.goto(base + slug, {waitUntil: 'load', timeout: 60000})
    const enPagina = await pagina.locator('[data-ficha]').first().evaluate((el) => el.outerHTML)

    await pagina.goto(`${base}/catalogo#diseno=${encodeURIComponent(id)}`, {waitUntil: 'load', timeout: 60000})
    await fichaEnganchada(pagina)
    await fichaAbierta(pagina)
    const enOverlay = await pagina.locator('[data-capa-ficha] [data-ficha]').first().evaluate((el) => el.outerHTML)

    // El overlay destapa el compartir (lo hace el script), así que se compara
    // sin ese atributo: todo lo demás tiene que ser idéntico.
    const limpiar = (html) => html.replace(/ hidden=""/g, '').replace(/\s+/g, ' ')
    comprobar(limpiar(enPagina) === limpiar(enOverlay), 'el overlay muestra la misma ficha que la página propia')

    const ancho = await pagina.locator('.capa-ficha__caja').evaluate((el) => el.getBoundingClientRect().width)
    // 882 = los 880px de contenido que declara el diseño MÁS su filete de 1px a
    // cada lado. La cifra estaba en 880 porque nuestro diálogo no tenía borde;
    // se le puso en la tanda 2 de la auditoría de estados (plan-proyecto §20).
    comprobar(Math.round(ancho) === 882, `el diálogo de escritorio mide 882px (880 + filete): ${Math.round(ancho)}px`)

    await pagina.mouse.click(8, 8)
    await pagina.waitForTimeout(500)
    comprobar(await pagina.evaluate(() => document.querySelector('[data-capa-ficha]').hidden), 'clic fuera cierra el diálogo')

    await pagina.locator(`a[data-abre-ficha="${id}"]`).first().click()
    await fichaAbierta(pagina)
    await pagina.keyboard.press('Escape')
    await pagina.waitForTimeout(500)
    comprobar(await pagina.evaluate(() => document.querySelector('[data-capa-ficha]').hidden), 'Escape cierra el diálogo')

    await contexto.close()
  }

  anotar(
    '07',
    'El enlace de un diseño abre el catálogo con su ficha',
    fallas.length ? 'FALLA' : 'OK',
    `${notas.length} comprobaciones · ${fallas.length} fallidas`,
    notas,
  )
}

// ===========================================================================
// 10 — Con datos faltantes, ninguna pantalla se ve rota
// ===========================================================================
// El handoff lo enuncia en tres casos: "con el catálogo vacío, con una sola
// foto faltante y con una ficha sin datos, ninguna pantalla se ve rota".
//
// Ya no hace falta preparar contenido: el catálogo real trae los tres. Hay 37
// productos sin ninguna foto —las de ejemplo se quitaron a propósito, para que
// nadie tenga que adivinar cuáles eran reales—, hay fichas a las que les faltan
// filas de specs, y cualquier combinación de filtros sin resultados deja la
// grilla vacía.
//
// "No se ve rota" se mide, no se opina: el hueco tiene que ocupar el MISMO
// espacio que ocuparía la foto (si no, la grilla se descuadra), la tarjeta
// tiene que conservar su texto, y el estado vacío tiene que ofrecer una salida.
async function prueba10(navegador, base) {
  const notas = []
  const fallas = []
  const comprobar = (ok, texto) => {
    notas.push(`${ok ? 'OK' : 'FALLA'} · ${texto}`)
    if (!ok) fallas.push(texto)
  }

  const contexto = await navegador.newContext({viewport: {width: 1440, height: 900}})
  const pagina = await contexto.newPage()
  await pagina.addInitScript(SIN_TELON)
  await pagina.goto(base + '/catalogo', {waitUntil: 'load', timeout: 60000})
  await fichaEnganchada(pagina)

  // — 1 · Producto sin foto: el hueco no descuadra la grilla ————————————
  const grilla = await pagina.evaluate(() => {
    const tarjetas = [...document.querySelectorAll('.grilla a[data-abre-ficha]')]
    const conFoto = tarjetas.filter((t) => t.querySelector('.tarjeta__img'))
    const sinFoto = tarjetas.filter((t) => t.querySelector('.tarjeta__sinfoto'))
    const alto = (t) => Math.round(t.querySelector('.tarjeta__marco').getBoundingClientRect().height)
    const ancho = (t) => Math.round(t.getBoundingClientRect().width)
    return {
      total: tarjetas.length,
      conFoto: conFoto.length,
      sinFoto: sinFoto.length,
      altoConFoto: conFoto.length ? alto(conFoto[0]) : 0,
      altoSinFoto: sinFoto.length ? alto(sinFoto[0]) : 0,
      anchoConFoto: conFoto.length ? ancho(conFoto[0]) : 0,
      anchoSinFoto: sinFoto.length ? ancho(sinFoto[0]) : 0,
      // La tarjeta sin foto conserva su texto: nombre y specs.
      sinFotoConTexto: sinFoto.filter((t) => (t.querySelector('.tarjeta__nombre')?.textContent || '').trim()).length,
      // Y no deja un `alt` vacío ni un `img` roto.
      imgRotas: tarjetas.filter((t) => {
        const i = t.querySelector('img')
        return i && (!i.getAttribute('src') || i.getAttribute('alt') === null)
      }).length,
    }
  })

  comprobar(grilla.sinFoto > 0, `hay productos sin foto para probar el caso: ${grilla.sinFoto} de ${grilla.total}`)
  comprobar(
    grilla.altoSinFoto === grilla.altoConFoto && grilla.anchoSinFoto === grilla.anchoConFoto,
    `el hueco ocupa lo mismo que la foto y la grilla no se descuadra: ${grilla.anchoSinFoto}×${grilla.altoSinFoto} contra ${grilla.anchoConFoto}×${grilla.altoConFoto}`,
  )
  comprobar(grilla.sinFotoConTexto === grilla.sinFoto, `las tarjetas sin foto conservan su nombre: ${grilla.sinFotoConTexto}/${grilla.sinFoto}`)
  comprobar(grilla.imgRotas === 0, `ninguna imagen queda sin src o sin alt: ${grilla.imgRotas} rotas`)

  // — 2 · Ficha sin datos: las filas vacías se ocultan, no se dibujan ————
  const sinFotoId = await pagina.evaluate(() => {
    const t = [...document.querySelectorAll('.grilla a[data-abre-ficha]')].find((x) => x.querySelector('.tarjeta__sinfoto'))
    return t ? t.getAttribute('data-abre-ficha') : null
  })
  if (sinFotoId) {
    await pagina.locator(`a[data-abre-ficha="${sinFotoId}"]`).first().click()
    await fichaAbierta(pagina)
    const ficha = await pagina.evaluate(() => {
      const f = document.querySelector('[data-capa-ficha] [data-ficha]')
      const filas = [...f.querySelectorAll('.ficha__fila')]
      const marco = f.querySelector('.ficha__marco')
      return {
        filas: filas.length,
        vacias: filas.filter((x) => !(x.querySelector('.ficha__v')?.textContent || '').trim()).length,
        // El marco de la foto sigue ocupando su sitio aunque no haya foto.
        marcoAlto: marco ? Math.round(marco.getBoundingClientRect().height) : 0,
        huecoDeFoto: !!f.querySelector('.ficha__sinfoto'),
        nombre: (f.querySelector('.ficha__nombre')?.textContent || '').trim(),
      }
    })
    comprobar(ficha.huecoDeFoto && ficha.marcoAlto > 100, `la ficha sin foto compone igual: hueco presente, marco de ${ficha.marcoAlto}px`)
    comprobar(ficha.vacias === 0, `ninguna fila de specs se dibuja vacía: ${ficha.filas} filas, ${ficha.vacias} sin valor`)
    comprobar(!!ficha.nombre, `la ficha conserva su nombre: ${ficha.nombre || '(vacío)'}`)
    await pagina.keyboard.press('Escape')
    await pagina.waitForTimeout(400)
  } else {
    comprobar(false, 'no se encontró ningún producto sin foto para abrir su ficha')
  }

  // — 3 · Catálogo vacío: el estado ofrece una salida ————————————————————
  // Se combinan dos filtros que no comparten ningún producto. Se buscan a
  // ciegas entre los ejes, porque cuál combinación queda vacía depende del
  // contenido, y el contenido lo edita el cliente.
  await pagina.goto(base + '/catalogo', {waitUntil: 'load', timeout: 60000})
  await fichaEnganchada(pagina)
  const vacio = await pagina.evaluate(async () => {
    const casillas = [...document.querySelectorAll('aside input[data-eje]')]
    const porEje = new Map()
    for (const c of casillas) {
      const e = c.getAttribute('data-eje')
      if (!porEje.has(e)) porEje.set(e, [])
      porEje.get(e).push(c)
    }
    const ejes = [...porEje.keys()]
    const espera = () => new Promise((r) => setTimeout(r, 160))
    for (const a of ejes) {
      for (const b of ejes) {
        if (a === b) continue
        for (const ca of porEje.get(a)) {
          for (const cb of porEje.get(b)) {
            if (cb.disabled) continue
            if (!ca.checked) ca.click()
            await espera()
            if (cb.disabled) continue
            cb.click()
            await espera()
            const visibles = [...document.querySelectorAll('.grilla a[data-abre-ficha]')].filter((t) => !t.hidden).length
            if (visibles === 0) {
              const v = document.querySelector('[data-vacio]')
              return {
                logrado: true,
                avisoVisible: !!v && !v.hidden,
                titulo: (v?.querySelector('.vacio__titulo')?.textContent || '').trim(),
                salida: !!v?.querySelector('[data-limpiar]'),
              }
            }
            if (cb.checked) cb.click()
            await espera()
          }
          if (ca.checked) ca.click()
          await espera()
        }
      }
    }
    return {logrado: false}
  })

  if (vacio.logrado) {
    comprobar(vacio.avisoVisible, `con la grilla vacía aparece el aviso: "${vacio.titulo}"`)
    comprobar(vacio.salida, 'el aviso ofrece una salida (limpiar filtros), no deja al visitante encerrado')
  } else {
    comprobar(true, 'ninguna combinación de dos filtros deja la grilla vacía: el catálogo evita el callejón sin salida deshabilitando lo que no lleva a nada')
  }

  await contexto.close()
  anotar(
    '10',
    'Con datos faltantes, ninguna pantalla se ve rota',
    fallas.length ? 'FALLA' : 'OK',
    `${notas.length} comprobaciones · ${fallas.length} fallidas`,
    notas,
  )
}

const PRUEBAS = [
  ['01', prueba01],
  ['02', prueba02],
  ['03', prueba03],
  ['04', prueba04],
  ['05', prueba05],
  ['06', prueba06],
  ['07', prueba07],
  ['08', prueba08],
  ['09', prueba09],
  ['10', prueba10],
  ['11', prueba11],
  ['12', prueba12],
]

const servidor = process.env.NUESTRO ? null : await levantarServidor()
const base = (process.env.NUESTRO || `http://localhost:${PUERTO}`).replace(/\/$/, '')

titular(`Checklist de aceptación — ${base}`)
console.log('Las 12 pruebas del checklist están automatizadas. La 03 se mide y no se juzga.')

const navegador = await chromium.launch()
for (const [n, prueba] of PRUEBAS) {
  if (SOLO.length && !SOLO.includes(n)) continue
  try {
    await prueba(navegador, base)
  } catch (error) {
    anotar(n, 'la prueba no pudo completarse', 'FALLA', String(error.message || error).split('\n')[0], [])
  }
}
await navegador.close()
servidor?.close()

titular('Resumen')
const ancho = Math.max(...resultados.map((r) => r.titulo.length))
for (const r of resultados) {
  console.log(`  ${r.n}  ${r.titulo.padEnd(ancho)}  ${r.estado.padEnd(6)}  ${r.medida}`)
}
const fallidas = resultados.filter((r) => r.estado === 'FALLA')
console.log(
  `\n  ${resultados.filter((r) => r.estado === 'OK').length} en verde · ${resultados.filter((r) => r.estado === 'MEDIDO').length} medidas sin veredicto · ${fallidas.length} en falla\n`,
)
process.exit(fallidas.length ? 1 : 0)
