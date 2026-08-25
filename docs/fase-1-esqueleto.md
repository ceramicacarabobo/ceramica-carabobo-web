# Fase 1 — Esqueleto (bitácora de ejecución)

*Fecha: 2026-08-24 · Estado: **código completo; falta la parte que depende de cuentas***
*Entregable de la fase (plan maestro §6): «QA en línea: home mínima + admin funcional con click-to-edit».*

---

## 1. Qué quedó construido

| Pieza | Dónde | Nota |
|---|---|---|
| Proyecto Astro 7.2.6 | raíz | `output` estático; cambia a server solo en el build de preview |
| Adaptador Cloudflare | `astro.config.mjs` + `wrangler.jsonc` | Workers con assets; `not_found_handling: "404-page"` (requisito nº11) |
| Studio de Sanity embebido | `/admin` (`sanity.config.ts`) | menú por páginas + colecciones, singletons sin crear/borrar/duplicar |
| Schemas del modelo de contenido | `sanity/schemas/` | producto, distribuidor, materia + home, contacto, dondeComprar, ajustes |
| Listas cerradas | `sanity/lib/listas.ts` | series, materias, formatos, brillos, texturas, usos, PEI, 24 estados |
| Capa de datos (adaptador) | `src/lib/data/` + `src/lib/queries/` | `getProductos()`, `getHome()`, `getDistribuidores()`… con tipos propios |
| Tokens de diseño | `src/theme/tokens.css` | **copia literal** de `design/Tokens v0` §09 |
| Cáscara compartida | `src/layouts/Base.astro` + `src/components/shell/` | `ClientRouter` + `transition:persist` en cabecera y pie |
| Páginas | `src/pages/` | home mínima, 404 real, y catálogo/contacto/dónde comprar como marcadores de fase |
| Visual editing | `<VisualEditing>` en el layout + `presentationTool` en el Studio | se enciende con `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true` |

Verificado en local: `npm run build` (6 páginas, 0 errores), `npm run check` (0 errores),
`npm run dev` sirve `/` y `/admin`, y el HTML construido **no referencia ningún CDN externo**
(tipografías Work Sans y Open Sans empaquetadas por `@fontsource-variable`).

## 2. Lo que falta y depende de cuentas (no se puede hacer desde el repo)

Estos pasos necesitan iniciar sesión; hay que hacerlos una vez, en las cuentas del
desarrollador (producción se rehace en las del cliente en la Fase 7).

### 2.1 Crear el proyecto de Sanity

```bash
npx sanity login                 # abre el navegador
npx sanity projects create "Ceramica Carabobo"
npx sanity dataset create production
```

Copiar el `projectId` a `.env`:

```
PUBLIC_SANITY_PROJECT_ID="xxxxxxxx"
PUBLIC_SANITY_DATASET="production"
```

Mientras no exista el proyecto, el valor `placeholder` deja el sitio compilando y
sirviendo contenido vacío (las secciones bajo su mínimo se ocultan solas).

### 2.2 Habilitar CORS del Studio

En `sanity.io/manage → API → CORS origins`, agregar **con credenciales**:
`http://localhost:4321` y la URL del deploy de QA. Sin esto el Studio embebido no
puede autenticar.

### 2.3 Token de lectura para el preview

`sanity.io/manage → API → Tokens → Add token` (permiso *Viewer*) → `SANITY_API_READ_TOKEN`.
Solo lo usa el deploy de preview para leer borradores; el build de producción no lo necesita.

### 2.4 Deploy a Cloudflare

```bash
npx wrangler login
npm run deploy            # producción estática  → dist/client
npm run deploy:preview    # preview con SSR      → dist/server (worker aparte)
```

Variables a cargar en el worker (`Workers → Settings → Variables`, o `wrangler secret put`):
`PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, `SITE_URL` y —solo en el de
preview— `SANITY_API_READ_TOKEN` y `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true`.

En el build de Cloudflare hay que fijar **`NODE_VERSION=22.22.0`** (Astro 7 no corre con Node 20).

Después del primer deploy: poner `PUBLIC_SANITY_PREVIEW_URL` (URL del worker de preview)
en el entorno del Studio para que el Presentation Tool apunte ahí.

### 2.5 Webhook de publicación (publicar → build)

1. Cloudflare → el proyecto → *Deploy hooks* → crear uno para la rama `main`; copiar la URL.
2. Sanity → `sanity.io/manage → API → Webhooks → Create webhook`:
   - URL: la del deploy hook.
   - Trigger: `Create`, `Update`, `Delete`.
   - Filter: `_type in ["producto","distribuidor","materia","home","contacto","dondeComprar","ajustes"]`.
   - Projection: vacía. HTTP method: `POST`.
3. Publicar cualquier cambio y confirmar que arranca un build (2–4 min, expectativa ya comunicada).

### 2.6 Contraseña de QA

Antes de que el cliente vea la URL, proteger el deploy de QA con Cloudflare Access
(gratis hasta 50 usuarios): el sitio no puede quedar público con los placeholders
marcados en el LEEME del handoff.

## 3. Decisiones tomadas durante la ejecución

1. **Node 22.12+ obligatorio** (Astro 7). Se fija en `.nvmrc`, `engines` y en el build de Cloudflare.
2. **Cloudflare Workers con assets**, no Pages: el adaptador de Astro genera el
   `wrangler.json` final dentro de `dist/` y `wrangler.jsonc` de la raíz aporta nombre,
   `nodejs_compat` y el manejo de 404. Producción y preview son **dos workers distintos**.
3. **Preview = build aparte con `output: 'server'`.** El visual editing exige páginas
   server-rendered; producción sigue siendo 100% estática, como manda la arquitectura.
4. **Modo `placeholder`:** sin proyecto de Sanity el sitio compila igual. Evita que la
   falta de cuentas bloquee el desarrollo.
5. **`baseUrl` fuera del `tsconfig.json`:** con `baseUrl: "."` la carpeta `sanity/` del repo
   tapaba al paquete npm `sanity` y el build fallaba. Los alias se declaran con rutas
   relativas (`"~/*": ["./src/*"]`).
6. **Binarios pesados del handoff fuera de git** (2026-08-25): `design/publicar/uploads/` (103 MB)
   y `design/publicar/assets/catalogo/` (10 MB) quedan en `.gitignore`. El repo versiona el resto
   del handoff —prototipo HTML, specs, `catalogo.json`, GeoJSON, logos SVG— en 2,5 MB. Las fotos
   viven en el disco de trabajo hasta cargarse a Sanity; de ahí en más el respaldo es el export
   del dataset (condición nº2 del plan).
7. **Publicar → build por la opción A** (2026-08-25): Cloudflare conectado al repo de GitHub +
   *deploy hook* llamado por el webhook de Sanity. El cliente nunca toca GitHub: edita, publica y
   el sitio se reconstruye solo.
8. **Studio en modo hash-router** en el build estático (`/admin#/...`), que es el default del
   integrador cuando `output` es estático; en el deploy de preview usa rutas normales.

## 4. Cierre de la fase — cómo se verifica

- [x] `npm run build` y `npm run check` sin errores.
- [x] Home mínima con la cáscara compartida y el 404 propio.
- [x] Sin CDN externo en el HTML construido.
- [ ] `/admin` carga el Studio con el proyecto real y guarda contenido (requiere §2.1–2.2).
- [ ] Click-to-edit desde el Presentation Tool sobre el deploy de preview (requiere §2.3–2.4).
- [ ] Publicar dispara build y el cambio aparece en QA (requiere §2.5).

## 5. Siguiente

**Fase 2 — Diseño a componentes**: llevar cada sección del handoff a bloques Astro
conectados a los schemas ya creados, con los valores exactos de `design/Tokens v0`,
`Primitivas v1` y `Responsividad v0`.
