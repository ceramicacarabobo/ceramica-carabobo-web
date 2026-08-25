# Fase 2 — QA de fidelidad (parte de defectos)

*Abierto: 2026-08-25, tras la revisión manual del usuario.*

## Herramientas

**El prototipo ya se ejecuta.** Al bundle le faltaba `support.js` —su runtime—, que sí estaba en
el proyecto de Claude Design y se recuperó por el MCP el 2026-08-25. Sin él las páginas quedaban
como plantillas crudas con los `{{ }}` sin resolver. Ahora la referencia es el prototipo corriendo,
como manda el contrato de fidelidad.

```bash
# Servir las dos puntas
(cd design/publicar && python3 -m http.server 4500 &)     # prototipo  → :4500
npm run build && (cd dist/client && python3 -m http.server 4600 &)   # nuestro sitio → :4600

# Comparar píxel a píxel una sección (deja proto/nuestro/diff en DESTINO)
DESTINO=/ruta node scripts/qa/diff.mjs '[data-screen-label="Hero"]' '.hero' hero 1440 900
PLANO=1 DESTINO=/ruta node scripts/qa/diff.mjs '[data-screen-label="Hero"]' '.hero' hero 1440 900

# Medir caja y estilos calculados de un elemento en ambas puntas
node scripts/qa/medir.mjs '[data-screen-label="Hero"] h1' '.hero__titular' 1440 900

# Mirar solo nuestras secciones (sin comparar)
DESTINO=/ruta node scripts/qa/mirar.mjs

# Autosuficiencia: registrar TODO el tráfico al cargar la home y confirmar que
# no sale ni una petición fuera de nuestro origen (después pulsa la fachada de
# video para comprobar que ahí sí carga YouTube). Sale con código 1 si falla.
node scripts/qa/red.mjs
```

`PLANO=1` apaga las imágenes: mide **solo composición y tipografía**. Sin eso, una foto distinta o
un carrusel en otro estado ensucian el número y esconden los desajustes de maquetación.

El build local necesita `.env` con el `PUBLIC_SANITY_PROJECT_ID` real; con `placeholder` la home
sale vacía y no hay nada que comparar.

## Defectos abiertos (revisión del 2026-08-25)

| # | Dónde | Defecto |
|---|---|---|
| 1 | Hero | Alto: el prototipo usa 78dvh en desktop; `Responsividad v0` §02 pide **100dvh (mín. 560)**. Corregido a 78/88/100 por rango. |
| 2 | Cabecera | "Dónde comprar" aparece **dos veces**: como enlace de nav y como CTA. En el prototipo la nav es Catálogo + Contacto y el CTA es Dónde comprar. |
| 3 | Cabecera | Alto sobre el hero: el prototipo usa **84px**; la banda compacta al scrollear, 63px. |
| 4 | Ambientes | El bloque de intro (eyebrow, título, pestañas, flechas) queda **pegado al borde izquierdo**, sin el gutter de página. El "01" se corta. |
| 5 | Proyectos | La cabecera debe ser de **dos columnas** (título · bajada de 44ch), no apilada a la izquierda. |
| 6 | Proyectos | Las obras se apilan a ancho completo; el prototipo usa grilla (`proyGridCols` / `proSplitCols`). |
| 7 | Global | Movimiento: duración y curva no coincidían. El valor real del prototipo para apariciones es **480ms con `cubic-bezier(0.2,0,0,1)`**, umbral cuando el elemento entró (top < 86% del alto de ventana) y cascada **60 + i×70ms**. Corregido en `Reveal.astro`. |
| 8 | Global | Faltan dos efectos del prototipo: la **máscara de imagen** (`clip-path: inset(0 0 14% 0)` → `inset(0)`, 480ms ease-out) y el **filete que se dibuja** (`background-size: 0 1px` → `100% 1px`, 480ms ease-out con 120ms de retraso). |
| 9 | Profesionales | Faltaban el **tile de video** (play de 72px + etiqueta "Video · 3:47") y el bloque **"Conecta con nuestras redes"**. No eran de maquetación: no había campo en el CMS. Resuelto agregando `home.profesionales.video`/`videoEtiqueta` y `ajustes.redes[]`. **Cerrado el 2026-08-25**: el cliente entregó las tres redes y el video, ya cargados (ver §Video de instalación). |
| 10 | Proyectos | Las obras tenían `producto` vacío: sus diseños (Carrara Brillante, Teca) son Serie Regular y la carga solo traía Serie Venezuela. La fila "Diseño" se ocultaba y la ficha quedaba 40px baja en móvil. Resuelto: los dos productos se importan y las obras los referencian; `formato` queda solo con la especificación, como en el prototipo. |
| 12 | Encuéntranos | La sección salía **sin foto de panel y sin distribuidores**: el modelo no tenía campo de imagen ahí y la colección estaba vacía. Resuelto agregando `home.encuentranos.foto` y `home.encuentranos.estadosDestacados`, y cargando los 24 distribuidores del prototipo. **Cerrado el 2026-08-25** — ver §Encuéntranos. |
| 13 | Encuéntranos | El CTA del panel se estiraba a lo ancho: `.panel__cta { align-self }` apuntaba al `<a>` que dibuja `Boton`, que no lleva el scope de la sección (misma falla que el hallazgo 2). Resuelto con `:global()`. |
| 11 | Global | **`line-height` de los tokens vs. el prototipo.** El prototipo no declara `line-height` en overlines ni en valores de ficha (queda `normal`); los tokens sí: `--text-overline` 1.35 (16.2px vs 14px reales) y `--text-caption-lg` 1.5 (19.5px vs 18px). Es la causa de todo el residuo que queda: +13px en Proyectos a 390 (1.2%) y +4px a 1440, y el corrimiento de 2px del bloque editorial de Profesionales. Afecta a todo el sitio, así que **es decisión de tokens, no de una sección**: o el prototipo se aparta de `Tokens v0` §09 y manda el token, o manda el prototipo y hay que anotar la desviación. Sin resolver esto no se baja del 1% en móvil. |

## Hallazgos de fondo (2026-08-25)

1. **La tipografía no era la del diseño.** `@fontsource-variable/*` declara las familias como
   "Work Sans Variable" y "Open Sans Variable", pero los tokens piden "Work Sans" y "Open Sans":
   el navegador caía a Arial en TODO el sitio. Se cambió a `@fontsource/work-sans` 300/500/600 y
   `@fontsource/open-sans` 400 — exactamente los pesos que carga el prototipo. Tras el cambio, el
   titular del hero mide idéntico al diseño (misma caja, 27 propiedades calculadas iguales).
2. **`Reveal` no reenviaba el scope de estilos del padre.** Cualquier regla CSS escrita en una
   sección que apuntara a un elemento envuelto en `<Reveal>` no hacía match y moría en silencio:
   por eso Proyectos se apilaba pese a tener las reglas correctas. Corregido: `Reveal` ahora
   reenvía todos los atributos, como ya hacía `Seccion`.
3. **El hero del prototipo mide 100dvh en desktop**, confirmado con el prototipo en marcha. La
   tabla de `Responsividad v0` §02 tenía razón y el valor por defecto del prototipo (78dvh) era
   un tweak de su entorno.

## Movimiento: los valores reales del diseño (medidos 2026-08-25)

El prototipo servido corre con **`data-mov="editorial"` y `data-heroms="700"` activados**. Esa
calibración —que el propio documento describe como "reversible"— es la que está puesta en el
diseño entregado, así que es la que manda. Es más lenta y con otra curva que la del bloque de
tokens, y explica la sensación de "movimiento demasiado rápido".

| Qué | Valor medido en el prototipo |
|---|---|
| Entrada del hero | **700ms**, `cubic-bezier(0.37, 0, 0.63, 1)`, translateY **10px**, escalonado 0 / 90 / 180ms |
| Aparición al entrar en pantalla | **660ms**, misma curva, translateY 10px, cascada 60 + i×70ms |
| Máscara de imagen | 660ms, misma curva, `clip-path: inset(0 0 14%)` → `inset(0)` |
| Respuesta a una acción (pestañas, tiles) | **180ms**, `cubic-bezier(0.4, 0, 0.2, 1)` |
| Enlaces de nav | 240ms, `cubic-bezier(0.2, 0, 0, 1)` |

La curva simétrica en las entradas es deliberada: el ease-out fuerte queda para lo que responde a
una acción del usuario, donde arrancar inmediato es lo correcto. Estos valores viven en
`src/theme/base.css` como `--ease-editorial`, `--dur-entrada`, `--dur-aparicion`,
`--desplazamiento-entrada`, `--dur-respuesta` y `--ease-respuesta` — no en `tokens.css`, que es
copia literal del documento de diseño.

## Video de instalación y redes — cargados el 2026-08-25

`design/NOTAS-SESION-DISENO.md:56` lo dejaba anotado: en el prototipo los tres botones de redes y el
tile de video de Profesionales apuntan todos a `#contacto` — eran placeholders, y el handoff no traía
ninguna URL real ni el archivo del video. El cliente entregó los datos y ya están en el CMS.

| Campo del CMS | Dato cargado |
|---|---|
| `ajustes.redes[]` | Instagram, YouTube y TikTok del cliente (orden del diseño) |
| `home.profesionales.videoYoutube` | `https://www.youtube.com/watch?v=MkAEfk4V65w` |
| `home.profesionales.videoPortada` | `maxresdefault` del video, descargada una vez y subida a Sanity |
| `home.profesionales.videoTitulo` | "Cómo instalar revestimiento 60x120 \| Cerámica de gran formato" |
| `home.profesionales.videoEtiqueta` | "Video · 1:36" — la duración real; el "3:47" del diseño era relleno |

**El video vive en YouTube, así que el tile es una fachada** (decisión registrada en
`plan-proyecto.md` §11): portada nuestra + botón de play del diseño, y el `<iframe>` de
`youtube-nocookie.com` se crea solo al pulsar. Medido con `scripts/qa/red.mjs`: **0 peticiones fuera
de nuestro origen** al cargar la home; tras el clic aparecen las de `youtube-nocookie.com` y
compañía, que es lo esperado. La fachada es un `<button>` real, con `aria-label` que nombra el video
por su título y anillo de foco on-dark (brand-300, 2px, hacia adentro porque el marco recorta).

**Los textos de la sección cambiaron con el dato.** El prototipo decía "Aprende a instalar los
formatos grandes." y un texto genérico sobre guías, fichas y muestras; ahora la sección muestra un
video concreto sobre revestimiento de 60×120, así que el título y la bajada hablan de eso. El largo
está calibrado contra el prototipo: título de 3 líneas a 390 y 2 a 1440, bajada de 3 y 2 — las
mismas que el diseño, para que el cambio de copy no mueva la caja.

### Los 3–4px que quedan a 390 son del prototipo, no nuestros

Con los datos puestos, la sección pasó de 151px de diferencia a **3px** (796 contra 800) a 390 y de 1,19% a **1,11%**
a 1440. El residuo de alto está localizado: los botones de red del prototipo miden **46px** y los
nuestros **44px**. El prototipo los declara con `min-height:44px` y borde de 1px, pero esos anchors
con estilo en línea renderizan en `content-box` (no hay reset de `box-sizing` que los alcance), así
que suman los dos bordes. `Tokens v0` fija la altura de control en 44 y nosotros usamos
`--control-height-md`: manda el token. A 390 los botones envuelven en dos filas → 4px, que es
prácticamente todo lo que separa las dos cajas. Es un **artefacto de herramienta**, del mismo tipo
que los breakpoints en JS: no se replica.

## Reglas del arreglo

- El árbitro de valores es el marcado del prototipo; ante ambigüedad, `Tokens v0` y `Responsividad v0`.
- Mobile-first, media queries CSS, nunca breakpoints en JS.
- Solo opacity y transform (la máscara de imagen usa clip-path, que el propio prototipo declara).
- Verificar con capturas antes de dar por cerrado un arreglo.


## Estado de fidelidad (medido 2026-08-25, modo PLANO)

| Sección | 1440 | 390 |
|---|---|---|
| Hero | 0,21% | **0,00%** |
| Cita | **0,00%** | **0,00%** |
| Historia | 0,13% | sin pin en móvil — divergencia decidida |
| Ambientes | 0,70% | pestañas deslizables en vez de dos líneas — divergencia decidida |
| Proyectos | 2px de alto | 2px de alto |
| Profesionales | **1,11%** | **3px de alto** (antes: 1,19% y 151px) |
| Encuéntranos | **32px de alto** (antes: 680px / 58,0%) | **21px de alto** (antes: 1016px / 77,4%) |

### Interlineado: manda la página, no el token

Las páginas del diseño no declaran `line-height` en overlines, labels de navegación ni valores de
dato (queda `normal`), y los tokens sí (1.35 / 1.5). Esos ~2px por fila se acumulaban en cada ficha
y cabecera del sitio. `Tokens v0` §10 fija la regla: *"un token es verdad solo si alguna página lo
aplica; auditar por VALOR y no por nombre"*. Se corrigió redefiniendo `--text-overline`,
`--text-nav` y `--text-caption-lg` en `src/theme/base.css`, sin tocar `tokens.css`.
Efecto medido: el hero pasó de 0,88% a **0,00%** en móvil, y de 0,36% a 0,21% en escritorio.

### Encuéntranos: la sección estaba vacía, no mal maquetada (2026-08-25)

El 58% de diferencia a 1440 y el 77% a 390 eran **falta de contenido**, no de maquetación: sin
distribuidores no se dibujaba ni el índice ni el panel, y la foto del panel no existía en el modelo.
Se cargaron los 24 puntos de la red del prototipo (`design/publicar/donde-comprar.html`, constante
`DIST`) y se agregaron dos campos a `home.encuentranos`: `foto` y `estadosDestacados`.

**Por qué `estadosDestacados`.** El home del prototipo NO lista la red entera: lista **seis** estados
(constante `REGIONES`) y remata con el CTA a Dónde comprar, que sí los trae los veinte. Cuáles son
esos seis no se deriva de los conteos —el prototipo deja fuera a Miranda, que empata en puntos con
los tres primeros—, así que es decisión editorial y vive en el CMS. Los **números** siguen
derivándose de los distribuidores (`contarPorEstado`), como manda la regla: el panel resume la red
completa (24 · 20 estados · 23 ciudades) aunque el índice muestre seis.

Con eso, el contenido queda a **4px a 1440 y 3px a 390** (medido sobre `.encuentranos__grid` contra
la grilla del prototipo). Ese residuo es el CTA del panel: el prototipo lo declara de 48px y nuestro
`Boton` usa `--control-height-md` (44px), el valor que fija `Primitivas v1` para el botón
(*"Work Sans 600 · 15px · min-height 44px"*). El mismo botón también difiere en tipografía —el
prototipo lo escribe en versalitas de 13px/500, la primitiva en 15px/600 sin versalitas—: manda la
primitiva, como en Profesionales.

**El resto de la diferencia (32px a 1440, 21px a 390) es el ritmo de sección, no la sección.** El
prototipo le da a Encuéntranos un padding propio (`clamp(40px,4.5vw,72px)` arriba y
`clamp(80px,9vw,140px)` abajo → 64,8 + 129,6 a 1440) en vez del que usan Proyectos y Profesionales
(8vw). `Responsividad v0` §02 fija el ritmo entre secciones en **104 → 120px** en escritorio y 64px
en móvil, y nuestro `--space-section` (115,2px a 1440) cumple; los 64,8px del prototipo no. Como en
el alto del hero, **gana la spec**: no se replica.

### Divergencias decididas (no se cierran a cero, a propósito)

En móvil el prototipo contradice a su propia `Responsividad v0` en tres puntos. Gana la spec:

1. **Historia**: el prototipo mantiene el pin conducido por scroll; la spec dice que ningún efecto
   conducido por scroll sobrevive en móvil. Nuestra versión es imagen + lista cronológica.
2. **Ambientes**: el prototipo envuelve las pestañas en dos líneas; la spec pide pestañas
   deslizables horizontalmente.
3. **Hero**: el prototipo corre a 78dvh por un ajuste de su entorno; la tabla de grilla pide
   100dvh en escritorio.

## Checklist de aceptación — automatizado (2026-08-25)

`scripts/qa/aceptacion.mjs` corre con Playwright las **7 pruebas del checklist que no dependen
del catálogo ni del mapa**. Un solo comando, informe legible, código 1 si algo falla:

```bash
node scripts/qa/aceptacion.mjs                       # levanta dist/client con las reglas de Cloudflare
NUESTRO=https://…       node scripts/qa/aceptacion.mjs   # contra el desplegado
RAIZ_ESTATICA=/ruta     node scripts/qa/aceptacion.mjs   # contra una copia del build
SOLO=04,12              node scripts/qa/aceptacion.mjs   # solo esas pruebas
```

Sin `NUESTRO` levanta un servidor propio que replica el `wrangler.jsonc`
(`not_found_handling: "404-page"` y `html_handling: "drop-trailing-slash"`): con
`python3 -m http.server` la prueba 02 mediría el 404 de Python, que no es el que va a producción.

| # | Prueba | Resultado | Número medido |
|---|---|---|---|
| 02 | 404 del sitio, no del servidor | ✅ | HTTP 404 con encabezado, explicación y botón al catálogo |
| 03 | Primera pantalla del inicio | medida | 3G lenta: LCP 7,51 s · 237 KB hasta el LCP — sin frenos: LCP 0,32 s |
| 04 | Sin destello blanco ni remonte del encabezado | ✅ | mismo nodo de `<header>` · 15 fotogramas, blanco máx 0,4% |
| 08 | Las imágenes no hacen saltar el contenido | ✅ | CLS 0,0000 |
| 09 | Con movimiento reducido nada se anima | ✅ | 0 declaraciones > 1 ms · 0 animaciones vivas · sin telón |
| 11 | 44px de área tocable · barra del sistema | ✅ | 0 controles bajo 44px · 2 barras fijas, 0 sin safe-area |
| 12 | Recorrido con teclado y paneles | ✅ | 29 paradas, 0 sin foco visible · paneles abren y cierran |

Las pruebas **01, 05, 06, 07 y 10** quedan para las fases del catálogo y del mapa.

**La 03 se mide, no se juzga.** El enunciado ("menos de tres segundos en datos móviles") depende
de la red real del visitante y del CDN, no del build: dar un veredicto desde localhost sería
inventarlo. Lo que sí controlamos es el peso, y se reporta separado — **237 KB hasta el LCP** (la
primera pantalla de verdad) contra 1159 KB hasta el evento `load`, que incluye las imágenes
diferidas que Chrome adelanta por su cuenta cuando la red es lenta.

### Defectos que encontró, y cómo se arreglaron

| # | Dónde | Defecto | Arreglo |
|---|---|---|---|
| 12 | Cáscara | **`transition:persist` no hacía nada.** Puesto sobre `<Header/>` y `<Footer/>` en el layout, el compilador lo convierte en una *prop* del componente; si el componente no la reenvía a un elemento, se pierde en silencio. Medido: el `<header>` era un nodo NUEVO en cada navegación. | La directiva se declara en el elemento raíz de cada componente de la cáscara (`transition:persist="cabecera" / "menu-movil" / "pie"`). |
| 13 | Cabecera | Con la cabecera ya persistiendo, lo que depende de la página quedaba congelado: `data-sobre-hero` de la página anterior y `aria-current="page"` en el enlace equivocado. | `sincronizar()` en `astro:after-swap`: lee `#contenido[data-sobre-hero]` (el `<main>` sí se cambia) y recalcula `aria-current`. |
| 14 | Cabecera | El script se volvía a enganchar en cada `astro:page-load` sobre el MISMO nodo persistido: a partir de la segunda página cada clic disparaba el manejador dos veces y el megamenú abría y cerraba en el mismo gesto. | Guarda de idempotencia (`data-enganchada`); en las siguientes páginas solo se resincroniza. |
| 15 | Ambientes | El área tocable de las pestañas era de 24px en móvil. La zona ampliada existe (`.ambientes__tab::after`, 44px), pero `overflow-x: auto` obliga a `overflow-y: auto` y la **recortaba** — ya estaba corregido para ≥760px, no para móvil, que es donde importa. | `padding-block: 10px` en la tira con margen negativo que lo descuenta: 44px de banda tocable y ni un píxel de cambio en la maqueta. |
| 16 | Menú móvil | Hoja a pantalla completa sin trampa de foco: tabular llevaba el foco al contenido de atrás, que no se ve. | `role="dialog" aria-modal="true"` y ciclado del foco dentro de la hoja mientras está abierta. |

**Cómo se comprueba cada cosa, y por qué así** (está comentado en el script):

- **04** no se da por bueno mirando el marcado: se guarda la referencia al nodo `<header>` antes de
  navegar y se verifica que después es el **mismo objeto**; y la transición se graba con el
  screencast de CDP —fotogramas reales del compositor— buscando uno de ≥97% blanco puro. El fondo
  del sitio es `#F5F3F0`, así que nunca se confunde con la página.
- **11** no mide la caja del elemento sino **lo que recibe el dedo**: lanza puntos a ±21px del
  centro y pregunta al navegador qué elemento hay ahí. Así reconoce las áreas ampliadas con
  pseudoelemento (pestañas de Ambientes) y detecta cuando un `overflow` las recorta. La barra del
  sistema no se puede emular en Chrome de escritorio (`env()` resuelve a 0), así que se audita la
  fuente: se buscan las reglas que declaran `env(safe-area-inset-*)` y se comprueba que alcanzan a
  cada barra fija o pegajosa.
- **09** mira las duraciones calculadas de elementos **y pseudoelementos**, la lista real de
  `document.getAnimations()`, y que el telón no aparezca ni deje el contenido invisible.
