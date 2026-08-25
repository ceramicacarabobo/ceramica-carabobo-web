import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'dondeComprar',
  title: 'Dónde comprar',
  type: 'document',
  fields: [
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      fields: [
        defineField({name: 'eyebrow', title: 'Antetítulo', type: 'string'}),
        defineField({name: 'titular', title: 'Titular', type: 'string'}),
        defineField({name: 'bajada', title: 'Bajada', type: 'text', rows: 2}),
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
      name: 'whatsappCentral',
      title: 'WhatsApp central',
      type: 'string',
      description: 'Solo dígitos con código de país, ej. 584140000000.',
      validation: (rule) => rule.regex(/^\d{10,15}$/, {name: 'solo dígitos'}).warning('Solo dígitos, con código de país.'),
    }),
    defineField({
      name: 'textoEstadoVacio',
      title: 'Texto cuando no hay resultados',
      type: 'text',
      rows: 3,
      description:
        'Se muestra cuando el estado elegido no tiene distribuidores y cuando la búsqueda no encuentra ninguno. Sin disculpas ni signos de admiración: qué pasa y cuál es la salida.',
    }),
    defineField({
      name: 'cierre',
      title: 'Banda de cierre',
      type: 'object',
      description: 'Sin título la banda no se dibuja.',
      fields: [
        defineField({name: 'etiqueta', title: 'Antetítulo', type: 'string'}),
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({name: 'texto', title: 'Texto', type: 'text', rows: 2}),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Dónde comprar'})},
})
