import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'

import {schemaTypes, SINGLETONS} from './sanity/schemas'
import {structure} from './sanity/structure'
import {locations} from './sanity/locations'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'placeholder'
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production'

// En dev el Studio y el sitio comparten origen; el deploy de preview
// (server-rendered) se pasa por variable de entorno.
const previewUrl = import.meta.env.PUBLIC_SANITY_PREVIEW_URL || '/'

export default defineConfig({
  name: 'ceramica-carabobo',
  title: 'Cerámica Carabobo',
  projectId,
  dataset,
  basePath: '/admin',
  plugins: [
    structureTool({structure}),
    presentationTool({previewUrl, resolve: {locations}}),
    visionTool({defaultApiVersion: '2026-08-01'}),
  ],
  schema: {
    types: schemaTypes,
    // Los documentos únicos no se crean ni se duplican desde el menú global.
    templates: (prev) => prev.filter((plantilla) => !SINGLETONS.includes(plantilla.schemaType as never)),
  },
  document: {
    actions: (prev, {schemaType}) =>
      SINGLETONS.includes(schemaType as never)
        ? prev.filter(({action}) => action !== 'duplicate' && action !== 'delete' && action !== 'unpublish')
        : prev,
  },
})
