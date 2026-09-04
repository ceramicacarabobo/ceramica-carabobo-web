import {defineField, defineType} from 'sanity'

/**
 * Una fila del comparador de arrastre (02 · Compara).
 *
 * El nombre del diseño, su especificación y la macro de la baldosa NO se
 * escriben ni se eligen acá: se leen del producto referenciado. Es la regla del
 * handoff —"las especificaciones se leen del dato, no se redactan"— y evita que
 * un editor deje una spec que ya no coincide con el catálogo. En la práctica el
 * editor carga DOS fotos por par, no cuatro.
 *
 * Lo que sí se carga por fila son las DOS fotos de ambiente, porque el
 * comparador exige el MISMO ENCUADRE en las dos: la foto de ambiente que el
 * producto trae en su ficha sirve para el catálogo, no para superponerla con
 * la de otro diseño. Sin las dos fotos la fila no se puede componer y se oculta.
 *
 * "Encima" es la capa que se recorta desde la izquierda: ocupa el lado
 * IZQUIERDO del comparador. "Base" queda a la derecha.
 */
export default defineType({
  name: 'comparacion',
  title: 'Par a comparar',
  type: 'object',
  fields: [
    defineField({
      name: 'productoEncima',
      title: 'Diseño de la izquierda',
      type: 'reference',
      to: [{type: 'producto'}],
      description: 'Su macro de baldosa, su nombre y su spec se toman del catálogo. Si el diseño no tiene macro cargada, esa baldosa no se muestra.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'fotoEncima',
      title: 'Ambiente con el diseño de la izquierda',
      type: 'image',
      options: {hotspot: true},
      description: 'Tiene que ser EL MISMO encuadre que la foto de la derecha: es lo que hace que la comparación se lea.',
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string', validation: (rule) => rule.required().max(120)})],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'productoBase',
      title: 'Diseño de la derecha',
      type: 'reference',
      to: [{type: 'producto'}],
      description: 'Igual que el de la izquierda: macro, nombre y spec salen del catálogo.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'fotoBase',
      title: 'Ambiente con el diseño de la derecha',
      type: 'image',
      options: {hotspot: true},
      description: 'Mismo encuadre que la de la izquierda.',
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string', validation: (rule) => rule.required().max(120)})],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {izq: 'productoEncima.nombre', der: 'productoBase.nombre', media: 'fotoEncima'},
    prepare: ({izq, der, media}) => ({title: `${izq ?? '—'} / ${der ?? '—'}`, subtitle: 'Par a comparar', media}),
  },
})
