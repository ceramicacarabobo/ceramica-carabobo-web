import type {SchemaTypeDefinition} from 'sanity'

import producto from './documents/producto'
import distribuidor from './documents/distribuidor'
import materia from './documents/materia'

import home from './singletons/home'
import contacto from './singletons/contacto'
import dondeComprar from './singletons/dondeComprar'
import ajustes from './singletons/ajustes'

import fotoProducto from './objects/fotoProducto'
import heroCapa from './objects/heroCapa'
import {ambienteFicha, ambientePestana} from './objects/ambiente'
import proyecto from './objects/proyecto'
import hito from './objects/hito'
import sede from './objects/sede'

/** Documentos únicos: se editan desde su propia entrada del menú, no se crean ni borran. */
export const SINGLETONS = ['home', 'contacto', 'dondeComprar', 'ajustes'] as const

export const schemaTypes: SchemaTypeDefinition[] = [
  // Colecciones
  producto,
  distribuidor,
  materia,
  // Páginas (singletons)
  home,
  contacto,
  dondeComprar,
  ajustes,
  // Objetos
  fotoProducto,
  heroCapa,
  ambienteFicha,
  ambientePestana,
  proyecto,
  hito,
  sede,
]
