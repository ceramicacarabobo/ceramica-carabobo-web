# Plan maestro del proyecto — Cerámica Carabobo Web

*Actualizado: 2026-08-25 (5ª ed.: Fase 2 cerrada) · Estado: **Fases 0, 1 y 2 cerradas · Fase 3 (catálogo) en curso** — ver [fase-2-componentes.md](./fase-2-componentes.md), [fase-2-qa-fidelidad.md](./fase-2-qa-fidelidad.md) y [fase-3-catalogo.md](./fase-3-catalogo.md)*
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
| Mapas | ~~MapLibre GL + OpenFreeMap~~ → **SVG con geometría en el bundle** (ver §13.1) | Ni librería ni teselas ajenas |
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
| **2. Diseño a componentes** ✅ | Tokens al theme; cada sección del handoff → bloque Astro conectado a schema (nada hardcodeado) | Admin compone una página nueva con bloques reales |
| **3. Catálogo** ✅ | Producto + atributos en Sanity; listado con filtros client-side; fichas estáticas; imágenes en build; (Pagefind si se pide) | Admin crea/edita/despublica producto, filtrable en el sitio |
| **4. Multiidioma** | i18n rutas + traducción de contenido en Studio + hreflang/sitemap | Sitio en todos los idiomas, traducible desde el admin |
| **5. Puntos de venta + contacto** ✅ (sin receptor) | Colección dealers + mapa **SVG self-hosted, no MapLibre** (ver §13.1) + formulario de contacto | Admin añade punto de venta y aparece en mapa |
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

## 11. Registro de ejecución — Fase 2 (2026-08-25)

1. **Fachada para el video de YouTube.** El cliente entregó el video de instalación alojado en su
   canal (`MkAEfk4V65w`), no como archivo. Un embed normal descargaría scripts de terceros con solo
   abrir la home, lo que choca con la condición §3.3 (autosuficiencia). Decisión: el tile de
   Profesionales es una **fachada** — portada propia, subida a Sanity y procesada en el build, más
   el botón de play del diseño — y el `<iframe>` de `youtube-nocookie.com` se crea **solo cuando el
   visitante pulsa**. Mientras nadie pulse, la página no hace ni una petición fuera de nuestro
   origen; verificado con `scripts/qa/red.mjs` (0 peticiones ajenas antes del clic).
   La miniatura de `i.ytimg.com` **no se enlaza**: se descargó una vez y vive en el CMS.
2. **Precedencia archivo propio > YouTube.** `home.profesionales` acepta las dos formas de cargar
   el video. Si están las dos, gana el `.mp4` propio, porque lo servimos nosotros y no mete a un
   tercero en la página. El adaptador resuelve cuál aplica y entrega `video.tipo`; el componente no
   parsea URLs ni conoce YouTube más allá de ese valor.

## 12. Registro de ejecución — Fase 3 (2026-08-25)

1. **El overlay de la ficha no dibuja una segunda ficha: se trae la página del producto.** Cada
   producto tiene página propia estática e indexable (`/catalogo/<slug>`, decisión cerrada del anexo
   §3-4 de `modelo-de-contenido.md`), y el overlay del catálogo pide esa página por `fetch` y se
   queda con su bloque `[data-ficha]`. Es una petición a nuestro propio origen y a un archivo
   estático: no toca la autosuficiencia (§3.3) ni mete `cdn.sanity.io` en el cliente. Las
   alternativas eran incrustar las 126 fichas en el HTML del catálogo (+300 KB y ~5.000 nodos sobre
   una página que ya pesa 256 KB) o dibujarlas en el navegador, que habría exigido URLs del CMS en
   el cliente. Efecto de fondo: overlay y página propia **son el mismo HTML** y no pueden divergir.
   Si el `fetch` falla, la capa se aparta y el enlace navega — la misma degradación que sin
   JavaScript. Detalle y alternativas descartadas en `docs/fase-3-catalogo.md`, decisión 12.
2. **El estilo de la ficha es CSS global** (`src/components/catalogo/ficha.css`), única excepción a
   los estilos con scope del proyecto: el marcado que entra por `innerHTML` no lleva el atributo de
   scope que Astro le pone al que compila. Por lo mismo, las acciones de la ficha no usan la
   primitiva `Boton`.
3. **Nunca se le pide a `astro:assets` un ancho mayor que el del archivo.** Agrandar no gana nitidez
   y multiplica el build: en el catálogo, el recorte bajó el build de 1.411 imágenes a 967. La
   primitiva `base/Imagen.astro` sigue sin ese recorte y le aplica el mismo defecto — anotado como
   pendiente de la cáscara.

## 13. Registro de ejecución — Fase 5 (2026-08-25)

La Fase 5 se adelantó mientras corría la 3: contacto y dónde comprar se construyeron completas en la
misma tanda que la ficha de producto. Lo que sigue son los cambios que introduce esa ejecución,
registrados acá como manda §9.

1. **Los mapas NO son MapLibre. Son SVG con la geometría en el bundle.** §4 de este plan proponía
   **MapLibre GL + OpenFreeMap** (Protomaps `.pmtiles` como plan B) y la tabla de fases habla de
   "mapa MapLibre". No se usó ninguno de los dos, y la razón es la condición de autosuficiencia
   (§3.3), que no admite matices: *ningún CDN externo en producción*.

   - **Dónde comprar** dibuja las entidades federales con trazados calculados en build por
     `scripts/generar-mapa.mjs` y volcados en `src/components/donde-comprar/geometria.ts` (38 KB).
     El prototipo cargaba d3 y topojson desde unpkg y el GeoJSON desde jsDelivr — tres terceros, y
     el propio prototipo anotaba que uno ya se había roto solo. Como la proyección es fija (Mercator
     ajustada a un viewBox de 800×505), el cálculo se hace UNA VEZ y el mapa entra al HTML ya
     dibujado: en producción no hay librería de mapas ni archivo de geometría que pedir.
   - **Contacto** dibuja el mapa de sedes con el mismo criterio. El prototipo usaba Leaflet de
     unpkg con teselas de `tile.openstreetmap.org`; traer Leaflet desde npm habría resuelto la
     librería y no lo que importa, porque cada tesela sigue siendo una petición a un servidor ajeno
     sin la cual el mapa queda en blanco. Servir teselas propias habría significado versionar
     cientos de PNG por sede y nivel de zoom, con su licencia, para ilustrar dos puntos cuyas
     coordenadas todavía son aproximadas.

   Esto **no reabre** la decisión de §4: MapLibre sigue siendo la respuesta correcta para un mapa
   de calles navegable. Lo que el diseño pide no es eso — es un mapa temático de entidades y un
   localizador—, y para eso la librería sobra. Si más adelante aparece un requisito de mapa
   navegable, MapLibre + Protomaps self-hosted es el camino, no las teselas de terceros.

2. **Venezuela tiene 25 entidades federales, no 26.** El checklist de aceptación (prueba 01) dice
   "los 26 estados" y el prototipo dibujaba 26 formas, pero la 26ª no es un estado: el GeoJSON de
   Natural Earth trae una entidad con `ISO: "VE-X01~"` y `NAME_1: null`, una mancha de 0,28 × 0,21
   unidades en un lienzo de 800×505 — invisible, sin nombre y sin tienda posible. Se colaba porque
   el generador caía al ISO cuando no había nombre, y entraba al mapa como un trazado que el lector
   de pantalla anunciaba "VE-X01~". `scripts/generar-mapa.mjs` ahora la descarta y lo dice al
   generar. El mapa dibuja **23 estados + Distrito Capital + Dependencias Federales = 25**, y la
   prueba 01 comprueba ese número.

3. **El contenido del prototipo ES el contenido real, por ahora** (decisión del usuario,
   2026-08-25). La web tiene que quedar en línea *tal cual el prototipo, con lo que contiene*.
   Después el cliente cambia lo que quiera desde el administrador, o nos entrega el contenido real y
   lo gestionamos nosotros. Consecuencia práctica: los teléfonos, WhatsApp y correos de las tiendas
   de "dónde comprar" son los del handoff (`584141234567` correlativos, `@placeholder.com`) y **eso
   está bien por ahora** — no son datos inventados por la ejecución, son los del diseño. El schema
   `distribuidor` tiene un campo `esEjemplo` justo para marcarlos como pendientes de validar. Los
   pedidos al cliente de `modelo-de-contenido.md` §6 siguen abiertos, pero **ya no bloquean**
   terminar el sitio.

4. **El formulario de contacto queda sin receptor, a propósito** (decisión del usuario,
   2026-08-25). Está construido completo —campos, teclados de móvil, validación, estado de éxito y
   de error— y todo el envío entra y sale por una única función, `src/components/contacto/envio.ts`.
   Mientras no haya receptor, `hayReceptor()` devuelve `false` y el formulario no promete lo que no
   puede cumplir: avisa que hay que escribir o llamar, en vez de decir "gracias" y tirar el mensaje.
   Conectarlo son tres pasos y ningún otro archivo, descritos en la cabecera de ese archivo. La
   decisión de §5.3 de `modelo-de-contenido.md` (Worker de Cloudflare + email con tier gratis, y
   Turnstile como anti-spam) sigue siendo la propuesta; falta el correo destino del cliente.

5. **El entregable de la fase, verificado de punta a punta** (2026-08-25). "Admin añade punto de
   venta y aparece en mapa" se probó creando un distribuidor real en **Cojedes** —un estado que no
   tenía cobertura, para que el cambio fuera inequívoco— con el mismo schema que usa el Studio.
   Tras reconstruir: la tienda entró al índice, **Cojedes ganó su pin** (`<g class="pin"
   data-estado="cojedes">`) y los puntos pasaron de 24 a 25. Después se borró el documento y se
   reconstruyó: 0 menciones, 24 puntos, sin pin en Cojedes. El camino CMS → adaptador → mapa
   funciona en las dos direcciones, alta y baja.

## 14. Registro de ejecución — el preview y el click-to-edit (2026-09-02)

El deploy de preview servía una versión de la Fase 1 y el click-to-edit no había funcionado nunca.
Eran tres fallas encadenadas, y la tercera destapó un defecto del sitio:

1. **Nadie lo redesplegaba.** El worker `qa` se reconstruye solo en cada push (Workers Builds); el
   `preview` solo se actualiza con `npm run deploy:preview`, a mano. Conectarlo también a Workers
   Builds es el arreglo de fondo y sigue pendiente.
2. **El token no llegaba al Worker.** `astro.config.mjs` reinyectaba con `vite.define` solo las
   variables `PUBLIC_`. El token de lectura no lleva ese prefijo, así que
   `import.meta.env.SANITY_API_READ_TOKEN` quedaba `undefined` dentro del Worker —que no tiene
   `process.env`— y el cliente caía a la rama sin borradores. Ahora se inyecta, y **solo en el build
   de preview**: verificado que el build estático de producción no contiene el token en ningún
   archivo.
3. **El token estaba vacío** en `.env`. El de la Fase 1 existía en Sanity pero su secreto nunca se
   guardó, y rotarlo exige el secreto viejo. Se creó uno nuevo con rol *viewer*.

**El defecto que apareció al encender los borradores es del sitio, no del preview.**
`agruparPorEstado` ordenaba con `a.nombre.localeCompare(...)` y un distribuidor sin estado llega con
`null`: la página de dónde comprar reventaba entera (respuesta de 1 byte). El schema exige el estado,
así que ningún documento publicado llega sin él — pero el preview lee BORRADORES, y un borrador a
medias sí puede venir sin estado. Ahora esos puntos se descartan (sin estado no hay grupo ni
dirección `#estado=…`, y el filtro no los alcanza) y el orden tolera nulos.

**Cloudflare Access descartado** (decisión del usuario, 2026-09-02): el QA queda accesible con el
enlace. Los buscadores no lo indexan —`robots.txt` con `Disallow: /` y `noindex, nofollow`,
verificados— pero cualquiera con la dirección entra, y se acepta a propósito. El admin sigue
protegido por el inicio de sesión de Sanity, que es lo que importa para editar.

## 15. Registro de ejecución — las fotos del home (2026-09-03)

El catálogo quedó sin una sola foto de ejemplo; el home se revisó con el mismo criterio, y ahí el
schema **no tiene marca `esEjemplo`**, así que no se podía saber por el dato cuál era prestada. Se
resolvió por procedencia: comprobar si la foto del home **es la misma que una foto real de su
producto**. De las 15 fichas de Ambientes, 10 lo eran; 5 no venían de ningún producto.

1. **Las pestañas de Ambientes son por espacio** (Baños, Salas, Cocinas, Exteriores), así que la
   foto tiene que coincidir con la pestaña, no solo con el producto. Al aplicarlo, 3 de las 5 se
   pudieron reemplazar con un ambiente real del propio producto y del espacio correcto (Cubiro Gris
   → baño, Samán Gris → sala, Catatumbo → el patio de 5060px). Las otras dos no tenían foto de su
   espacio, así que **se cambió el producto de la casilla**, que es una decisión editorial y no
   técnica: entra Livorno Avorio en Baños y Gran Sabana en Exteriores. Sin esto se habría puesto una
   habitación en la pestaña de Baños y un comedor en la de Exteriores.
2. **Los `alt` nombran el espacio.** Los diez que venían del PDF decían "Ambiente con X" y ahora
   dicen "Baño con X", "Cocina con X". El dato estaba en la pestaña y se perdía para quien usa
   lector de pantalla.
3. **Efecto de fondo: el home ya no es solo Serie Venezuela.** Las 15 fichas lo eran; ahora entran
   dos de la Regular. El home muestra el portafolio, no una serie, así que es correcto — pero es un
   cambio de criterio que conviene saber.
4. **El hero NO se toca** (decisión del usuario). Sus tres capas usan productos de la Serie
   Venezuela, justo donde las fotos nuevas del cliente son de MENOR resolución que las que ya
   había: sustituirlas empeoraría lo primero que se ve. Quedan a la espera de que el cliente
   entregue esas tres en alta y horizontales.
5. **Historia queda pendiente** (decisión del usuario). Sus cinco imágenes son de ejemplo y ninguna
   viene de un producto. Solo dos hitos admiten sustituto honesto —2015 "Gran formato", porque el
   texto habla de 60×120 y tenemos ambientes de ese formato, y 2026 "El portafolio hoy"—. Los de
   1978 y 1996 hablan de hornos de rodillos y líneas de producción: poner una baldosa ahí engañaría
   en vez de ilustrar. Son material de fábrica que solo tiene el cliente.
6. **Encuéntranos NO era una foto prestada**: sale de Adícora Beige. Lo que estaba mal era su texto
   alternativo, que decía "Ambiente con porcelanato de la red de distribuidores" cuando no es la
   sala de exhibición de ningún distribuidor. Corregido a "Ambiente con Adícora Beige". Lo que falta
   ahí sigue siendo lo que ya anotaba el diseño: una foto de tienda real.
