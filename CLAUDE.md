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

## Estado (2026-08-25)

- Fase 0 (modelo de contenido) ✅. Bundle de diseño completo en `design/` (107 archivos, texto + fotos + video) ✅.
- **Fase 1 (esqueleto) cerrada** — QA en línea: https://qa.ceramica-carabobo.workers.dev (preview en https://preview.ceramica-carabobo.workers.dev). Sanity `egpui9al`; publicar reconstruye el sitio solo (webhook → Workers Builds). Datos del entorno en `docs/fase-1-esqueleto.md` §1.bis.
- Pendientes de la fase, cerrados el 2026-09-02: el click-to-edit **ya funciona** (estaba roto por tres causas encadenadas — ver `plan-proyecto.md` §14) y **Cloudflare Access se descarta** (decisión del usuario): el QA queda accesible con el enlace. No lo indexan los buscadores (`robots.txt` con `Disallow: /` y `noindex, nofollow` verificados), pero cualquiera con la dirección entra. El admin sigue protegido por el inicio de sesión de Sanity, que es lo que importa para editar.
- El worker `preview` **se despliega a mano** (`npm run deploy:preview`); solo el `qa` está conectado a Workers Builds. Por eso el preview se quedó atrás fases enteras. Conectarlo es el arreglo de fondo.
- **Fase 2 (diseño a componentes) cerrada** — home completa y 404 al píxel contra el prototipo, QA de aceptación automatizado en `scripts/qa/aceptacion.mjs` (6 pruebas en verde). Herramientas de fidelidad y decisiones en `docs/fase-2-qa-fidelidad.md`.
- **En curso: Fase 3 (catálogo)** — ver `docs/fase-3-catalogo.md`.
- **El prototipo del diseño se ejecuta**: `cd design/publicar && python3 -m http.server 4500`. Es la referencia de fidelidad; se compara con `scripts/qa/diff.mjs` y `scripts/qa/medir.mjs`.
- Node **22.12+** obligatorio (Astro 7). `npm run dev` levanta sitio y admin juntos.
- Cambios de arquitectura durante la ejecución se registran en `docs/plan-proyecto.md`, no solo en el chat.

## Convenciones del código (Fase 1)

- `src/lib/queries/` — TODO el GROQ. `src/lib/data/` — adaptador con tipos propios; los componentes nunca importan de Sanity.
- `src/theme/tokens.css` es copia literal de `design/Tokens v0` §09: no editar valores sueltos.
- Alias `~/*` → `src/*`. **No agregar `baseUrl` al tsconfig**: la carpeta `sanity/` taparía al paquete npm `sanity`.
- Textos de marca nunca hardcodeados: si no está en el CMS, no se muestra.

## Método de trabajo del usuario

Planifica con el modelo más capaz, ejecuta con uno moderado. Responder en español, puntual y simple. Decisiones importantes → persistirlas en `docs/`.
