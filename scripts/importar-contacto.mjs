#!/usr/bin/env node
/**
 * Carga el singleton `contacto` con el contenido del handoff.
 *
 *   node scripts/importar-contacto.mjs --ensayo   # no escribe: dice qué haría
 *   node scripts/importar-contacto.mjs            # escribe de verdad
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 * La página de contacto estaba CONSTRUIDA pero VACÍA: sus componentes, su ruta
 * y su schema existían desde la Fase 5, pero el documento `contacto` nunca se
 * creó en el CMS. Como el sitio oculta toda sección que queda bajo su mínimo
 * —regla de contenido del handoff—, la página servía un hero y poco más, y a
 * simple vista parecía sin construir.
 *
 * El importador se escribió para el home, para el catálogo y para dónde
 * comprar; para contacto se saltó. Este lo cierra.
 *
 * Fuente: `design/publicar/contacto.html`, la misma que el resto.
 *
 * ── Lo que NO trae ─────────────────────────────────────────────────────────
 * La imagen del hero: el prototipo usa una foto de ambiente que el cliente
 * reemplaza. Se deja vacía a propósito y la sección compone igual.
 *
 * Las coordenadas de las dos plantas son las del prototipo y él mismo avisa
 * que son APROXIMADAS: la nota bajo el mapa lo dice en pantalla, y pedirlas es
 * el punto 6 de la lista al cliente (`modelo-de-contenido.md` §6).
 */
import {readFileSync} from 'node:fs'

const ENSAYO = process.argv.includes('--ensayo')

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]
    }),
)
const PROYECTO = env.PUBLIC_SANITY_PROJECT_ID
const DATASET = env.PUBLIC_SANITY_DATASET || 'production'
const TOKEN = env.SANITY_API_WRITE_TOKEN
if (!PROYECTO || !TOKEN) throw new Error('Faltan PUBLIC_SANITY_PROJECT_ID o SANITY_API_WRITE_TOKEN en .env')

const doc = {
  _id: 'contacto',
  _type: 'contacto',
  hero: {
    _type: 'object',
    eyebrow: 'Contacto',
    titular: 'Hablemos',
    bajada:
      'Ven a la planta a ver el material, escríbenos o llámanos. Atendemos obra residencial, arquitectos y distribuidores.',
  },
  visitaTitulo: 'Para reservar una visita',
  // Dos líneas, como el prototipo: el componente respeta el salto.
  horario: 'Lunes a miércoles de 9:00 am – 3:00 pm\nJueves y viernes de 9:00 am – 2:00 pm',
  correoTexto: 'Envíanos un correo electrónico a la siguiente dirección:',
  correo: 'lapieldetuhogar@ceramica-carabobo.com',
  sedes: [
    {
      _key: 'valencia',
      _type: 'sede',
      nombre: 'Planta Valencia',
      ciudad: 'Valencia',
      direccion:
        'Av. Lisandro Alvarado, fundo La Guacamaya, calle de Servicio, Sector C-04. Valencia, estado Carabobo.',
      telefono: '0241-8134131',
      ubicacion: {_type: 'geopoint', lat: 10.1853, lng: -68.0114},
    },
    {
      _key: 'guacara',
      _type: 'sede',
      nombre: 'Planta Guacara',
      ciudad: 'Guacara',
      direccion: 'Carretera Nacional Los Guayos. Guacara, estado Carabobo.',
      telefono: '0245-571.52.62',
      ubicacion: {_type: 'geopoint', lat: 10.2297, lng: -67.8772},
    },
  ],
  mapaNota:
    'Mapa: OpenStreetMap. La posición exacta de los pines es aproximada, pendiente de validar con las coordenadas de planta.',
  formulario: {
    _type: 'object',
    etiqueta: 'Escríbenos',
    titulo: 'Si tienes dudas sobre nuestros productos o servicios, envíanos un mensaje.',
    texto:
      'Te respondemos en horario de oficina. Si necesitas cálculo de metros o ficha técnica, cuéntanos el proyecto y la ciudad.',
    privacidad: 'Al enviar este formulario aceptas la política de privacidad.',
    gracias: 'Gracias por escribirnos. Te respondemos en horario de oficina.',
  },
}

if (ENSAYO) {
  console.log('--ensayo: no se escribió nada. Documento que se crearía:\n')
  console.log(JSON.stringify(doc, null, 2))
  process.exit(0)
}

const r = await fetch(`https://${PROYECTO}.api.sanity.io/v2023-05-03/data/mutate/${DATASET}`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`},
  body: JSON.stringify({mutations: [{createOrReplace: doc}]}),
})
const cuerpo = await r.json()
if (!r.ok) throw new Error(`HTTP ${r.status} — ${JSON.stringify(cuerpo).slice(0, 400)}`)
console.log(`contacto cargado · ${doc.sedes.length} sedes · ${doc.correo}`)
