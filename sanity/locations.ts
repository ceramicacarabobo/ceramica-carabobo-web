import {defineLocations} from 'sanity/presentation'

/**
 * Dónde vive cada documento en el sitio: habilita el click-to-edit del
 * Presentation Tool y el botón "abrir en el sitio".
 */
export const locations = {
  home: defineLocations({
    select: {},
    resolve: () => ({locations: [{title: 'Home', href: '/'}]}),
  }),
  contacto: defineLocations({
    select: {},
    resolve: () => ({locations: [{title: 'Contacto', href: '/contacto'}]}),
  }),
  dondeComprar: defineLocations({
    select: {},
    resolve: () => ({locations: [{title: 'Dónde comprar', href: '/donde-comprar'}]}),
  }),
  producto: defineLocations({
    select: {nombre: 'nombre', slug: 'slug.current'},
    resolve: (doc) => ({
      locations: [
        {title: doc?.nombre || 'Producto', href: `/catalogo/${doc?.slug}`},
        {title: 'Catálogo', href: '/catalogo'},
      ],
    }),
  }),
  distribuidor: defineLocations({
    select: {nombre: 'nombre', estado: 'estado'},
    resolve: (doc) => ({
      locations: [{title: `${doc?.nombre ?? 'Distribuidor'} — ${doc?.estado ?? ''}`.trim(), href: '/donde-comprar'}],
    }),
  }),
}
