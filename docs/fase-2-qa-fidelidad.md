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
| 9 | Profesionales | Faltaban el **tile de video** (play de 72px + etiqueta "Video · 3:47") y el bloque **"Conecta con nuestras redes"**. No eran de maquetación: no había campo en el CMS. Resuelto agregando `home.profesionales.video`/`videoEtiqueta` y `ajustes.redes[]`. **Los datos siguen pendientes del cliente**, así que el bloque no se dibuja todavía (ver §Contenido pendiente). |
| 10 | Proyectos | Las obras tenían `producto` vacío: sus diseños (Carrara Brillante, Teca) son Serie Regular y la carga solo traía Serie Venezuela. La fila "Diseño" se ocultaba y la ficha quedaba 40px baja en móvil. Resuelto: los dos productos se importan y las obras los referencian; `formato` queda solo con la especificación, como en el prototipo. |
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

## Contenido pendiente del cliente (bloquea fidelidad, no código)

`design/NOTAS-SESION-DISENO.md:56` ya lo dejaba anotado: en el prototipo **los tres botones de
redes y el tile de video de Profesionales apuntan todos a `#contacto`** — son placeholders. El
handoff no trae ninguna URL real ni el archivo del video de instalación (el único `.mp4` del bundle
es el loop del hero). Los campos están creados y vacíos:

| Campo del CMS | Qué falta | Efecto mientras falte |
|---|---|---|
| `ajustes.redes[]` | URL de Instagram, YouTube y TikTok | El bloque "Conecta con nuestras redes" no se dibuja: la sección queda 150px más baja que el diseño a 390px |
| `home.profesionales.video` | El archivo del video de instalación | Sin play ni etiqueta: la mitad izquierda queda como foto fija, sin enlace |
| `home.profesionales.videoEtiqueta` | La duración real (el diseño dice "Video · 3:47") | — |

Verificado con una carga provisional (redes de ejemplo + el mp4 del hero, borrada después): con los
datos puestos, Profesionales cierra la caja a 390 (800×800, idéntica al prototipo) y baja de 1.19% a
**0.86%** a 1440. Es decir, **el marcado ya está bien; lo que falta es el dato.**

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
| Profesionales | 1,19% | falta el dato de redes y video |

### Interlineado: manda la página, no el token

Las páginas del diseño no declaran `line-height` en overlines, labels de navegación ni valores de
dato (queda `normal`), y los tokens sí (1.35 / 1.5). Esos ~2px por fila se acumulaban en cada ficha
y cabecera del sitio. `Tokens v0` §10 fija la regla: *"un token es verdad solo si alguna página lo
aplica; auditar por VALOR y no por nombre"*. Se corrigió redefiniendo `--text-overline`,
`--text-nav` y `--text-caption-lg` en `src/theme/base.css`, sin tocar `tokens.css`.
Efecto medido: el hero pasó de 0,88% a **0,00%** en móvil, y de 0,36% a 0,21% en escritorio.

### Divergencias decididas (no se cierran a cero, a propósito)

En móvil el prototipo contradice a su propia `Responsividad v0` en tres puntos. Gana la spec:

1. **Historia**: el prototipo mantiene el pin conducido por scroll; la spec dice que ningún efecto
   conducido por scroll sobrevive en móvil. Nuestra versión es imagen + lista cronológica.
2. **Ambientes**: el prototipo envuelve las pestañas en dos líneas; la spec pide pestañas
   deslizables horizontalmente.
3. **Hero**: el prototipo corre a 78dvh por un ajuste de su entorno; la tabla de grilla pide
   100dvh en escritorio.

## Contenido pendiente del cliente (bloquea cerrar la fidelidad)

1. **URL de Instagram, YouTube y TikTok** → `ajustes.redes[]`. En el prototipo los tres botones
   apuntan a `#contacto`: no hay dato real. Sin esto, Profesionales queda 150px más corta en móvil.
2. **El video de instalación** → `home.profesionales.video`, y su duración real para la etiqueta
   (el diseño dice "Video · 3:47", que es inventado).
