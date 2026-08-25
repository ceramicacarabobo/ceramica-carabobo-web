# Plan maestro del proyecto — Cerámica Carabobo Web

*Actualizado: 2026-08-25 (4ª ed.: Fase 1 en línea) · Estado: **Fases 0 y 1 cerradas · QA en línea con publicación automática** — ver [fase-1-esqueleto.md](./fase-1-esqueleto.md)*
*Documento de entrada para las sesiones de ejecución. Contexto histórico: [propuesta-arquitectura.md](./propuesta-arquitectura.md) (propuesta Payload, superada) y [contraste-propuestas.md](./contraste-propuestas.md) (análisis que llevó a la decisión).*

---

## 1. Contexto en 5 líneas

Sitio para cliente que migra desde WordPress (hoy: WP gestionado en Hostinger). Combina contenido editorial de marca + catálogo de cientos de SKUs con filtros combinados + buscador de puntos de venta con mapa + multiidioma. **Criterio de éxito nº 1:** admins no técnicos gestionan todo el contenido sin desarrollador, con experiencia igual o mejor que WordPress. Presupuesto de herramientas $0. El cliente NO tiene infraestructura propia ni equipo de TI → se descartó todo lo self-hosted. El diseño está terminado en Claude Design (handoff bundle con anotaciones editable/fijo, **pendiente de copiar al repo**).

## 2. Arquitectura decidida

```
[Editores] → Sanity Studio (/admin) → contenido en nube de Sanity (plan Free)
                        │ publicar → webhook → build (2–4 min)
                        ▼
[Cloudflare Pages/Workers free] build de Astro: baja contenido e imágenes,
        genera HTML + imágenes optimizadas (astro:assets) → sirve todo
                        ▼
[Visitantes] solo tocan Cloudflare. Producción NUNCA depende de Sanity en runtime.
```

| Capa | Elección | Nota clave |
|---|---|---|
| Framework | **Astro 7.x** (estático; preview server-rendered para visual editing) | Verificar versión al iniciar ejecución |
| CMS | **Sanity Free** (Studio embebido en `/admin`, Presentation Tool para click-to-edit) | ~20 asientos, 10k docs, bloquea sin cobrar |
| Hosting | **Cloudflare Pages/Workers free** (build + serving + preview) | Uso comercial permitido |
| Código | **GitHub** (repo único, no monorepo) | |
| Imágenes | Procesadas **en build** (resize, WebP/AVIF), servidas por Cloudflare | El CDN de Sanity solo en build/preview |
| Filtros catálogo | **JSON precargado + filtrado client-side** (isla interactiva) | 0 requests a Sanity |
| Búsqueda texto | **Pagefind** (solo si el cliente la pide) | Índice en build, multiidioma |
| Mapas | **MapLibre GL + OpenFreeMap** (Protomaps `.pmtiles` como plan B) | Sin API key, sin tarjeta |
| i18n | Rutas por idioma en Astro + document-internationalization en Sanity | Idiomas: pendiente confirmar con cliente |

**Por qué esta y no Payload self-hosted:** modo de fallo benigno — sin nadie que mantenga, el sitio estático queda congelado pero en línea (vs caído). Payload queda documentado como opción preferente para clientes futuros CON infraestructura (ver contraste-propuestas.md).

**Descartados:** Payload self-hosted (sin quién mantener servidor), Payload-sobre-Workers (sin día para el spike de validación), Vercel (Hobby prohíbe uso comercial), Netlify (créditos con pausa), Algolia/Fuse.js, Google Maps, CMS git-based (UX insuficiente), monorepo.

## 3. Condiciones no negociables de implementación

0. **Contrato de fidelidad visual**: la web debe ser **visualmente idéntica al diseño** — mismos colores hex, tipografías, pesos, espaciados, proporciones, composición y comportamientos, tomados de los valores escritos en `design/Tokens v0`, `Primitivas v1` y `Responsividad v0` (no "parecido", no "inspirado en"). La ÚNICA desviación permitida respecto al prototipo son los artefactos de herramienta que el propio handoff ordena NO replicar (breakpoints en JS → media queries; PNG pesados → WebP/AVIF optimizado; archivo por página → app con cáscara compartida; enlaces `.dc.html` → rutas limpias). Ante cualquier ambigüedad visual, el prototipo servido en el navegador es la referencia y los documentos de tokens/responsividad son el árbitro. Verificación: comparación lado a lado por página y por rango (móvil/desktop) + el checklist de aceptación del handoff.
1. **Patrón adaptador:** capa de datos propia (`getProducts()`, `getPage(slug)`, `getDealers()`) que devuelve tipos nuestros; queries GROQ en una sola carpeta; componentes con props planos que no conocen Sanity; `<Imagen>` wrapper propio; Portable Text sin bloques exóticos.
2. **Export automático periódico** del dataset de Sanity (NDJSON) — seguro contra cambio de planes/servicio.
3. **Imágenes autoalojadas en build** — nunca `cdn.sanity.io` en producción.
4. **Contenido 100% administrable:** nada de lo marcado editable en el handoff queda hardcodeado.
5. **Expectativa comunicada:** publicar tarda 2–4 minutos.

## 4. Cuentas y titularidad

- Necesarias: **GitHub, Sanity, Cloudflare** (gratis, sin tarjeta).
- **Dev/QA arranca en cuentas del desarrollador** (no bloquear el inicio); en paralelo pedir correo del cliente (ej. `web@cliente.com`).
- **Producción nace en cuentas del cliente** con el desarrollador invitado como admin/colaborador — **las tres: GitHub, Sanity y Cloudflare** (decisión 2026-08-24: el desarrollador no quiere vínculo permanente no acordado vía cuenta personal; el plan free de GitHub basta — repos privados ilimitados, colaboradores ilimitados, webhooks incluidos). Crítico en Cloudflare (no hay transferencia de proyectos: habría que recrear y reapuntar dominio).
- Dominio: hoy en Hostinger; al final se apuntan DNS a Cloudflare y se cancela el plan WP.

## 5. Base reutilizable para futuros proyectos (objetivo de negocio)

Este proyecto es el primero de varios similares. **No se construye plataforma genérica**; se construye este sitio con disciplinas que hacen extraíble un starter al terminar:

**Durante el desarrollo (disciplinas, costo ~0):**
- Estructura desacoplada: `src/lib/data/` (adaptador CMS), `src/components/blocks/` (bloques 1:1 con handoff), `src/theme/` (tokens: colores, tipografía, espaciado — TODO lo de marca vive solo aquí), `sanity/schemas/` (modelo de contenido).
- Nombres de bloques y schemas genéricos (hero, galería, grid-productos, CTA…), consistentes con el handoff de Claude Design.
- Nada del cliente esparcido: si un componente necesita algo de marca, lo recibe del theme o del CMS.

**Al cierre del proyecto (entregables de reutilización):**
1. **Repo template**: clon del proyecto con contenido vaciado y theme en placeholder.
2. **CLAUDE.md** con convenciones del stack (estructura, patrones, cómo se añade un bloque nuevo, cómo se modela contenido).
3. **Playbook de prompts**: secuencia probada de prompts/pasos para levantar el siguiente cliente (de handoff de Claude Design → sitio en QA).
4. **Runbook de operación**: cuentas, cuotas free y qué hacer al alcanzarlas, export de dataset, traspaso de titularidad.

**Regla de decisión para futuros clientes** (heredada del análisis): con infra propia y quién la mantenga → considerar Payload self-hosted (contraste-propuestas.md); sin infra/TI → este mismo stack.

## 6. Plan de fases (ejecución)

| Fase | Contenido | Entregable verificable |
|---|---|---|
| **0. Modelo de contenido** ✅ | Inventario de tipos y bloques desde el handoff → schemas Sanity con validaciones. ANTES de tocar diseño | Documento de modelo aprobado + schemas |
| **1. Esqueleto** ✅ | Astro + Sanity Studio en `/admin` + deploy Cloudflare + webhook publicación + preview/visual editing | QA en línea: home mínima + admin funcional — *en línea en https://qa.ceramica-carabobo.workers.dev; publicar en Sanity reconstruye el sitio solo* |
| **2. Diseño a componentes** | Tokens al theme; cada sección del handoff → bloque Astro conectado a schema (nada hardcodeado) | Admin compone una página nueva con bloques reales |
| **3. Catálogo** | Producto + atributos en Sanity; listado con filtros client-side; fichas estáticas; imágenes en build; (Pagefind si se pide) | Admin crea/edita/despublica producto, filtrable en el sitio |
| **4. Multiidioma** | i18n rutas + traducción de contenido en Studio + hreflang/sitemap | Sitio en todos los idiomas, traducible desde el admin |
| **5. Puntos de venta + contacto** | Colección dealers + mapa MapLibre + formulario de contacto | Admin añade punto de venta y aparece en mapa |
| **6. Editores + migración** | Studio pulido para no técnicos; doc "en WordPress lo hacía así → ahora así"; carga de contenido real; redirects 301 | Cliente valida QA; capacitación hecha |
| **7. Producción** | Cuentas del cliente; DNS a Cloudflare; export automático configurado; runbook | Sitio en producción + titularidad del cliente |
| **8. Extracción** | Repo template + CLAUDE.md + playbook + runbook (sección 5) | Starter listo para el cliente nº 2 |

**Estimación** (sitio de 4 páginas: home, catálogo, contacto, distribuidores): ~3.5–4 días efectivos de desarrollo; 2–3 semanas calendario incluyendo contenido real, vueltas del cliente y traspaso.

## 7. Bloqueantes antes de ejecutar

1. ~~Copiar el handoff bundle~~ **HECHO Y COMPLETO** (2026-08-24) — texto + assets binarios verificados: 107 archivos, 114MB, fotos de catálogo, video del hero, logos, GeoJSON. `design/publicar/` es el prototipo íntegro y servible.
2. Confirmar con el cliente: idiomas definitivos, taxonomía de atributos del catálogo (tipo/material/acabado/uso y valores), si hay export de WordPress y quién carga contenido, listado de distribuidores con direcciones, correo destino de formularios, correo corporativo para cuentas de producción.
3. Inventario de URLs actuales del WP para redirects 301.

## 8. Análisis del handoff (2026-08-24, sesión Fable)

El bundle de diseño (Etapa 1.3) fue importado y analizado. Resultado completo en **[modelo-de-contenido.md](./modelo-de-contenido.md)** — es el entregable de la Fase 0, pendiente de aprobación. Ajustes que introduce al plan:

- **El sitio son 5 páginas fijas** (home, catálogo, contacto, dónde comprar, 404) con contenido editable — NO hay page-builder libre en el diseño. La "Fase 2: diseño a componentes" implementa esas composiciones; los schemas son colecciones (producto ×126, distribuidor, materia) + singletons por página.
- **Cáscara compartida obligatoria** (requisito nº1 del handoff): navegación sin recarga ni destello → Astro `ClientRouter` + `transition:persist`. Compatible con lo decidido.
- **El catálogo del prototipo ya define el contrato de URL/historial** (filtros con replaceState, ficha con pushState, atrás cierra overlays) y los 5 ejes de filtro con listas cerradas — replicar criterio, no inventar.
- **Multiidioma: FUERA DEL ALCANCE** (confirmado por el usuario 2026-08-24). El sitio es es-VE monolingüe; la antigua Fase 4 (i18n) se elimina del plan. Los schemas se crean sin localización.
- Checklist de aceptación del handoff (12 pruebas en teléfono real) pasa a ser el criterio de cierre de QA.
- Autosuficiencia de terceros ya exigida por el diseño (GeoJSON propio ✓ descargado, librerías empaquetadas, fuentes self-hosted) — refuerza la condición 3 nuestra.
- Nuevo pendiente técnico: **receptor del formulario de contacto** (el prototipo no envía) — propuesta: Cloudflare Worker + email gratis + Turnstile.
- Los datos del cliente tienen huecos documentados (materia 29/126 sin dato, fotos reales solo 31/126, distribuidores 100% placeholder, hitos de historia sin validar) — el desarrollo NO se bloquea, la publicación sin contraseña SÍ.

## 9. Nota de método de trabajo

La planificación y las decisiones de arquitectura se hicieron en sesión con el modelo más capaz (Fable/Opus); **la ejecución se hará en sesiones con un modelo más moderado usando este documento como fuente de verdad**. Cualquier cambio de arquitectura durante la ejecución debe registrarse aquí, no solo en el chat.

## 10. Registro de ejecución — Fase 1 (2026-08-24)

Detalle y pasos pendientes: **[fase-1-esqueleto.md](./fase-1-esqueleto.md)**. Ajustes de arquitectura
que introduce la ejecución (registrados acá como manda §9):

1. **Astro 7.2.6 con Node 22.12+.** El entorno de build (local y Cloudflare) tiene que fijar
   Node 22; con Node 20 Astro 7 no arranca.
2. **Cloudflare Workers con assets estáticos**, no Pages. El adaptador de Astro genera el
   `wrangler.json` de deploy dentro de `dist/`; `wrangler.jsonc` en la raíz aporta el nombre,
   `nodejs_compat` y `not_found_handling: "404-page"` (requisito nº11 del handoff).
3. **Producción y preview son dos workers.** Producción se construye estática; el preview con
   visual editing se construye server-rendered (`PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true`),
   que es lo que exige el Presentation Tool. La arquitectura decidida no cambia: producción
   sigue sin depender de Sanity en runtime.
4. **Los schemas del modelo de contenido ya existen** en `sanity/schemas/` (colecciones producto,
   distribuidor y materia + singletons home, contacto, dondeComprar y ajustes), con las listas
   cerradas en `sanity/lib/listas.ts`.
5. **Modo `placeholder`:** sin proyecto de Sanity configurado el sitio compila y sirve contenido
   vacío, para que la falta de cuentas no bloquee el desarrollo.
6. **Fase 4 (multiidioma) eliminada** del plan de fases, en línea con la decisión de §8: el sitio
   es monolingüe es-VE. Las fases posteriores conservan su numeración original para no romper
   referencias.
