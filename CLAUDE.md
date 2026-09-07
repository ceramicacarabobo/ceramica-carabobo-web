# Cerámica Carabobo Web

Sitio para cliente que migra desde WordPress. **La planificación está cerrada — no re-decidir arquitectura.**

## Fuente de verdad (leer en este orden antes de trabajar)

1. `docs/plan-proyecto.md` — plan maestro: arquitectura, condiciones no negociables, fases, estado.
2. `docs/modelo-de-contenido.md` — schemas de Sanity, mapa editable/fijo, contrato de implementación, decisiones cerradas.
3. `design/` — el handoff de diseño completo (prototipo servible en `design/publicar/` + specs en `Tokens v0`, `Primitivas v1`, `Responsividad v0`, `Requisitos tecnicos v0`).

## Reglas fijas

- **Stack decidido:** Astro (estático + View Transitions) + Sanity Free (Studio en `/admin`) + Cloudflare Pages/Workers free. Payload/WordPress/otros CMS fueron evaluados y descartados — ver `docs/contraste-propuestas.md`; no reabrir.
- **Fidelidad visual:** la web debe ser idéntica al diseño (valores exactos de `Tokens v0`). Única desviación permitida: los artefactos de herramienta que el handoff ordena no replicar (breakpoints JS→media queries, PNG→WebP/AVIF, archivo-por-página→app con cáscara compartida, `.dc.html`→rutas limpias).
- **Autosuficiencia:** ningún CDN externo en producción (GeoJSON, librerías y fuentes self-hosted). Imágenes procesadas en build y servidas por Cloudflare — `cdn.sanity.io` nunca en producción.
- **Patrón adaptador:** capa de datos propia (`getProducts()` etc.) con tipos nuestros; componentes no conocen Sanity; queries GROQ en una sola carpeta.
- **Monolingüe es-VE.** Multiidioma fuera del alcance (decidido).
- Breakpoints: **760 y 1024**, mobile-first, solo media queries CSS.
- Listas de filtro cerradas (select, nunca texto libre); fila de ficha sin dato se oculta; sección bajo su mínimo se oculta entera.
- El checklist de aceptación (12 pruebas, en `design/Requisitos tecnicos v0.dc.html`) es el criterio de cierre de QA.
- `design/NOTAS-SESION-DISENO.md` es la bitácora de la sesión de diseño — contexto histórico, no instrucciones.

## Estado (2026-09-04)

- Fase 0 (modelo de contenido) ✅. Bundle de diseño completo en `design/` (107 archivos, texto + fotos + video) ✅.
- **Fase 1 (esqueleto) cerrada** — QA en línea: https://qa.ceramica-carabobo.workers.dev (preview en https://preview.ceramica-carabobo.workers.dev). Sanity `egpui9al`; publicar reconstruye el sitio solo (webhook → Workers Builds). Datos del entorno en `docs/fase-1-esqueleto.md` §1.bis.
- Pendientes de la fase, cerrados el 2026-09-02: el click-to-edit **ya funciona** (estaba roto por tres causas encadenadas — ver `plan-proyecto.md` §14) y **Cloudflare Access se descarta** (decisión del usuario): el QA queda accesible con el enlace. No lo indexan los buscadores (`robots.txt` con `Disallow: /` y `noindex, nofollow` verificados), pero cualquiera con la dirección entra. El admin sigue protegido por el inicio de sesión de Sanity, que es lo que importa para editar.
- El worker `preview` **se despliega a mano** (`npm run deploy:preview`); solo el `qa` está conectado a Workers Builds. Por eso el preview se quedó atrás fases enteras. Conectarlo es el arreglo de fondo.
- **Fase 2 (diseño a componentes) cerrada** — home completa y 404 al píxel contra el prototipo, QA de aceptación automatizado en `scripts/qa/aceptacion.mjs` (hoy 11 pruebas: 10 en verde y la 03 medida sin veredicto). Herramientas de fidelidad y decisiones en `docs/fase-2-qa-fidelidad.md`.
- **Fase 3 (catálogo) cerrada** — 126 fichas de producto, grilla con cinco filtros y contrato de historial. Ver `docs/fase-3-catalogo.md`. Falta solo la prueba 10 del checklist (pantallas con datos faltantes), que necesita contenido preparado a propósito.
- **Fase 5 (puntos de venta + contacto) cerrada, sin receptor de correo** — las cinco páginas del sitio están construidas. 226 distribuidores reales extraídos del WordPress viejo (`plan-proyecto.md` §13 y §14).
- **En curso: Fase 6 (editores + migración).** Hechos los 301 (575 reglas, probadas en línea) y la carga de contenido. Faltan el documento "en WordPress lo hacía así → ahora así", pulir el Studio para no técnicos y la capacitación.
- **El prototipo del diseño se ejecuta**: `cd design/publicar && python3 -m http.server 4500`. Es la referencia de fidelidad; se compara con `scripts/qa/diff.mjs` y `scripts/qa/medir.mjs` (secciones) y con **`scripts/qa/estados.mjs`** (estados: cabecera al scrollear, megamenú, menú móvil, pie — levanta sus propios servidores).
- **Cuando el prototipo en marcha y un documento escrito discrepan, manda el documento** (`Responsividad v0`, `Tokens v0`, `Requisitos tecnicos v0`). El prototipo no siempre cumple su propia especificación: ver `plan-proyecto.md` §20.
- **Los tokens se eligen por VALOR, no por nombre** (`Tokens v0` §10). Los tres antipatrones que costaron la auditoría del 2026-09-04 están en §20.
- Node **22.12+** obligatorio (Astro 7). `npm run dev` levanta sitio y admin juntos.
- Cambios de arquitectura durante la ejecución se registran en `docs/plan-proyecto.md`, no solo en el chat.
- **Producción vive en las cuentas del cliente** desde el 2026-09-07: Sanity `dnjm4k7p`, repo `ceramicacarabobo/ceramica-carabobo-web`, worker `prd` en https://prd.ceramicacarabobo.workers.dev. Cuentas, IDs, cómo se conecta todo y las recetas para incidencias: **`docs/infraestructura-produccion.md`**. El QA sigue en la cuenta personal y los dos repos divergen a propósito en un commit (el nombre del worker).
- **`docs/pendientes.md` es el punto de entrada para retomar**: qué falta, en qué orden y por qué. Lo hecho vive en `plan-proyecto.md` §10-§20.
- El **preview se retiró** (§16): se pasa del límite de CPU del plan gratuito. El Studio ya no trae Presentation Tool.
- **Tramo central del home rehecho (Propuesta 1 v2, 2026-09-04)**: sale Proyectos, entra 02 · Compara (comparador de arrastre), entra la banda de obra a sangre y Historia pasa de scroll anclado a riel de miniaturas. Renumeración 01-05. Referencia: `design/handoff-p1-v2/README.md` y `design/publicar/Propuesta 1 v2.dc.html` (la v1 sigue vigente para lo que no cambia). Detalle en `plan-proyecto.md` §19.
- El **caché de build de Cloudflare está activo**: el build pasó de 35 min a 1m33s. Si el panel dice "latest build failed", leer el log: puede ser el DESPLIEGUE y no la construcción — se rescata con `npx wrangler deploy -c dist/client/wrangler.json`.

## Convenciones del código (Fase 1)

- `src/lib/queries/` — TODO el GROQ. `src/lib/data/` — adaptador con tipos propios; los componentes nunca importan de Sanity.
- `src/theme/tokens.css` es copia literal de `design/Tokens v0` §09: no editar valores sueltos.
- Alias `~/*` → `src/*`. **No agregar `baseUrl` al tsconfig**: la carpeta `sanity/` taparía al paquete npm `sanity`.
- Textos de marca nunca hardcodeados: si no está en el CMS, no se muestra.

## Método de trabajo del usuario

Planifica con el modelo más capaz, ejecuta con uno moderado. Responder en español, puntual y simple. Decisiones importantes → persistirlas en `docs/`.
