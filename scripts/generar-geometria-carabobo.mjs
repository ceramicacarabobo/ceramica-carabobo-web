#!/usr/bin/env node
/**
 * Genera la geometría del mapa de sedes de la página de Contacto.
 *
 * POR QUÉ EXISTE: el prototipo dibuja ese mapa con Leaflet + teselas de
 * tile.openstreetmap.org, las dos cosas traídas de un CDN ajeno en tiempo de
 * ejecución. La condición de autosuficiencia del plan (§3) lo prohíbe. La
 * salida honesta es la MISMA que el propio handoff ya eligió para el mapa de
 * "Dónde comprar": geometría real proyectada por nosotros sobre el GeoJSON que
 * servimos, sin librería de mapas y sin teselas.
 *
 * Entrada: design/publicar/data/venezuela.geojson — 26 estados, procedencia
 * Apache Superset (linaje Natural Earth), licencia Apache-2.0. El crédito es
 * obligatorio y lo muestra el componente.
 *
 * Salida: src/components/contacto/geometria.ts — trazas SVG ya proyectadas y
 * los parámetros de la proyección, para que ni el build ni el navegador tengan
 * que leer los 117 KB del GeoJSON. Regenerar con:
 *
 *   node scripts/generar-geometria-carabobo.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ENTRADA = path.join(ROOT, 'design', 'publicar', 'data', 'venezuela.geojson')
const SALIDA = path.join(ROOT, 'src', 'components', 'contacto', 'geometria.ts')

// Ventana geográfica: Carabobo con aire suficiente para que se lean la costa y
// los estados vecinos. Sin ese contexto el dibujo no se reconoce como un mapa.
const VENTANA = {oeste: -68.9, este: -67.1, sur: 9.55, norte: 10.85}
const ANCHO = 800
const ALTO = 600
const DESTACADO = 'Carabobo'

/** Mercator esférica normalizada (radio 1), la misma familia que d3.geoMercator. */
const mercatorX = (lon) => (lon * Math.PI) / 180
// El eje Y del SVG crece hacia abajo, así que la Mercator va negada: el norte
// queda arriba sin tener que voltear nada después.
const mercatorY = (lat) => -Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))

const x0 = mercatorX(VENTANA.oeste)
const x1 = mercatorX(VENTANA.este)
const y0 = mercatorY(VENTANA.norte)
const y1 = mercatorY(VENTANA.sur)

// fitExtent tipo "contain": una sola escala para los dos ejes, y centrado.
const ESCALA = Math.min(ANCHO / (x1 - x0), ALTO / (y1 - y0))
const DESPLAZAMIENTO_X = (ANCHO - (x1 - x0) * ESCALA) / 2 - x0 * ESCALA
const DESPLAZAMIENTO_Y = (ALTO - (y1 - y0) * ESCALA) / 2 - y0 * ESCALA

const proyectar = (lon, lat) => [
  mercatorX(lon) * ESCALA + DESPLAZAMIENTO_X,
  mercatorY(lat) * ESCALA + DESPLAZAMIENTO_Y,
]

/** Anillos a traza SVG, soltando los puntos que no mueven el dibujo (< 0,6px). */
function traza(anillos) {
  const partes = []
  for (const anillo of anillos) {
    let anterior = null
    const puntos = []
    for (const [lon, lat] of anillo) {
      const [px, py] = proyectar(lon, lat)
      if (anterior && Math.hypot(px - anterior[0], py - anterior[1]) < 0.6) continue
      anterior = [px, py]
      puntos.push(`${px.toFixed(1)},${py.toFixed(1)}`)
    }
    if (puntos.length < 3) continue
    partes.push(`M${puntos.join('L')}Z`)
  }
  return partes.join('')
}

const anillosDe = (geometria) =>
  geometria.type === 'Polygon' ? geometria.coordinates : geometria.coordinates.flat()

function caja(geometria) {
  let oeste = Infinity, este = -Infinity, sur = Infinity, norte = -Infinity
  for (const anillo of anillosDe(geometria)) {
    for (const [lon, lat] of anillo) {
      if (lon < oeste) oeste = lon
      if (lon > este) este = lon
      if (lat < sur) sur = lat
      if (lat > norte) norte = lat
    }
  }
  return {oeste, este, sur, norte}
}

const geo = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'))

const estados = geo.features
  .map((f) => ({nombre: f.properties.NAME_1, geometria: f.geometry}))
  .filter(({geometria}) => {
    const c = caja(geometria)
    return c.este > VENTANA.oeste && c.oeste < VENTANA.este && c.norte > VENTANA.sur && c.sur < VENTANA.norte
  })
  .map(({nombre, geometria}) => ({nombre, d: traza(anillosDe(geometria)), destacado: nombre === DESTACADO}))
  .filter((e) => e.d.length > 0)
  // El estado destacado se dibuja último para que su borde quede encima.
  .sort((a, b) => Number(a.destacado) - Number(b.destacado))

const salida = `/**
 * GENERADO — no editar a mano.
 * Regenerar: node scripts/generar-geometria-carabobo.mjs
 *
 * Geometría de ${DESTACADO} y sus vecinos, ya proyectada (Mercator) sobre un
 * lienzo de ${ANCHO}×${ALTO}. Fuente: design/publicar/data/venezuela.geojson —
 * Apache Superset (linaje Natural Earth), Apache-2.0. El crédito es obligatorio.
 */

export const ANCHO = ${ANCHO}
export const ALTO = ${ALTO}
export const DESTACADO = ${JSON.stringify(DESTACADO)}

/** Parámetros de la proyección, para ubicar puntos (lon, lat) en el lienzo. */
const ESCALA = ${ESCALA}
const DESPLAZAMIENTO_X = ${DESPLAZAMIENTO_X}
const DESPLAZAMIENTO_Y = ${DESPLAZAMIENTO_Y}

/** (longitud, latitud) → coordenadas del lienzo. La misma Mercator del generador. */
export function proyectar(lon: number, lat: number): {x: number; y: number} {
  return {
    x: ((lon * Math.PI) / 180) * ESCALA + DESPLAZAMIENTO_X,
    y: -Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * ESCALA + DESPLAZAMIENTO_Y,
  }
}

/** ¿El punto cae dentro del lienzo? Un pin fuera no se dibuja. */
export function dentro(x: number, y: number): boolean {
  return x >= 0 && x <= ANCHO && y >= 0 && y <= ALTO
}

export interface Estado {
  nombre: string
  d: string
  destacado: boolean
}

export const ESTADOS: Estado[] = ${JSON.stringify(estados, null, 2)}
`

fs.mkdirSync(path.dirname(SALIDA), {recursive: true})
fs.writeFileSync(SALIDA, salida)
console.log(
  `${estados.length} estados · ${(salida.length / 1024).toFixed(1)} KB · escala ${ESCALA.toFixed(1)} → ${path.relative(ROOT, SALIDA)}`,
)
