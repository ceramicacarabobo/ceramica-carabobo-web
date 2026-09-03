import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'

import {schemaTypes, SINGLETONS} from './sanity/schemas'
import {structure} from './sanity/structure'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'placeholder'
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production'

export default defineConfig({
  name: 'ceramica-carabobo',
  title: 'Cerámica Carabobo',
  projectId,
  dataset,
  basePath: '/admin',
  // El Presentation Tool (vista previa de borradores con click-to-edit) se
  // RETIRÓ el 2026-09-04. Exigía un deploy server-rendered, y ese worker se
  // pasa del límite de CPU del plan gratuito al renderizar el sitio con el
  // marcado invisible que el click-to-edit inyecta: devolvía 503 en TODAS sus
  // rutas. No es un fallo de configuración, es un techo del plan.
  // Dejarlo enchufado a un worker caído habría puesto un panel roto dentro del
  // admin que usa el cliente. El ciclo editar → publicar → ver en ~3 minutos
  // cubre la necesidad; ver `plan-proyecto.md` §16.
  plugins: [
    structureTool({structure}),
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
