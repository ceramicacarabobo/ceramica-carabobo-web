import {defineField, defineType} from 'sanity'
import {MATERIAS, opciones} from '../../lib/listas'

/**
 * Materia (6 documentos): alimenta el megamenú del catálogo y las secciones
 * del home. El conteo de diseños por materia SE DERIVA del catálogo — no se escribe.
 */
export default defineType({
  name: 'materia',
  title: 'Materia',
  type: 'document',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Materia',
      type: 'string',
      options: {list: opciones(MATERIAS)},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'claim',
      title: 'Frase',
      type: 'string',
      description: 'Una línea. Ej.: "La calidez de la veta, sin su mantenimiento."',
      validation: (rule) => rule.max(80).warning('Más de 80 caracteres rompe la línea del megamenú.'),
    }),
    defineField({
      name: 'fotoTextura',
      title: 'Foto macro de la textura',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
    }),
    defineField({
      name: 'fotoAmbiente',
      title: 'Foto de ambiente',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
    }),
  ],
  preview: {select: {title: 'nombre', subtitle: 'claim', media: 'fotoTextura'}},
})
