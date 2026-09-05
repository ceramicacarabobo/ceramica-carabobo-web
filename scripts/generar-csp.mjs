#!/usr/bin/env node
/**
 * Genera la Content-Security-Policy y la escribe en `dist/client/_headers`.
 *
 * Corre DESPUÉS del build (`npm run build` lo encadena) porque necesita el HTML
 * ya construido: la política lleva el hash de cada script en línea, y varios de
 * esos scripts contienen datos —el JSON del catálogo, los datos estructurados—
 * que cambian cada vez que el cliente publica. Una lista de hashes escrita a
 * mano se rompería en la primera edición y el sitio dejaría de funcionar sin
 * que nadie tocara una línea de código.
 *
 * ── Dos políticas, no una ──────────────────────────────────────────────────
 * El sitio público es estático y no habla con nadie: aguanta una política
 * estricta. El Studio de `/admin` es una aplicación que conversa con la API de
 * Sanity, sube imágenes y monta su interfaz en caliente: con la política del
 * sitio se rompe. Van separadas, que es justo lo que permite `_headers`.
 *
 * ── Report-Only ────────────────────────────────────────────────────────────
 * Hoy se emite como `Content-Security-Policy-Report-Only`: el navegador ANOTA
 * lo que bloquearía y no bloquea nada. Es deliberado — una CSP falla en
 * silencio, y la única forma honesta de activarla es verla reportar limpio
 * primero. Para activarla de verdad se cambia `MODO` a 'bloqueo'.
 */
import {readFileSync, writeFileSync, existsSync, readdirSync, statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'

const RAIZ = 'dist/client'
const MODO = process.env.CSP_MODO || 'reporte' // 'reporte' | 'bloqueo'
const CABECERA =
  MODO === 'bloqueo' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'

/** Todos los .html del build, menos los del Studio. */
function paginas(dir, fuera = []) {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada)
    if (statSync(ruta).isDirectory()) {
      if (entrada === 'admin' || entrada === '_astro') continue
      paginas(ruta, fuera)
    } else if (entrada.endsWith('.html')) {
      fuera.push(ruta)
    }
  }
  return fuera
}

// Hash de cada script EJECUTABLE en línea. Los `application/ld+json` y el JSON
// del catálogo quedan fuera a propósito: son DATOS —el navegador no ejecuta su
// contenido— y hay uno distinto por ficha de producto, así que hashearlos metía
// 129 hashes contra 17, unos 6,8 KB de cabecera EN CADA respuesta del sitio.
// El modo reporte dirá si el navegador se queja de ellos; si lo hace, se decide
// con el dato delante y no de antemano.
const EJECUTABLE = (attrs) => {
  const tipo = /type="([^"]+)"/.exec(attrs)?.[1]
  return !tipo || tipo === 'module' || tipo === 'text/javascript'
}
const hashes = new Set()
for (const pagina of paginas(RAIZ)) {
  const html = readFileSync(pagina, 'utf8')
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!EJECUTABLE(m[1])) continue
    hashes.add(`'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`)
  }
}

const publica = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].join(' ')}`,
  // Los estilos en línea no se pueden hashear uno a uno: Astro genera 69
  // atributos `style=` en el home y un hash cubre bloques `<style>`, no
  // atributos. Es la concesión conocida de una CSP en un sitio estático, y la
  // superficie que abre es mucho menor que la de un script.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  // `data:` porque el bundler incrusta Open Sans como data URI dentro del CSS
  // (lo cazó el modo reporte: sin esto el sitio caía a la fuente del sistema).
  "font-src 'self' data:",
  "media-src 'self'",
  // El único tercero del sitio: el reproductor, que se crea SOLO al pulsar play.
  "frame-src https://www.youtube-nocookie.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

// El Studio: aplicación viva, no página. Necesita construir su interfaz en
// caliente y hablar con Sanity. Se le da lo que necesita y nada más — sigue sin
// poder cargar scripts de otros dominios.
const admin = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://core.sanity-cdn.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.sanity.io https://lh3.googleusercontent.com",
  // El Studio trae su tipografía de su propio CDN de assets — otro hallazgo del
  // modo reporte, que no estaba en ninguna documentación.
  "font-src 'self' data: https://design-system-static.sanity.io",
  "media-src 'self' blob: https://cdn.sanity.io",
  "connect-src 'self' https://*.api.sanity.io https://*.apicdn.sanity.io https://cdn.sanity.io wss://*.api.sanity.io https://core.sanity-cdn.com https://design-system-static.sanity.io",
  "frame-src 'self' https://*.sanity.io",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

const RUTA = join(RAIZ, '_headers')
const actual = existsSync(RUTA) ? readFileSync(RUTA, 'utf8') : ''
// Se busca la CABECERA, no la palabra: `public/_headers` la nombra en sus
// comentarios y con un `includes` a secas el generador no escribía nunca.
const yaTiene = actual.split('\n').some((l) => /^\s*Content-Security-Policy(-Report-Only)?\s*:/i.test(l))
if (yaTiene) {
  console.log('  _headers ya trae una CSP: no se toca.')
  process.exit(0)
}

const bloque = `

# ── Content-Security-Policy ────────────────────────────────────────────────
# Generada por scripts/generar-csp.mjs en cada build. NO editar a mano: los
# hashes de los scripts en línea cambian con el contenido.
# Modo actual: ${MODO === 'bloqueo' ? 'BLOQUEO' : 'SOLO REPORTE (no bloquea nada)'}.
${MODO === 'bloqueo' ? '' : '# Para activarla: CSP_MODO=bloqueo npm run build\n'}
/admin/*
  ${CABECERA}: ${admin}

/*
  ${CABECERA}: ${publica}
`

writeFileSync(RUTA, actual + bloque)
console.log(`  CSP escrita en _headers · modo ${MODO} · ${hashes.size} scripts en línea`)
