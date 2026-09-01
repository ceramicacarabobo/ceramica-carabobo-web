// @ts-check
import {defineConfig} from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import sanity from '@sanity/astro'
import {loadEnv} from 'vite'

// Se lee en modo `production` por defecto: así el build de Cloudflare toma
// `.env.production` (configuración pública versionada) aunque no venga NODE_ENV.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '')

const projectId = env.PUBLIC_SANITY_PROJECT_ID || 'placeholder'
const dataset = env.PUBLIC_SANITY_DATASET || 'production'

// El visual editing (Presentation Tool) exige páginas server-rendered.
// Solo el deploy de preview lo enciende; producción se construye estática.
// Se mira primero process.env para que `PUBLIC_...=true astro build` mande sobre
// el valor de los archivos .env, y se reinyecta más abajo con `vite.define` para
// que el código de las páginas vea exactamente lo mismo que esta configuración.
const visualEditingEnabled =
  (process.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED ?? env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED) === 'true'

// El Studio vive en el sitio estático y el preview en otro dominio: la URL del
// Studio tiene que ser absoluta o los overlays no encuentran a quién hablarle.
const studioUrl = env.PUBLIC_SANITY_STUDIO_URL || '/admin'

if (projectId === 'placeholder') {
  console.warn(
    '[ceramica] PUBLIC_SANITY_PROJECT_ID sin configurar: el sitio compila sin contenido. Ver docs/fase-1-esqueleto.md',
  )
}

export default defineConfig({
  site: env.SITE_URL || 'http://localhost:4321',
  trailingSlash: 'never',
  output: visualEditingEnabled ? 'server' : 'static',
  adapter: cloudflare({imageService: 'compile'}),
  integrations: [
    sanity({
      projectId,
      dataset,
      apiVersion: '2026-08-01',
      // Producción nunca depende de Sanity en runtime: el build baja el contenido.
      useCdn: false,
      studioBasePath: '/admin',
      stega: {studioUrl},
    }),
    react(),
  ],
  image: {
    // Las imágenes del CMS se descargan y reprocesan en el build: el HTML de
    // producción nunca referencia cdn.sanity.io (condición §3.3 del plan).
    remotePatterns: [{protocol: 'https', hostname: 'cdn.sanity.io'}],
  },
  prefetch: {prefetchAll: true, defaultStrategy: 'hover'},
  vite: {
    define: {
      'import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED': JSON.stringify(String(visualEditingEnabled)),
      'import.meta.env.PUBLIC_SANITY_STUDIO_URL': JSON.stringify(studioUrl),
      // El token de lectura NO lleva prefijo `PUBLIC_`, así que Vite no lo
      // sustituye solo: sin esta línea `import.meta.env.SANITY_API_READ_TOKEN`
      // queda `undefined` dentro del Worker —que no tiene `process.env`— y el
      // preview cae a la rama sin borradores. Era la causa de que el
      // click-to-edit no funcionara desde la Fase 1.
      //
      // Se inyecta SOLO en el build de preview: el sitio estático de producción
      // no lo lleva, y así el token no viaja en ningún artefacto público. Es un
      // token de rol *viewer* y el bundle del Worker no se sirve al navegador.
      ...(visualEditingEnabled
        ? {'import.meta.env.SANITY_API_READ_TOKEN': JSON.stringify(process.env.SANITY_API_READ_TOKEN ?? env.SANITY_API_READ_TOKEN ?? '')}
        : {}),
    },
  },
  build: {inlineStylesheets: 'auto'},
})
