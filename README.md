# Cerámica Carabobo — sitio

Astro (estático) + Sanity (Studio embebido en `/admin`) + Cloudflare Workers.
La fuente de verdad del proyecto está en `docs/` y `design/`; empezar por
[`docs/plan-proyecto.md`](docs/plan-proyecto.md).

## Requisitos

- Node **22.12+** (`.nvmrc` fija 22.22.0) — Astro 7 no arranca con Node 20.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Sitio en `localhost:4321` y Studio en `localhost:4321/admin` |
| `npm run build` | Build estático de producción (`dist/client/`) |
| `npm run build:preview` | Build server-rendered para visual editing (`dist/server/`) |
| `npm run check` | Tipos y diagnósticos de Astro |
| `npm run deploy` | Build estático + `wrangler deploy` |
| `npm run deploy:preview` | Build de preview + deploy al worker de preview |

## Estructura

```
src/
  theme/          tokens.css (copia literal de design/Tokens v0) + base.css
  lib/queries/    todo el GROQ del proyecto
  lib/data/       adaptador: getProductos(), getHome()… devuelven tipos propios
  components/     shell/ (cabecera y pie que persisten entre navegaciones)
  layouts/        Base.astro — cáscara compartida, SEO, View Transitions
  pages/          una ruta por página del diseño
sanity/           schemas, estructura del Studio y locations para click-to-edit
sanity.config.ts  configuración del Studio embebido
```

Regla del adaptador: **ningún componente importa de Sanity**. Si un dato nuevo
hace falta, se agrega la query en `src/lib/queries/` y la función en
`src/lib/data/`.

Puesta en marcha (cuentas, variables, deploy, webhook): [`docs/fase-1-esqueleto.md`](docs/fase-1-esqueleto.md).
