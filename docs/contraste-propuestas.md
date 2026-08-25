# Contraste de propuestas: Payload self-hosted vs Astro + Sanity

*Fecha: 2026-08-22 · Complementa a [propuesta-arquitectura.md](./propuesta-arquitectura.md)*

## Verificación de datos de la propuesta Astro + Sanity

- **Astro va por 7.x** (Astro 6 salió en marzo 2026; la 7.2.1 es del 11 de agosto 2026). Desde Astro 6 las **Live Content Collections son estables** — contenido en tiempo real sin rebuild, pero exige servidor Node en producción.
- **Sanity Free confirmado**: ~20 asientos, 10k documentos, 1M requests CDN/mes, 100GB assets/bandwidth, y **bloquea en vez de cobrar** al exceder — cumple el criterio anti-sorpresa.
- **Incorrecto**: Vercel Hobby **prohíbe uso comercial** en sus términos — un QA de proyecto de cliente está en zona gris.

## Coincidencias (≈60% de ambas propuestas)

1. Arquitectura de bloques 1:1 con el handoff (schema/colección + componente, mismos nombres); páginas como composición de bloques.
2. Design tokens en un solo archivo de tema; plomería desacoplada de la marca → starter extraíble.
3. Contenido 100% administrable, nada visible hardcodeado.
4. Nada de Algolia/servicio de búsqueda externo a este volumen.
5. Descartar Google Maps; mapas con stack abierto.
6. Cientos de SKUs no requieren infraestructura de catálogo especial.
7. Cierre con repo template + convenciones para próximos clientes.
8. Modelo de contenido **antes** de tocar diseño (Fase 0 de la propuesta Astro+Sanity — mejor secuenciada; adoptada).

## Puntos de conflicto y elección

### 1. CMS: Sanity (SaaS) vs Payload (self-hosted) — conflicto central. **Elección: Payload.**

La propuesta Astro+Sanity admite que si el cliente exige alojar también los datos, "habría que sustituir el CMS" — ante una pregunta sin respuesta, 50% de probabilidad del cambio más traumático posible (rehacer schemas, queries, media, visual editing). Payload cubre ambos escenarios cambiando variables de entorno.

- **$0 estructural vs $0 condicional**: Sanity Free es generoso pero puede cambiar (ya reestructuró precios antes); Payload MIT no tiene plan que cambiar.
- **Lock-in**: el export de Sanity (NDJSON + Portable Text) es razonable, pero necesita 3 disciplinas de desacoplamiento para *mitigar* un lock-in que Payload no tiene.
- **i18n**: Payload nativo a nivel de campo; Sanity vía plugin (document-internationalization) menos integrado.
- Donde Sanity **gana**: el Presentation Tool (click-to-edit) es superior al live preview open source de Payload (el visual editor de Payload es enterprise). Ventaja real de UX, no compensa el riesgo del escenario B.

### 2. Framework: Astro estático vs Next.js dinámico — **empate condicionado a la infra del cliente.**

Carta fuerte de Astro: **el build estático corre en cualquier servidor** (Nginx, Apache, hosting compartido PHP) — neutraliza el riesgo nº 1 de la propuesta Payload. Es el escenario donde Astro+Sanity gana.

Costos subestimados:
- **Latencia de publicación**: 2–4 min de rebuild vs inmediatez WordPress. La inmediatez no es expectativa a gestionar sino a **cumplir** (criterio de éxito nº 1). Astro 6+ Live Collections daría inmediatez pero exige Node en producción → pierde su ventaja y las propuestas convergen.
- **El pipeline fantasma** (mayor hueco): el webhook Sanity→Vercel solo reconstruye QA. Producción en infra del cliente necesita pipeline de build+deploy por cada publicación (GitHub Actions free: 2.000 min/mes ≈ 600 publicaciones/mes con builds de 3 min). Latencia total 3–6 min, plomería invisible que mantener, y si el pipeline se rompe los editores quedan bloqueados sin entender por qué.

**Elección**: Next.js dinámico *si* la infra corre Node/Docker; Astro estático si es hosting estático. La decisión pertenece a la respuesta del cliente.

### 3. Vercel dev/QA — **Elección: Cloudflare Workers.** Vercel Hobby prohíbe uso comercial; Cloudflare free (100k req/día) permite comercial y bloquea sin cobrar.

### 4. Pagefind vs Fuse.js — **En stack Astro: Pagefind; en stack Payload: ninguno.**

- Pagefind: índice en build (no carga todo en el navegador), **filtros facetados** y multiidioma nativo. Fuse: búsqueda difusa en memoria; los filtros combinados habría que construirlos aparte.
- Matiz: para filtros por atributos a esta escala, JSON de catálogo precargado + filtrado client-side basta; Pagefind aporta para texto libre.
- Con Payload: queries a la base de datos, sin herramienta extra.

### 5. Mapas — **MapLibre GL + OpenFreeMap** (gratis, sin API key, sin tarjeta); Protomaps self-hosted (`.pmtiles`) como plan B de autarquía. Vale para ambos stacks.

### 6. Repo — repo único, no monorepo. Admin embebido (`/admin` en ambos casos). Monorepo es sobre-ingeniería hasta el segundo cliente.

## Veredicto global

**Payload + Next.js como propuesta por defecto**: degrada mejor ante las dos incógnitas. Si el cliente exige datos en su infra, Astro+Sanity colapsa (swap de CMS); si la infra no corre Node, Payload necesita un VPS de ~$5/mes. Mejor el riesgo que se resuelve con $5/mes que el que se resuelve rehaciendo la capa de contenido.

**Regla de decisión (las preguntas 1–2 al cliente deciden):**

| Respuesta del cliente | Propuesta ganadora |
|---|---|
| Infra corre Node/Docker (cualquier escenario de datos) | **Payload + Next.js** |
| Infra estática/compartida Y datos en la nube OK | **Astro + Sanity**, con: Cloudflare en vez de Vercel, Pagefind, pipeline de deploy a producción diseñado y monitoreado desde el día uno, honestidad sobre los 3–6 min de publicación |
| Infra estática Y datos deben ser suyos | Variante: Astro estático + Payload en un VPS mínimo del cliente como fuente de contenido |

**Adoptado de la propuesta Astro+Sanity** (aplica igual con Payload):
1. Fase 0 de modelo de contenido antes del diseño.
2. Disciplina de desacoplamiento (queries en una carpeta, componentes con props planos, `<Imagen>` propio) — abarata el starter reutilizable.
3. Documento **"cómo lo hacía en WordPress → cómo lo hago ahora"** — la idea de mayor retorno por esfuerzo.
4. Playbook de prompts + CLAUDE.md como entregable del cierre.

## Fuentes

- [Sanity CMS Pricing 2026](https://nayankyada.com/blog/sanity-cms-pricing-in-2026-free-plan-growth-and-when-you-need-enterprise)
- [Sanity pricing decoded](https://robotostudio.com/blog/sanity-cms-pricing-which-plan-is-right-for-you)
- [Astro 6.0](https://astro.build/blog/astro-6/)
- [astro en npm](https://www.npmjs.com/package/astro?activeTab=versions)
- [Vercel free tier limits 2026](https://www.promptstoproduct.com/vercel-free-tier-limits)

---

## Actualización 2026-08-24 — Decisión tomada y cierres

**Escenario confirmado:** el cliente no tiene infraestructura propia (hoy: WordPress gestionado en Hostinger) ni equipo de TI para mantener servidores.

**Decisión: Astro + Sanity + Cloudflare (Pages/Workers free).** Razón dominante: modo de fallo benigno — si algún día nadie mantiene nada, el sitio estático queda congelado pero en línea; un stack self-hosted sin mantenedor queda caído. Payload-sobre-Cloudflare-Workers quedó descartado por no disponer del día de spike para validar sus aristas (imágenes sin sharp, madurez del adaptador).

**Condiciones no negociables de la implementación:**
1. **Desacoplamiento formal (patrón adaptador):** capa de datos propia (`getProducts()`, `getPage(slug)`, `getDealers()`) que devuelve tipos nuestros, no de Sanity; queries GROQ en una sola carpeta; componentes con props planos; `<Imagen>` wrapper propio; Portable Text sin bloques exóticos.
2. **Export automático periódico** del dataset de Sanity (NDJSON) como seguro contra cambio abrupto de planes/servicio.
3. **Imágenes procesadas en build** (`astro:assets`: resize + WebP/AVIF) y servidas como estáticos desde Cloudflare. El CDN de Sanity solo se usa en builds y preview, nunca en producción → el tope duro de 100GB/mes de Sanity se vuelve teórico y el sitio público no depende de Sanity en runtime. Vigilar duración de builds en la fase de catálogo.
4. **Expectativa comunicada al cliente:** publicar tarda 2–4 minutos (rebuild).

**Búsqueda/filtros del catálogo (cerrado):**
- Filtros combinados por atributos: **JSON precargado + filtrado client-side** en isla interactiva. 0 requests a Sanity, instantáneo a esta escala.
- Búsqueda por texto libre: **Pagefind** (índice en build, multiidioma), solo si el cliente la pide.
- Fuse.js descartado (carga todo en memoria, no aporta al facetado); Algolia descartado (servicio externo, injustificable bajo miles de SKUs; anotado como upgrade futuro).

**Cuotas Sanity Free vs esta arquitectura:** builds estáticos consumen decenas de requests por deploy (mayormente al CDN: 1M/mes; API directo: 250k/mes) — no son cuello de botella. El riesgo real era bandwidth de assets (100GB/mes, tope duro), neutralizado por la condición 3. El Presentation Tool consume API en vivo solo durante sesiones de edición (volumen trivial); por eso preview es server-rendered en Cloudflare y producción 100% estática.
