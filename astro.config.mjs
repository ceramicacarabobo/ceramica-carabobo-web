// @ts-check
import {defineConfig} from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import sanity from '@sanity/astro'
import {loadEnv} from 'vite'

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')

const projectId = env.PUBLIC_SANITY_PROJECT_ID || 'placeholder'
const dataset = env.PUBLIC_SANITY_DATASET || 'production'

// El visual editing (Presentation Tool) exige páginas server-rendered.
// Solo el deploy de preview lo enciende; producción se construye estática.
const visualEditingEnabled = env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === 'true'

if (projectId === 'placeholder') {
  console.warn(
    '[ceramica] PUBLIC_SANITY_PROJECT_ID sin configurar: el sitio compila sin contenido. Ver docs/fase-1-esqueleto.md',
  )
}

export default defineConfig({
  site: env.SITE_URL || 'http://localhost:4321',
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
      stega: {studioUrl: '/admin'},
    }),
    react(),
  ],
  prefetch: {prefetchAll: true, defaultStrategy: 'hover'},
  build: {inlineStylesheets: 'auto'},
})
