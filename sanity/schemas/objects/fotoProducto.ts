import {defineField, defineType} from 'sanity'

/**
 * Foto de producto. El hotspot de Sanity es el "punto focal" que exige
 * Requisitos técnicos §Imágenes (se traduce a object-position en el sitio).
 */
export default defineType({
  name: 'fotoProducto',
  title: 'Foto',
  type: 'image',
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Texto alternativo',
      type: 'string',
      description: 'Qué se ve en la foto. Obligatorio para accesibilidad.',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'tipo',
      title: 'Tipo de toma',
      type: 'string',
      options: {list: [{title: 'Macro de la baldosa', value: 'macro'}, {title: 'Ambiente', value: 'ambiente'}], layout: 'radio'},
      initialValue: 'ambiente',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'esEjemplo',
      title: 'Es foto de ejemplo (no corresponde a este producto)',
      type: 'boolean',
      description:
        'Marca la foto como referencia. Se ve un aviso solo en el preview del admin; en producción nunca aparece.',
      initialValue: false,
    }),
  ],
  preview: {
    select: {media: 'asset', title: 'alt', subtitle: 'tipo', ejemplo: 'esEjemplo'},
    prepare: ({media, title, subtitle, ejemplo}) => ({
      media,
      title: title || 'Sin texto alternativo',
      subtitle: ejemplo ? `${subtitle} · EJEMPLO` : subtitle,
    }),
  },
})
