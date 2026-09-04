/**
 * Datos estructurados (JSON-LD, schema.org).
 *
 * Son un bloque invisible que le dice al buscador qué ES cada página: una
 * empresa con su dirección y su teléfono, o un producto con sus medidas.
 *
 * Reglas que sigue este módulo:
 *
 *  1. **Solo se publica dato verificado.** Un dato estructurado equivocado es
 *     peor que ninguno: el buscador lo toma por bueno y lo muestra. Por eso las
 *     coordenadas de planta —que el propio handoff marca como APROXIMADAS— no
 *     se publican, y `geo` queda fuera hasta que el cliente las confirme.
 *  2. **Nada que no esté ya en la página.** Marcar como dato algo que el
 *     visitante no ve es lo que las guías llaman contenido oculto, y se penaliza.
 *  3. **Sin `offers`.** Cerámica Carabobo no vende en línea, así que el producto
 *     no tiene precio ni disponibilidad. Inventar un `offers` para forzar la
 *     ficha enriquecida sería falso; sin él, el buscador entiende el catálogo
 *     igual, aunque no muestre precio.
 *
 * Las funciones son puras y reciben el dato ya preparado: `lib/` no importa de
 * `components/`.
 */

/** Un valor de la ficha técnica, tal como se muestra en la página. */
export interface FilaTecnica {
  k: string
  v: string
}

interface DatosEmpresa {
  nombre: string
  sitio: string
  descripcion?: string
  direccion?: string
  telefono?: string
  correo?: string
  anioFundacion?: number
  /** Perfiles públicos, para `sameAs`. */
  redes?: string[]
}

/**
 * La empresa. Va una sola vez, en el inicio.
 *
 * Se declara `Organization` y no `LocalBusiness` a propósito: `LocalBusiness`
 * espera coordenadas y horario de atención al público en un formato cerrado, y
 * de las dos plantas no tenemos ni lo uno (aproximadas) ni lo otro (el horario
 * del CMS es texto libre). Con `Organization` el dato que damos es todo cierto.
 */
export function empresa(datos: DatosEmpresa) {
  // La dirección es UN campo de texto libre en el CMS ("Zona Industrial
  // Municipal Norte\nValencia, Carabobo — Venezuela"), y schema.org quiere
  // calle, ciudad y estado por separado. Se parte por lo que el dato real trae:
  // salto de línea → calle / resto, y del resto la coma separa ciudad de estado.
  // Es un reparto CONSERVADOR: si algo no encaja, el campo no se emite en vez de
  // emitirse mal. Lo correcto de fondo es separar ciudad y estado en el CMS —
  // anotado en `docs/pendientes.md` para antes de producción.
  const [calle, ...resto] = (datos.direccion ?? '').split('\n').map((linea) => linea.trim())
  const [localidad, region] = (resto.join(' ') || '')
    .split(',')
    .map((parte) => parte.split('—')[0].trim())

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: datos.nombre,
    url: datos.sitio,
    ...(datos.descripcion ? {description: datos.descripcion} : {}),
    ...(datos.anioFundacion ? {foundingDate: String(datos.anioFundacion)} : {}),
    ...(calle
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: calle,
            ...(localidad ? {addressLocality: localidad} : {}),
            ...(region ? {addressRegion: region} : {}),
            addressCountry: 'VE',
          },
        }
      : {}),
    ...(datos.telefono || datos.correo
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'sales',
            ...(datos.telefono ? {telephone: datos.telefono} : {}),
            ...(datos.correo ? {email: datos.correo} : {}),
            areaServed: 'VE',
            availableLanguage: 'es',
          },
        }
      : {}),
    ...(datos.redes?.length ? {sameAs: datos.redes} : {}),
  }
}

interface DatosProducto {
  nombre: string
  descripcion: string
  marca: string
  sitio: string
  url: string
  /** Direcciones ABSOLUTAS de las fotos ya procesadas por el build. */
  imagenes: string[]
  materia?: string
  /** Las mismas filas que muestra la ficha en pantalla. */
  filas: FilaTecnica[]
}

/** Un diseño del catálogo. Va en su página propia. */
export function producto(datos: DatosProducto) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: datos.nombre,
    description: datos.descripcion,
    url: datos.url,
    ...(datos.imagenes.length ? {image: datos.imagenes} : {}),
    brand: {'@type': 'Brand', name: datos.marca},
    manufacturer: {'@type': 'Organization', name: datos.marca, url: datos.sitio},
    ...(datos.materia ? {material: datos.materia, category: datos.materia} : {}),
    // La ficha técnica entera como propiedades. Son las MISMAS filas que se ven
    // en pantalla: si un producto no trae un dato, esa fila no existe ni acá ni
    // allá (regla de contenido defensivo del handoff).
    ...(datos.filas.length
      ? {additionalProperty: datos.filas.map((fila) => ({'@type': 'PropertyValue', name: fila.k, value: fila.v}))}
      : {}),
  }
}
