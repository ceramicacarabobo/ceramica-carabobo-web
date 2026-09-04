# Pendientes — estado al 2026-09-04

Punto de entrada para retomar. Lo que está hecho vive en `plan-proyecto.md` §10-§20;
acá solo lo que falta, ordenado por prioridad.

## Decisiones pendientes — no son trabajo, son un sí o un no tuyo

| # | Decisión | Estado |
|---|---|---|
| D1 | Parallax del home | ~~Pendiente~~ **RESUELTA por el tramo v2**: el mecanismo no tenía consumidor porque la banda a sangre a la que servía había desaparecido en una recomposición. La banda de obra nueva lo revive. Implementado. |
| D2 | **Borrar Proyectos del CMS** | Esperando que confirmes la versión definitiva del home. Hoy el contenido se conserva y la sección no se muestra. |

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

- ~~**Sitemap**~~ **HECHO el 2026-09-04**: `src/pages/sitemap.xml.ts`, 130 direcciones (todas
  verificadas contra el build; `/admin` queda fuera a propósito). Sin `lastmod`, `changefreq` ni
  `priority` — los dos últimos los ignora Google y el primero sería falso, porque el sitio se
  construye entero de una vez. `robots.txt` ya lo apuntaba.
- ~~**Datos estructurados**~~ **HECHOS los que el dato permite**, el 2026-09-04
  (`src/lib/estructurados.ts`): la empresa en el inicio (`Organization`) y cada diseño en su página
  (`Product`, con la ficha técnica entera como `additionalProperty`). Los distribuidores ya los
  tenían desde la Fase 5.
- Correcto ya: título único, descripción de 118-174 caracteres, un solo `h1`, canonical, 5 etiquetas
  Open Graph, textos alternativos y los 575 redirects 301.

### Datos estructurados — verificar antes de producción

Cosas que se dejaron FUERA a propósito, porque publicar un dato estructurado equivocado es peor que
no publicarlo: el buscador lo toma por bueno y lo muestra.

1. **Coordenadas de las plantas** (`geo`). El handoff las marca como APROXIMADAS y están pendientes
   del cliente. Por eso la empresa se declara `Organization` y no `LocalBusiness`: `LocalBusiness`
   espera coordenadas y horario en formato cerrado, y no tenemos ni lo uno ni lo otro. Cuando
   lleguen: agregar `geo` y evaluar el cambio de tipo.
2. **Horario de atención.** En el CMS es texto libre; `openingHours` exige un formato cerrado.
   Mismo criterio: o se estructura el campo, o no se publica.
3. **La dirección de la empresa es UN campo de texto libre.** `estructurados.ts` la parte a mano
   (salto de línea → calle; coma → ciudad / estado) y hoy sale bien, pero si el editor cambia el
   formato el dato se desarma en silencio. **Lo correcto es separar ciudad y estado en el schema
   del CMS.**
4. **Sin `offers` en producto**, y es decisión: Cerámica Carabobo no vende en línea, así que no hay
   precio ni disponibilidad. Consecuencia a tener presente: **Google normalmente NO muestra la ficha
   enriquecida de producto sin precio**, así que el beneficio de este bloque es que entienda el
   catálogo, no que salgan estrellas ni precios.
5. **Logo.** No se emite `logo`: los dos que tenemos son SVG y Google pide un raster para ese campo.
   Hace falta un PNG de 112px o más.
6. **Correo.** `ajustes.correo` dice `ventas@ceramicacarabobo.com` y el singleton de contacto usa
   `lapieldetuhogar@ceramica-carabobo.com` (ojo: distinto dominio). El dato estructurado publica el
   primero. **Confirmar cuál es el bueno.**

## Prioridad 3 — seguridad

- ~~**Cabeceras sin riesgo**~~ **HECHAS el 2026-09-04** en `public/_headers`:
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y
  `Permissions-Policy` apagando cámara, micrófono, geolocalización, pago y USB — comprobado que el
  sitio no usa ninguna de esas API.
- **`Strict-Transport-Security` — por evaluar.** Obliga HTTPS y **no se puede revertir** hasta que
  expire en cada navegador que ya la recibió. Plan: `max-age` de un día primero, subirlo tras el
  lanzamiento, y **nunca `preload`**, que es prácticamente irreversible.
- **`Content-Security-Policy` — por evaluar.** Es la única que puede romper cosas, y falla en
  silencio: el navegador bloquea y no se ve nada raro. Encaja muy bien con la regla de
  autosuficiencia (ningún CDN externo), pero hay tres puntos que resolver antes:
  1. **Dos scripts en línea** — la bandera de movimiento (`layouts/Base.astro`) y el telón
     (`shell/Telon.astro`). Necesitan su hash, y hay que automatizarlo o se rompe cada vez que se
     los toque.
  2. **El iframe de YouTube**, que solo aparece al pulsar play: `frame-src youtube-nocookie.com`.
  3. **El `/admin`**: el Studio de Sanity se sirve del mismo dominio, habla con la API de Sanity y
     usa código dinámico. Una política pensada para el sitio público muy probablemente lo rompa —
     necesita la suya, por ruta.
  Plan: montarla en `Report-Only`, pasarle el arnés por las cinco páginas y por el admin, y activarla
  después.
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
