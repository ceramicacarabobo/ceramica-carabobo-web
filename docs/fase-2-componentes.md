# Fase 2 — Diseño a componentes (bitácora de ejecución)

*Inicio: 2026-08-25 · Entregable (plan maestro §6): cada sección del handoff convertida en bloque
Astro conectado a su schema, sin nada de marca hardcodeado, con fidelidad visual exacta.*

## Alcance

Esta fase construye **la cáscara completa y la home**. El catálogo es Fase 3; contacto y dónde
comprar, Fase 5. Lo que se construya acá es la base que esas fases reutilizan.

Fuentes de verdad, en orden de autoridad ante una duda visual:
1. El prototipo servido (`design/publicar/`) — la referencia.
2. `design/Tokens v0` §09 — árbitro de valores.
3. `design/Responsividad v0` §03 — árbitro de reflow (qué hace cada patrón al angostarse).
4. `design/Primitivas v1` — anatomía de los componentes base.

## Orden de trabajo

| # | Bloque | Estado |
|---|---|---|
| 2.1 | Fundaciones: `<Imagen>` (Sanity → assets en build), `<Seccion>`, `<Reveal>`, `<Boton>` | ✅ |
| 2.2 | Cáscara: telón de entrada, header (transparente sobre hero → sólido), megamenú, menú móvil anclado al pie, footer de 3 columnas | ✅ |
| 2.3 | Contenido de referencia: `scripts/importar-contenido.mjs` (idempotente) — 69 assets, 6 materias, 29 productos de Serie Venezuela, home y ajustes | ✅ |
| 2.4 | Secciones de la home: hero, ambientes, cita, proyectos, historia, profesionales, encuéntranos | ✅ |
| 2.5 | QA de la fase: comparación lado a lado por rango + reglas duras de `Responsividad v0` §04 | pendiente |

## Reglas que gobiernan esta fase

- **Mobile-first con media queries CSS**, breakpoints 760 y 1024. Nunca un breakpoint en JS
  (el prototipo lo hace por limitación de su entorno, no por diseño).
- **Nada de marca en el código**: si un texto o una imagen no está en el CMS, la sección no lo
  muestra. Sección bajo su mínimo se oculta entera; fila sin dato desaparece.
- **Solo se anima opacity y transform.** `reduced-motion` colapsa todo a 1ms. Ningún efecto
  conducido por scroll sobrevive en móvil.
- **44px de área tocable** en todo lo que se toca; safe areas en cualquier barra fija.
- **Sin scroll horizontal del documento**; los únicos desbordes permitidos son los tracks
  declarados con scroll-snap.
- **Imágenes procesadas en build**: `cdn.sanity.io` nunca aparece en el HTML de producción.

## Decisiones de esta fase

1. **Ritmo vertical por token, no por tabla.** `Responsividad v0` §02 pide 64px de ritmo en móvil;
   el token `--space-section` es `clamp(72px, 8vw, 120px)`, que da 72px en móvil. Manda el token:
   es el contrato de implementación de `Tokens v0` §09 y la diferencia es de 8px en un solo rango.
2. **El pie necesitó dos campos nuevos en `ajustes`**: `textoPie` (el párrafo de marca) y
   `direccion`. Sin ellos, esos textos quedaban hardcodeados, que es justo lo que la fase prohíbe.
3. **El megamenú deriva su conteo del catálogo** (productos por materia) y se oculta entero si hay
   menos de 4 materias con foto: contenido defensivo, igual que las secciones del home.
4. **Las fichas de Ambientes y las obras de Proyectos ya traen el slug del producto**, pero todavía
   no enlazan: las rutas por producto nacen en la Fase 3. Conectar el enlace será una línea.
5. **La navegación usa Work Sans 400**, no el 500 que declara `--text-nav`. Las cuatro páginas del
   diseño escriben 400 y el propio documento de tokens (§10) manda auditar por valor, no por nombre.
6. **Los archivos de Sanity (el video del hero) se descargan en el build** a `public/medios/` y se
   sirven desde el propio sitio: `scripts/descargar-medios.mjs`, enganchado como `prebuild`. Sin
   esto el HTML quedaba con una URL de `cdn.sanity.io`, que la condición de autosuficiencia prohíbe.
   Las imágenes ya las resolvía astro:assets; los archivos no pasan por ahí.
7. **Historia sin pin en móvil**: el prototipo lo mantiene, `Responsividad v0` §03 y §04 lo prohíben.
   Manda la spec. La guardia de alto (&lt;640px sin pin) se aplica también en desktop.
8. **Faltan marcas de "ejemplo" fuera de producto**: las fotos de obras, hitos y profesionales son
   de referencia y el schema no tiene dónde declararlo (solo `fotoProducto` tiene `esEjemplo`).
   Anotado para la Fase 6, que es la que controla el reemplazo de placeholders antes de publicar.
9. **Estado de la cabecera por atributos en el DOM**, no por breakpoints en JS: `data-sobre-hero`,
   `data-scrolled` y `data-panel-abierto` combinados con media queries CSS.
