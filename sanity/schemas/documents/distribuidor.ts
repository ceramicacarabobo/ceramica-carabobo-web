import {defineField, defineType} from 'sanity'
import {ESTADOS, opciones} from '../../lib/listas'

/**
 * Distribuidor / punto de venta (~24 documentos).
 * Alimenta: página Dónde comprar (mapa + índice + tarjetas), sección
 * Encuéntranos del home (los conteos SE DERIVAN por código, nunca se escriben)
 * y el JSON-LD LocalBusiness por punto de venta.
 */
export default defineType({
  name: 'distribuidor',
  title: 'Distribuidor',
  type: 'document',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre del comercio',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'estado',
      title: 'Estado',
      type: 'string',
      description: 'Lista cerrada: es la que enlaza con el mapa de Venezuela.',
      options: {list: opciones(ESTADOS)},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'ciudad', title: 'Ciudad', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'direccion', title: 'Dirección', type: 'text', rows: 2, validation: (rule) => rule.required()}),
    defineField({name: 'telefono', title: 'Teléfono', type: 'string'}),
    defineField({
      name: 'whatsapp',
      title: 'WhatsApp',
      type: 'string',
      description: 'Solo dígitos con código de país, ej. 584140000000.',
      validation: (rule) => rule.regex(/^\d{10,15}$/, {name: 'solo dígitos'}).warning('Solo dígitos, con código de país.'),
    }),
    defineField({name: 'correo', title: 'Correo', type: 'string', validation: (rule) => rule.email()}),
    defineField({name: 'horario', title: 'Horario', type: 'string'}),
    defineField({
      name: 'ubicacion',
      title: 'Ubicación en el mapa',
      type: 'geopoint',
      description: 'Opcional: sin coordenadas el punto se lista pero no se marca en el mapa.',
    }),
  ],
  orderings: [
    {name: 'estadoCiudad', title: 'Estado y ciudad', by: [{field: 'estado', direction: 'asc'}, {field: 'ciudad', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'nombre', ciudad: 'ciudad', estado: 'estado'},
    prepare: ({title, ciudad, estado}) => ({title, subtitle: [ciudad, estado].filter(Boolean).join(', ')}),
  },
})
