# Fase 3 — Catálogo (bitácora de ejecución)

*Inicio: 2026-08-25 · Entregable (plan maestro §6): el admin crea, edita y despublica un producto,
y el sitio lo muestra filtrable.*

## Alcance

| # | Bloque | Estado |
|---|---|---|
| 3.1 | Los 126 productos cargados en Sanity con sus fotos y marcas de ejemplo | ✅ |
| 3.2 | Página de catálogo: grilla de 24 en 24, cinco filtros combinables, orden y estados vacíos | ✅ |
| 3.3 | Contrato de URL e historial (filtros sin ensuciar historial, ficha con entrada propia, atrás cierra lo de encima) | ✅ (la ficha, enganchada) |
| 3.4 | Ficha de producto: overlay en el catálogo y página propia indexable por producto | pendiente |
| 3.5 | Megamenú de Catálogo enlazando por materia, y las tarjetas del home enlazando a su producto | pendiente |
| 3.6 | QA: pruebas 05, 06, 07 y 10 del checklist, sumadas a `scripts/qa/aceptacion.mjs` | pendiente |

## Reglas heredadas que gobiernan esta fase

- **Filtros client-side sobre JSON embebido en el build.** Cero peticiones a Sanity en runtime y
  ningún servicio externo de búsqueda.
- **Listas cerradas**: los cinco ejes son selects; un valor fuera de lista deja al producto fuera
  del filtro. Nunca texto libre.
- **Fila sin dato desaparece** de la ficha: ni en blanco ni "no especificado".
- **Sección bajo su mínimo se oculta entera.**
- Grillas de **24 en 24**; reacomodo animado al filtrar.
- Cada producto tiene **página propia indexable** además del overlay (decisión cerrada, anexo §3-4
  de `modelo-de-contenido.md`).
- Imágenes procesadas en build; `cdn.sanity.io` nunca en producción.
- Los avisos de "foto de ejemplo" se ven **solo en el preview del admin**, nunca en producción.

## Pendiente del cliente que afecta a esta fase

1. **La columna de materia** de los 126 productos — 29 no la tienen. No rompe nada (no aparecen al
   filtrar por ese eje), pero el handoff lo llama "el único pedido que detiene el catálogo".
2. **Fotos reales de 95 productos**: 66 llevan hoy una foto de ejemplo que no corresponde al
   producto que ilustra, y 29 no tienen foto.
3. Si el cliente decide **agrupar variantes por diseño** en vez de 1 fila = 1 producto, cambia el
   modelo. Está en consulta desde el handoff y conviene cerrarlo antes de cargar contenido real.

## Decisiones de esta fase

1. **Direcciones de producto con formato cuando el nombre se repite** (2026-08-25). El archivo del
   cliente trae 126 filas pero solo 113 nombres distintos: 13 diseños existen en 60×60 y en 60×120
   (Duna, Mallorca, Santorini, Enigma White…). Como la unidad decidida es "una fila = un producto =
   una página propia", cada fila necesita su propia dirección: el primero conserva la dirección
   simple y el segundo lleva el formato (`/catalogo/duna` y `/catalogo/duna-60x120`).
   Si el cliente decidiera agrupar por diseño —consulta todavía abierta— esto se revierte.
2. **La macro deja de ser obligatoria cuando no existe** (2026-08-25). El schema exigía que la
   primera foto fuera la macro de la baldosa. Nueve productos del catálogo real solo tienen foto de
   ambiente: es un hueco de material del cliente, no un error de carga. Ahora el Studio avisa
   ("Falta la macro de la baldosa") en vez de bloquear, y sigue siendo error poner un ambiente
   delante de una macro que sí existe.

### Bloques 3.2 y 3.3 — catálogo, filtros y dirección (2026-08-25)

**Dónde vive cada cosa.** `src/pages/catalogo.astro` es delgada; el resto está en
`src/components/catalogo/`: `filtrar.ts` (ejes, coincidencia, orden y conteos — se usa en el build
Y en el navegador, por eso es un módulo aparte), `direccion.ts` (contrato de URL e historial, y el
enganche documentado para la ficha), `Catalogo.astro` (armazón + script), `Tarjeta.astro`,
`HeroCatalogo.astro` y `Cierre.astro`.

3. **La grilla se renderiza entera en el build; el navegador solo ordena, muestra y esconde.**
   Las 126 tarjetas salen del HTML con sus fotos ya procesadas (`cdn.sanity.io` nunca en
   producción) y el catálogo se ve sin JavaScript. El JSON embebido lleva **solo** id, nombre,
   serie y los cinco ejes — ni fotos ni ficha: ~12 KB antes de comprimir. Dibujar las tarjetas con
   JavaScript habría exigido URLs de imagen en el cliente y una primera pantalla vacía.
4. **El orden se aplica moviendo el DOM, no con `order` de CSS**: así el recorrido con teclado
   sigue al orden visual (`order` solo reordena lo que se ve y deja el tabulador desordenado).
5. **Breakpoints 760 y 1024, siempre por media query.** El prototipo conmuta a 760 porque decide
   en JavaScript; `Responsividad v0` §03 dice que el sidebar de tablet "pasa al patrón móvil si no
   caben 2 columnas de cards", y con 220px de barra no caben hasta ~900px. Queda:
   <760 dos columnas (gutter 12px) · 760–1023 tres columnas fijas y hoja de filtros ·
   ≥1024 barra lateral pegajosa (260px) y `auto-fill minmax(300px,1fr)`.
6. **Altura de control.** `Tokens v0` reserva `--control-height-lg` (48px) para "CTA de cierre /
   acción destacada": lo usan "Ver 24 más", el botón "Filtrar" y el pie de la hoja. El resto queda
   en 44px, incluido el "Limpiar filtros" del estado vacío — el propio prototipo hace esa misma
   distinción. Matiza, no contradice, la decisión de la fase 2 sobre el CTA de Encuéntranos.
7. **"Catálogo general PDF" no se publica.** En el prototipo ese enlace no navega a ninguna parte
   y no hay archivo en el CMS: no se sirve un enlace muerto. Queda solo "Distribuidores".
8. **El orden de las opciones lo manda `sanity/lib/listas.ts`**, no el prototipo (difieren en
   Materia y Brillo). Es la lista cerrada del modelo y es la que ve el admin en el Studio.
9. **Contrato de URL.** Serie, los cinco ejes y el orden se escriben con `replaceState` — la
   dirección es compartible pero el historial no crece. Lo que se abre encima (hoja de filtros,
   ficha) va con `pushState` y se cierra con "atrás"; cerrar delega en `history.back()` cuando la
   capa dejó entrada propia, así el aspa y el gesto del sistema hacen lo mismo. El bloque visible
   (24, 48, …) NO viaja: un enlace compartido abre siempre en el primero. Se admite el enlace del
   megamenú (`#materia-madera`) y se normaliza a `#materia=Madera` con `replaceState`.
   `capa=menu` queda **fuera**: el menú móvil es de la cáscara y su entrada de historial le toca a
   quien la mantenga.
10. **Enganche de la ficha (bloque 3.4).** El catálogo ya implementa el contrato; falta dibujar.
    Cada tarjeta es `<a href="/catalogo/<slug>" data-abre-ficha="<id>">`: sin JavaScript, con clic
    medio o en pestaña nueva lleva a la página propia del producto. Para el overlay,
    `window.catalogo.abrirFicha(id)` (deja entrada de historial y escribe `#diseno=<id>`),
    `window.catalogo.cerrar()`, `window.catalogo.productos`, `window.catalogo.estado()` y el aviso
    `document.addEventListener('catalogo:capa', …)` con `{ficha, capa}`. Todo documentado en
    `src/components/catalogo/direccion.ts`.
11. **Nuevo singleton `catalogo` en el CMS** (ver `modelo-de-contenido.md` §2.2). Hoy está vacío:
    el hero se dibuja con la ruta y el h1, y la banda de cierre no aparece. Los textos del
    prototipo, para cargarlos con el resto del contenido:
    - `hero.eyebrow`: "Diseños 2026" · `hero.titular`: "Catálogo"
    - `hero.bajada`: "El portafolio completo: 126 productos entre la Serie Regular y la Serie
      Venezuela. Filtra por materia, formato, uso, textura o brillo."
    - `hero.imagen`: la foto de ambiente del hero del home (`uploads/hero-poster.jpg`)
    - `cierre.etiqueta`: "Siguiente paso" · `cierre.titulo`: "Vela en persona antes de decidir." ·
      `cierre.texto`: "Nuestros distribuidores tienen muestras físicas de cada diseño y te ayudan
      con el cálculo de metros."

#### Fidelidad medida (modo PLANO, contra el prototipo en marcha)

| Zona | 1440 | 390 |
|---|---|---|
| Buscador completo (`.finder`: barra lateral + grilla de 24 + "ver más") | **0,09%** | **0,11%** |
| Barra "Entra por serie" | **0,00%** | **0,00%** |

Las cajas coinciden al píxel (1440×4623 y 390×4460). El residuo es texto: el orden de las opciones
de Materia y Brillo (decisión 8) y antialiasing.

```bash
PLANO=1 PROTO=http://localhost:4500/catalogo-c5.dc.html NUESTRO=http://localhost:4600/catalogo/ \
  node scripts/qa/diff.mjs '[data-screen-label="Finder"]' '.finder' finder 1440 900
```

**Un defecto viejo que apareció midiendo**: el `padding: 1px 6px` que el navegador le pone a todo
`<button>` sobrevive si solo se declara `padding-block`. Ensanchaba 12px cada pestaña de serie
(1,84% de diferencia en esa barra, ya en 0,00%). Conviene revisar el resto del sitio con ese ojo.

#### Prueba 05 del checklist — pasa

`node scripts/qa/prueba-05.mjs` (suelta mientras dura la fase; el bloque 3.6 la pliega a
`aceptacion.mjs` junto con la 06, la 07 y la 10).

| Qué | Resultado |
|---|---|
| Quince filtrados no agregan entradas al historial | ✅ `history.length` 3 → 3 |
| La dirección igual refleja los filtros (`replaceState`) | ✅ `#serie=…&materia=…&uso=…` |
| Un "atrás" devuelve a la página anterior | ✅ vuelve al inicio |
| Abrir la hoja de filtros SÍ agrega una entrada | ✅ 2 → 3 |
| "Atrás" cierra la hoja sin salir del catálogo y conserva el filtro puesto dentro | ✅ |

#### Abierto para el bloque 3.6

- **El `select` de "Ordenar" mide 36px de alto en teléfono**, que es lo que dibuja el prototipo y lo
  que `Tokens v0` llama `--control-height-sm`. La prueba 11 exige 44px de banda tocable y hoy solo
  corre sobre el home, así que no falla. Subirlo a 44 mueve la grilla 8px y rompe la comparación
  con el prototipo: se decide con dato, no acá.
- Plegar `scripts/qa/prueba-05.mjs` a `scripts/qa/aceptacion.mjs`.

## Estado del dato cargado (2026-08-25)

126 productos · 97 con materia y **29 sin materia** · 97 con fotos y **29 sin ninguna foto** ·
**132 fotos marcadas como ejemplo**. Coincide exactamente con el archivo del cliente y con lo que
declara `design/publicar/LEEME.md`.
