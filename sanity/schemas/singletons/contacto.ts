import {defineField, defineType} from 'sanity'

/**
 * Página de Contacto (§2.3 de docs/modelo-de-contenido.md).
 *
 * Campos agregados en la Fase 2 al construir la página: el diseño mostraba
 * textos que no tenían lugar en el modelo, y la regla es dura — si un texto no
 * está en el CMS, no se muestra. Son `hero.eyebrow`, `visitaTitulo`,
 * `correoTexto`, `mapaNota`, `formulario.etiqueta` y `formulario.privacidad`.
 * `horario` pasó de string a texto de dos líneas porque el diseño lo escribe en
 * dos (lunes a miércoles / jueves y viernes).
 */
export default defineType({
  name: 'contacto',
  title: 'Contacto',
  type: 'document',
  groups: [
    {name: 'hero', title: 'Hero'},
    {name: 'visita', title: 'Visita y sedes'},
    {name: 'formulario', title: 'Formulario'},
  ],
  fields: [
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({
          name: 'eyebrow',
          title: 'Antetítulo',
          type: 'string',
          description: 'La línea corta en versalitas sobre el titular.',
          validation: (rule) => rule.max(24).warning('Más de 24 caracteres parte la línea.'),
        }),
        defineField({name: 'titular', title: 'Titular', type: 'string'}),
        defineField({name: 'bajada', title: 'Bajada', type: 'text', rows: 2}),
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
      name: 'visitaTitulo',
      title: 'Título del bloque de datos',
      type: 'string',
      group: 'visita',
      description: 'Encabeza la columna de horario, correo y sedes.',
    }),
    defineField({
      name: 'horario',
      title: 'Horario de atención',
      type: 'text',
      rows: 2,
      group: 'visita',
      description: 'Una línea por tramo; los saltos de línea se respetan.',
    }),
    defineField({
      name: 'correoTexto',
      title: 'Texto sobre el correo',
      type: 'string',
      group: 'visita',
      description: 'La línea que introduce la dirección de correo.',
    }),
    defineField({
      name: 'correo',
      title: 'Correo',
      type: 'string',
      group: 'visita',
      validation: (rule) => rule.email(),
      description: 'Si se deja vacío se usa el correo de Ajustes del sitio.',
    }),
    defineField({
      name: 'sedes',
      title: 'Sedes',
      type: 'array',
      of: [{type: 'sede'}],
      group: 'visita',
      description: 'Las dos plantas: Valencia y Guacara. La primera es la que llama el botón del pulgar en teléfono.',
    }),
    defineField({
      name: 'mapaNota',
      title: 'Nota del mapa',
      type: 'text',
      rows: 2,
      group: 'visita',
      description:
        'Aclaración bajo el mapa. Hoy avisa que la posición de los pines es aproximada; cuando lleguen las coordenadas de planta, se borra y la nota desaparece.',
    }),
    defineField({
      name: 'formulario',
      title: 'Bloque del formulario',
      type: 'object',
      group: 'formulario',
      fields: [
        defineField({name: 'etiqueta', title: 'Antetítulo', type: 'string'}),
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({name: 'texto', title: 'Texto', type: 'text', rows: 2}),
        defineField({
          name: 'privacidad',
          title: 'Aviso de privacidad',
          type: 'string',
          description: 'La línea junto al botón de envío. Vacío = no se muestra.',
        }),
        defineField({
          name: 'gracias',
          title: 'Mensaje de gracias',
          type: 'text',
          rows: 2,
          description: 'Lo que se lee al enviar. Escribir {nombre} donde deba ir el nombre de quien escribió.',
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Contacto'})},
})
