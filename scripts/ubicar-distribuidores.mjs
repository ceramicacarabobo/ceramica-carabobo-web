#!/usr/bin/env node
/**
 * Le pone coordenadas a los distribuidores extraídos de
 * `scripts/datos/distribuidores-wp.json`.
 *
 *   node scripts/ubicar-distribuidores.mjs [--limite N]
 *
 * ── De dónde salen las coordenadas ─────────────────────────────────────────
 * Cada ficha del sitio viejo incrusta un mapa de Google cuyo parámetro `q` es
 * lo que alguien escribió al armarla. No es homogéneo, y por eso hay dos
 * caminos:
 *
 *   1. **Plus Code** (`M96F+29V, Puerto Ayacucho 7101, Amazonas`) — 81 fichas.
 *      Un Plus Code es un ALGORITMO, no una consulta: se convierte en
 *      coordenadas sin pedirle nada a nadie, con ~14 m de precisión. El código
 *      viene "corto" (le faltan los 4 primeros caracteres), así que necesita
 *      una referencia a menos de medio grado para resolverse — la ciudad.
 *   2. **Dirección de calle** — 76 fichas. No hay algoritmo: hay que preguntar.
 *
 * Se usa Nominatim (OpenStreetMap): gratis, sin tarjeta y sin clave. Su
 * política pide como mucho un pedido por segundo y un User-Agent que
 * identifique quién llama; las dos cosas se respetan. Esto corre UNA VEZ al
 * importar — el sitio publicado no consulta a nadie: las coordenadas quedan
 * como números en el CMS. La regla de autosuficiencia habla de producción.
 *
 * Como las ciudades se repiten (74 distintas para 226 comercios), se piden una
 * sola vez y se guardan en `scripts/datos/ciudades.json`. Volver a correr esto
 * no vuelve a preguntar lo ya sabido.
 *
 * ── Lo que NO se hace ──────────────────────────────────────────────────────
 * A quien no tiene ubicación no se le inventa una. Se queda sin coordenada: en
 * el sitio aparece en el índice y pinta su estado como "con cobertura", pero no
 * tiene pin. Poner a todos en el centro de su ciudad fingiría una precisión que
 * no existe.
 *
 * Y todo lo que sale de la caja de Venezuela se descarta con nombre y motivo:
 * el sitio viejo tiene fichas que apuntan a Perú por un copiado erróneo.
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs'

const ENTRADA = 'scripts/datos/distribuidores-wp.json'
const SALIDA = 'scripts/datos/distribuidores-ubicados.json'
const CACHE_CIUDADES = 'scripts/datos/ciudades.json'
const AGENTE = 'ceramica-carabobo-migracion/1.0 (migracion puntual de un directorio de tiendas)'
const PAUSA_NOMINATIM = 1100 // su política pide 1 por segundo; se le da margen

/** Caja de Venezuela, con holgura. Fuera de acá, la coordenada está mal. */
const VENEZUELA = {latMin: 0.5, latMax: 12.5, lngMin: -73.5, lngMax: -59.5}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const iLim = args.indexOf('--limite')
const LIMITE = iLim >= 0 && args[iLim + 1] ? Number(args[iLim + 1]) : Infinity

// ---------------------------------------------------------------------------
// Open Location Code (Plus Codes)
//
// Se usa la implementación oficial de Google (`open-location-code`, Apache-2.0)
// en vez de una propia. Es un algoritmo corto y tentador de escribir a mano,
// pero un error silencioso acá siembra decenas de puntos en el lugar
// equivocado sin que nada avise. La librería es dependencia de DESARROLLO: la
// usa este script una vez y no viaja al sitio.
//
// Los códigos del cliente vienen "cortos" (`M96F+29V`): les faltan los cuatro
// primeros caracteres y necesitan una referencia a menos de medio grado para
// resolverse. Esa referencia es la ciudad.
// ---------------------------------------------------------------------------
import {OpenLocationCode} from 'open-location-code'

const olc = new OpenLocationCode()

function resolverCorto(corto, refLat, refLng) {
  const pleno = olc.recoverNearest(corto, refLat, refLng)
  const area = olc.decode(pleno)
  return {lat: area.latitudeCenter, lng: area.longitudeCenter, codigo: pleno}
}

// ---------------------------------------------------------------------------
// Nominatim
// ---------------------------------------------------------------------------
let pedidos = 0
async function nominatim(consulta) {
  pedidos++
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ve&q=${encodeURIComponent(consulta)}`
  try {
    const r = await fetch(url, {headers: {'User-Agent': AGENTE, 'Accept-Language': 'es'}})
    if (!r.ok) return null
    const d = await r.json()
    if (!Array.isArray(d) || !d.length) return null
    return {lat: Number(d[0].lat), lng: Number(d[0].lon)}
  } catch (e) {
    return null
  } finally {
    await dormir(PAUSA_NOMINATIM)
  }
}

const dentroDeVenezuela = (p) =>
  !!p && p.lat >= VENEZUELA.latMin && p.lat <= VENEZUELA.latMax && p.lng >= VENEZUELA.lngMin && p.lng <= VENEZUELA.lngMax

// ---------------------------------------------------------------------------
const datos = JSON.parse(readFileSync(ENTRADA, 'utf8'))
const lista = datos.distribuidores.filter((d) => d.origen === 'post').slice(0, LIMITE)
const parciales = datos.distribuidores.filter((d) => d.origen !== 'post')

const esPlusCode = (q) => /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i.test(q || '')

// 1 · Las ciudades, una sola vez.
const ciudades = existsSync(CACHE_CIUDADES) ? JSON.parse(readFileSync(CACHE_CIUDADES, 'utf8')) : {}
const claveCiudad = (d) => `${d.ciudad}|${d.estado}`
const pendientes = [...new Set(lista.filter((d) => d.ciudad).map(claveCiudad))].filter((k) => !(k in ciudades))

console.log(`${lista.length} distribuidores · ${pendientes.length} ciudades por consultar (${Object.keys(ciudades).length} ya en caché)`)
for (const [i, clave] of pendientes.entries()) {
  const [ciudad, estado] = clave.split('|')
  ciudades[clave] = await nominatim(`${ciudad}, ${estado}, Venezuela`)
  if (!ciudades[clave]) ciudades[clave] = await nominatim(`${ciudad}, Venezuela`)
  const p = ciudades[clave]
  if (p && !dentroDeVenezuela(p)) ciudades[clave] = null
  if ((i + 1) % 10 === 0 || i === pendientes.length - 1) console.log(`  ciudades ${i + 1}/${pendientes.length}`)
  writeFileSync(CACHE_CIUDADES, JSON.stringify(ciudades, null, 2))
}
const ciudadesUbicadas = Object.values(ciudades).filter(Boolean).length
console.log(`  ${ciudadesUbicadas}/${Object.keys(ciudades).length} ciudades ubicadas`)

// 2 · Cada comercio.
const descartadas = []
let porPlusCode = 0
let porDireccion = 0

for (const [i, d] of lista.entries()) {
  const q = (d.mapa || '').trim()
  const ref = ciudades[claveCiudad(d)] || null
  d.ubicacion = null
  d.precision = 'sin ubicación'

  if (!q) continue

  if (esPlusCode(q)) {
    if (!ref) {
      descartadas.push({nombre: d.nombre, motivo: 'Plus Code sin ciudad de referencia', q})
      continue
    }
    // El código se saca con expresión regular, no cortando por la coma: hay
    // fichas donde viene pegado a texto (`3FHF+VJ2 MIL CERÁMICAS`).
    const codigo = (q.match(/[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i) || [])[0]
    let p = null
    try {
      p = codigo ? resolverCorto(codigo.toUpperCase(), ref.lat, ref.lng) : null
    } catch (error) {
      p = null
    }
    if (dentroDeVenezuela(p)) {
      d.ubicacion = {lat: p.lat, lng: p.lng}
      d.precision = 'plus-code'
      porPlusCode++
    } else {
      descartadas.push({nombre: d.nombre, motivo: p ? 'el Plus Code cae fuera de Venezuela' : 'el Plus Code no se pudo resolver', q})
    }
    continue
  }

  // Dirección: se pregunta tal cual la escribió el cliente, restringido a VE.
  // Las que apuntan a otro país no devuelven nada y quedan descartadas con su
  // motivo — es lo que pasa con las dos fichas que dicen "Ayacucho, Perú".
  const p = await nominatim(q)
  if (dentroDeVenezuela(p)) {
    d.ubicacion = p
    d.precision = 'dirección'
    porDireccion++
  } else {
    descartadas.push({nombre: d.nombre, motivo: p ? 'la dirección cae fuera de Venezuela' : 'la dirección no se encontró en Venezuela', q})
  }
  if ((i + 1) % 25 === 0) console.log(`  comercios ${i + 1}/${lista.length}`)
}

const salida = {
  fuente: datos.fuente,
  ubicado: new Date().toISOString(),
  resumen: {
    total: lista.length + parciales.length,
    cargables: lista.length,
    parciales: parciales.length,
    conCoordenada: porPlusCode + porDireccion,
    porPlusCode,
    porDireccion,
    sinCoordenada: lista.length - porPlusCode - porDireccion,
    descartadas: descartadas.length,
    pedidosANominatim: pedidos,
  },
  descartadas,
  distribuidores: [...lista, ...parciales],
}
writeFileSync(SALIDA, JSON.stringify(salida, null, 2))

console.log('')
console.log(`  ${salida.resumen.conCoordenada} de ${lista.length} con coordenada (${porPlusCode} por Plus Code, ${porDireccion} por dirección)`)
console.log(`  ${salida.resumen.sinCoordenada} sin coordenada · ${descartadas.length} descartadas`)
console.log(`  ${pedidos} pedidos a Nominatim`)
console.log(`  → ${SALIDA}`)
