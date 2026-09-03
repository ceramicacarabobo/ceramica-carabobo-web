import type {StructureResolver} from 'sanity/structure'
import {SINGLETONS} from './schemas'
import {ESTADOS} from './lib/listas'

/**
 * Id seguro para los nodos del menú: Sanity NO admite tildes ni espacios ahí, y
 * los nombres de estado los traen ("Anzoátegui", "Nueva Esparta"). Usar el
 * nombre tal cual rompía el Studio entero con "Structure node id cannot contain
 * character á" — el error se lanza al construir el árbol, así que no falla solo
 * esa rama: no carga ninguna.
 */
const idSeguro = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const TITULOS: Record<string, string> = {
  home: 'Home',
  catalogo: 'Catálogo',
  contacto: 'Contacto',
  dondeComprar: 'Dónde comprar',
  ajustes: 'Ajustes del sitio',
}

/**
 * Menú del Studio pensado para admins no técnicos.
 *
 * La idea de fondo: que el menú no sea solo un archivador, sino que DIGA QUÉ
 * FALTA. Con 126 productos y 247 puntos de venta, una lista plana obliga a
 * abrir fichas al azar para descubrir cuáles están incompletas. Cada vista de
 * "pendientes" es una consulta que el editor no tiene que saber escribir.
 *
 * Las cuentas de cada vista se mueven solas con el contenido: si el cliente
 * sube la macro que falta, el producto desaparece de "Sin foto de la baldosa"
 * sin que nadie toque el código.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Contenido')
    .items([
      // ── Las cinco páginas del sitio ──────────────────────────────────────
      S.listItem()
        .title('Páginas')
        .child(
          S.list()
            .title('Páginas')
            .items(
              SINGLETONS.map((tipo) =>
                S.listItem()
                  .title(TITULOS[tipo] ?? tipo)
                  .id(tipo)
                  .child(S.document().schemaType(tipo).documentId(tipo).title(TITULOS[tipo] ?? tipo)),
              ),
            ),
        ),

      S.divider(),

      // ── Productos ────────────────────────────────────────────────────────
      S.listItem()
        .title('Productos')
        .id('productos')
        .child(
          S.list()
            .title('Productos')
            .items([
              S.listItem()
                .title('Todos')
                .id('producto-todos')
                .child(S.documentTypeList('producto').title('Todos los productos')),
              S.listItem()
                .title('Por serie')
                .id('producto-serie')
                .child(
                  S.list()
                    .id('lista-por-serie')
                    .title('Por serie')
                    .items(
                      ['Regular', 'Venezuela'].map((serie) =>
                        S.listItem()
                          .title(serie)
                          .id(`serie-${idSeguro(serie)}`)
                          .child(
                            S.documentTypeList('producto')
                              .id(`lista-serie-${idSeguro(serie)}`)
                              .title(`Serie ${serie}`)
                              .filter('_type == "producto" && serie == $serie')
                              .params({serie}),
                          ),
                      ),
                    ),
                ),
              S.divider(),
              // Estas tres vistas son la lista de trabajo pendiente.
              S.listItem()
                .title('Sin ninguna foto')
                .id('producto-sin-foto')
                .child(
                  S.documentTypeList('producto')
                    .title('Sin ninguna foto')
                    .filter('_type == "producto" && coalesce(count(fotos), 0) == 0'),
                ),
              S.listItem()
                .title('Sin foto de la baldosa')
                .id('producto-sin-macro')
                .child(
                  S.documentTypeList('producto')
                    .title('Sin foto de la baldosa (macro)')
                    .filter('_type == "producto" && count(fotos) > 0 && count(fotos[tipo == "macro"]) == 0'),
                ),
              S.listItem()
                .title('Con fotos de ejemplo')
                .id('producto-ejemplo')
                .child(
                  S.documentTypeList('producto')
                    .title('Con fotos de ejemplo (no son de este producto)')
                    .filter('_type == "producto" && count(fotos[esEjemplo == true]) > 0'),
                ),
            ]),
        ),

      // ── Distribuidores ───────────────────────────────────────────────────
      S.listItem()
        .title('Distribuidores')
        .id('distribuidores')
        .child(
          S.list()
            .title('Distribuidores')
            .items([
              S.listItem()
                .title('Todos')
                .id('distribuidor-todos')
                .child(S.documentTypeList('distribuidor').title('Todos los distribuidores')),
              S.listItem()
                .title('Por estado')
                .id('distribuidor-estado')
                .child(
                  S.list()
                    .id('lista-por-estado')
                    .title('Por estado')
                    .items(
                      ESTADOS.map((estado) =>
                        S.listItem()
                          .title(estado)
                          .id(`estado-${idSeguro(estado)}`)
                          .child(
                            // La hija TAMBIÉN necesita id propio: sin él Sanity lo
                            // deriva del título, y ahí vuelven las tildes.
                            S.documentTypeList('distribuidor')
                              .id(`lista-estado-${idSeguro(estado)}`)
                              .title(estado)
                              .filter('_type == "distribuidor" && estado == $estado')
                              .params({estado}),
                          ),
                      ),
                    ),
                ),
              S.divider(),
              S.listItem()
                .title('Sin ubicación en el mapa')
                .id('distribuidor-sin-mapa')
                .child(
                  S.documentTypeList('distribuidor')
                    .title('Sin ubicación en el mapa')
                    .filter('_type == "distribuidor" && !defined(ubicacion)'),
                ),
              S.listItem()
                .title('Sin teléfono')
                .id('distribuidor-sin-tel')
                .child(
                  S.documentTypeList('distribuidor')
                    .title('Sin teléfono')
                    .filter('_type == "distribuidor" && !defined(telefono)'),
                ),
              S.listItem()
                .title('Datos de ejemplo por validar')
                .id('distribuidor-ejemplo')
                .child(
                  S.documentTypeList('distribuidor')
                    .title('Datos de ejemplo por validar')
                    .filter('_type == "distribuidor" && esEjemplo == true'),
                ),
            ]),
        ),

      S.listItem().title('Materias').id('materias').child(S.documentTypeList('materia').title('Materias')),
    ])
