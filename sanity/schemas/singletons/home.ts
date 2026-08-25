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
          description: 'La mitad izquierda de la sección. Con video cargado y sin portada propia, hace de portada del tile.',
          fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
        }),
        // --- Video del tile izquierdo -------------------------------------
        // Hay dos maneras de cargarlo y REGLA DE PRECEDENCIA: si están las dos,
        // GANA EL ARCHIVO. El mp4 propio se sirve desde nuestro dominio
        // (autosuficiencia, plan maestro §3.3) y no involucra a terceros; el de
        // YouTube, aun con fachada, termina cargando el reproductor ajeno
        // cuando el visitante pulsa. El de YouTube es el camino disponible hoy;
        // el día que suban el mp4 propio, ese pasa a mandar sin tocar código.
        defineField({
          name: 'video',
          title: 'Video de instalación (archivo propio)',
          type: 'file',
          options: {accept: 'video/mp4'},
          description:
            'Opción preferida: se sirve desde nuestro propio sitio. Si está cargado, manda sobre la URL de YouTube.',
        }),
        defineField({
          name: 'videoYoutube',
          title: 'Video de instalación (YouTube)',
          type: 'url',
          description:
            'Alternativa cuando el video vive en el canal, ej. https://www.youtube.com/watch?v=… El sitio muestra la portada de abajo y solo carga el reproductor de YouTube cuando el visitante pulsa el play.',
          validation: (rule) =>
            rule
              .uri({scheme: ['http', 'https']})
              .custom((valor) =>
                !valor || /(?:youtube\.com|youtu\.be)/.test(valor)
                  ? true
                  : 'Tiene que ser una dirección de YouTube (youtube.com o youtu.be).',
              ),
        }),
        defineField({
          name: 'videoPortada',
          title: 'Portada del video',
          type: 'image',
          options: {hotspot: true},
          description:
            'La imagen fija del tile mientras nadie pulsa el play. Se sirve desde nuestro sitio: nunca se enlaza la miniatura de YouTube. Sin portada se usa la imagen de la sección.',
          fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
        }),
        defineField({
          name: 'videoTitulo',
          title: 'Título del video',
          type: 'string',
          description:
            'El título real del video. No se dibuja en pantalla: nombra el botón de play para quien usa lector de pantalla y titula el reproductor.',
        }),
        defineField({
          name: 'videoEtiqueta',
          title: 'Etiqueta del video',
          type: 'string',
          description: 'Texto corto sobre la imagen, ej. "Video · 1:36". Sin duración cierta, mejor solo "Video".',
          validation: (rule) => rule.max(32).warning('Más de 32 caracteres se parte en dos líneas sobre la imagen.'),
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
