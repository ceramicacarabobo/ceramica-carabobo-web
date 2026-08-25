# Cerámica Carabobo — paquete para publicar

Propuesta de sitio, Etapa 1.3. Sitio **estático**: no requiere base de datos ni build.
Regenerado el 2026-08-24.

## Publicar

Arrastra esta carpeta completa a Vercel, Netlify o GitHub Pages.

> **No abras `index.html` haciendo doble clic.** El catálogo lee sus 126 productos desde
> `data/catalogo.json` y los navegadores bloquean esa lectura cuando la página se abre
> directamente desde el disco: la grilla saldría vacía. Tiene que servirse por http.
> Para probar en local: `npx serve` dentro de esta carpeta, o publicarlo y abrir el enlace.

**Configura la página de error**: apunta el 404 del servidor a `404.dc.html`. Sin ese paso, una
dirección mal escrita muestra el error genérico del hosting en vez de la página del sitio.

## Contenido

| Archivo | Página |
|---|---|
| `index.html` | Home (misma página que `Propuesta 1.dc.html`, con título y etiquetas para compartir) |
| `Propuesta 1.dc.html` | Home — es el destino de los enlaces "Inicio" del resto del sitio |
| `catalogo-c5.dc.html` | Catálogo: 126 productos en bloques de 24, 5 filtros, ficha con galería |
| `contacto.html` | Contacto (datos reales + mapa de las dos plantas) |
| `donde-comprar.html` | Dónde comprar (mapa de Venezuela por estados) |
| `404.dc.html` | Página de dirección no encontrada |
| `data/catalogo.json` | **El catálogo.** Único archivo a editar para cambiar productos |
| `support.js`, `image-slot.js` | Runtime; no editar |
| `assets/`, `uploads/` | Logo, imágenes y video |

## Qué es dato real y qué no

**Real, tomado de los archivos del cliente** (planilla Guacara 2026 + catálogo PDF Serie Venezuela).
Ojo con el alcance: esto vale para la **página de catálogo**, no para el home.
- En el catálogo: los 126 productos con su nombre, serie, formato, PEI, dureza MOHS y metros por caja,
  más el brillo y la textura.
- En contacto: el horario, el correo, las dos direcciones y sus teléfonos.

**Nuestro, no del cliente** — hay que validarlo antes de publicar sin contraseña:

- **Materia**: solo **26** de los 126 la traen declarada. Otras **71** las dedujimos de la tipología
  (42), del formato (17), del nombre (10) o por supuesto (2), y **29 productos no tienen materia**:
  no aparecen al filtrar por ese eje y la fila desaparece de su ficha. Cada fila del JSON lleva un
  campo `materiaOrigen` que dice de dónde salió cada valor, así que se puede auditar o revertir por
  grupo. **Pedir esa columna es el único pedido que detiene el catálogo.**
- **Fotos**: **31** productos tienen fotografía real del cliente — los 29 de Serie Venezuela (una
  macro de la baldosa y un ambiente por producto, extraídos de su catálogo) más Ciprés Gris y Ciprés
  Moka. De los otros 95, **66 llevan una foto de ejemplo que NO corresponde al producto que ilustra**
  y **29 se muestran sin foto**. Las de Serie Venezuela son también las que se ven en el home.
- **Historia del home**: los cinco hitos —años y textos— son nuestros. Lo único que viene del
  cliente es **1956** como año de fundación. Hay que validarlos antes de publicar sin contraseña.
- **Proyectos del home**: las dos obras ("Living de hotel", "Restaurante") y sus fotos son ejemplo.
  Los nombres de diseño y las especificaciones que las acompañan sí son reales, leídos del catálogo.
- **Distribuidores** de `donde-comprar.html` y del índice del home: los nombres de estado y el
  reparto son nuestros; direcciones y teléfonos son inventados.
- Coordenadas de las dos plantas en `contacto.html`: aproximadas.
- El video del encabezado es material de prueba, en 1280×720 (se amplía en pantallas grandes).

**Corregido el 2026-08-21**: el sitio decía "Desde 1962" y el catálogo que envió el cliente dice
"desde 1956". Se tomó el 1956 del cliente como válido y se aplicó en todas las páginas.

## Antes de compartir el enlace

**Protege el sitio con contraseña** (Vercel y Netlify lo permiten en su configuración). Hay datos
sin validar publicados como si fueran reales. Cada página muestra un aviso visible de lo que es
placeholder, pero el aviso no reemplaza a la contraseña.

El formulario de contacto no está conectado: valida y muestra confirmación, no envía nada.

## Requiere conexión a internet

Se cargan desde servicios externos: tipografías (Google Fonts), geometría de los estados de
Venezuela (dataset público Apache-2.0), librerías de mapas (d3, topojson, Leaflet) y los mosaicos
de calles (OpenStreetMap). Sin conexión las páginas cargan, pero los dos mapas y las tipografías no.

## Qué falta para producción

Este paquete es el prototipo de diseño servido tal cual. Lo que el desarrollo tiene que agregar
—metadatos para compartir y buscadores, varios tamaños por imagen, roles de accesibilidad,
direcciones limpias— está especificado en `Requisitos tecnicos v0`, fuera de esta carpeta.
