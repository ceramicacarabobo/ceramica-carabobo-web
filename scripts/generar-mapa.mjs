/**
 * Generador de la geometría del mapa de Venezuela (uso único, no corre en el build).
 *
 *   node scripts/generar-mapa.mjs
 *
 * Lee `design/publicar/data/venezuela.geojson` (26 estados, Natural Earth vía
 * Apache Superset, Apache-2.0) y escribe `src/components/donde-comprar/geometria.ts`
 * con los trazados SVG ya proyectados.
 *
 * POR QUÉ ASÍ. El prototipo trae d3 y topojson desde unpkg y el GeoJSON desde
 * jsDelivr: tres dependencias de terceros para dibujar una figura que no cambia
 * nunca. La prueba nº1 del checklist de aceptación pide justo lo contrario. Como
 * la proyección es fija (Mercator ajustada a un viewBox fijo de 800×505), el
 * resultado se calcula UNA VEZ acá y queda como dato: producción no carga
 * ninguna librería de mapas ni pide el GeoJSON — los trazados van en el HTML.
 *
 * El único cálculo que queda en el sitio es proyectar la coordenada de cada
 * ciudad, y para eso basta la fórmula cerrada de Mercator con los parámetros
 * (escala y traslación) que este script deja anotados: cinco líneas, sin librería.
 *
 * `d3-geo` es dependencia SOLO de este script; se instala al vuelo con
 * `npm install --no-save d3-geo` y no figura en package.json.
 */
import {readFileSync, writeFileSync} from 'node:fs'
import {geoMercator, geoPath} from 'd3-geo'

const W = 800
const H = 505
const MARGEN = 16
const ENTRADA = new URL('../design/publicar/data/venezuela.geojson', import.meta.url)
const SALIDA = new URL('../src/components/donde-comprar/geometria.ts', import.meta.url)

const geo = JSON.parse(readFileSync(ENTRADA, 'utf8'))
const features = (geo.features || []).filter((f) => f.geometry)

// Exactamente la proyección del prototipo.
const proyeccion = geoMercator().fitExtent(
  [
    [MARGEN, MARGEN],
    [W - MARGEN, H - MARGEN],
  ],
  {type: 'FeatureCollection', features},
)
// `digits(2)` recorta el trazado a centésimas de unidad de viewBox: por debajo
// del píxel a cualquier zoom razonable y menos de la mitad de bytes.
const trazar = geoPath(proyeccion).digits(2)

const escala = proyeccion.scale()
const [dx, dy] = proyeccion.translate()

// Verificación de la fórmula cerrada que usará el sitio para los pines.
const mercator = ([lon, lat]) => [
  dx + escala * (lon * Math.PI) / 180,
  dy - escala * Math.log(Math.tan(Math.PI / 4 + ((lat * Math.PI) / 180) / 2)),
]
let peor = 0
for (const [lon, lat] of [[-68, 10.16], [-71.6, 10.64], [-62.7, 8.29], [-63.87, 10.96]]) {
  const a = proyeccion([lon, lat])
  const b = mercator([lon, lat])
  peor = Math.max(peor, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))
}
if (peor > 1e-6) throw new Error(`la fórmula cerrada no coincide con d3 (${peor})`)

const nombreDe = (f) => f.properties?.NAME_1 || f.properties?.name || f.properties?.NAME || f.properties?.ISO || ''

const estados = features
  .map((f) => {
    const [[x0, y0], [x1, y1]] = trazar.bounds(f)
    return {
      nombre: nombreDe(f),
      iso: f.properties?.ISO ?? '',
      d: trazar(f),
      caja: [x0, y0, x1, y1].map((n) => Math.round(n * 100) / 100),
    }
  })
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

const ts = `/* GENERADO por scripts/generar-mapa.mjs — no editar a mano.
 *
 * Geometría de los ${estados.length} estados de Venezuela, ya proyectada (Mercator ajustada
 * al viewBox ${W}×${H} con ${MARGEN}px de margen: la misma del prototipo). Va como dato en el
 * bundle, no como archivo que el navegador tenga que pedir, así que el mapa se
 * dibuja sin una sola petición a ningún servidor — prueba nº1 del checklist.
 *
 * Fuente: Natural Earth vía Apache Superset (Apache-2.0),
 * design/publicar/data/venezuela.geojson.
 */

/** Un estado: trazado SVG y su caja envolvente [x0, y0, x1, y1] en el viewBox. */
export interface EstadoGeo {
  nombre: string
  iso: string
  d: string
  caja: [number, number, number, number]
}

export const ANCHO_MAPA = ${W}
export const ALTO_MAPA = ${H}

/** Parámetros de la proyección, para ubicar las ciudades con \`proyectar()\`. */
export const ESCALA = ${escala}
export const TRASLACION: [number, number] = [${dx}, ${dy}]

/**
 * Coordenada geográfica → punto del viewBox. Mercator en forma cerrada: es la
 * misma cuenta que hace d3, verificada contra ella en el generador. No hace
 * falta la librería para un solo punto.
 */
export function proyectar(lng: number, lat: number): [number, number] {
  const fi = (lat * Math.PI) / 180
  return [
    TRASLACION[0] + (ESCALA * lng * Math.PI) / 180,
    TRASLACION[1] - ESCALA * Math.log(Math.tan(Math.PI / 4 + fi / 2)),
  ]
}

export const ESTADOS: EstadoGeo[] = ${JSON.stringify(estados, null, 0).replace(/\},\{/g, '},\n  {').replace(/^\[/, '[\n  ').replace(/\]$/, ',\n]')}
`

writeFileSync(SALIDA, ts)
console.log(`${estados.length} estados · ${(ts.length / 1024).toFixed(1)} KB → ${SALIDA.pathname}`)
console.log(estados.map((e) => e.nombre).join(' · '))
