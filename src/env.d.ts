/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface ImportMetaEnv {
  readonly PUBLIC_SANITY_PROJECT_ID: string
  readonly PUBLIC_SANITY_DATASET: string
  readonly PUBLIC_SANITY_VISUAL_EDITING_ENABLED?: string
  readonly PUBLIC_SANITY_PREVIEW_URL?: string
  readonly PUBLIC_SANITY_STUDIO_URL?: string
  readonly PUBLIC_ENTORNO?: 'qa' | 'preview' | 'produccion'
  readonly SANITY_API_READ_TOKEN?: string
  readonly SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
