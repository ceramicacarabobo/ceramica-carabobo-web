/**
 * Checklist de aceptación del handoff — la parte automatizable HOY.
 *
 * El criterio de cierre de QA del proyecto son las 12 pruebas de
 * `design/Requisitos tecnicos v0.dc.html` (clave `aceptacion` del script).
 * Cinco de ellas —01 (mapa), 05, 06, 07 (direcciones del catálogo) y 10
 * (estados vacíos del catálogo)— dependen de pantallas que todavía no existen:
 * son de las fases del catálogo y del mapa. Este script cubre las otras siete:
 *
 *   02  una dirección inexistente muestra NUESTRA 404, no el error del servidor
 *   03  la primera pantalla del inicio: LCP y peso transferido (se MIDE, no se juzga)
 *   04  navegar no produce destello blanco ni vuelve a montar el encabezado
 *   08  ninguna imagen hace saltar el contenido (CLS)
 *   09  con movimiento reducido, nada se anima
 *   11  todo lo tocable mide 44px y nada queda bajo la barra del sistema
 *   12  se recorre con el teclado, con foco visible, y los paneles abren y cierran
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
const PRUEBAS = [
  ['02', prueba02],
  ['03', prueba03],
  ['04', prueba04],
  ['08', prueba08],
  ['09', prueba09],
  ['11', prueba11],
  ['12', prueba12],
]

const servidor = process.env.NUESTRO ? null : await levantarServidor()
const base = (process.env.NUESTRO || `http://localhost:${PUERTO}`).replace(/\/$/, '')

titular(`Checklist de aceptación — ${base}`)
console.log('Pruebas 01, 05, 06, 07 y 10 del handoff dependen del catálogo y del mapa: fases posteriores.')

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
