import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'contacto',
  title: 'Contacto',
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
    defineField({name: 'horario', title: 'Horario de atención', type: 'string'}),
    defineField({name: 'correo', title: 'Correo', type: 'string', validation: (rule) => rule.email()}),
    defineField({
      name: 'sedes',
      title: 'Sedes',
      type: 'array',
      of: [{type: 'sede'}],
      description: 'Las dos plantas: Valencia y Guacara.',
    }),
    defineField({
      name: 'formulario',
      title: 'Bloque del formulario',
      type: 'object',
      fields: [
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({name: 'texto', title: 'Texto', type: 'text', rows: 2}),
        defineField({name: 'gracias', title: 'Mensaje de gracias', type: 'string'}),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Contacto'})},
})
