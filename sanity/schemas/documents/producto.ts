import {defineField, defineType} from 'sanity'
import {BRILLOS, FORMATOS, MATERIAS, MATERIA_ORIGEN, PEI, SERIES, TEXTURAS, USOS, opciones} from '../../lib/listas'

/**
 * Producto — 126 documentos. Una fila del archivo del cliente = un producto
 * = una página propia indexable (decisión cerrada 2026-08-24, anexo §3).
 *
 * Regla de ficha: la fila sin dato DESAPARECE (ni en blanco, ni "no especificado").
 * Por eso los campos opcionales no llevan initialValue ni placeholder.
 */
export default defineType({
  name: 'producto',
  title: 'Producto',
  type: 'document',
  groups: [
    {name: 'identidad', title: 'Identidad', default: true},
    {name: 'atributos', title: 'Atributos (filtros)'},
    {name: 'tecnico', title: 'Ficha técnica'},
    {name: 'fotos', title: 'Fotos'},
  ],
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre del diseño',
      type: 'string',
      group: 'identidad',
      validation: (rule) => [
        rule.required(),
        rule.max(48).warning('Más de 48 caracteres se corta en la card del catálogo.'),
      ],
    }),
    defineField({
      name: 'slug',
      title: 'Dirección web',
      type: 'slug',
      group: 'identidad',
      options: {source: 'nombre', maxLength: 64},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'serie',
      title: 'Serie',
      type: 'string',
      group: 'identidad',
      description: 'Navegación, no filtro.',
      options: {list: opciones(SERIES), layout: 'radio'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'itemCliente',
      title: 'Nº de ítem del cliente',
      type: 'number',
      group: 'identidad',
      description: 'Fila original de la planilla. Solo referencia interna.',
      readOnly: true,
      hidden: ({value}) => value === undefined,
    }),

    defineField({
      name: 'materia',
      title: 'Materia',
      type: 'string',
      group: 'atributos',
      description: 'Sin materia el producto no aparece al filtrar por este eje y la fila se oculta en su ficha.',
      options: {list: opciones(MATERIAS)},
    }),
    defineField({
      name: 'materiaOrigen',
      title: 'Origen del dato de materia',
      type: 'string',
      group: 'atributos',
      description: 'Auditoría: de dónde salió la materia. Al corregirla un admin, marcar "cliente".',
      options: {list: opciones(MATERIA_ORIGEN)},
      initialValue: 'pendiente',
    }),
    defineField({
      name: 'formato',
      title: 'Formato',
      type: 'string',
      group: 'atributos',
      options: {list: opciones(FORMATOS), layout: 'radio'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formatoReal',
      title: 'Medida real de fábrica',
      type: 'string',
      group: 'atributos',
      description: 'Solo si difiere del formato comercial (ej. 59,5 × 59,5 cm).',
    }),
    defineField({
      name: 'brillo',
      title: 'Brillo',
      type: 'array',
      group: 'atributos',
      of: [{type: 'string'}],
      options: {list: opciones(BRILLOS), layout: 'grid'},
      description: 'Puede tener más de uno (ej. Mate y Satinado).',
      validation: (rule) => rule.unique().min(1),
    }),
    defineField({
      name: 'textura',
      title: 'Textura',
      type: 'string',
      group: 'atributos',
      options: {list: opciones(TEXTURAS), layout: 'radio'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'uso',
      title: 'Uso',
      type: 'string',
      group: 'atributos',
      options: {list: opciones(USOS), layout: 'radio'},
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'pei',
      title: 'PEI (resistencia a la abrasión)',
      type: 'string',
      group: 'tecnico',
      options: {list: opciones(PEI), layout: 'radio', direction: 'horizontal'},
    }),
    defineField({
      name: 'mohs',
      title: 'Dureza MOHS',
      type: 'number',
      group: 'tecnico',
      validation: (rule) => rule.min(1).max(10),
    }),
    defineField({
      name: 'mtsCaja',
      title: 'Metros cuadrados por caja',
      type: 'number',
      group: 'tecnico',
      validation: (rule) => rule.positive(),
    }),

    defineField({
      name: 'fotos',
      title: 'Fotos',
      type: 'array',
      group: 'fotos',
      of: [{type: 'fotoProducto'}],
      description: 'Hasta 4. La primera debe ser la macro de la baldosa; el resto, ambientes.',
      validation: (rule) => [
        rule.max(4),
        // Si hay macro, va primera. Si el producto no tiene ninguna macro —hay 9
        // así en el catálogo del cliente, solo con foto de ambiente— es un hueco
        // de material, no un error de carga: se avisa, no se bloquea.
        rule.custom((fotos?: {tipo?: string}[]) => {
          if (!fotos || fotos.length === 0) return true
          if (!fotos.some((foto) => foto?.tipo === 'macro')) return true
          return fotos[0]?.tipo === 'macro' ? true : 'Si hay una macro de la baldosa, tiene que ir primera.'
        }),
        rule
          .custom((fotos?: {tipo?: string}[]) => {
            if (!fotos || fotos.length === 0) return true
            return fotos.some((foto) => foto?.tipo === 'macro') ? true : 'Falta la macro de la baldosa.'
          })
          .warning(),
      ],
    }),
  ],
  orderings: [
    {name: 'nombreAsc', title: 'Nombre (A-Z)', by: [{field: 'nombre', direction: 'asc'}]},
    {name: 'serieNombre', title: 'Serie y nombre', by: [{field: 'serie', direction: 'asc'}, {field: 'nombre', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'nombre', serie: 'serie', formato: 'formato', media: 'fotos.0.asset'},
    prepare: ({title, serie, formato, media}) => ({title, subtitle: [serie, formato].filter(Boolean).join(' · '), media}),
  },
})
