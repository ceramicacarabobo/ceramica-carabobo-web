import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'sede',
  title: 'Sede',
  type: 'object',
  fields: [
    defineField({name: 'nombre', title: 'Nombre', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'direccion', title: 'Dirección', type: 'text', rows: 2, validation: (rule) => rule.required()}),
    defineField({name: 'telefono', title: 'Teléfono', type: 'string'}),
    defineField({
      name: 'ubicacion',
      title: 'Ubicación en el mapa',
      type: 'geopoint',
      description: 'Coordenadas exactas de la planta (las actuales son aproximadas).',
    }),
  ],
  preview: {select: {title: 'nombre', subtitle: 'direccion'}},
})
