import {defineField, defineType} from 'sanity'

/**
 * Home — singleton. Composición y orden de secciones son FIJOS (código);
 * lo editable es el contenido de cada sección.
 * Regla defensiva: una sección bajo su mínimo se oculta entera en el sitio.
 */
export default defineType({
  name: 'home',
  title: 'Home',
  type: 'document',
  groups: [
    {name: 'hero', title: 'Hero', default: true},
    {name: 'ambientes', title: '01 · Ambientes'},
    {name: 'proyectos', title: '02 · Proyectos'},
    {name: 'historia', title: 'Historia'},
    {name: 'profesionales', title: '03 · Profesionales'},
    {name: 'encuentranos', title: '04 · Encuéntranos'},
  ],
  fields: [
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      options: {collapsible: false},
      fields: [
        defineField({name: 'eyebrow', title: 'Línea superior', type: 'string', description: 'Ej.: "Hecho en Venezuela · Desde 1956".'}),
        defineField({name: 'titular', title: 'Titular', type: 'string', validation: (rule) => rule.max(60).warning('Más de 60 caracteres rompe el titular en móvil.')}),
        defineField({name: 'video', title: 'Video', type: 'file', options: {accept: 'video/mp4'}}),
        defineField({
          name: 'poster',
          title: 'Poster del video',
          type: 'image',
          options: {hotspot: true},
          description: 'Se muestra solo (sin video) con Save-Data o conexión lenta.',
          fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
        }),
        defineField({
          name: 'capas',
          title: 'Capas del carrusel',
          type: 'array',
          of: [{type: 'heroCapa'}],
          description: 'Mínimo 2: con menos, el carrusel no se muestra.',
          validation: (rule) => rule.min(2).warning('Con menos de 2 capas el carrusel se oculta.'),
        }),
      ],
    }),

    defineField({
      name: 'ambientes',
      title: 'Ambientes',
      type: 'object',
      group: 'ambientes',
      fields: [
        defineField({name: 'etiqueta', title: 'Etiqueta', type: 'string'}),
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({
          name: 'pestanas',
          title: 'Pestañas',
          type: 'array',
          of: [{type: 'ambientePestana'}],
        }),
      ],
    }),

    defineField({
      name: 'cita',
      title: 'Cita',
      type: 'object',
      group: 'ambientes',
      fields: [defineField({name: 'texto', title: 'Texto', type: 'text', rows: 2})],
    }),

    defineField({
      name: 'proyectos',
      title: 'Proyectos',
      type: 'object',
      group: 'proyectos',
      fields: [
        defineField({name: 'etiqueta', title: 'Etiqueta', type: 'string'}),
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({name: 'bajada', title: 'Bajada', type: 'text', rows: 2}),
        defineField({
          name: 'obras',
          title: 'Obras',
          type: 'array',
          of: [{type: 'proyecto'}],
          description: 'Mínimo 2: con menos, la sección se oculta.',
          validation: (rule) => rule.min(2).warning('Con menos de 2 obras la sección se oculta.'),
        }),
      ],
    }),

    defineField({
      name: 'historia',
      title: 'Historia',
      type: 'object',
      group: 'historia',
      fields: [
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({
          name: 'hitos',
          title: 'Hitos',
          type: 'array',
          of: [{type: 'hito'}],
          description: 'Mínimo 3: con menos, la sección se oculta.',
          validation: (rule) => rule.min(3).warning('Con menos de 3 hitos la sección se oculta.'),
        }),
      ],
    }),

    defineField({
      name: 'profesionales',
      title: 'Profesionales',
      type: 'object',
      group: 'profesionales',
      fields: [
        defineField({name: 'etiqueta', title: 'Etiqueta', type: 'string'}),
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({name: 'texto', title: 'Texto', type: 'text', rows: 3}),
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
      name: 'encuentranos',
      title: 'Encuéntranos',
      type: 'object',
      group: 'encuentranos',
      description: 'Solo los textos: los datos y los conteos salen de los distribuidores.',
      fields: [
        defineField({name: 'etiqueta', title: 'Etiqueta', type: 'string'}),
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({name: 'texto', title: 'Texto', type: 'text', rows: 2}),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Home'})},
})
