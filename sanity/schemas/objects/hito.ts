import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'hito',
  title: 'Hito de historia',
  type: 'object',
  fields: [
    defineField({
      name: 'anio',
      title: 'Año',
      type: 'number',
      validation: (rule) => rule.required().min(1900).max(2100),
    }),
    defineField({name: 'titulo', title: 'Título', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'texto',
      title: 'Texto',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(220).warning('Más de 220 caracteres desborda la capa de la historia.'),
    }),
    defineField({
      name: 'imagen',
      title: 'Imagen',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
    }),
  ],
  preview: {
    select: {title: 'titulo', anio: 'anio', media: 'imagen'},
    prepare: ({title, anio, media}) => ({title: `${anio ?? ''} — ${title ?? ''}`.trim(), media}),
  },
})
