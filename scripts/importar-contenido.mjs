#!/usr/bin/env node
/**
 * Importa a Sanity el contenido de referencia del handoff de diseño, para que
 * la home tenga con qué renderizarse en Fase 2.
 *
 * Alcance (ver docs/modelo-de-contenido.md y CLAUDE.md — no ampliar sin
 * actualizar esos documentos primero):
 *   1. materia ×6 (claim + fotoTextura + fotoAmbiente cuando el handoff los trae)
 *   2. producto: los de Serie Venezuela con foto real (~29, según design/publicar/LEEME.md)
 *      más los diseños que citan las obras del home (Serie Regular), para que
 *      la fila "Diseño" de la ficha de Proyectos tenga a quién apuntar
 *      (sus fotos son de ejemplo: quedan marcadas esEjemplo)
 *   3. home (singleton): hero, ambientes, cita, proyectos, historia, profesionales, encuentranos
 *   4. ajustes (singleton): metadatos, datos de contacto globales y redes
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
 * No toca distribuidor, contacto ni dondeComprar: son de otra fase.
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
// 2. Producto — Serie Venezuela con foto real, desde catalogo.json.
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

async function construirProducto(p) {
  const doc = {
    _id: `producto-${p.slug}`,
    _type: 'producto',
    nombre: p.nombre,
    slug: {_type: 'slug', current: p.slug},
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
    // index.html:43150-43163 ("04 · Encuéntranos")
    encuentranos: {
      etiqueta: 'Encuéntranos',
      titulo: 'En todo el país.',
      texto: 'No vendemos en línea: el material está a la vista en la red.',
    },
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
// Ejecución
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Sanity: proyecto ${PROJECT_ID}, dataset ${DATASET}\n`)

  const catalogo = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'))
  const productosVenezuela = catalogo.productos.filter((p) => p.serie === 'Venezuela')
  // Los diseños de las obras del home son Serie Regular: entran igual, porque
  // sin ellos la fila "Diseño" de la ficha de Proyectos queda sin dato.
  const productosObra = PRODUCTOS_OBRA.map((slug) => {
    const p = catalogo.productos.find((item) => item.slug === slug)
    if (!p) throw new Error(`El catálogo no trae el diseño "${slug}" que cita una obra del home.`)
    return p
  })
  const productosAImportar = [...productosVenezuela, ...productosObra]
  const productosPorSlug = Object.fromEntries(productosAImportar.map((p) => [p.slug, p]))

  console.log(
    `Catálogo: ${catalogo.productos.length} productos totales, ${productosVenezuela.length} de Serie Venezuela` +
      ` + ${productosObra.length} diseños de obra (${PRODUCTOS_OBRA.join(', ')}).`,
  )

  // 1. Materias
  const materiasCreadas = []
  for (const spec of MATERIA_ESPECIFICACIONES) {
    const doc = await construirMateria(spec, productosPorSlug)
    await client.createOrReplace(doc)
    materiasCreadas.push(doc.nombre)
  }

  // 2. Productos
  const productosCreados = []
  for (const p of productosAImportar) {
    const doc = await construirProducto(p)
    await client.createOrReplace(doc)
    productosCreados.push(doc.slug.current)
  }

  // 3. Home
  const homeDoc = await construirHome(productosPorSlug)
  await client.createOrReplace(homeDoc)

  // 4. Ajustes
  const ajustesDoc = construirAjustes()
  await client.createOrReplace(ajustesDoc)

  console.log('\n=== Resumen de la importación ===')
  console.log(`Assets subidos a Sanity: ${contador.assetsSubidos}`)
  console.log(`Assets reutilizados (ya estaban en scripts/.assets-subidos.json): ${contador.assetsReutilizados}`)
  console.log(`materia (${materiasCreadas.length}): ${materiasCreadas.join(', ')}`)
  console.log(`producto (${productosCreados.length}): ${productosCreados.join(', ')}`)
  console.log('home: actualizado (_id "home")')
  console.log(`  profesionales: video de YouTube ${VIDEO_PROFESIONALES.id} + portada propia, etiqueta "${VIDEO_PROFESIONALES.etiqueta}"`)
  console.log('ajustes: actualizado (_id "ajustes")')
  console.log(`  redes (${REDES_CLIENTE.length}): ${REDES_CLIENTE.map((r) => r.nombre).join(', ')}`)
}

main().catch((err) => {
  console.error('\nError en la importación:', err)
  process.exit(1)
})
