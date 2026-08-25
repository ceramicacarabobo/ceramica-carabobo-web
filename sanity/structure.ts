import type {StructureResolver} from 'sanity/structure'
import {SINGLETONS} from './schemas'

const TITULOS: Record<string, string> = {
  home: 'Home',
  contacto: 'Contacto',
  dondeComprar: 'Dónde comprar',
  ajustes: 'Ajustes del sitio',
}

/**
 * Menú del Studio pensado para admins no técnicos:
 * primero las páginas (documentos únicos, sin "crear" ni "borrar"),
 * después las colecciones.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Contenido')
    .items([
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
      S.documentTypeListItem('producto').title('Productos'),
      S.documentTypeListItem('distribuidor').title('Distribuidores'),
      S.documentTypeListItem('materia').title('Materias'),
    ])
