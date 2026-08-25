#!/usr/bin/env node
/**
 * Importa a Sanity el contenido de referencia del handoff de diseño, para que
 * la home tenga con qué renderizarse en Fase 2.
 *
 * Alcance (ver docs/modelo-de-contenido.md y CLAUDE.md — no ampliar sin
 * actualizar esos documentos primero):
 *   1. materia ×6 (claim + fotoTextura + fotoAmbiente cuando el handoff los trae)
 *   2. producto: los 126 de design/publicar/data/catalogo.json (Fase 3). Solo
 *      31 tienen foto real (los 29 de Serie Venezuela + Ciprés Gris/Moka); el
 *      resto llega sin materia (29, no se inventa valor) y/o con foto ajena
 *      marcada `esEjemplo` (66 productos) o sin foto (29) — todo tal como lo
 *      trae el JSON, ver design/publicar/LEEME.md.
 *   3. home (singleton): hero, ambientes, cita, proyectos, historia, profesionales, encuentranos
 *   4. ajustes (singleton): metadatos, datos de contacto globales y redes
 *   5. catalogo (singleton): hero y banda de cierre de la página de Catálogo
 *   6. distribuidor ×24 (la red del prototipo, marcada como dato de ejemplo)
 *
 * Además del bundle de diseño, el bloque VIDEO_PROFESIONALES trae el dato que
 * entregó el cliente sobre el video de instalación alojado en su canal. Su
 * portada se descarga UNA VEZ de YouTube a `scripts/.medios-descargados/` y de
 * ahí sube a Sanity: en el sitio se sirve procesada por nosotros, nunca
 * enlazada a i.ytimg.com (autosuficiencia, plan maestro §3.3).
 *
 * Fuente de los datos: design/publicar/data/catalogo.json (productos) y las
 * constantes HERO, MATERIAS, IMGS_AMB, ESPACIOS, PROYECTOS, HITOS del <script>
 * final de design/publicar/index.html (transcritas abajo con su línea de origen;
 * no se inventa ningún valor).
 *
 * Idempotente: usa _id deterministas y createOrReplace. Los assets subidos se
 * registran en scripts/.assets-subidos.json (ruta local -> assetId) para no
 * volver a subir binarios en corridas repetidas.
 *
 * AVISO SOBRE LOS DISTRIBUIDORES: design/publicar/LEEME.md es explícito — de esa
 * red "los nombres de estado y el reparto son nuestros; direcciones y teléfonos
 * son inventados". Se cargan igual (el sitio se entrega con contenido de
 * referencia y el cliente lo reemplaza), pero los 24 quedan con
 * `esEjemplo: true`, que el Studio muestra en el listado, y sus correos siguen
 * siendo @placeholder.com. Reemplazarlos es condición de lanzamiento público
 * (docs/modelo-de-contenido.md, anexo de decisiones cerradas).
 *
 * No toca contacto ni dondeComprar: son de otra fase.
 */

import {createClient} from '@sanity/client'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DESIGN = path.join(ROOT, 'design', 'publicar')
const CATALOGO_PATH = path.join(DESIGN, 'data', 'catalogo.json')
const MAPA_ASSETS_PATH = path.join(ROOT, 'scripts', '.assets-subidos.json')
const DESCARGAS = path.join(ROOT, 'scripts', '.medios-descargados')

// ---------------------------------------------------------------------------
// Variables de entorno: se leen de .env a mano (no hay dotenv en el proyecto)
// sin pisar las que ya estén puestas en el proceso.
// ---------------------------------------------------------------------------
function cargarEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return
  for (const linea of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const igual = l.indexOf('=')
    if (igual === -1) continue
    const clave = l.slice(0, igual).trim()
    let valor = l.slice(igual + 1).trim()
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1)
    }
    if (!(clave in process.env)) process.env[clave] = valor
  }
}
cargarEnv()

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.PUBLIC_SANITY_DATASET
const TOKEN = process.env.SANITY_API_WRITE_TOKEN

if (!PROJECT_ID || !DATASET || !TOKEN) {
  console.error(
    'Faltan variables de entorno. Se necesitan PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET y SANITY_API_WRITE_TOKEN en .env.',
  )
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2026-08-01',
  useCdn: false,
})

// ---------------------------------------------------------------------------
// Subida de assets con caché local, para que correr el script dos veces no
// vuelva a subir los mismos binarios.
// ---------------------------------------------------------------------------
function cargarMapaAssets() {
  if (!fs.existsSync(MAPA_ASSETS_PATH)) return {}
  try {
    return JSON.parse(fs.readFileSync(MAPA_ASSETS_PATH, 'utf8'))
  } catch {
    return {}
  }
}
const mapaAssets = cargarMapaAssets()
function guardarMapaAssets() {
  fs.writeFileSync(MAPA_ASSETS_PATH, JSON.stringify(mapaAssets, null, 2))
}

const contador = {assetsSubidos: 0, assetsReutilizados: 0}

async function subirAsset(tipo, rutaAbsoluta, filename) {
  const clave = `${tipo}:${rutaAbsoluta}`
  if (mapaAssets[clave]) {
    contador.assetsReutilizados++
    return mapaAssets[clave]
  }
  if (!fs.existsSync(rutaAbsoluta)) {
    throw new Error(`No existe el archivo de origen: ${rutaAbsoluta}`)
  }
  const resultado = await client.assets.upload(tipo, fs.createReadStream(rutaAbsoluta), {filename})
  mapaAssets[clave] = resultado._id
  guardarMapaAssets()
  contador.assetsSubidos++
  return resultado._id
}

/** Imagen de Sanity a partir de una ruta relativa a design/publicar. */
async function imagen(rutaRelativa, alt, camposExtra = {}) {
  const rutaAbsoluta = path.join(DESIGN, rutaRelativa)
  const assetId = await subirAsset('image', rutaAbsoluta, path.basename(rutaRelativa))
  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: assetId},
    ...(alt ? {alt} : {}),
    ...camposExtra,
  }
}

/**
 * Imagen de Sanity a partir de una URL remota. Se descarga a
 * `scripts/.medios-descargados/` (caché local, no versionada) y se sube como
 * cualquier otro asset: a partir de ahí el dato es nuestro y el sitio no
 * depende del origen. `alternativas` permite intentar varias direcciones —
 * maxresdefault no existe para todos los videos de YouTube, hqdefault sí.
 */
async function imagenRemota(alternativas, nombreArchivo, alt, camposExtra = {}) {
  const destino = path.join(DESCARGAS, nombreArchivo)
  if (!fs.existsSync(destino)) {
    fs.mkdirSync(DESCARGAS, {recursive: true})
    let ultimoError = null
    for (const url of alternativas) {
      try {
        const respuesta = await fetch(url)
        if (!respuesta.ok) {
          ultimoError = new Error(`${respuesta.status} en ${url}`)
          continue
        }
        fs.writeFileSync(destino, Buffer.from(await respuesta.arrayBuffer()))
        console.log(`Portada descargada de ${url}`)
        ultimoError = null
        break
      } catch (err) {
        ultimoError = err
      }
    }
    if (ultimoError || !fs.existsSync(destino)) {
      throw new Error(`No se pudo descargar la portada (${nombreArchivo}): ${ultimoError?.message ?? 'sin respuesta'}`)
    }
  }
  const assetId = await subirAsset('image', destino, nombreArchivo)
  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: assetId},
    ...(alt ? {alt} : {}),
    ...camposExtra,
  }
}

/** Archivo (video) de Sanity a partir de una ruta relativa a design/publicar. */
async function archivo(rutaRelativa) {
  const rutaAbsoluta = path.join(DESIGN, rutaRelativa)
  const assetId = await subirAsset('file', rutaAbsoluta, path.basename(rutaRelativa))
  return {_type: 'file', asset: {_type: 'reference', _ref: assetId}}
}

const refProducto = (slug) => ({_type: 'reference', _ref: `producto-${slug}`})

/** Clave corta y determinista para _key de items de array (no aporta random). */
function keyDe(texto) {
  return crypto.createHash('sha1').update(texto).digest('hex').slice(0, 12)
}

function slugSimple(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
}

/** "1,77 MT2" -> 1.77. El campo del schema es number; el catálogo trae texto. */
function parseMtsCaja(valor) {
  if (!valor) return undefined
  const coincidencia = String(valor).replace(',', '.').match(/[\d.]+/)
  return coincidencia ? parseFloat(coincidencia[0]) : undefined
}

// ---------------------------------------------------------------------------
// 1. Materia — claim de MATERIAS (index.html líneas 472-488) + macro/ambiente
//    de la propia materia (mismas rutas que usa el megamenú del prototipo).
//    "Otros" no tiene claim ni fotos en el prototipo: sus 3 productos no
//    traen fotografía real (LEEME), así que no hay nada que subir sin inventar.
// ---------------------------------------------------------------------------
const MATERIA_ESPECIFICACIONES = [
  {nombre: 'Madera', claim: 'La calidez de la veta, sin su mantenimiento.', macro: 'saman-beige', ambienteAlt: 'Sala con piso de porcelanato símil madera Samán Beige'},
  {nombre: 'Mármol', claim: 'Luz y profundidad de la piedra pulida.', macro: 'galipan-taupe', ambienteAlt: 'Comedor con piso de porcelanato símil mármol Galipán Taupe'},
  {nombre: 'Cemento', claim: 'La calma de la superficie continua.', macro: 'avila-gris', ambienteAlt: 'Comedor con piso de porcelanato símil cemento Ávila Gris'},
  {nombre: 'Piedra', claim: 'Textura mineral para dentro y fuera.', macro: 'catatumbo', ambienteAlt: 'Patio exterior con porcelanato símil piedra Catatumbo'},
  {nombre: 'Terrazo', claim: 'El grano que vuelve, en gran formato.', macro: 'cata-humo', ambienteAlt: 'Sala con piso de terrazo Cata Humo'},
  {nombre: 'Otros', claim: undefined, macro: undefined, ambienteAlt: undefined},
]

async function construirMateria(spec, productosPorSlug) {
  const doc = {_id: `materia-${slugSimple(spec.nombre)}`, _type: 'materia', nombre: spec.nombre}
  if (spec.claim) doc.claim = spec.claim
  if (spec.macro) {
    const p = productosPorSlug[spec.macro]
    const fotoMacro = p.fotos.find((f) => f.tipo === 'macro')
    const fotoAmbiente = p.fotos.find((f) => f.tipo === 'ambiente')
    doc.fotoTextura = await imagen(fotoMacro.src, fotoMacro.alt)
    doc.fotoAmbiente = await imagen(fotoAmbiente.src, spec.ambienteAlt)
  }
  return doc
}

// ---------------------------------------------------------------------------
// 2. Producto — los 126 de catalogo.json (Fase 3).
// ---------------------------------------------------------------------------

// El campo materiaOrigen del catálogo trae textos descriptivos más largos que
// la lista cerrada del schema (sanity/lib/listas.ts). "acabado del PDF" es el
// dato declarado por el cliente en el catálogo PDF, equivalente a "cliente".
const MATERIA_ORIGEN_MAP = {
  'acabado del PDF': 'cliente',
  tipología: 'tipología',
  formato: 'formato',
  nombre: 'nombre',
  supuesto: 'supuesto',
  pendiente: 'pendiente',
}

/**
 * El catálogo trae 126 filas pero solo 113 `slug` distintos: 13 diseños
 * aparecen dos veces, uno en 60×60 y otro en 60×120 (mismo nombre, misma
 * materia, distinto formato — y a veces distinta textura/brillo/uso: son
 * SKUs reales, no un duplicado de captura). Es la brecha "SKU vs diseño" que
 * docs/modelo-de-contenido.md §5 deja abierta con el cliente; mientras el
 * modelo siga siendo "una fila = un producto = una URL propia" (estado
 * vigente, no se reabre acá), cada fila necesita un slug único o la segunda
 * pisa el `_id` de la primera vía createOrReplace y una de las dos desaparece.
 * Se desambigua con el formato, que es justo el eje en que difieren las 13
 * parejas. Devuelve un Map producto -> slug final a usar en _id y slug.current.
 */
function calcularSlugsFinales(productos) {
  const apariciones = new Map()
  for (const p of productos) apariciones.set(p.slug, (apariciones.get(p.slug) ?? 0) + 1)
  const final = new Map()
  for (const p of productos) {
    const slug = apariciones.get(p.slug) > 1 ? `${p.slug}-${p.formato.replace('×', 'x')}` : p.slug
    final.set(p, slug)
  }
  return final
}

async function construirProducto(p, slugFinal = p.slug) {
  const doc = {
    _id: `producto-${slugFinal}`,
    _type: 'producto',
    nombre: p.nombre,
    slug: {_type: 'slug', current: slugFinal},
    serie: p.serie,
    formato: p.formato,
    uso: p.uso,
  }
  // Regla del modelo de contenido: la fila sin dato desaparece, no se inventa.
  if (p.materia) {
    doc.materia = p.materia
    doc.materiaOrigen = MATERIA_ORIGEN_MAP[p.materiaOrigen] ?? 'pendiente'
  }
  if (p.formatoReal) doc.formatoReal = p.formatoReal
  if (p.brillo && p.brillo.length > 0) doc.brillo = p.brillo
  if (p.textura) doc.textura = p.textura
  if (p.pei) doc.pei = p.pei
  if (p.mohs != null) doc.mohs = p.mohs
  const mtsCaja = parseMtsCaja(p.mtsCaja)
  if (mtsCaja != null) doc.mtsCaja = mtsCaja

  if (p.fotos && p.fotos.length > 0) {
    // El schema exige que la primera foto sea la macro de la baldosa. El
    // catálogo respeta ese orden en Serie Venezuela pero no siempre en Regular
    // (Teca trae el ambiente primero), así que se ordena acá en vez de dejar
    // el documento en falta en el Studio.
    const fotos = [...p.fotos].sort((a, b) => (a.tipo === 'macro' ? -1 : 0) - (b.tipo === 'macro' ? -1 : 0))
    doc.fotos = []
    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i]
      const img = await imagen(foto.src, foto.alt, {tipo: foto.tipo, esEjemplo: Boolean(foto.ejemplo)})
      doc.fotos.push({...img, _type: 'fotoProducto', _key: keyDe(`${p.slug}-foto-${i}`)})
    }
  }
  return doc
}

// ---------------------------------------------------------------------------
// 3. Home — constantes HERO, MATERIAS, IMGS_AMB, ESPACIOS, PROYECTOS, HITOS
//    de design/publicar/index.html (líneas 460-568), y los textos de cada
//    sección tomados del marcado de la misma página.
// ---------------------------------------------------------------------------

// index.html:556-563 (constante REGIONES): los seis estados que el home lista,
// en el orden del diseño. Cuáles son es decisión editorial —el prototipo deja
// fuera a Miranda, que empata en puntos con los tres primeros—, así que el dato
// vive en el CMS y no se deriva.
const ESTADOS_DESTACADOS = ['Distrito Capital', 'Carabobo', 'Zulia', 'Lara', 'Bolívar', 'Nueva Esparta']

// index.html:411: la foto de ambiente que corona el panel de Encuéntranos.
const FOTO_ENCUENTRANOS = {
  src: 'assets/catalogo/ambientes/adicora-beige-2.webp',
  alt: 'Ambiente con porcelanato de la red de distribuidores',
}

// HERO (índice.html:460-465): el estado 0 es el video ambiental (va en
// hero.video/hero.poster); los otros tres son las capas del carrusel.
const HERO_CAPAS = [
  {slug: 'sanare-beige', alt: 'Dormitorio revestido en porcelanato símil mármol Sanare Beige'},
  {slug: 'avila-gris-oscuro', alt: 'Sala abierta al jardín con piso símil cemento Ávila Gris Oscuro'},
  {slug: 'baruta-silver', alt: 'Terraza exterior con porcelanato símil piedra Baruta Silver'},
]

async function construirCapaHero(productosPorSlug, item) {
  const p = productosPorSlug[item.slug]
  const fotoAmbiente = p.fotos.find((f) => f.tipo === 'ambiente')
  return {
    _type: 'heroCapa',
    _key: keyDe(`hero-${item.slug}`),
    producto: refProducto(item.slug),
    imagen: await imagen(fotoAmbiente.src, item.alt),
  }
}

// ESPACIOS (index.html:510-534): pestañas del bloque "Ambientes", con la
// ficha apuntando al producto y su ambiente real como foto.
const ESPACIOS = [
  {
    label: 'Baños',
    fichas: [
      {slug: 'paramo-beige', spec: '60×60 · Mate'},
      {slug: 'galipan-gris', spec: '60×60 · Satinado'},
      {slug: 'sanare-perla', spec: '60×60 · Satinado'},
      {slug: 'cubiro-gris', spec: '60×60 · Satinado'},
    ],
  },
  {
    label: 'Salas',
    fichas: [
      {slug: 'saman-gris', spec: '60×60'},
      {slug: 'paramo-gris', spec: '60×60 · Mate'},
      {slug: 'sanare-marron', spec: '60×60 · Satinado'},
      {slug: 'cata-humo', spec: '60×60 · Mate · Satinado'},
    ],
  },
  {
    label: 'Cocinas',
    fichas: [
      {slug: 'cata-azul', spec: '60×60 · Mate · Satinado'},
      {slug: 'galipan-taupe', spec: '60×60 · Satinado'},
      {slug: 'cubiro-marron', spec: '60×60 · Satinado'},
      {slug: 'avila-gris', spec: '60×60 · Mate'},
    ],
  },
  {
    label: 'Exteriores',
    fichas: [
      {slug: 'catatumbo', spec: '60×60 · Mate'},
      {slug: 'adicora-gris', spec: '60×60 · Mate'},
      {slug: 'baruta-gris', spec: '60×60 · Mate'},
    ],
  },
]

async function construirFicha(productosPorSlug, item) {
  const p = productosPorSlug[item.slug]
  const fotoAmbiente = p.fotos.find((f) => f.tipo === 'ambiente')
  return {
    _type: 'ambienteFicha',
    _key: keyDe(`ficha-${item.slug}`),
    producto: refProducto(item.slug),
    foto: await imagen(fotoAmbiente.src, fotoAmbiente.alt),
    spec: item.spec,
  }
}

// PROYECTOS (index.html:538-545): el campo "credito" del prototipo guarda en
// realidad la ciudad de la obra (comentario del propio archivo: "sin crédito
// de arquitecto — el dato no lo tenemos"), por eso se mapea a `ciudad`, no a
// `credito`. Sus dos diseños son de Serie Regular: se importan aparte (ver
// PRODUCTOS_OBRA) y la obra los enlaza por referencia, que es lo que llena la
// fila "Diseño" de la ficha. En `formato` queda solo la especificación, tal
// como la separa el prototipo.
const OBRAS = [
  {
    nombre: 'Living de hotel',
    ciudad: 'Valencia',
    diseno: 'carrara-brillante',
    formato: '60×60 cm · Brillante · Liso',
    img: 'assets/catalogo/ejemplo-living.jpg',
    alt: 'Living de hotel con piso de porcelanato símil mármol pulido',
  },
  {
    nombre: 'Restaurante',
    ciudad: 'Caracas',
    diseno: 'teca',
    formato: '25×120 cm · Mate · Liso',
    img: 'assets/catalogo/ejemplo-restaurante.jpg',
    alt: 'Salón de restaurante con piso de porcelanato símil madera',
  },
]

/** Diseños que citan las obras: fuera de Serie Venezuela, pero necesarios. */
const PRODUCTOS_OBRA = OBRAS.map((obra) => obra.diseno)

async function construirObra(item) {
  return {
    _type: 'proyecto',
    _key: keyDe(`obra-${item.nombre}`),
    nombre: item.nombre,
    ciudad: item.ciudad,
    producto: refProducto(item.diseno),
    formato: item.formato,
    foto: await imagen(item.img, item.alt),
  }
}

// HITOS (index.html:548-554): años y textos son placeholder pendiente de
// validar con el cliente (docs/modelo-de-contenido.md §1.4) — solo 1956 es
// dato real. El quinto hito decía año "Hoy" en el prototipo; el schema exige
// un número (1900-2100), así que se usa el año en curso.
const HITOS = [
  {anio: 1956, titulo: 'El primer horno', texto: 'Arranca la planta de Valencia con producción de baldosa de piso para el mercado local.', img: 'uploads/Gemini_Generated_Image_a5mttda5mttda5mt.png'},
  {anio: 1978, titulo: 'Escala industrial', texto: 'Se incorpora el horno de rodillos y la capacidad instalada se multiplica para atender obra pública.', img: 'assets/catalogo/ejemplo-ambiente-cemento.jpg'},
  {anio: 1996, titulo: 'Primer porcelanato', texto: 'La línea de porcelanato técnico entra en producción y abre el mercado de alto tránsito.', img: 'assets/catalogo/ejemplo-ambiente-piedra.jpg'},
  {anio: 2015, titulo: 'Gran formato', texto: 'Nuevas prensas permiten formatos de 60×120 y el catálogo se abre a efectos mármol y cemento.', img: 'assets/catalogo/ejemplo-living.jpg'},
  {anio: new Date().getFullYear(), titulo: 'El portafolio hoy', texto: 'Más de cien productos entre la Serie Regular y la Serie Venezuela, distribuidos en todo el país, con planta propia en Carabobo.', img: 'assets/catalogo/ejemplo-restaurante.jpg'},
]

async function construirHito(item) {
  return {
    _type: 'hito',
    _key: keyDe(`hito-${item.anio}-${item.titulo}`),
    anio: item.anio,
    titulo: item.titulo,
    texto: item.texto,
    imagen: await imagen(item.img, `${item.titulo} — Cerámica Carabobo, ${item.anio}`),
  }
}

/**
 * Video de instalación entregado por el cliente (2026-08-25). Vive en su canal
 * de YouTube, así que el sitio lo dibuja como fachada: portada nuestra y el
 * reproductor ajeno solo si el visitante pulsa (ver Profesionales.astro).
 *
 * Título y canal, verificados contra el propio YouTube (oEmbed). Duración
 * 1:36, leída de la ficha del video en el canal ("1 minute, 36 seconds"):
 * el "3:47" del prototipo era un valor de relleno del diseño.
 */
const VIDEO_PROFESIONALES = {
  url: 'https://www.youtube.com/watch?v=MkAEfk4V65w',
  id: 'MkAEfk4V65w',
  titulo: 'Cómo instalar revestimiento 60x120 | Cerámica de gran formato',
  etiqueta: 'Video · 1:36',
  portadaAlt: 'Instalación de revestimiento cerámico de 60×120 en pared',
}

/**
 * Redes del cliente (2026-08-25). En el prototipo los tres botones apuntaban a
 * "#contacto": eran placeholders. El orden es el del diseño.
 */
const REDES_CLIENTE = [
  {nombre: 'Instagram', url: 'https://www.instagram.com/ceramicacarabobo/'},
  {nombre: 'YouTube', url: 'https://www.youtube.com/@ceramicacarabobove'},
  {nombre: 'TikTok', url: 'https://www.tiktok.com/@ceramicacarabobo.ve'},
]

async function construirHome(productosPorSlug) {
  const video = await archivo('uploads/hero-ambiente-loop.mp4')
  const poster = await imagen('uploads/hero-poster.jpg', 'Video de ambiente con revestimiento cerámico')

  const capas = []
  for (const item of HERO_CAPAS) capas.push(await construirCapaHero(productosPorSlug, item))

  const pestanas = []
  for (const tab of ESPACIOS) {
    const fichas = []
    for (const item of tab.fichas) fichas.push(await construirFicha(productosPorSlug, item))
    pestanas.push({_type: 'ambientePestana', _key: keyDe(`tab-${tab.label}`), label: tab.label, fichas})
  }

  const obras = []
  for (const item of OBRAS) obras.push(await construirObra(item))

  const hitos = []
  for (const item of HITOS) hitos.push(await construirHito(item))

  const imagenProfesionales = await imagen(
    'assets/catalogo/ejemplo-restaurante.jpg',
    'Instalación de porcelanato de gran formato en obra',
  )

  const fotoEncuentranos = await imagen(FOTO_ENCUENTRANOS.src, FOTO_ENCUENTRANOS.alt)

  const portadaVideo = await imagenRemota(
    [
      `https://i.ytimg.com/vi/${VIDEO_PROFESIONALES.id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${VIDEO_PROFESIONALES.id}/hqdefault.jpg`,
    ],
    `youtube-${VIDEO_PROFESIONALES.id}.jpg`,
    VIDEO_PROFESIONALES.portadaAlt,
  )

  return {
    _id: 'home',
    _type: 'home',
    // index.html:206-207 (telón de hero, capas 1-2 del <div data-heroin>)
    hero: {
      eyebrow: 'Hecho en Venezuela · Desde 1956',
      titular: 'La piel de tu hogar.',
      video,
      poster,
      capas,
    },
    // index.html:25313-25316 ("01 · Ambientes" / "Cómo se ve en tu casa.")
    ambientes: {
      etiqueta: 'Ambientes',
      titulo: 'Cómo se ve en tu casa.',
      pestanas,
    },
    // index.html:29904-29908 (sección "RESPIRO · CITA")
    cita: {texto: 'Innovación y tradición\nen cada pieza.'},
    // index.html:30607-30611 ("02 · Proyectos" / "Obra construida.")
    proyectos: {
      etiqueta: 'Proyectos',
      titulo: 'Obra construida.',
      bajada: 'Espacios reales, con el diálogo entre el material y la luz del lugar.',
      obras,
    },
    // index.html:35550 (label "Historia" del bloque con scroll); solo el
    // rótulo va aquí, la portada de cada hito ya lleva su propio título.
    historia: {
      titulo: 'Historia',
      hitos,
    },
    // index.html:39070-40100 ("03 · Profesionales"). El título y el texto del
    // prototipo eran genéricos ("Aprende a instalar los formatos grandes." +
    // guías, fichas y muestras): ahora la sección muestra un video concreto,
    // así que hablan de lo que ese video enseña.
    profesionales: {
      etiqueta: 'Profesionales',
      // Largo calibrado contra el prototipo: el título ocupa 3 líneas a 390 y
      // 2 a 1440, y el texto 3 y 2, exactamente como el bloque del diseño. Así
      // el cambio de copy no mueve la caja de la sección.
      titulo: 'Cómo se instala el revestimiento 60×120.',
      texto: 'Preparación de la pared, adhesivo, corte y junta, en el orden en que se hacen en obra.',
      imagen: imagenProfesionales,
      videoYoutube: VIDEO_PROFESIONALES.url,
      videoPortada: portadaVideo,
      videoTitulo: VIDEO_PROFESIONALES.titulo,
      videoEtiqueta: VIDEO_PROFESIONALES.etiqueta,
    },
    // index.html:394-424 ("04 · Encuéntranos")
    encuentranos: {
      etiqueta: 'Encuéntranos',
      titulo: 'En todo el país.',
      texto: 'No vendemos en línea: el material está a la vista en la red.',
      // La foto que corona el panel derecho en el prototipo (index.html:411).
      foto: fotoEncuentranos,
      // index.html:556-563, constante REGIONES: el home lista SEIS estados en
      // ese orden, no los veinte de la red — el listado completo es la página
      // Dónde comprar, a la que apunta el CTA del panel. Los conteos no se
      // copian: se derivan de los distribuidores.
      estadosDestacados: ESTADOS_DESTACADOS,
    },
  }
}

// ---------------------------------------------------------------------------
// 5. Distribuidor — la red del prototipo, transcrita de la constante DIST de
//    design/publicar/donde-comprar.html:279-304 (24 filas, 20 estados, 23
//    ciudades: coincide exactamente con el agregado RED del home,
//    design/publicar/index.html:568).
//
//    DATO DE EJEMPLO. Del LEEME del handoff: lo único con criterio es el
//    reparto por estado; nombres de comercio, direcciones y teléfonos son
//    inventados. No se agrega, quita ni completa nada: se carga lo que el
//    diseño trae, tal cual, con la marca `esEjemplo` puesta.
// ---------------------------------------------------------------------------
const DISTRIBUIDORES = [
  {nombre: 'Cerámicas del Centro', estado: 'Carabobo', ciudad: 'Valencia', direccion: 'Av. Bolívar Norte, C.C. Camoruco, local 12', telefono: '+58 241 555 0142', whatsapp: '584141234567', correo: 'valencia@placeholder.com', horario: 'Lun–Vie 8:00–17:00 · Sáb 9:00–13:00', lat: 10.162, lng: -68.0077},
  {nombre: 'Depósito Puerto Cabello', estado: 'Carabobo', ciudad: 'Puerto Cabello', direccion: 'Zona industrial, galpón 4, calle Sucre', telefono: '+58 242 555 0198', whatsapp: '584141234568', correo: 'pcabello@placeholder.com', horario: 'Lun–Vie 8:00–16:30', lat: 10.4731, lng: -68.0125},
  {nombre: 'Materiales Caracas C.A.', estado: 'Distrito Capital', ciudad: 'Caracas', direccion: 'Av. Andrés Bello, Edif. Norte, PB', telefono: '+58 212 555 0110', whatsapp: '584141234569', correo: 'caracas@placeholder.com', horario: 'Lun–Vie 8:30–17:30 · Sáb 9:00–14:00', lat: 10.4806, lng: -66.9036},
  {nombre: 'Casa del Porcelanato', estado: 'Distrito Capital', ciudad: 'Caracas', direccion: 'Av. Libertador, nivel plaza, local 8', telefono: '+58 212 555 0171', whatsapp: '584141234570', correo: 'libertador@placeholder.com', horario: 'Lun–Sáb 9:00–18:00', lat: 10.495, lng: -66.86},
  {nombre: 'Distribuidora Miranda', estado: 'Miranda', ciudad: 'Guarenas', direccion: 'Carretera Nacional, sector Trapichito', telefono: '+58 212 555 0233', whatsapp: '584141234571', correo: 'miranda@placeholder.com', horario: 'Lun–Vie 8:00–17:00', lat: 10.4736, lng: -66.6136},
  {nombre: 'Acabados Baruta', estado: 'Miranda', ciudad: 'Baruta', direccion: 'Calle Real de Baruta, quinta 22', telefono: '+58 212 555 0244', whatsapp: '584141234572', correo: 'baruta@placeholder.com', horario: 'Lun–Vie 9:00–18:00', lat: 10.4333, lng: -66.8667},
  {nombre: 'Cerámicas Aragua', estado: 'Aragua', ciudad: 'Maracay', direccion: 'Av. Las Delicias, C.C. Paseo, local 5', telefono: '+58 243 555 0127', whatsapp: '584141234573', correo: 'maracay@placeholder.com', horario: 'Lun–Vie 8:00–17:00 · Sáb 9:00–13:00', lat: 10.2469, lng: -67.5958},
  {nombre: 'Zulia Revestimientos', estado: 'Zulia', ciudad: 'Maracaibo', direccion: 'Av. 15 Las Delicias con calle 72', telefono: '+58 261 555 0166', whatsapp: '584141234574', correo: 'maracaibo@placeholder.com', horario: 'Lun–Vie 8:00–17:30 · Sáb 9:00–13:00', lat: 10.6427, lng: -71.6125},
  {nombre: 'Depósito Cabimas', estado: 'Zulia', ciudad: 'Cabimas', direccion: 'Carretera Lara–Zulia, km 4', telefono: '+58 264 555 0188', whatsapp: '584141234575', correo: 'cabimas@placeholder.com', horario: 'Lun–Vie 8:00–16:00', lat: 10.39, lng: -71.4467},
  {nombre: 'Lara Materiales', estado: 'Lara', ciudad: 'Barquisimeto', direccion: 'Av. Vargas con Av. Los Leones, local 3', telefono: '+58 251 555 0119', whatsapp: '584141234576', correo: 'barquisimeto@placeholder.com', horario: 'Lun–Vie 8:00–17:00', lat: 10.0678, lng: -69.3467},
  {nombre: 'Oriente Cerámicas', estado: 'Anzoátegui', ciudad: 'Puerto La Cruz', direccion: 'Av. Municipal, sector Guaraguao', telefono: '+58 281 555 0154', whatsapp: '584141234577', correo: 'plc@placeholder.com', horario: 'Lun–Vie 8:00–17:00 · Sáb 9:00–13:00', lat: 10.2167, lng: -64.6167},
  {nombre: 'Guayana Acabados', estado: 'Bolívar', ciudad: 'Puerto Ordaz', direccion: 'Av. Guayana, Alta Vista Sur, galpón 2', telefono: '+58 286 555 0135', whatsapp: '584141234578', correo: 'guayana@placeholder.com', horario: 'Lun–Vie 8:00–17:00', lat: 8.2967, lng: -62.71},
  {nombre: 'Andes Porcelanato', estado: 'Táchira', ciudad: 'San Cristóbal', direccion: 'Av. 19 de Abril, sector Barrio Obrero', telefono: '+58 276 555 0143', whatsapp: '584141234579', correo: 'tachira@placeholder.com', horario: 'Lun–Vie 8:00–17:00', lat: 7.7669, lng: -72.225},
  {nombre: 'Mérida Cerámicas', estado: 'Mérida', ciudad: 'Mérida', direccion: 'Av. Andrés Bello, sector La Parroquia', telefono: '+58 274 555 0129', whatsapp: '584141234580', correo: 'merida@placeholder.com', horario: 'Lun–Vie 8:30–17:00', lat: 8.5897, lng: -71.1561},
  {nombre: 'Margarita Deco', estado: 'Nueva Esparta', ciudad: 'Porlamar', direccion: 'Av. Juan Bautista Arismendi, local 7', telefono: '+58 295 555 0177', whatsapp: '584141234581', correo: 'margarita@placeholder.com', horario: 'Lun–Sáb 9:00–18:00', lat: 10.9577, lng: -63.8699},
  {nombre: 'Monagas Materiales', estado: 'Monagas', ciudad: 'Maturín', direccion: 'Av. Raúl Leoni, sector Los Guaritos', telefono: '+58 291 555 0161', whatsapp: '584141234582', correo: 'maturin@placeholder.com', horario: 'Lun–Vie 8:00–17:00', lat: 9.7457, lng: -63.1832},
  {nombre: 'Falcón Revestimientos', estado: 'Falcón', ciudad: 'Punto Fijo', direccion: 'Av. Colombia con calle Girardot', telefono: '+58 269 555 0148', whatsapp: '584141234583', correo: 'puntofijo@placeholder.com', horario: 'Lun–Vie 8:00–16:30', lat: 11.6947, lng: -70.1997},
  {nombre: 'Sucre Acabados', estado: 'Sucre', ciudad: 'Cumaná', direccion: 'Av. Perimetral, sector Caigüire', telefono: '+58 293 555 0192', whatsapp: '584141234584', correo: 'cumana@placeholder.com', horario: 'Lun–Vie 8:00–16:30', lat: 10.4544, lng: -64.1767},
  {nombre: 'Llanos Cerámicas', estado: 'Portuguesa', ciudad: 'Acarigua', direccion: 'Av. Libertador, zona industrial', telefono: '+58 255 555 0157', whatsapp: '584141234585', correo: 'acarigua@placeholder.com', horario: 'Lun–Vie 8:00–17:00', lat: 9.5597, lng: -69.2019},
  {nombre: 'Barinas Materiales', estado: 'Barinas', ciudad: 'Barinas', direccion: 'Av. 23 de Enero, sector Alto Barinas', telefono: '+58 273 555 0125', whatsapp: '584141234586', correo: 'barinas@placeholder.com', horario: 'Lun–Vie 8:00–16:30', lat: 8.6226, lng: -70.2075},
  {nombre: 'Trujillo Deco', estado: 'Trujillo', ciudad: 'Valera', direccion: 'Av. Bolívar con calle 12, local 4', telefono: '+58 271 555 0138', whatsapp: '584141234587', correo: 'valera@placeholder.com', horario: 'Lun–Vie 8:00–16:30', lat: 9.3167, lng: -70.6039},
  {nombre: 'Yaracuy Cerámicas', estado: 'Yaracuy', ciudad: 'San Felipe', direccion: 'Av. La Fuente, sector centro', telefono: '+58 254 555 0173', whatsapp: '584141234588', correo: 'yaracuy@placeholder.com', horario: 'Lun–Vie 8:00–16:30', lat: 10.3399, lng: -68.7422},
  {nombre: 'Guárico Materiales', estado: 'Guárico', ciudad: 'San Juan de los Morros', direccion: 'Av. Rómulo Gallegos, galpón 1', telefono: '+58 246 555 0111', whatsapp: '584141234589', correo: 'guarico@placeholder.com', horario: 'Lun–Vie 8:00–16:00', lat: 9.9036, lng: -67.3547},
  {nombre: 'La Guaira Acabados', estado: 'La Guaira', ciudad: 'Catia La Mar', direccion: 'Av. Principal, sector Playa Grande', telefono: '+58 212 555 0206', whatsapp: '584141234590', correo: 'laguaira@placeholder.com', horario: 'Lun–Vie 8:00–16:30', lat: 10.6, lng: -67.0167},
]

/** Id determinista y legible a partir del nombre del comercio (los 24 son únicos). */
function idDistribuidor(nombre) {
  const slug = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `distribuidor-${slug}`
}

function construirDistribuidor(d) {
  return {
    _id: idDistribuidor(d.nombre),
    _type: 'distribuidor',
    nombre: d.nombre,
    estado: d.estado,
    ciudad: d.ciudad,
    direccion: d.direccion,
    telefono: d.telefono,
    whatsapp: d.whatsapp,
    correo: d.correo,
    horario: d.horario,
    ubicacion: {_type: 'geopoint', lat: d.lat, lng: d.lng},
    // La marca que ve quien edita en el Studio: este punto no es dato del cliente.
    esEjemplo: true,
  }
}

// ---------------------------------------------------------------------------
// 4. Ajustes — pie de página y metadatos (index.html:1-11 y 47303-49900).
// ---------------------------------------------------------------------------
function construirAjustes() {
  return {
    _id: 'ajustes',
    _type: 'ajustes',
    titulo: 'Cerámica Carabobo',
    descripcion:
      'Fabricantes venezolanos de gres porcelánico y cerámica. Porcelanato y revestimiento en Serie Regular y Serie Venezuela, con distribuidores en todo el país.',
    textoPie:
      'Cerámica Carabobo produce porcelanato y revestimientos en Valencia desde hace setenta años, con capacidad industrial instalada, arcillas de la región y control de calidad propio. Hecho en Venezuela, para obra residencial y pública en todo el país.',
    direccion: 'Zona Industrial Municipal Norte\nValencia, Carabobo — Venezuela',
    telefono: '+58 241 838 00 00',
    correo: 'ventas@ceramicacarabobo.com',
    redes: REDES_CLIENTE.map((red) => ({_type: 'red', _key: keyDe(`red-${red.nombre}`), ...red})),
    anioFundacion: 1956,
  }
}

// ---------------------------------------------------------------------------
// 5. Catálogo (singleton) — los textos editoriales de la página, transcritos
// del prototipo (design/publicar/catalogo-c5.dc.html, bloques del hero y de la
// banda de cierre). La grilla, los filtros y sus conteos NO viven acá: se
// derivan de los productos. Sin este documento el hero se queda con la ruta y
// el h1 y la banda de cierre no se dibuja (contenido defensivo).
// ---------------------------------------------------------------------------
async function construirCatalogo() {
  return {
    _id: 'catalogo',
    _type: 'catalogo',
    hero: {
      eyebrow: 'Diseños 2026',
      titular: 'Catálogo',
      bajada:
        'El portafolio completo: 126 productos entre la Serie Regular y la Serie Venezuela. ' +
        'Filtra por materia, formato, uso, textura o brillo.',
      // La misma foto de ambiente que abre el home: es la que usa el prototipo.
      imagen: await imagen('uploads/hero-poster.jpg', 'Ambiente con revestimiento cerámico'),
    },
    cierre: {
      etiqueta: 'Siguiente paso',
      titulo: 'Vela en persona antes de decidir.',
      texto:
        'Nuestros distribuidores tienen muestras físicas de cada diseño y te ayudan con el cálculo de metros.',
    },
  }
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Sanity: proyecto ${PROJECT_ID}, dataset ${DATASET}\n`)

  const catalogo = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'))
  // Fase 3: se cargan los 126 productos del catálogo (antes solo entraban los
  // 29 de Serie Venezuela + los 2 diseños citados por las obras del home).
  // productosPorSlug sigue armado sobre el universo completo: las funciones
  // del home (HERO_CAPAS, ESPACIOS, OBRAS) buscan por slug ahí adentro.
  const productosAImportar = catalogo.productos
  const productosPorSlug = Object.fromEntries(productosAImportar.map((p) => [p.slug, p]))
  const productosVenezuela = productosAImportar.filter((p) => p.serie === 'Venezuela')
  const productosRegular = productosAImportar.filter((p) => p.serie === 'Regular')
  for (const slug of PRODUCTOS_OBRA) {
    if (!productosPorSlug[slug]) throw new Error(`El catálogo no trae el diseño "${slug}" que cita una obra del home.`)
  }

  console.log(
    `Catálogo: ${productosAImportar.length} productos a importar` +
      ` (${productosVenezuela.length} Serie Venezuela + ${productosRegular.length} Serie Regular).`,
  )

  // 1. Materias
  const materiasCreadas = []
  for (const spec of MATERIA_ESPECIFICACIONES) {
    const doc = await construirMateria(spec, productosPorSlug)
    await client.createOrReplace(doc)
    materiasCreadas.push(doc.nombre)
  }

  // 2. Productos
  const slugFinalPorProducto = calcularSlugsFinales(productosAImportar)
  const productosCreados = []
  for (const p of productosAImportar) {
    const doc = await construirProducto(p, slugFinalPorProducto.get(p))
    await client.createOrReplace(doc)
    productosCreados.push(doc.slug.current)
  }
  // Limpieza: los `_id` base (sin desambiguar) de las 13 parejas con slug
  // repetido pudieron quedar creados por corridas de este script anteriores
  // a que calcularSlugsFinales existiera (createOrReplace pisaba una fila con
  // la otra). Ninguna fila usa hoy ese _id pelado, así que borrarlo es seguro
  // e idempotente (borrar un id inexistente no falla).
  const basesColisionadas = new Set(
    [...slugFinalPorProducto.entries()].filter(([p, final]) => final !== p.slug).map(([p]) => p.slug),
  )
  if (basesColisionadas.size > 0) {
    await client.delete({query: '*[_id in $ids]', params: {ids: [...basesColisionadas].map((s) => `producto-${s}`)}})
  }

  // 3. Home
  const homeDoc = await construirHome(productosPorSlug)
  await client.createOrReplace(homeDoc)

  // 4. Ajustes
  const ajustesDoc = construirAjustes()
  await client.createOrReplace(ajustesDoc)

  // 5. Catálogo (singleton)
  const catalogoDoc = await construirCatalogo()
  await client.createOrReplace(catalogoDoc)

  // 6. Distribuidores
  for (const d of DISTRIBUIDORES) {
    await client.createOrReplace(construirDistribuidor(d))
  }

  console.log('\n=== Resumen de la importación ===')
  console.log(`Assets subidos a Sanity: ${contador.assetsSubidos}`)
  console.log(`Assets reutilizados (ya estaban en scripts/.assets-subidos.json): ${contador.assetsReutilizados}`)
  console.log(`materia (${materiasCreadas.length}): ${materiasCreadas.join(', ')}`)
  const conMateria = productosAImportar.filter((p) => p.materia).length
  const conFotos = productosAImportar.filter((p) => p.fotos && p.fotos.length > 0).length
  const fotosEjemplo = productosAImportar.reduce((n, p) => n + p.fotos.filter((f) => f.ejemplo).length, 0)
  console.log(
    `producto (${productosCreados.length}): ${conMateria} con materia · ${productosAImportar.length - conMateria} sin materia · ` +
      `${conFotos} con fotos · ${productosAImportar.length - conFotos} sin fotos · ${fotosEjemplo} fotos marcadas esEjemplo`,
  )
  console.log('home: actualizado (_id "home")')
  console.log(`  profesionales: video de YouTube ${VIDEO_PROFESIONALES.id} + portada propia, etiqueta "${VIDEO_PROFESIONALES.etiqueta}"`)
  console.log('catalogo: actualizado (_id "catalogo") — hero y banda de cierre')
  console.log('ajustes: actualizado (_id "ajustes")')
  console.log(`  redes (${REDES_CLIENTE.length}): ${REDES_CLIENTE.map((r) => r.nombre).join(', ')}`)
  const estadosRed = new Set(DISTRIBUIDORES.map((d) => d.estado))
  const ciudadesRed = new Set(DISTRIBUIDORES.map((d) => d.ciudad))
  console.log(
    `distribuidor (${DISTRIBUIDORES.length}): ${estadosRed.size} estados · ${ciudadesRed.size} ciudades` +
      ` — TODOS marcados esEjemplo: nombres, direcciones y teléfonos son inventados (design/publicar/LEEME.md).`,
  )
  console.log(`  el home lista ${ESTADOS_DESTACADOS.length}: ${ESTADOS_DESTACADOS.join(', ')}`)
}

main().catch((err) => {
  console.error('\nError en la importación:', err)
  process.exit(1)
})
