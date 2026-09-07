# Infraestructura de producción — cuentas, IDs y procedimientos

*Creada el 2026-09-07, al migrar de las cuentas del desarrollador a las del cliente.*

Este documento existe para que **cualquiera pueda resolver una incidencia sin depender de quien
montó esto**. Están los identificadores, cómo se creó cada pieza y qué hacer cuando algo falla.

## 1. Las cuentas

Las tres a nombre del cliente, correo **`ceramicacarabobo.rrss@gmail.com`**, con el desarrollador
invitado. Es una decisión del plan maestro (§4) y tiene un motivo concreto: **Cloudflare no permite
transferir proyectos entre cuentas**, así que si producción hubiera nacido en la cuenta del
desarrollador, moverla después habría significado recrearla y reapuntar el dominio.

| Servicio | Identificador | Dónde se administra |
|---|---|---|
| **Sanity** | proyecto `dnjm4k7p`, dataset `production` (público) | sanity.io/manage |
| **GitHub** | `ceramicacarabobo/ceramica-carabobo-web` (privado) | github.com |
| **Cloudflare** | cuenta `3cdd63318956d18e8cefaf1ba9833af6` · worker `prd` | dash.cloudflare.com |

Dirección temporal: **https://prd.ceramicacarabobo.workers.dev**
El subdominio de la cuenta es `ceramicacarabobo`; el nombre del worker sale de `wrangler.jsonc`
(`"name": "prd"`), y de la unión de los dos sale la dirección.

## 2. Cómo se conecta todo

```
El cliente edita en /admin  →  publica
                                  ↓
                     Webhook de Sanity  (id xvE1lz6wxH235nID)
                                  ↓
                     Deploy hook de Cloudflare
                                  ↓
                     Workers Builds:  npm run build
                                      npx wrangler deploy -c dist/client/wrangler.json
                                  ↓
                     Sitio actualizado  (2–4 minutos)
```

El cliente **nunca toca GitHub**. Edita, publica y espera.

### El webhook, con sus valores exactos

`sanity.io/manage → API → Webhooks`. Si hay que recrearlo:

| Campo | Valor |
|---|---|
| Name | `deploy` |
| URL | el *deploy hook* de Cloudflare (ver abajo cómo obtenerlo) |
| Dataset | `production` |
| Trigger on | Create · Update · Delete |
| Filter | `_type in ["producto","distribuidor","materia","home","contacto","dondeComprar","ajustes"]` |
| Projection | `{_id, _type}` |
| HTTP method | `POST` |
| **Include drafts** | **desactivado** |

Los dos últimos campos no son decorativos. El **filtro** evita que cambios internos de Sanity
disparen builds; **`includeDrafts` desactivado** evita que cada tecla que el cliente escribe sin
publicar gaste un build de la cuota gratuita.

El *deploy hook* de Cloudflare se crea en `Workers & Pages → prd → Settings → Builds → Deploy hooks`,
sobre la rama `main`. Da una URL de la forma
`https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/<uuid>`.

## 3. Credenciales: qué existe y para qué

**Nada de esto está en el repositorio.** El `.gitignore` cubre `.env*`.

| Dónde | Qué | Para qué |
|---|---|---|
| `.env` | proyecto y tokens de Sanity | desarrollo y scripts de carga |
| `.env.cliente` | token y cuenta de Cloudflare | desplegar a mano |
| `.env.production` | **sin secretos**, se versiona | lo que lee el build |
| `~/.config/sanity/config.json` | sesión de la CLI de Sanity | **la que más sirve**: ver §4 |

### La sesión de la CLI es la llave maestra

Los tokens de API de Sanity que se crean en el panel son de **contenido**: leen y escriben
documentos, pero **no pueden tocar la configuración del proyecto** (CORS, webhooks, miembros).
Intentarlo devuelve `User must have grant sanity.project.webhooks/create`.

La sesión de la CLI (`npx sanity login`) **sí tiene esos permisos**. Con ella se hizo el webhook,
sin necesidad de crear un token de administrador —que habría podido borrar el proyecto entero—.

Si la sesión se pierde: `npx sanity login`, se elige "Email/Password" o el proveedor que
corresponda, y se entra con la cuenta del cliente.

## 4. Recetas para incidencias

### El sitio no se actualiza después de publicar

1. **¿Se disparó el webhook?**
   ```bash
   TOK=$(python3 -c "import json; print(json.load(open('/root/.config/sanity/config.json'))['authToken'])")
   curl -s "https://api.sanity.io/v2021-10-04/hooks/projects/dnjm4k7p/xvE1lz6wxH235nID/attempts" \
     -H "Authorization: Bearer $TOK" | head -c 400
   ```
   Un intento con `resultCode: 200` significa que Cloudflare lo recibió.
2. **¿El build corrió?** `Workers & Pages → prd → Builds`.
3. Si el panel dice *"latest build failed"*, **leer el log**: puede ser el DESPLIEGUE y no la
   construcción. Se rescata a mano con el comando de §5.

### Desplegar a mano, sin esperar al webhook

```bash
export $(grep -v '^#' .env.cliente | xargs)
NODE_ENV=production npm run build
npx wrangler deploy -c dist/client/wrangler.json
```

### Restaurar el contenido

El respaldo del dataset se genera con `npm run sanity:export`. Para restaurarlo:

```bash
npx sanity dataset import <archivo.tar.gz> production -p dnjm4k7p
```

El export incluye los archivos (imágenes y videos), no solo los documentos.

### Agregar un dominio al CORS de Sanity

Sin esto el `/admin` no carga contenido desde ese dominio:

```bash
npx sanity cors add https://EL-DOMINIO --credentials -p dnjm4k7p
npx sanity cors list -p dnjm4k7p
```

## 5. El día del cambio de dominio

El dominio del cliente todavía apunta a su sitio anterior. **Ese cambio es una operación aparte**,
y hasta que ocurra este sitio vive en la dirección temporal.

En orden:

1. Apuntar los DNS del dominio a Cloudflare (hoy están en Hostinger).
2. Agregar el dominio al worker `prd` en Cloudflare.
3. En `.env.production`: `SITE_URL` y `PUBLIC_SANITY_STUDIO_URL` al dominio real.
4. **`PUBLIC_ENTORNO="produccion"`** — es lo único que levanta el bloqueo de indexación.
5. Agregar el dominio real al CORS de Sanity (§4).
6. Desplegar y verificar.
7. **Comprobar en vivo los 575 redirects 301.** Es el punto delicado: si fallan, los buscadores
   pierden todas las direcciones indexadas del sitio anterior.
8. Recién entonces: activar HSTS (`public/_headers`, empezando por `max-age=86400`) y pasar la CSP
   a modo bloqueo (`CSP_MODO=bloqueo npm run build`).
9. Cancelar el plan de WordPress en Hostinger.

## 6. Lo que quedó del entorno de pruebas

El QA sigue vivo en la **cuenta personal del desarrollador**
(`qa.ceramica-carabobo.workers.dev`, proyecto Sanity `egpui9al`) y su repositorio es el remoto
`origin`. Producción es el remoto `cliente`.

Los dos repositorios **divergen a propósito** en un commit: el que renombra el worker de `qa` a
`prd`. Si ese commit llegara al QA, su siguiente build crearía allí un worker `prd` nuevo y dejaría
el `qa` huérfano.

Mientras los dos convivan, los cambios se suben a los dos:

```bash
git push cliente main    # producción
git push origin main     # QA
```

Cuando producción esté verificada, el QA se puede apagar y esto deja de aplicar.
