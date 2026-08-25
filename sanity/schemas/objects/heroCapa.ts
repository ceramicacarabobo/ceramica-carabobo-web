import {defineField, defineType} from 'sanity'

/** Capa del carrusel del hero: o apunta a un producto, o es imagen con etiqueta. */
export default defineType({
  name: 'heroCapa',
  title: 'Capa del hero',
  type: 'object',
  fields: [
    defineField({
      name: 'producto',
      title: 'Diseño',
      type: 'reference',
      to: [{type: 'producto'}],
      description: 'La etiqueta del carrusel toma el nombre del diseño.',
    }),
    defineField({
      name: 'etiqueta',
      title: 'Etiqueta (si no hay diseño)',
      type: 'string',
    }),
    defineField({
      name: 'imagen',
      title: 'Imagen',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
      validation: (rule) => rule.required(),
    }),
  ],
  validation: (rule) =>
    rule.custom((capa?: {producto?: unknown; etiqueta?: string}) =>
      capa?.producto || capa?.etiqueta ? true : 'Elegí un diseño o escribí una etiqueta.',
    ),
  preview: {
    select: {title: 'etiqueta', producto: 'producto.nombre', media: 'imagen'},
    prepare: ({title, producto, media}) => ({title: producto || title || 'Capa', media}),
  },
})
