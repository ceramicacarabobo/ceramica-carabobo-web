# Pendientes — estado al 2026-09-04

Punto de entrada para retomar. Lo que está hecho vive en `plan-proyecto.md` §10-§19;
acá solo lo que falta, ordenado por prioridad.

## Decisiones pendientes — no son trabajo, son un sí o un no tuyo

| # | Decisión | Estado |
|---|---|---|
| D1 | Parallax del home | ~~Pendiente~~ **RESUELTA por el tramo v2**: el mecanismo no tenía consumidor porque la banda a sangre a la que servía había desaparecido en una recomposición. La banda de obra nueva lo revive. Implementado. |
| D2 | **Borrar Proyectos del CMS** | Esperando que confirmes la versión definitiva del home. Hoy el contenido se conserva y la sección no se muestra. |

## Para avisarle al lado de diseño

El **estado degradado del comparador entra en bucle infinito** en un navegador real y tumba la
página entera (React, "Maximum update depth exceeded"): el `onError` vuelve a marcar la fila en cada
render y el ref se recrea con él. Se disparó solo mientras faltaba una foto. Detalle en
`plan-proyecto.md` §19. **No afecta a nuestra implementación**, que marca el fallo una sola vez.

## Prioridad 1 — movimiento del home (auditoría del agente de diseño, 2026-09-04)

**Cerrada el 2026-09-04, los seis puntos.** Detalle y verificación en `plan-proyecto.md` §17 y §18;
el parallax, en §19.

1. ~~Marcador de carga de imagen~~ — **hecho** (§17).
2. ~~Alcance de los reveals~~ — **hecho**: se funden solo los cinco encabezados de apertura; los
   cuatro bloques repetidos entran ya visibles y conservan máscara y filete.
3. ~~Carrusel del hero apilado~~ — **hecho**: la saliente se queda opaca debajo, la entrante sube en
   1200ms con la curva editorial. De paso salieron dos defectos propios: el recorrido automático
   pasaba por un estado inexistente (el hero se quedaba gris nueve segundos) y el clic sobre el
   indicador ya elegido cortaba el fundido a la mitad.
4. ~~Máscara y filete~~ — **hecho**: primitivas globales `data-mascara` y `data-filete` en
   `theme/base.css`, abiertas por el observador de `Reveal.astro`. El filete reemplaza al
   `border-top` de las filas de Proyectos, que además ocupaba 1px de caja: la sección ahora mide
   exactamente lo mismo que el prototipo.
6. ~~Reduced-motion global~~ — **ya estaba**: la regla a 1ms vive en `theme/tokens.css` desde el
   principio. El auditor no la vio.

### 5. Parallax — HECHO el 2026-09-04

Resuelto por el tramo v2: la banda de obra a sangre es el consumidor que le faltaba. ±4,5% del alto,
transform puro con `requestAnimationFrame`, apagado en móvil y con movimiento reducido.

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
