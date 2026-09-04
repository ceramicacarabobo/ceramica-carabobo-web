# Pendientes — estado al 2026-09-04

Punto de entrada para retomar. Lo que está hecho vive en `plan-proyecto.md` §10-§16;
acá solo lo que falta, ordenado por prioridad.

## Prioridad 1 — movimiento del home (auditoría del agente de diseño, 2026-09-04)

El build corresponde a la combinación calibrada del diseño (`base.css` documenta que se midió
con `data-mov="editorial"` y `data-heroms="700"`), y **los valores base son exactos**: 660ms,
`cubic-bezier(.37,0,.63,1)`, 10px, cascada 60+i×70ms, umbral −14%, una sola vez.

Lo que falta NO es calibración sino **implementación incompleta**: se construyó una sola capa de
movimiento y el diseño pedía cuatro. Ninguna limitación técnica lo impide.

1. **Marcador de carga de imagen — el más urgente.** `base/Imagen.astro` solo pone
   `loading="lazy"|"eager"`. El diseño pide: opacidad 0 → 1 en 320ms al disparar `load`; si viene
   de caché y el evento no llega, marcarla cargada comprobando `complete && naturalWidth`; si falla,
   ocultarla y dejar la superficie neutra del marco. Marco y foto son DOS animaciones separadas.
   Sin esto el marco entra visible mientras la foto todavía descarga y se ve materializándose
   dentro de una caja opaca — es el defecto que motivó la auditoría. Con `lazy` el navegador decide
   cuándo bajar, así que el marcador no es opcional: sin él el orden queda al azar.
   En Proyectos son 2 imágenes; ninguna lleva `fetchpriority` (solo el hero).

2. **Alcance de los reveals.** `revealsAlcance: intermedio` pide fundir SOLO los cinco encabezados
   de apertura; el contenido repetido entra ya visible, conservando únicamente máscara y filete.
   Hoy `Reveal.astro` funde todo lo que envuelve — 9 usos en el home, y varios envuelven listas.

3. **Carrusel del hero.** Debe ser APILADO: la capa saliente se queda opaca debajo y sin
   transición, y solo la entrante sube 0→1 en 1200ms con la curva editorial. Hoy
   `Hero.astro` hace `transition: opacity 900ms ease` en ambas capas: crossfade, y el punto medio
   pasa por gris.

4. **Máscara y filete — no existen.** Máscara: `clip-path: inset(0 0 14% 0)` → `inset(0)`, 660ms,
   curva editorial. Filete: `background-size: 0 1px` → `100% 1px`, 660ms, misma curva, retardo
   120ms. Son otra clase de movimiento, con sus propios valores.

5. **Parallax ±4.5%** en banda a sangre, transform puro, apagado en móvil y con reduced-motion.
   No se encontró en el código.

6. **Reduced-motion global.** Hoy está en `Reveal` y 7 componentes, no como regla global a 1ms.

Lo que SÍ está correcto y no hay que tocar: valores del fundido, cascada, umbral, entrada del hero
(700ms), Historia atada al scroll (100vh + 5×40vh) y micro-estados (180ms con curva de interfaz,
token propio que no comparte con el fundido).

## Prioridad 2 — SEO

- **No hay sitemap.** `/sitemap.xml` da 404 con 132 páginas, 126 de ellas fichas de producto.
  Es lo más rentable del lote.
- **No hay datos estructurados** (`ld+json`): producto y negocio local.
- Correcto ya: título único, descripción de 118-174 caracteres, un solo `h1`, canonical, 5 etiquetas
  Open Graph, textos alternativos y los 575 redirects 301.

## Prioridad 3 — seguridad

- **Ninguna cabecera de seguridad.** Faltan `Content-Security-Policy`,
  `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
  Se declaran en `_headers`, que ya existe. La CSP encaja con la regla de autosuficiencia.
- Verificado que está bien: cero secretos en el bundle público, cero peticiones a `cdn.sanity.io`,
  sitio estático sin servidor ni base de datos, y el admin tras el inicio de sesión de Sanity.

## Prioridad 4 — Fase 6, lo que queda

- Documento **"en WordPress lo hacía así → ahora así"**.
- Capacitación.

## El día del lanzamiento (Fase 7) — no olvidar

- `SITE_URL` apunta al QA: los `canonical` y `og:url` dirían la dirección equivocada.
- `PUBLIC_ENTORNO` bloquea la indexación (`robots.txt` con `Disallow: /` y `noindex`). Quitarlo.
- Las tres cuentas a nombre del cliente. Sin eso no arranca la fase.

## Bloqueado por el cliente

El reporte con las listas (37 sin foto, 24 sin macro, 21 con foto peor que el PDF, 3 sin
identificar, resolución, hero en alta, material histórico, foto de sala de exhibición, video de
archivo, WhatsApp central, coordenadas de planta, obras reales) está preparado en la conversación
del 2026-09-04. **Cada respuesta suya destraba una pieza distinta: es lo que más rinde por
esfuerzo.**
