import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'proyecto',
  title: 'Obra',
  type: 'object',
  fields: [
    defineField({name: 'nombre', title: 'Nombre de la obra', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'ciudad', title: 'Ciudad', type: 'string'}),
    defineField({name: 'credito', title: 'Crédito', type: 'string', description: 'Autoría o estudio, si corresponde.'}),
    defineField({name: 'producto', title: 'Diseño usado', type: 'reference', to: [{type: 'producto'}]}),
    defineField({name: 'formato', title: 'Formato', type: 'string'}),
    defineField({
      name: 'foto',
      title: 'Foto',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {select: {title: 'nombre', subtitle: 'ciudad', media: 'foto'}},
})
