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
    defineField({name: 'textoEstadoVacio', title: 'Texto cuando un estado no tiene distribuidores', type: 'string'}),
    defineField({name: 'cierre', title: 'Texto de cierre', type: 'text', rows: 2}),
  ],
  preview: {prepare: () => ({title: 'Dónde comprar'})},
})
