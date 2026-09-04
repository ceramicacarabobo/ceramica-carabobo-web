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

## 1.bis Datos del entorno de QA (creado el 2026-08-25)

| Qué | Valor |
|---|---|
| Repositorio | `git@github.com:freddyc26/ceramica-carabobo-web.git` (privado, rama `main`) |
| Organización de Sanity | `ozx400x1m` — "Ceramica Carabobo" |
| Proyecto de Sanity | **`egpui9al`**, dataset `production` (público) |
| Cuenta de Cloudflare | `ad857af1656d828f42c5bc88253e8cd4` |
| Worker del sitio (QA) | `qa` → https://qa.ceramica-carabobo.workers.dev |
| Worker de preview | `preview` → https://preview.ceramica-carabobo.workers.dev |

**Si el build sale verde pero el despliegue falla** (2026-09-04). Workers Builds separa las dos
etapas y el panel las junta bajo un mismo "latest build failed", así que el rótulo engaña. Pasó con
un `504 Gateway Timeout` de la propia API de Cloudflare en el paso de subida:

```
[build] 132 page(s) built in 1m 33s
Success: Build command completed
Executing user deploy command: npx wrangler deploy…
✘ ERROR: Received a malformed response from the API
  GET /accounts/…/workers/services/qa -> 504 Gateway Timeout
```

No es del repositorio ni de recursos. Se resuelve desplegando el artefacto ya construido a mano:

```
npm run build && npx wrangler deploy -c dist/client/wrangler.json
```

Y **antes de diagnosticar, leer el log del build en el panel**: el mensaje que muestra la lista de
builds es el TÍTULO DEL COMMIT, no el error. Confundirlos cuesta un rato de hipótesis inútiles.

**El caché de build de Cloudflare está activo desde el 2026-09-03** y el efecto es grande: el build
pasó de 35 minutos a **1m 33s** con las 2.211 imágenes en `reused cache entry`. Con eso se cumple la
expectativa de "publicar tarda 2 a 4 minutos" que se le comunicó al cliente, ya con el catálogo
completo cargado.

**El preview se conecta a Workers Builds igual que el `qa`, pero con otra configuración** (2026-09-04):
comando de build `npm run build:preview`, despliegue
`npx wrangler deploy -c dist/server/wrangler.json --name preview`, y la variable
`SANITY_API_READ_TOKEN` como **secreto de BUILD** — no como variable del Worker: el token se
inyecta al compilar (`astro.config.mjs`, `vite.define`), así que en tiempo de ejecución ya está
dentro del bundle. Si se pone en el sitio equivocado, el preview se despliega sin borradores y sin
click-to-edit, **sin dar ningún error**.

Cloudflare avisa de que `wrangler.jsonc` dice `"name": "qa"` y ofrece un PR para cambiarlo a
`"preview"`. **Ese PR NO se fusiona**: el archivo es compartido por los dos workers y renombrarlo
rompería el despliegue del `qa`, que es el que ve el cliente. El `--name preview` del comando ya
manda sobre el archivo.
| Orígenes CORS con credenciales | `localhost:4321`, worker de producción, worker de preview |
| Token de lectura | etiqueta `preview-visual-editing`, rol *viewer* (guardado solo en `.env`) |

Las credenciales viven en `.env`, que no se versiona. Para reconstruir el entorno en otra
máquina: copiar `.env.example`, completar y `npm ci`.

## 2. Estado de la puesta en marcha

Hecho el 2026-08-25 (§1.bis tiene los valores):

- [x] Sesión de Sanity en el VPS (`sanity login --no-open --provider google`).
- [x] Organización, proyecto `egpui9al` y dataset `production` creados.
- [x] Orígenes CORS con credenciales para local, producción y preview.
- [x] Token de lectura *viewer* para el preview.
- [x] Repositorio en GitHub y primer push.
- [x] Worker de producción desplegado (estático) y worker de preview desplegado (SSR).
- [x] 404 del servidor sirviendo la página 404 del sitio; rutas sin barra final.

Queda un paso manual y dos que dependen de él:

### 2.1 Conectar el repositorio con Workers Builds (requiere un clic tuyo)

Panel de Cloudflare → *Compute (Workers)* → `qa` → *Settings → Build* →
*Connect to Git* → autorizar GitHub → elegir `freddyc26/ceramica-carabobo-web`, rama `main`.
Es un permiso OAuth entre Cloudflare y GitHub: no existe por API.

Configuración de los disparadores (ajustada por API; el valor por defecto de Cloudflare no
sirve porque no encuentra el `wrangler.json` que genera Astro):

| Disparador | Build | Deploy |
|---|---|---|
| rama `main` | `npm run build` | `npx wrangler deploy -c dist/client/wrangler.json` |
| otras ramas | `npm run build` | `npx wrangler versions upload -c dist/client/wrangler.json` |

Si algún día se vuelve a conectar el repositorio, hay que rehacer este ajuste.

**No hacen falta variables en el panel.** Workers Builds detecta Node 22.22.0 desde el `.nvmrc`
del repositorio, y la configuración pública (projectId, dataset, URLs) vive versionada en
`.env.production`. Los secretos nunca se versionan.

Verificado el 2026-08-25: push a `main` → build `ac423b2f` → deploy correcto.

**Renombrado del 2026-08-25:** el subdominio de la cuenta pasó a `ceramica-carabobo` y los workers
a `qa` y `preview` (Cloudflare no renombra: se desplegaron con el nombre nuevo y se borraron los
viejos). Consecuencia: la conexión con GitHub, que colgaba del worker anterior, hay que rehacerla
sobre `qa`.

### 2.2 Deploy hook + webhook de Sanity — HECHO

*Deploy hook* creado en Workers Builds (rama `main`) y webhook de Sanity apuntando a esa URL
(`gbJTXgX7yTpjeWL4`, visible en `sanity.io/manage → API → Webhooks`):

- Dispara en `create`, `update`, `delete`.
- Filtro: `_type in ["producto","distribuidor","materia","home","contacto","dondeComprar","ajustes"]`.
- Proyección `{_id, _type}`, método `POST`, `includeDrafts: false` — escribir sin publicar no gasta builds.

**Ciclo verificado el 2026-08-25**: publicar un documento → build `5364cac2` con origen
`deploy_hook` → sitio actualizado. Del lado del editor, publicar y esperar 2–4 minutos.

El esquema del webhook no es obvio: los eventos y el filtro van anidados en `rule`
(`{"type":"document","rule":{"on":[…],"filter":"…","projection":"…"},"apiVersion":"v2021-03-25"}`).

### 2.3 Contraseña del QA

Cloudflare Access (gratis hasta 50 usuarios) sobre los dos workers. El sitio no puede quedar
público con los placeholders que marca el LEEME del handoff.

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
- [x] Sitio en línea en Cloudflare con el 404 propio y rutas limpias.
- [x] `/admin` desplegado y apuntando al proyecto `egpui9al`.
- [x] Iniciar sesión en `/admin`, crear y publicar un documento (verificado con un distribuidor).
- [x] Push a `main` dispara build y despliegue automáticos.
- [x] Publicar en Sanity dispara build y el cambio aparece en el sitio.
- [ ] Click-to-edit desde el Presentation Tool sobre el worker de preview (verificación humana).
- [ ] Contraseña del QA con Cloudflare Access (§2.3), antes de compartir la URL con el cliente.

## 5. Siguiente

**Fase 2 — Diseño a componentes**: llevar cada sección del handoff a bloques Astro
conectados a los schemas ya creados, con los valores exactos de `design/Tokens v0`,
`Primitivas v1` y `Responsividad v0`.
