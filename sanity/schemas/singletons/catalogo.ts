import {defineField, defineType} from 'sanity'

/**
 * Página de Catálogo — textos editoriales del hero y de la banda de cierre.
 *
 * La grilla, los filtros y sus conteos NO viven acá: se derivan de los
 * productos (regla del prototipo — un conteo nunca se escribe a mano). Este
 * documento existe porque el catálogo es la única página del diseño con copy
 * propio que no estaba en el modelo, y la regla del proyecto es dura: si un
 * texto no está en el CMS, no se muestra.
 */
export default defineType({
  name: 'catalogo',
  title: 'Catálogo',
  type: 'document',
  fields: [
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      fields: [
        defineField({name: 'eyebrow', title: 'Antetítulo', type: 'string', description: 'Línea corta sobre el titular, ej. "Diseños 2026".'}),
        defineField({
          name: 'titular',
          title: 'Titular',
          type: 'string',
          description: 'Vacío = se usa el nombre de la página en la navegación ("Catálogo"), que es estructura, no copy.',
        }),
        defineField({name: 'bajada', title: 'Bajada', type: 'text', rows: 3}),
        defineField({
          name: 'imagen',
          title: 'Imagen',
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
        }),
      ],
    }),
    defineField({
      name: 'cierre',
      title: 'Banda de cierre',
      description: 'Sin título no se dibuja la banda entera (contenido defensivo).',
      type: 'object',
      fields: [
        defineField({name: 'etiqueta', title: 'Antetítulo', type: 'string'}),
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({name: 'texto', title: 'Texto', type: 'text', rows: 3}),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Catálogo'})},
})
