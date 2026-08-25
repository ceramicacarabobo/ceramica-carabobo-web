import {chromium} from 'playwright'

/**
 * Mide caja y estilos calculados de un elemento en el prototipo y en nuestro sitio,
 * y muestra las diferencias. Es la herramienta para afinar fidelidad sin adivinar.
 *
 *   node scripts/qa/medir.mjs '<selector-proto>' '<selector-nuestro>' [ancho] [alto]
 */
const PROTO = process.env.PROTO || 'http://localhost:4500/index.html'
const NUESTRO = process.env.NUESTRO || 'http://localhost:4600/index.html'
const [, , selProto, selNuestro, ancho = '1440', alto = '900'] = process.argv

const PROPIEDADES = [
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform',
  'color', 'backgroundColor', 'padding', 'margin', 'gap', 'display', 'flexDirection',
  'alignItems', 'justifyContent', 'gridTemplateColumns', 'maxWidth', 'width', 'height',
  'position', 'top', 'left', 'right', 'bottom', 'zIndex', 'opacity', 'transition', 'borderBottom',
]

async function medir(url, selector) {
  const navegador = await chromium.launch()
  const contexto = await navegador.newContext({viewport: {width: +ancho, height: +alto}, deviceScaleFactor: 1})
  const pagina = await contexto.newPage()
  await pagina.goto(url, {waitUntil: 'networkidle', timeout: 60000})
  await pagina.waitForTimeout(3200)
  await pagina.evaluate(() => {
    document.documentElement.removeAttribute('data-telon')
    document.querySelectorAll('#telon, [data-screen-label="Telon"]').forEach((el) => el.remove())
  })
  const datos = await pagina.evaluate(
    ([sel, props]) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const caja = el.getBoundingClientRect()
      const estilo = getComputedStyle(el)
      const salida = {
        caja: {
          x: Math.round(caja.x), y: Math.round(caja.y),
          ancho: Math.round(caja.width), alto: Math.round(caja.height),
        },
      }
      for (const p of props) salida[p] = estilo[p]
      return salida
    },
    [selector, PROPIEDADES],
  )
  await navegador.close()
  return datos
}

const a = await medir(PROTO, selProto)
const b = await medir(NUESTRO, selNuestro)

if (!a) console.log(`prototipo: no encontré ${selProto}`)
if (!b) console.log(`nuestro: no encontré ${selNuestro}`)
if (!a || !b) process.exit(1)

console.log(`caja  prototipo: x${a.caja.x} y${a.caja.y} ${a.caja.ancho}×${a.caja.alto}`)
console.log(`caja  nuestro:   x${b.caja.x} y${b.caja.y} ${b.caja.ancho}×${b.caja.alto}`)
console.log('--- diferencias de estilo ---')
let iguales = 0
for (const p of PROPIEDADES) {
  if (a[p] === b[p]) { iguales += 1; continue }
  console.log(`${p}:\n   proto  ${a[p]}\n   nuestro ${b[p]}`)
}
console.log(`(${iguales} propiedades idénticas)`)
