import {FOTO_PRODUCTO, IMAGEN} from './fragmentos'

const PRODUCTO_CAMPOS = /* groq */ `
  "id": _id,
  nombre,
  "slug": slug.current,
  serie,
  materia,
  materiaOrigen,
  formato,
  formatoReal,
  "brillo": coalesce(brillo, []),
  textura,
  uso,
  pei,
  mohs,
  mtsCaja,
  "fotos": coalesce(fotos[]${FOTO_PRODUCTO}, [])
`

export const PRODUCTOS = /* groq */ `
*[_type == "producto" && defined(slug.current)] | order(serie asc, nombre asc) {${PRODUCTO_CAMPOS}}
`

export const PRODUCTO_POR_SLUG = /* groq */ `
*[_type == "producto" && slug.current == $slug][0] {${PRODUCTO_CAMPOS}}
`

export const DISTRIBUIDORES = /* groq */ `
*[_type == "distribuidor"] | order(estado asc, ciudad asc) {
  "id": _id,
  nombre,
  estado,
  ciudad,
  direccion,
  telefono,
  whatsapp,
  correo,
  horario,
  "ubicacion": select(defined(ubicacion) => {"lat": ubicacion.lat, "lng": ubicacion.lng})
}
`

export const MATERIAS = /* groq */ `
*[_type == "materia"] | order(nombre asc) {
  "id": _id,
  nombre,
  claim,
  "fotoTextura": fotoTextura${IMAGEN},
  "fotoAmbiente": fotoAmbiente${IMAGEN}
}
`

export const HOME = /* groq */ `
*[_type == "home"][0] {
  "hero": {
    "eyebrow": hero.eyebrow,
    "titular": hero.titular,
    "videoUrl": hero.video.asset->url,
    "poster": hero.poster${IMAGEN},
    "capas": coalesce(hero.capas[]{
      "etiqueta": coalesce(producto->nombre, etiqueta),
      "imagen": imagen${IMAGEN}
    }, [])
  },
  "ambientes": {
    "etiqueta": ambientes.etiqueta,
    "titulo": ambientes.titulo,
    "pestanas": coalesce(ambientes.pestanas[]{
      label,
      "fichas": coalesce(fichas[]{
        "nombre": producto->nombre,
        "slug": producto->slug.current,
        spec,
        "foto": foto${IMAGEN}
      }, [])
    }, [])
  },
  "cita": cita.texto,
  "proyectos": {
    "etiqueta": proyectos.etiqueta,
    "titulo": proyectos.titulo,
    "bajada": proyectos.bajada,
    "obras": coalesce(proyectos.obras[]{
      nombre,
      ciudad,
      credito,
      "diseno": select(
        defined(producto->materia) => producto->nombre + " · " + producto->materia,
        producto->nombre
      ),
      "disenoSlug": producto->slug.current,
      formato,
      "foto": foto${IMAGEN}
    }, [])
  },
  "historia": {
    "titulo": historia.titulo,
    "hitos": coalesce(historia.hitos[]{anio, titulo, texto, "imagen": imagen${IMAGEN}}, [])
  },
  "profesionales": {
    "etiqueta": profesionales.etiqueta,
    "titulo": profesionales.titulo,
    "texto": profesionales.texto,
    "imagen": profesionales.imagen${IMAGEN},
    "videoUrl": profesionales.video.asset->url,
    "videoEtiqueta": profesionales.videoEtiqueta
  },
  "encuentranos": {
    "etiqueta": encuentranos.etiqueta,
    "titulo": encuentranos.titulo,
    "texto": encuentranos.texto
  }
}
`

export const CONTACTO = /* groq */ `
*[_type == "contacto"][0] {
  "hero": {
    "titular": hero.titular,
    "bajada": hero.bajada,
    "imagen": hero.imagen${IMAGEN}
  },
  horario,
  correo,
  "sedes": coalesce(sedes[]{
    nombre,
    direccion,
    telefono,
    "ubicacion": select(defined(ubicacion) => {"lat": ubicacion.lat, "lng": ubicacion.lng})
  }, []),
  "formulario": {
    "titulo": formulario.titulo,
    "texto": formulario.texto,
    "gracias": formulario.gracias
  }
}
`

export const DONDE_COMPRAR = /* groq */ `
*[_type == "dondeComprar"][0] {
  "hero": {
    "titular": hero.titular,
    "bajada": hero.bajada,
    "imagen": hero.imagen${IMAGEN}
  },
  whatsappCentral,
  textoEstadoVacio,
  cierre
}
`

export const AJUSTES = /* groq */ `
*[_type == "ajustes"][0] {
  titulo,
  descripcion,
  "imagenOG": imagenOG${IMAGEN},
  textoPie,
  direccion,
  telefono,
  correo,
  whatsapp,
  "redes": coalesce(redes[]{nombre, url}, []),
  anioFundacion
}
`
