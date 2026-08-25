import {defineField, defineType} from 'sanity'

/**
 * Una planta. La consume la página de Contacto: el bloque de datos, el
 * conmutador del mapa y el marcador sobre la geometría.
 *
 * `ciudad` y `enlaceMapa` se agregaron en la Fase 2: el diseño rotula cada
 * bloque de dirección con la ciudad ("Dirección Valencia") mientras el
 * conmutador usa el nombre completo ("Planta Valencia"), y ofrece un enlace
 * directo a la ruta en Google Maps. El teléfono para marcar NO es un campo:
 * se normaliza en la capa de datos a partir del que se muestra.
 */
export default defineType({
  name: 'sede',
  title: 'Sede',
  type: 'object',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      description: 'Como se lee en el conmutador del mapa, ej. "Planta Valencia".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'ciudad',
      title: 'Ciudad',
      type: 'string',
      description: 'Rotula el bloque de dirección y el pin del mapa, ej. "Valencia".',
    }),
    defineField({name: 'direccion', title: 'Dirección', type: 'text', rows: 2, validation: (rule) => rule.required()}),
    defineField({
      name: 'telefono',
      title: 'Teléfono',
      type: 'string',
      description: 'Tal como debe leerse, ej. "0241-8134131". El enlace para marcar se arma solo.',
    }),
    defineField({
      name: 'ubicacion',
      title: 'Ubicación en el mapa',
      type: 'geopoint',
      description: 'Coordenadas exactas de la planta (las actuales son aproximadas). Sin ellas no se dibuja el pin.',
    }),
    defineField({
      name: 'enlaceMapa',
      title: 'Enlace a Google Maps',
      type: 'url',
      description: 'Opcional: la ruta exacta. Vacío = se arma una búsqueda con la dirección.',
    }),
  ],
  preview: {select: {title: 'nombre', subtitle: 'direccion'}},
})
