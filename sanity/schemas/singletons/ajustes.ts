import {defineField, defineType} from 'sanity'

/** Ajustes del sitio: metadatos, datos de contacto globales y textos legales. */
export default defineType({
  name: 'ajustes',
  title: 'Ajustes del sitio',
  type: 'document',
  fields: [
    defineField({name: 'titulo', title: 'Título del sitio', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'descripcion',
      title: 'Descripción',
      type: 'text',
      rows: 2,
      description: 'La que se ve en Google y al compartir por WhatsApp.',
      validation: (rule) => rule.max(160).warning('Google corta por encima de 160 caracteres.'),
    }),
    defineField({
      name: 'imagenOG',
      title: 'Imagen para compartir',
      type: 'image',
      description: 'Se usa cuando una página no trae la suya. 1200 × 630.',
    }),
    defineField({
      name: 'textoPie',
      title: 'Texto del pie',
      type: 'text',
      rows: 4,
      description: 'El párrafo de marca que abre el pie de página.',
      validation: (rule) => rule.max(400).warning('Más de 400 caracteres desbalancea la columna del pie.'),
    }),
    defineField({
      name: 'direccion',
      title: 'Dirección principal',
      type: 'text',
      rows: 2,
      description: 'La que se muestra en el pie. Las sedes completas se editan en la página de Contacto.',
    }),
    defineField({name: 'telefono', title: 'Teléfono', type: 'string'}),
    defineField({name: 'correo', title: 'Correo', type: 'string', validation: (rule) => rule.email()}),
    defineField({name: 'whatsapp', title: 'WhatsApp', type: 'string'}),
    defineField({
      name: 'anioFundacion',
      title: 'Año de fundación',
      type: 'number',
      initialValue: 1956,
      validation: (rule) => rule.min(1900).max(2100),
    }),
    defineField({name: 'privacidad', title: 'Política de privacidad', type: 'array', of: [{type: 'block'}]}),
  ],
  preview: {prepare: () => ({title: 'Ajustes del sitio'})},
})
