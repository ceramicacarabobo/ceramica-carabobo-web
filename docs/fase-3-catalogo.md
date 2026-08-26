# Fase 3 — Catálogo (bitácora de ejecución)

*Inicio: 2026-08-25 · Entregable (plan maestro §6): el admin crea, edita y despublica un producto,
y el sitio lo muestra filtrable.*

## Alcance

| # | Bloque | Estado |
|---|---|---|
| 3.1 | Los 126 productos cargados en Sanity con sus fotos y marcas de ejemplo | ✅ |
| 3.2 | Página de catálogo: grilla de 24 en 24, cinco filtros combinables, orden y estados vacíos | ✅ |
| 3.3 | Contrato de URL e historial (filtros sin ensuciar historial, ficha con entrada propia, atrás cierra lo de encima) | ✅ (la ficha, enganchada) |
| 3.4 | Ficha de producto: overlay en el catálogo y página propia indexable por producto | ✅ |
| 3.5 | Megamenú de Catálogo enlazando por materia, y las tarjetas del home enlazando a su producto | pendiente |
| 3.6 | QA: pruebas 05, 06, 07 y 10 del checklist, sumadas a `scripts/qa/aceptacion.mjs` | ✅ la 05, 06 y 07 (la 10 necesita contenido preparado) |

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

`SOLO=05 node scripts/qa/aceptacion.mjs` (plegada el 2026-08-25; ya no hay script suelto).

| Qué | Resultado |
|---|---|
| Quince filtrados no agregan entradas al historial | ✅ `history.length` 3 → 3 |
| La dirección igual refleja los filtros (`replaceState`) | ✅ `#serie=…&materia=…&uso=…` |
| Un "atrás" devuelve a la página anterior | ✅ vuelve al inicio |
| Abrir la hoja de filtros SÍ agrega una entrada | ✅ 2 → 3 |
| "Atrás" cierra la hoja sin salir del catálogo y conserva el filtro puesto dentro | ✅ |

#### Bloque 3.6 — las pruebas 05, 06 y 07, plegadas (2026-08-25)

`scripts/qa/prueba-05.mjs` y `scripts/qa/prueba-06-07.mjs` desaparecen: sus comprobaciones son ahora
`prueba05`, `prueba06` y `prueba07` dentro de `scripts/qa/aceptacion.mjs`, con el formato del resto
—un veredicto por prueba del checklist y cada comprobación anotada debajo—. Se corren solas con
`SOLO=05,06,07 node scripts/qa/aceptacion.mjs`.

La suite pasó de siete pruebas a diez: **9 en verde, la 03 medida sin veredicto, 0 en falla.**

Dos siguen sin automatizar, y conviene no perderlas de vista:

- **01** — el mapa de dónde comprar dibuja los 26 estados con todo CDN externo desconectado. La
  página existe desde hoy y el build no trae ningún script externo, así que ya se puede escribir.
- **10** — con el catálogo vacío, una foto faltante o una ficha sin datos, ninguna pantalla se ve
  rota. Necesita contenido preparado a propósito, que es lo que la mantiene fuera.

**Dos correcciones que salieron de plegarlas, las dos en la prueba, no en el catálogo:**

1. **La entrada de historial se comprueba por `history.state`, no por `history.length`.** La 06 medía
   la longitud antes y después de abrir la ficha y esperaba +1. Pero en el flujo de teléfono la
   prueba abre primero la hoja de filtros —que también empuja una entrada— y "ver resultados" la
   cierra con `history.back()`. Eso deja una entrada HACIA ADELANTE: el `pushState` de la ficha la
   sobrescribe en vez de sumar una, así que la longitud no se mueve aunque la entrada propia sí
   exista. Ahora se lee la marca `capaCatalogo` que escribe `direccion.ts`.
2. **La medida de 44px del aspa se reintenta una vez.** Se vio fallar dos veces con una lectura corta
   y no se pudo reproducir en 22 corridas seguidas; la hoja acaba de entrar con su animación y el
   HTML de la ficha se acaba de inyectar, así que una lectura temprana puede salir corta. Si la
   primera sale bajo 44 se repite a los 400ms y se anotan las dos: un aspa rota daría corto las dos
   veces. La 11, que barre todos los controles del sitio con hit-test, da 0 bajo 44px de forma
   estable — que es la comprobación de fondo.

**Cerrado el 2026-08-25 — el `select` de "Ordenar" ya mide 44px tocables.** Medía 36 de alto, que es
lo que dibuja el prototipo y lo que `Tokens v0` llama `--control-height-sm`, y subirlo a 44 movía la
grilla 8px. La regla de `Responsividad v0` §04 no pide agrandarlo: *"si el elemento visible es más
chico, se extiende el área con padding, no se agranda el dibujo"*. El dibujo (borde y radio) pasó a
un contenedor `.barra__caja` de 36px y el `<select>` mide 44 con margen vertical negativo de 4px, así
que se sale del contenedor sin ocupar nada en el flujo. Es el mismo criterio que ya usaban las
pestañas de Ambientes, con contenedor en vez de `::after` porque un elemento reemplazado no admite
pseudo-elementos. La maqueta no se movió: el diff siguió en 0,09% / 0,11%.

### Bloque 3.4 — la ficha de producto, en sus dos formas (2026-08-25)

**Dónde vive cada cosa.** `src/pages/catalogo/[slug].astro` (las 126 páginas propias) y, en
`src/components/catalogo/`: `Ficha.astro` (el marcado de la ficha, uno solo para las dos formas),
`ficha.ts` (las filas de la tabla y la regla de la fila vacía), `ficha.css` (todo el estilo, global),
`fotos.ts` (procesado de imagen compartido con la tarjeta), `CapaFicha.astro` (el overlay),
`galeria.ts` (galería y compartir, delegado) y `arrastre.ts` (el gesto de cerrar, que ahora comparten
la hoja de filtros y la de la ficha).

12. **El overlay se trae la página propia; no hay una segunda ficha** (2026-08-25). La capa pide por
    `fetch` `/catalogo/<slug>` —que el build ya genera— y se queda con su bloque `[data-ficha]`. Las
    dos alternativas eran peores: dibujar las 126 fichas escondidas en el catálogo le sumaba más de
    300 KB y unos 5.000 nodos a un HTML que ya pesa 256 KB, y dibujarlas en el navegador exigía URLs
    de imagen del CMS en el cliente, que es justo lo que `cdn.sanity.io` nunca en producción prohíbe.
    Como efecto de fondo, la ficha del overlay y la de la página propia **no pueden divergir**: son
    el mismo HTML, y la prueba lo comprueba comparando los dos `outerHTML`. La petición es a nuestro
    origen y a un archivo estático, así que no toca la autosuficiencia; si falla, la capa se aparta y
    deja que el enlace navegue, que es exactamente lo que pasa sin JavaScript. Para que no se note la
    espera, la ficha se adelanta al posarse el puntero (con 140ms de intención, para que barrer el
    ratón por la grilla no pida las 126) o al primer toque.
13. **El estilo de la ficha es CSS global, y es la única excepción del proyecto** (2026-08-25). El
    marcado que entra por `innerHTML` no lleva el atributo de scope que Astro le pone al que compila,
    así que un `<style>` con scope no lo alcanzaría. Por la misma razón la ficha no usa la primitiva
    `Boton`: sus acciones son `.ficha__cta`, con los valores del prototipo, y no dependen de que el
    CSS de otro componente esté presente en la página que recibe el HTML.
14. **Una sola anatomía para el Modal y la Hoja, conmutada por media query** (2026-08-25).
    `Responsividad v0` §03 pide dos anatomías distintas (diálogo de 880px con split imagen+tabla;
    hoja a pantalla completa con acciones ancladas al pie), pero el marcado es uno: bajo 760px es un
    flex en columna con las acciones en `position: sticky; bottom: 0`, y de 760 para arriba un grid
    de dos columnas donde las acciones caen al pie de la segunda. El aspa de 44px es **el mismo
    botón** en los dos casos y solo cambia de sitio. Sin esto habría que mover nodos con JavaScript
    al cruzar el breakpoint, que es exactamente lo que el handoff manda no hacer.
15. **"Rendimiento" se escribe con la unidad del sitio, no con la de la planilla** (2026-08-25). El
    prototipo muestra "1,77 MT2" porque repite el texto crudo del archivo del cliente; el modelo
    guarda `mtsCaja` como número, así que la ficha formatea "1,77 m²" con el separador decimal de
    es-VE. Es la única fila donde el texto se aparta del prototipo, y es a propósito.
16. **Las miniaturas no tienen imagen propia** (2026-08-25). Reusan el `srcset` de la foto grande con
    otro `sizes`, así que el navegador elige el candidato chico — el mismo archivo que ya bajó para
    la foto. Con ancho propio habrían sido 216 imágenes más en el build para un cuadro de 100px.
17. **Nunca se le pide a `astro:assets` un ancho mayor que el archivo** (2026-08-25). Agrandar no
    agrega un pixel de nitidez y sí multiplica el build: de los 72 archivos distintos del catálogo,
    38 miden menos de 800px de ancho, y se les estaban generando variantes de 800 y 1200 agrandadas.
    Con el recorte, el build pasó de 1.411 imágenes a 967. La tarjeta y la ficha además comparten la
    URL de origen (`FUENTE = 1200` en `fotos.ts`), así que los anchos que tienen en común se generan
    una sola vez en vez de dos. **La primitiva `base/Imagen.astro` sigue sin este recorte**: es de la
    cáscara y quedó fuera del alcance de este bloque, pero le aplica el mismo defecto.

#### Coste de build de las 126 páginas (medido 2026-08-25)

| | Imágenes generadas | Páginas |
|---|---|---|
| Antes del bloque 3.4 | 760 | 6 |
| Primer intento (sin recortar anchos) | 1.411 | 132 |
| Con la decisión 16 y la 17 | **967** | **132** |

Las 126 páginas nuevas suman **207 imágenes** al build, no las 651 del primer intento: el recorte de
anchos y el reuso del juego de la foto grande en las miniaturas se comen casi todo el crecimiento.
Los números de tiempo están más abajo, con su advertencia: **la máquina donde se midió tiene 2
núcleos y 3,9 GB de RAM**, y el codificador de AVIF llega a tardar 20 segundos en una sola foto de
2400px. Los 33 segundos que registraba la fase 3 eran de un build con la caché de imágenes CALIENTE
— nunca fueron el coste de generar las 760.

## Estado del dato cargado (2026-08-25)

126 productos · 97 con materia y **29 sin materia** · 97 con fotos y **29 sin ninguna foto** ·
**132 fotos marcadas como ejemplo**. Coincide exactamente con el archivo del cliente y con lo que
declara `design/publicar/LEEME.md`.
