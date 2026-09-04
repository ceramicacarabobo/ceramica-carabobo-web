import {defineField, defineType} from 'sanity'
import {ESTADOS, opciones} from '../../lib/listas'

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
    {name: 'compara', title: '02 · Compara'},
    {name: 'historia', title: '03 · Historia'},
    {name: 'profesionales', title: '04 · Profesionales'},
    {name: 'encuentranos', title: '05 · Encuéntranos'},
    {name: 'proyectos', title: 'Proyectos (no se muestra)'},
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

    /**
     * Compara — 02. Dos pares de diseños sobre el mismo ambiente, comparables
     * por arrastre. Con menos de un par la sección entera se oculta.
     */
    defineField({
      name: 'comparador',
      title: 'Compara',
      type: 'object',
      group: 'compara',
      fields: [
        defineField({name: 'etiqueta', title: 'Etiqueta', type: 'string', description: 'Ej.: "Compara". Va detrás del numeral 02.'}),
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({name: 'intro', title: 'Introducción', type: 'text', rows: 2}),
        defineField({
          name: 'pares',
          title: 'Pares',
          type: 'array',
          of: [{type: 'comparacion'}],
          description: 'El diseño usa dos. Sin ninguno, la sección se oculta.',
          validation: (rule) => rule.max(4).warning('Más de cuatro pares alargan mucho la sección.'),
        }),
      ],
    }),

    /**
     * Banda de obra — la franja a sangre entre Compara e Historia. Es una
     * macro de baldosa que se REPITE a lo ancho (no se estira): así se ven las
     * juntas, que es lo que la hace leer como un piso y no como una textura.
     * Sin producto no hay banda: la sección desaparece entera.
     */
    defineField({
      name: 'banda',
      title: 'Banda de obra',
      type: 'object',
      group: 'compara',
      description: 'La franja a sangre entre Compara e Historia.',
      fields: [
        defineField({
          name: 'producto',
          title: 'Diseño de la banda',
          type: 'reference',
          to: [{type: 'producto'}],
          description: 'Se usa su macro de baldosa. El rótulo (nombre y specs) se lee del producto, no se escribe.',
        }),
      ],
    }),

    /**
     * Proyectos — FUERA DEL HOME desde el tramo v2 (2026-09-04). El contenido se
     * conserva a propósito: la sección salió por falta de material fotográfico de
     * obra, no porque sobre. Si el material llega, se vuelve a colgar sin recargar
     * nada. Ver `docs/plan-proyecto.md` §19.
     */
    defineField({
      name: 'proyectos',
      title: 'Proyectos (hoy no se muestra en el sitio)',
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
        defineField({name: 'etiqueta', title: 'Etiqueta', type: 'string', description: 'Ej.: "Historia". Va detrás del numeral 03.'}),
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
      description:
        'Los textos y la foto del panel: los datos y los conteos salen de los distribuidores, nunca se escriben acá.',
      fields: [
        defineField({name: 'etiqueta', title: 'Etiqueta', type: 'string'}),
        defineField({name: 'titulo', title: 'Título', type: 'string'}),
        defineField({name: 'texto', title: 'Texto', type: 'text', rows: 2}),
        defineField({
          name: 'foto',
          title: 'Foto del panel',
          type: 'image',
          options: {hotspot: true},
          description:
            'Ambiente que corona el panel de la derecha. Sin foto el panel se compone igual, solo con los datos de la red.',
          fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
        }),
        // El índice del home NO es la red completa: el prototipo lista seis
        // estados y remata con el CTA a Dónde comprar, que sí los trae todos
        // (index.html, constante REGIONES). Cuáles son esos seis es una
        // decisión editorial —no se deriva de los conteos—, así que vive en el
        // CMS. Los números siguen derivándose de los distribuidores.
        defineField({
          name: 'estadosDestacados',
          title: 'Estados que se listan en el home',
          type: 'array',
          of: [{type: 'string'}],
          options: {list: opciones(ESTADOS)},
          description:
            'En este orden. Vacío = se listan todos los estados con distribuidores (el home queda muy largo).',
          validation: (rule) =>
            rule
              .max(8)
              .warning('Más de 8 estados alargan el home; el listado completo vive en Dónde comprar.')
              .unique(),
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Home'})},
})
