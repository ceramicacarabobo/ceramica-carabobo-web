# Handoff: Home de Cerámica Carabobo — tramo central (Propuesta 1 v2)

> Importado del proyecto de diseño `f879b7a1-bd5a-46f5-b7f5-fa0838420689` el 2026-09-04 con el
> MCP de Claude Design. La referencia servible está en `design/publicar/Propuesta 1 v2.dc.html`
> (mismo directorio que `Propuesta 1.dc.html`, que es la aprobada y sigue vigente).
> El `Brief - P1 estructura 1p.md` del paquete no se copió: su §2 (decisiones del cliente) y §4
> (trabajo de logic) están resumidas en `docs/plan-proyecto.md` §19.

## Alcance: sólo tres bloques cambian

Este paquete NO es un rediseño del home. `Propuesta 1.dc.html` es la versión aprobada y sigue
vigente; `Propuesta 1 v2.dc.html` es la misma página con **el tramo central sustituido**. El diff
entre los dos archivos ES el alcance.

**Cambia:**

| Antes (`Propuesta 1`) | Ahora (`v2`) |
|---|---|
| 02 · Proyectos (dos obras construidas con ficha) | **02 · Compara** — comparador de arrastre, dos filas |
| — | **Banda obra** — macro a sangre, entre Compara e Historia |
| Historia (scroll anclado, 300vh) | **03 · Historia** — índice con riel de cinco miniaturas |

**No cambia** (idéntico al archivo aprobado, no rehacer ni "mejorar"): telón de entrada · header
sobre el hero y header fijo · panel de catálogo y menú móvil · hero y su carrusel · 01 · Ambientes ·
el respiro con la cita ("Innovación y tradición / en cada pieza.", sobre crema) · 04 ·
Profesionales · 05 · Encuéntranos · pie · tipografía, color y tokens.

Renumeración: **01** Ambientes · **02** Compara · **03** Historia · **04** Profesionales ·
**05** Encuéntranos.

Dicho con precisión: **el trabajo son las secciones 02 y 03, más la banda a sangre nueva entre las
dos.** Lo único que se toca fuera de ahí son los **rótulos numerados** de Profesionales (03→04) y
Encuéntranos (04→05), que corren por la renumeración.

## ⚠ El diff tiene ruido fuera de alcance

`v2` también trae arreglos de mecanismo que no existen en el archivo aprobado y que **no son
cambios de diseño**:

| Qué aparece en el diff | Por qué | Qué hacer |
|---|---|---|
| Entradas del hero, hoja del menú y panel del catálogo reescritas de `@keyframes` a transiciones conducidas desde el código | Las animaciones de fotogramas no avanzan en la previsualización | **Ignorar la implementación.** Aspecto y tiempos son los del archivo aprobado: 700 ms, `cubic-bezier(.37,0,.63,1)`, retardos 0/90/180, desplazamiento 10 px |
| Reloj del telón pasado a `setInterval` + tope de seguridad | Con `requestAnimationFrame` el telón no se levantaba nunca | **Ignorar la implementación**, conservar el comportamiento: 2,2 s, la marca viaja al lockup del header, el hero retenido hasta que la hoja se levanta |
| Parallax escrito directo en el handler de scroll, y resuelto por selector en vez de por referencia | Misma causa; además el mecanismo llevaba semanas sin estar enganchado a ningún elemento | **Ignorar la implementación**, conservar ±4,5 % en banda a sangre |
| Micro-estados del riel en CSS colgado de `[aria-current]` | Los estilos por valor calculado no se re-aplicaban al cambiar de estado en ese runtime | En producción: estado → clase/prop |
| Baja de la Historia anclada (`syncPin`, su observador de tamaño, sus llamadas) y de los datos de Proyectos | Consecuencia directa de que esas dos secciones salen | Sí es alcance |

En una palabra: **si el diff toca el hero, el telón, el menú o el panel, es fontanería de entorno,
no diseño.** Ahí `Propuesta 1` es la referencia de comportamiento.

## ⚠ Parches de entorno que NO hay que portar

La previsualización donde se diseñó tiene tres limitaciones que no existen en un navegador real:

1. **Las animaciones `@keyframes` no avanzan** ahí. Por eso las entradas del hero, del menú y del
   panel están escritas como transiciones conducidas desde el código, con `void el.offsetHeight`
   para forzar reflujo. **En producción: animaciones/transiciones CSS normales.**
2. **`requestAnimationFrame` no ejecuta sus callbacks** ahí. Por eso el parallax se escribe directo
   en el handler de scroll y el reloj del telón corre con `setInterval`. **En producción: rAF.**
3. **Los estilos por hole y los atributos no siempre se re-aplican.** Varios micro-estados viven en
   CSS colgado de `[aria-current="true"]`. **En producción: estado → clase/prop, y CSS normal.**

Regla: **portar los valores y el comportamiento, no la fontanería.**

## Sistema de movimiento (rige todo el home, ya decidido)

- **Reveal on-scroll**: opacidad 0→1 + `translateY(10px)→0`, **660 ms**,
  `cubic-bezier(.37,0,.63,1)`, dispara cuando el borde superior cruza el **86 %** del alto de la
  ventana, **una sola vez**. Cascada entre hermanos: `retardo = 60 + índice × 70 ms`.
- **Alcance de reveals = intermedio**: **sólo los encabezados de sección funden**. El contenido
  repetido entra ya visible y recibe únicamente máscara y filete.
- **Máscara de imagen**: `clip-path: inset(0 0 14% 0) → inset(0)`, 660 ms, misma curva.
- **Filete que se dibuja**: `background-size: 0 1px → 100% 1px`, 660 ms, misma curva, retardo 120 ms.
- **Micro-estados**: **180 ms**, `cubic-bezier(.4,0,.2,1)`.
- **Fundido apilado** (hero e Historia): la capa que sale queda **opaca debajo y sin transición**;
  sólo la entrante sube 0→1 en **1200 ms** con `cubic-bezier(.37,0,.63,1)`.
- **Parallax**: ±4,5 % del alto, **sólo en banda a sangre**, `transform` puro, apagado en móvil.
- **`prefers-reduced-motion`**: todo a 1 ms, máscara sin `clip-path`, filete al 100 %.

## Tokens

Color: `#F5F3F0` crema (fondo) · `#ECE9E4` crema oscuro · `#2E2E2E` tinta · `#5C5A56` tinta
secundaria · `#6E6C68` tinta terciaria (**sólo sobre `#F5F3F0`**) · `#D9D9D9` filete · `#6B0F1A`
burdeos · `#55000F` burdeos hover.

Tipografía: **Work Sans** (300 titulares, 400/500 rótulos) · **Open Sans** (cuerpo). Rótulo de
sección: 0.75rem, 500, `letter-spacing .16em`, mayúsculas. Titular: `clamp(2.25rem, 1.73rem +
2.21vw, 3.5rem)`, 300, `line-height 1.08`. Cuerpo: 0.9375rem, `line-height 1.7`.

Aire: sección con `padding: clamp(72px,8vw,120px) clamp(20px,5vw,72px) 0`, `max-width 1600px`.
Rangos: móvil <760 · tablet 760–1023 · desktop ≥1024. Foco: `:focus-visible` 2 px `#6B0F1A`,
blanco sobre imagen y sobre fondo oscuro. Objetivo táctil mínimo 44 px.

---

## 02 · Compara

**Propósito.** Mostrar el mismo ambiente con dos revestimientos distintos, comparables por arrastre.

**Encabezado.** Rótulo `02 · Compara` (el `02` en burdeos) + `h2` "El mismo espacio, dos materias."
Rejilla `minmax(0,1.2fr) minmax(0,1fr)` en desktop, una columna en móvil; a la derecha, párrafo de
introducción. Lleva reveal de apertura.

**Dos filas, misma implementación.** Cada fila: comparador grande + columna con las dos macros del par.
- Desktop: `grid-template-columns: minmax(0,1.85fr) minmax(0,1fr)`, alto `clamp(280px,29vw,460px)`,
  gap 16 px.
- **La segunda fila va espejada**: columnas invertidas y `order` cambiado (verificado 821/443
  arriba, 443/821 abajo).
- Móvil: se apila; el comparador toma `aspect-ratio 4/5` y las macros van a dos columnas.
- Cada fila lleva reveal + filete que se dibuja, con la cascada de 70 ms.

**El comparador.**
- Dos imágenes superpuestas a `object-fit: cover`. La capa de encima se recorta con
  `clip-path: inset(0 <100−pos>% 0 0)` — ocupa el **lado izquierdo**; la base queda a la derecha.
- Divisor: línea de 1 px `rgba(255,255,255,0.92)` en `left: <pos>%`. Manija circular centrada de
  40 px (48 en móvil), borde de 1 px del mismo blanco, fondo `rgba(31,31,31,0.16)`, con dos
  flechitas de 12 px.
- Etiquetas con el nombre del diseño abajo a cada lado: 0.6875rem, 500, `.14em`, mayúsculas,
  blanco 92 % con sombra suave.
- Arrastre: `pointerdown` captura el puntero, `pointermove` actualiza. Mientras se arrastra, **sin
  transición**; al soltar, 180 ms `cubic-bezier(.4,0,.2,1)`. `touch-action: none` **sólo en el
  comparador**.
- Accesibilidad: `role="slider"`, `aria-valuemin/max/now`, `tabIndex 0`. Teclado: ←/→ 2 %, con
  Shift 10 %, Home 0, End 100.
- **Estado degradado**: si una capa falla al cargar, se oculta esa imagen, desaparecen divisor,
  manija y etiquetas, `role` pasa a `img`, `tabIndex` a −1, se suelta `touch-action`, la posición se
  fuerza al lado sano y el pie de figura pasa a describir la foto que quedó. **Es por instancia**:
  si cae una fila, la otra sigue viva.
- Pie de figura: "Arrastra para comparar." Es la única pista para teclado y lector de pantalla —
  no quitarla.

**Los pares** (fotos del cliente, mismo encuadre; specs verbatim del catálogo):
- Fila 1 — **Ávila Gris** (60×60 · Mate) / **Ávila Geométrico** (60×60 · Mate).
- Fila 2 — **Macuto Boreal** (60×60 · Mate) / **Baruta Terra** (60×60 · Mate).

**Las macros.** Dos por fila, en columna en desktop (`flex: 1 1 0`) y en dos columnas en móvil
(`aspect-ratio 4/3`). Enlazan al catálogo. Sobre cada una, al pie, degradado
`rgba(31,31,31,0.62)→0` con nombre del diseño (0.875rem, 500, blanco) y specs (0.75rem, blanco
78 %). Llevan reveal + máscara + cascada.

## Banda obra (a sangre, entre Compara e Historia)

Su trabajo es **puntuar**: cerrar Compara y abrir Historia. El aire va desbalanceado a propósito —
`margin-top: clamp(72px,8vw,120px)` arriba, y el `padding-top` de Historia baja a
`clamp(40px,4.5vw,64px)`.

- Alto `clamp(300px,32vh,360px)`, fondo `#2E2E2E`, `overflow: hidden`.
- **La macro se REPITE a lo ancho, no se estira**: `background-repeat: repeat-x`,
  `background-size: auto 100%`. La fuente es un cuadrado de 447 px; estirada a 1600 queda blanda.
  Repetida se mantiene nítida y aparecen las juntas. A 1504 px de ancho entran ~4,6 piezas.
- La capa sobresale 5 % arriba y abajo (`top: -5%; height: 110%`) para que el recorrido del
  parallax no descubra el borde.
- Rótulo abajo a la derecha sobre degradado: "Sanare Marrón · 60×60 · Satinado", 0.75rem.
- Lleva máscara de entrada + parallax. `role="img"` con `aria-label` descriptivo.

## 03 · Historia

**Encabezado.** Rótulo `03 · Historia` + `h2` "Setenta años en Valencia."

**Marco grande + texto.** Rejilla `minmax(0,1.9fr) minmax(0,1fr)` en desktop, una columna en móvil.
- Marco: `aspect-ratio 16/9`, fondo `#ECE9E4`, con las **cinco fotos superpuestas** como capas.
- Las capas van por `background-image`, no por `<img>`: el marcador de carga de imagen (que arranca
  las fotos en opacidad 0) pelearía con la opacidad del fundido.
- Cambio de hito con **fundido apilado**: la saliente queda `z-index 1`, opacidad 1 y **sin
  transición**; la entrante `z-index 2` con `opacity 0→1` en 1200 ms `cubic-bezier(.37,0,.63,1)`.
- A la derecha, alineado al fondo: año en 300, `clamp(2.5rem, 1.9rem + 2.4vw, 4rem)`, burdeos,
  `tabular-nums`; `h3` con el título; párrafo de 38ch máx.

**El riel.** Cinco miniaturas en `repeat(5,minmax(0,1fr))` (tres columnas en móvil), gap 12 px,
`aspect-ratio 3/2`.
- **El hito cambia al pasar el cursor y al enfocar, sin necesidad de clic.** Clic y Enter/Espacio
  hacen lo mismo. **No hay auto-avance** (decisión del cliente).
- Estado activo, los tres a 180 ms `cubic-bezier(.4,0,.2,1)`: filete inferior de 2 px burdeos
  (transparente en las inactivas), velo `rgba(245,243,240,0.42)` sobre las inactivas (**velo, no
  opacidad del `<img>`**), y año en `#2E2E2E` activo / `#5C5A56` inactivo.
- El estado se expresa con `aria-current="true"`. Las miniaturas llevan reveal + cascada.

**Los cinco hitos** (dato existente, no inventar): 1956 · 1978 · 1996 · 2015 · Hoy.

## Estado y datos

Estado del tramo: `cmpPos[2]` · `cmpDragging` · `cmpRotoA[2]` / `cmpRotoB[2]` · `hito` + `hitoPrev`.

Datos: los pares del comparador y los hitos son constantes en el prototipo; **en producción vienen
del catálogo**. Las especificaciones (`60×60`, `Mate`, `Satinado`) se leen del dato, **no se
redactan**: si un producto no tiene un campo, esa fila desaparece.

## Medidas de referencia (1504×903, con fuentes cargadas)

Página 6948 px. Hero 903 · Ambientes 821 · Cita 216 · **Compara 1366** · **Banda obra 300** ·
**Historia 907** · Profesionales 640 · Encuéntranos 1182 · Pie 493. Sin desborde horizontal.
Cobertura de imagen 35,8 % del área de página (unión de rectángulos sobre malla de 8 px).

## Assets

En `assets/catalogo/` del proyecto de diseño: `macros/` (avila-gris-1, avila-geometrico-1,
macuto-boreal-1, baruta-terra-1, sanare-marron-1) y `ambientes/` (avila-gris-2,
avila-geometrico-cliente-espejo, macuto-boreal-2, baruta-terra-cliente) más las cinco fotos de
Historia. Son fotos del cliente y derivadas; **ninguna es de stock**.

> Nota de la importación: `avila-geometrico-cliente-espejo.jpg` pasa de 256 KiB y el MCP no la deja
> leer entera, así que **falta en `design/publicar/assets/catalogo/ambientes/`**. Hay que bajarla a
> mano del proyecto de diseño para poder comparar la fila 1 del comparador contra el prototipo.

## Abierto — necesita al cliente, no al desarrollo

1. **"Sanare Marrón" no coincide con su foto.** El nombre y la materia (mármol satinado) salen del
   PDF del cliente; las dos fotos muestran una superficie gris verdosa. La banda a sangre imprime
   ese nombre al lado de la superficie más grande de la página. **Confirmar el nombre antes de
   publicar**; si está mal en el catálogo, está mal en las cinco páginas. Alternativas neutras ya
   evaluadas: Cata Humo o Choroní.
2. **El home perdió su prueba de obra construida.** Al salir Proyectos no hay ficha de obra real;
   la banda es atmósfera con rótulo. Decisión declarada, no olvido — pendiente de material
   fotográfico de obra.
3. **Falta el pase a 390 px** (móvil real). Composición móvil escrita y verificada por código, no
   medida en viewport real.
4. **Historia dejó de moverse con el scroll.** La versión anterior ataba las fotos al dedo durante
   1620 px; la nueva sólo responde al cursor. Si el cliente echa de menos esa sensación, es el hilo
   del que hay que tirar.
5. **`Propuesta 1` arrastra dos fallos preexistentes** de entorno: su telón no se levanta y su
   parallax no tiene consumidor. No son regresiones de v2. *(En nuestro sitio el telón sí funciona;
   el parallax es la decisión D1 de `docs/pendientes.md`, que este paquete resuelve: la banda a
   sangre nueva es su consumidor.)*

## Cómo saber que está bien

- Las cinco secciones abren igual: rótulo numerado con el numeral en burdeos + titular grande.
- Las dos filas del comparador se arrastran **independientes**, y la segunda está espejada en desktop.
- El comparador responde a teclado (←/→, Shift, Home/End) y anuncia su posición.
- Si se rompe la carga de una capa, esa fila queda como foto legible y la otra sigue funcionando.
- La banda a sangre muestra **piezas repetidas con sus juntas**, no una superficie estirada.
- El hito de Historia cambia al pasar el cursor y al enfocar, sin clic, y las fotos se relevan sin
  punto medio gris.
- Con `prefers-reduced-motion` no queda nada en movimiento y nada invisible.
- Al bajar, las imágenes grandes del tramo se dibujan: las dos cajas del comparador, las cuatro
  macros, la banda y el marco de Historia.
