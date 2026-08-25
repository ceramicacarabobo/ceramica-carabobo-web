import {defineField, defineType} from 'sanity'

export const ambienteFicha = defineType({
  name: 'ambienteFicha',
  title: 'Ficha de ambiente',
  type: 'object',
  fields: [
    defineField({
      name: 'producto',
      title: 'Diseño',
      type: 'reference',
      to: [{type: 'producto'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'foto',
      title: 'Foto del ambiente',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'spec', title: 'Dato al pie', type: 'string', description: 'Ej.: "60 × 120 · Mate".'}),
  ],
  preview: {
    select: {title: 'producto.nombre', subtitle: 'spec', media: 'foto'},
  },
})

export const ambientePestana = defineType({
  name: 'ambientePestana',
  title: 'Pestaña de ambientes',
  type: 'object',
  fields: [
    defineField({name: 'label', title: 'Nombre de la pestaña', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'fichas',
      title: 'Fichas',
      type: 'array',
      of: [{type: 'ambienteFicha'}],
      description: 'Mínimo 3: con menos, la pestaña no se muestra.',
      validation: (rule) => rule.min(3).warning('Con menos de 3 fichas la pestaña se oculta en el sitio.'),
    }),
  ],
  preview: {
    select: {title: 'label', fichas: 'fichas'},
    prepare: ({title, fichas}) => ({title, subtitle: `${fichas?.length ?? 0} fichas`}),
  },
})
