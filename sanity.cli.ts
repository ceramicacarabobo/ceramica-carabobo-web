import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'placeholder',
    dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  },
  // El Studio va embebido en Astro (/admin); la CLI solo se usa para
  // dataset export/import y gestión del proyecto.
  studioHost: undefined,
})
