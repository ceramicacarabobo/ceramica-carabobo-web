import {defineField, defineType} from 'sanity'
import {REDES, opciones} from '../../lib/listas'

/**
 * Un perfil de red social del cliente. Vive en Ajustes del sitio porque es
 * dato de marca, no de una sección: la home lo usa en "03 · Profesionales"
 * y el pie podrá usarlo más adelante sin duplicar la carga.
 *
 * `nombre` es lista cerrada (sanity/lib/listas.ts): el icono de cada red está
 * dibujado en el sitio, así que un valor libre saldría sin icono.
 */
export default defineType({
  name: 'red',
  title: 'Red social',
  type: 'object',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Red',
      type: 'string',
      options: {list: opciones(REDES)},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Dirección del perfil',
      type: 'url',
      description: 'La dirección completa, ej. https://www.instagram.com/…',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
  ],
  preview: {select: {title: 'nombre', subtitle: 'url'}},
})
