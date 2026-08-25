# Propuesta de arquitectura — Sitio Cerámica Carabobo

> ⚠️ **SUPERADO** — Esta propuesta (Payload self-hosted) fue descartada para este cliente al confirmarse que no tiene infraestructura ni TI. Ver decisión final en [plan-proyecto.md](./plan-proyecto.md). Se conserva como referencia para futuros clientes CON infraestructura propia.

*Fecha: 2026-08-22 · Estado: pendiente de aprobación*

## Resumen ejecutivo

**Recomendación: una sola aplicación Next.js con Payload CMS 3 embebido, self-hosted en la infraestructura del cliente.** Payload es MIT, gratis sin límites, corre dentro de Next.js (un solo deploy), tiene panel de administración con live preview, localización a nivel de campo, y guarda los datos en SQLite o Postgres — formatos abiertos. Es la única opción del ecosistema actual que cumple simultáneamente: $0 real, experiencia de edición al nivel de WordPress, publicación inmediata, despliegue en infra del cliente, y lock-in mínimo.

Decisión estructural clave: **se descartó el enfoque estático/git-based (Astro + CMS sobre git)** porque el criterio de éxito nº 1 lo invalida: editores no técnicos gestionando cientos de SKUs con atributos, traducciones y páginas nuevas necesitan un CMS con base de datos real y publicación instantánea, no un editor que hace commits y espera un build.

---

## 1. Arquitectura capa por capa

### 1.1 Frontend + Backend: Next.js 15 (App Router) + Payload CMS 3 — una sola app

Payload 3 se instala *dentro* del proyecto Next.js: el sitio público y el panel `/admin` son la misma aplicación Node. Un solo proceso, un solo deploy, una sola cosa que mantener.

**Por qué:**
- **MIT, 100% gratis self-hosted**, sin límite de usuarios, contenido ni features. No hay "plan free" que se pueda acabar: no hay planes.
- **Publicación inmediata**: contenido servido dinámicamente (con caché de Next.js revalidada al publicar). El editor guarda → el sitio cambia en segundos. Idéntico al modelo mental de WordPress.
- **Live preview integrado**: el editor ve el sitio real renderizado junto al formulario mientras edita.
- **Localización nativa a nivel de campo** con locales de fallback y switcher en el admin.
- **Drafts + versiones + publicar/despublicar** de serie (incluye per-locale publish desde v3.72).
- Para desarrollo con Claude Code: TypeScript puro, config-as-code (todo el modelo de contenido son archivos versionables), documentación excelente, código generado predecible. El modelo en código es la clave de la reutilización futura.

**Alternativas consideradas y descartadas:**

| Alternativa | Por qué se descarta |
|---|---|
| **Astro + Sveltia CMS** (git-based, $0 absoluto) | Editor UX por debajo del listón WordPress para cientos de SKUs; publicar = commit + build de 1–3 min; gestión de medios y relaciones débil. Decap CMS (el original) semi-abandonado con CVEs sin parchear en 2026. |
| **Directus + frontend separado** | Desde v12 (mayo 2026) licencia MSCL, no open source hasta pasados 4 años; tier Core con límite duro de 3 asientos; uso comercial libre depende de un "Open Innovation Grant". Dos sistemas que mantener. |
| **Strapi self-hosted** | Gratis y open source, pero dos apps separadas, i18n vía plugin menos integrado, sin live preview en tier gratuito, admin menos personalizable. |
| **TinaCMS** | Free tier de Tina Cloud: solo 2 usuarios; el modo self-hosted exige montar BD + auth + API GraphQL propios — más mantenimiento. |
| **WordPress headless** | Conserva el mantenimiento del que el cliente huye. |

⚠️ **Riesgo a conocer**: Figma adquirió Payload en 2025. El código sigue MIT y el desarrollo activo, pero existe riesgo de roadmap orientado a Figma. Mitigación: la licencia MIT — nadie puede quitarte la versión que uses.

### 1.2 Base de datos: SQLite (con Postgres como variante)

- SQLite = un archivo. Backup = copiar un archivo. Cero administración. Para cientos de SKUs y tráfico corporativo sobra capacidad.
- Si la infra del cliente ya opera Postgres, Payload lo soporta cambiando el adapter — decisión reversible.
- Lock-in: nulo. Plugin oficial import-export (GA desde v3.85) exporta todo a CSV/JSON con soporte de locales.

### 1.3 Medios: filesystem local + sharp

Imágenes al disco del servidor, con generación automática de tamaños/formatos (WebP/AVIF) vía sharp (integrado en Payload). Backup = copiar la carpeta. Escenario B (datos fuera del cliente): bucket S3-compatible (Cloudflare R2: 10 GB gratis, sin costo de egreso) con adapter oficial — reversible por configuración.

### 1.4 Catálogo y filtros: queries de Payload, sin servicio externo

Con cientos de SKUs no se necesita Algolia/Meilisearch. Filtros combinados (tipo, material, acabado, uso) = queries `where` sobre la colección de productos, atributos modelados como campos `select`/relación gestionables desde el admin. Facetas y conteos en el servidor. **Descartado**: Meilisearch self-hosted — otra pieza que operar, injustificable a este volumen; añadible después sin tocar el modelo.

### 1.5 Mapa de puntos de venta: MapLibre GL JS + tiles abiertos

- MapLibre (BSD) para el render.
- Tiles: OpenFreeMap (gratis, sin API key) o Protomaps self-hosted (archivo `.pmtiles` propio = cero dependencia externa). Empezar con OpenFreeMap, Protomaps documentado como plan B.
- Puntos de venta = colección en Payload (nombre, dirección, lat/lng, ciudad, tipo). Geocodificación al editar (Nominatim) o coordenadas manuales.
- **Descartado**: Google Maps — requiere tarjeta, facturación por uso, lock-in.

### 1.6 Multiidioma

- Contenido: localización de Payload (campo a campo, fallback al idioma principal).
- Rutas: i18n de Next.js (`/es/...`, `/en/...`) con `hreflang` y sitemap por idioma.
- UI fija: diccionarios en código, extraíbles del handoff.

### 1.7 Hosting

**Desarrollo y QA (gratis, sin riesgo de facturación):**
- **Cloudflare Workers (free)**: único free tier grande que permite uso comercial: 100k requests/día, D1 (SQLite) y R2 gratis. Payload soporta oficialmente despliegue en Cloudflare. Al alcanzar el límite: los requests fallan ese día, no cobran.
- **Descartados**: Vercel Hobby — prohíbe uso comercial en sus términos; Netlify Free — 300 créditos/mes con pausa del sitio al agotarse (modelo de créditos 2025/26).
- Alternativa: contenedor Docker en cualquier máquina disponible (incluso QA en infra del cliente).

**Producción (infra del cliente):**
- **Docker Compose: contenedor de la app + Caddy** (TLS automático). Requisitos: Linux con ~1 GB RAM. Actualizar = `docker compose pull && up`. Backup = cron que copia `db.sqlite` + carpeta media.
- **Escenario A** (cliente aloja todo): lo anterior. **Escenario B** (solo el sitio): misma app con Postgres/R2 externos — ojo: "gestionado, gratis y sin sorpresa" no cierra bien; si el cliente exige B, aquí aparece el primer costo real. La app no cambia entre escenarios, solo variables de entorno.

⚠️ **Dependencia crítica sin confirmar**: requiere que la infra del cliente ejecute **Node.js o Docker**. Si es hosting compartido PHP, la arquitectura cambia radicalmente. Pregunta nº 1 para el cliente.

### 1.8 Reutilización futura

No construir plataforma; construir este sitio con dos disciplinas baratas:
1. Modelo de contenido y librería de bloques en `src/collections/` y `src/blocks/` sin referencias a la marca.
2. Tokens de diseño (colores, tipografía, espaciado) del handoff centralizados en un theme.

Extraer template después = clonar repo y vaciar contenido. El segundo cliente arranca con el 70% hecho.

### 1.9 Estrategia de salida

| Pieza | Lock-in | Camino de salida |
|---|---|---|
| Payload | Nulo (MIT, self-hosted) | Código propio; datos en SQLite/Postgres + export CSV/JSON oficial |
| Next.js | Bajo (framework, no servicio) | React estándar |
| SQLite / filesystem | Nulo | Formatos abiertos |
| MapLibre + OpenFreeMap | Nulo / bajo | Swap de URL de tiles; Protomaps como autarquía total |
| Cloudflare (solo QA) | Nulo | Producción nunca depende de él |

Si el cliente abandona el CMS: build estático del sitio público → sitio HTML congelado funcionando sin piezas vivas.

---

## 2. Análisis de costos

**Costo de herramientas hoy: $0.** Todo open source o free tier apto para comercial.

Primeros costos reales posibles:
1. **VPS para producción** si el cliente no tiene dónde correr Docker: ~$4–6/mes. *El más probable.*
2. **Escenario B de datos**: Postgres gestionado ~$5–7/mes (o free tiers de Neon/Supabase, con riesgo de pausa por inactividad).
3. **Cloudflare Workers Paid** ($5/mes) solo si QA excede 100k req/día — improbable.
4. **Traducción automática asistida** (DeepL API) — opcional, no propuesta de inicio.
5. Lo que nunca aparece: costo por asiento, por API call, por entrada de contenido o por idioma (donde sangran Contentful, Sanity, Storyblok, Tina Cloud).

---

## 3. Expectativas heredadas de WordPress

**Se cumple igual o mejor:** publicación instantánea; editar cualquier texto/imagen; crear/despublicar productos; drafts y live preview lado a lado; sin actualizaciones de plugins; admin más rápido.

**A gestionar explícitamente:**
1. **No hay ecosistema de plugins.** "Instalar un plugin para X" → "pedírselo al desarrollador". Decirlo antes, no después.
2. **Crear páginas ≠ page builder libre.** Páginas componiendo bloques de la librería del handoff, no layouts arbitrarios estilo Elementor. Venderlo como consistencia de marca garantizada.
3. **El "tema" no se edita desde el admin.** Colores/tipografías son código. Definir qué globals sí son editables (logo, contacto, redes, menús).
4. **Mantenimiento mínimo ≠ cero**: acuerdo de 2–4 actualizaciones de dependencias al año.

---

## 4. Riesgos y puntos ciegos

1. **La infra del cliente es incógnita** — puede invalidar la capa de despliegue (§1.7). Bloqueante para la fase final, no para empezar.
2. **El handoff bundle no está en el repo** — su calidad de anotaciones define la fase 2.
3. **Migración de contenido desde WordPress** no está en el enunciado — ¿quién carga los SKUs y páginas? ¿Hay export XML/BD? Partida de trabajo más subestimada.
4. **SEO de migración**: sin mapa de redirects 301 el cliente pierde posicionamiento.
5. **Adquisición de Payload por Figma**: riesgo bajo, mitigado por MIT.
6. **Correo transaccional**: el admin necesita SMTP (recuperar contraseñas).
7. **Taxonomía de atributos**: cerrarla en papel antes de modelar o los filtros se rehacen.
8. **Capacitación**: sesión de capacitación + contenido semilla real (no lorem ipsum) en QA.

---

## 5. Preguntas para el cliente antes de escribir código

**Bloqueantes de arquitectura:**
1. Su infraestructura: ¿ejecuta Docker o Node.js? ¿VPS/servidor propio o hosting compartido? ¿Quién lo administra?
2. ¿"Su infraestructura" cubre también datos y medios (escenario A) o solo el sitio (escenario B)?

**Bloqueantes de modelo de contenido:**
3. Lista definitiva de idiomas, cuál es el principal, ¿lanzamiento con todos traducidos o por fases?
4. Taxonomía de atributos cerrada (valores de tipo, material, acabado, uso); ¿variantes o cada variante es un SKU?
5. ¿Existe export de WordPress y quién ejecuta la migración de contenido?

**Importantes, no bloqueantes:**
6. Inventario de URLs actuales para redirects 301 / SEO.
7. Nº de editores y roles distintos.
8. Puntos de venta: cuántos, listado con direcciones/coordenadas, filtros por ciudad/tipo.
9. Formularios: correo destino, anti-spam.
10. Analítica y legal: qué analytics, banner de cookies (propuesta: Umami/Plausible self-hosted o nada).
11. Dominio/DNS/SSL: quién controla y cuándo se corta el WordPress viejo.

---

## 6. Plan de fases

| Fase | Contenido | Entregable verificable |
|---|---|---|
| **0. Cierre** | Handoff bundle en el repo; respuestas a preguntas 1–5; taxonomía en papel | Documento de modelo de contenido aprobado |
| **1. Fundaciones** | Scaffold Next.js + Payload; tokens de diseño del handoff; deploy continuo a QA (Cloudflare) | URL de QA con home renderizada con diseño real y `/admin` accesible |
| **2. Editorial** | Librería de bloques desde el handoff; colección Pages con live preview; menús y globals | Un admin crea una página completa sin tocar código |
| **3. Catálogo** | Colección productos + atributos; listado con filtros combinados; ficha de producto | Admin crea/edita/despublica un producto y aparece filtrable |
| **4. Multiidioma** | Localización en todas las colecciones; rutas por idioma; hreflang/sitemap | Sitio en todos los idiomas; admin traduce desde el panel |
| **5. Puntos de venta** | Colección + mapa MapLibre + filtro por ciudad | Admin añade un punto de venta y aparece en el mapa |
| **6. Migración + QA** | Contenido real; redirects 301; SEO técnico; capacitación | Sitio completo en QA validado; capacitación hecha |
| **7. Producción** | Docker Compose en infra del cliente; backups automatizados; runbook | Sitio en producción + backup restaurado con éxito una vez |

**Primer paso concreto:** copiar el handoff bundle de Claude Design al repo y conseguir respuesta a las preguntas 1–2 (infra del cliente). Con el bundle disponible: fase 1 + derivar del handoff la librería de bloques y el modelo de contenido para aprobación.

---

## Fuentes

- [Payload CMS Pricing 2026: Free License, Self-Hosting](https://www.buildwithmatija.com/payload-cms-pricing)
- [Payload — Get started / deploy options](https://payloadcms.com/get-started)
- [Payload Docs — Localization](https://payloadcms.com/docs/configuration/localization)
- [Payload Docs — Live Preview](https://payloadcms.com/docs/live-preview/overview)
- [Payload CMS 2026: Why Figma Bought It](https://techsy.io/en/blog/payload-cms-guide)
- [Sveltia CMS — Successor to Netlify/Decap CMS](https://sveltiacms.app/en/docs/successor-to-netlify-cms)
- [Sveltia CMS README (estado de Decap y CVEs)](https://github.com/sveltia/sveltia-cms/blob/main/README.md)
- [Directus v12 license change (MSCL)](https://directus.com/resources/directus-v12-license-change)
- [Directus Pricing 2026: tiers y límites](https://nayankyada.com/blog/directus-pricing-2026-self-hosted-costs-cloud-tiers-license-thresholds)
- [TinaCMS Pricing / free tier](https://www.spotsaas.com/product/tinacms/pricing)
- [TinaCMS — Self-hosted discussion](https://github.com/tinacms/tinacms/discussions/3096)
- [Vercel free tier limits 2026 (prohibición comercial en Hobby)](https://www.promptstoproduct.com/vercel-free-tier-limits)
- [Cloudflare Workers vs Vercel 2026](https://www.morphllm.com/comparisons/cloudflare-workers-vs-vercel)
- [Netlify — Pricing updates April 2026 (créditos)](https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/)
- [Netlify Docs — Credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
