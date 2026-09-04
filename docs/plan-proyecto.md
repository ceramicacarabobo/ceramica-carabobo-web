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

## 16. Registro de ejecución — se retira el preview (2026-09-04)

**El deploy de preview se abandona.** No es un fallo de configuración: es un techo del plan gratuito
de Cloudflare Workers.

El preview existía para ver BORRADORES antes de publicar, con click-to-edit. Eso exige un deploy
**server-rendered** —el sitio de producción es estático— y, encima, el click-to-edit inyecta marcado
invisible en cada cadena de texto: la página de dónde comprar llegaba a 12 MB y casi 4 millones de
caracteres invisibles. Renderizar eso en cada petición se pasa del límite de CPU por petición del
plan gratuito, y el worker respondía **503 en todas sus rutas**.

Estuvo al filo mucho tiempo y lo cruzó al cargar el catálogo completo y los 226 distribuidores.

**Lo que se retira:**
- El `presentationTool` del Studio. Apuntaba al worker caído: dejarlo habría puesto un panel roto
  dentro del admin que usa el cliente.
- La inyección de `SANITY_API_READ_TOKEN` en `astro.config.mjs`, que solo servía a ese build.
- `PUBLIC_SANITY_PREVIEW_URL` de `.env.production` y los scripts `build:preview` / `deploy:preview`.

**Lo que NO se retira**, porque no era del preview aunque se descubriera por él: la guarda de
`agruparPorEstado` ante un distribuidor sin estado. El sitio reventaba entero con una ficha a medio
escribir y eso sigue siendo un defecto propio.

**Qué se pierde y qué no.** Se pierde ver un borrador antes de publicar. No se pierde nada del
checklist de aceptación ni de los entregables de ninguna fase: el preview era una comodidad, no un
requisito. El ciclo editar → publicar → ver tarda ~3 minutos con el caché de build activo, y
publicar es reversible.

**Si algún día se quiere recuperar**, las salidas son el plan de pago de Workers (~5 USD/mes, sube el
límite de CPU) o limitar el preview a las páginas ligeras. Ambas contradicen la premisa de
presupuesto cero, así que la decisión es del cliente, no técnica.

---

## 17. Registro de ejecución — marcador de carga de imagen (2026-09-04)

Primer punto de la auditoría de movimiento (`docs/pendientes.md`, prioridad 1). Lo que faltaba no
era calibración: el marco y la foto son **dos animaciones separadas** y solo estaba construida la
del marco. Con `loading="lazy"` el navegador decide cuándo pedir la foto, así que el marco entraba
visible mientras la imagen todavía bajaba y se la veía materializándose dentro de una caja opaca.

**Qué se hizo.** Tres piezas:

- `src/components/base/Imagen.astro` marca con `data-img` las fotos **diferidas** (no las de
  `prioridad`: los cuatro heroes son `eager` y tienen su propia entrada). Arrancan en opacidad 0 y
  se funden a 1 en 320ms con `--ease-out` cuando termina la descarga; hasta entonces se ve la
  superficie neutra del marco (`#ECE9E4`).
- El script del mismo componente marca `data-lista`. Comprueba `complete && naturalWidth` **antes**
  de escuchar `load`: si la foto viene de caché ese evento no llega y la imagen quedaría en 0 para
  siempre. Si la descarga falla, marca `data-falla` y la oculta — queda la superficie del marco, no
  el icono de imagen rota.
- La bandera `html[data-fundido]` se prende en el `<head>` de `src/layouts/Base.astro`, **síncrona**.
  Tuvo que ir ahí y no en el script del componente: los scripts de Astro son diferidos y el navegador
  ya habría pintado las fotos, que se verían apagarse. Se vuelve a poner en `astro:after-swap` porque
  el cambio de página con View Transitions copia los atributos de `<html>` del documento nuevo y
  borra este. Con `prefers-reduced-motion` no se prende: sin bandera no hay regla y las fotos se ven
  de una — igual que sin JavaScript.

Es la misma bandera que ya usaba la grilla del catálogo (`Catalogo.astro` + `Tarjeta.astro`), que
conserva su propio marcado porque arma el `<picture>` aparte y usa la curva editorial del prototipo
del catálogo. La curva de `Imagen.astro` es `--ease-out` porque esa es la del `[data-img]` del
prototipo del **home**, que es donde se midió la auditoría.

**Verificado** sobre el build, con el servidor local: 32 fotos diferidas en el home, ninguna de las
`eager` marcada; con la red frenada la primera está en opacidad 0 con `opacity .32s
cubic-bezier(.2,0,0,1)`; recorrida la página, las 16 que llegaron a cargar quedan marcadas y en
opacidad 1; abortando las descargas, las 13 rotas quedan en `display:none` sobre el marco
`rgb(236,233,228)`; la bandera sobrevive a navegar a `/catalogo` con el enrutador; y con movimiento
reducido no hay bandera y la foto nace visible. El checklist de aceptación sigue en **11 en verde y
la 03 medida sin veredicto** (la 09, "con movimiento reducido nada se anima", incluida).

Quedan los puntos 2 a 6 de la auditoría: alcance de los reveals, carrusel apilado del hero, máscara
y filete, parallax y la regla global de movimiento reducido.

---

## 18. Registro de ejecución — las cuatro capas de movimiento (2026-09-04)

Puntos 2 a 6 de la auditoría de movimiento. El diagnóstico de fondo era correcto: estaba construida
una sola capa —el fundido— y el diseño pide cuatro, cada una con sus propios valores.

### Una bandera para todo el movimiento

`html[data-movimiento]`, que prende el `<head>` de `Base.astro` de forma síncrona, significa "hay
JavaScript y el visitante no pidió menos movimiento". De ella cuelgan **los estados iniciales** —los
que dejan algo invisible o recortado— de las cuatro capas. Sin JavaScript, o con movimiento
reducido, no existe la bandera y todo nace en su estado final: nada queda invisible ni recortado por
un script que no llegó. Reemplaza a la `data-fundido` que había puesto el marcador de imagen (§17);
la grilla del catálogo conserva la suya, que es local y ya tenía su propia guarda.

### Punto 2 — alcance de los reveals (`revealsAlcance: intermedio`)

Se funden **solo los cinco encabezados de apertura** del home: Ambientes, Cita, Proyectos,
Profesionales y Encuéntranos. Los otros cuatro usos de `Reveal` eran contenido repetido —el track de
Ambientes, las filas de Proyectos, el tile de video y el panel de la red— y ahora entran ya visibles,
conservando únicamente máscara y filete. Envolver listas enteras en un fundido es lo que hacía que
la página se leyera como una sola capa de movimiento.

Dos de esos cuatro envoltorios no tenían estilos propios (el de Ambientes y el de Encuéntranos):
desaparecieron. Eso permitió, además, quitar tres `:global()` de `Proyectos.astro` que existían solo
porque `Reveal` no reenvía el scope de Astro.

### Punto 3 — carrusel del hero, apilado

La capa saliente se queda **opaca debajo** (`data-previa`, z-index 1, sin transición) y solo la
entrante sube 0→1 en **1200ms** con la curva editorial. Con el cruzado el navegador promedia dos
luminancias y el punto medio pasaba por gris.

Probándolo aparecieron **dos defectos propios**, ninguno de movimiento:

- **El recorrido automático pasaba por un estado inexistente.** Avanzaba con `capas.length`, que
  cuenta ELEMENTOS y no estados: el estado 0 lo pintan dos (el póster y el video encima). Con cuatro
  estados y cinco elementos, el ciclo iba 0→1→2→3→**4**, donde ninguna capa queda activa: el hero se
  quedaba en el gris del fondo una vuelta entera de nueve segundos. Ahora cuenta valores distintos de
  `data-capa`. Verificado: 0 → 1 → 2 → 3 → 0 en 42 s de observación.
- **Repetir el estado actual rompía el relevo.** En escritorio el puntero entra al indicador (que ya
  cambia el estado) y después hace clic: la segunda llamada borraba la marca de capa saliente en
  mitad del fundido y la de abajo desaparecía de golpe. `mostrar()` ahora descarta el estado repetido.

### Punto 4 — máscara y filete

No existían. Van como primitivas globales en `theme/base.css`, porque las lleva el elemento propio de
cada componente y no un envoltorio común:

- `data-mascara` — `clip-path: inset(0 0 14% 0)` → `inset(0)`, 660ms, curva editorial. Excepción
  declarada a "solo opacity/transform", limitada a reveals de imagen. La llevan la foto de cada obra
  de Proyectos, el tile de video de Profesionales y el panel de la red de Encuéntranos.
- `data-filete` — `background-size: 0 1px` → `100% 1px`, 660ms, misma curva, **120ms de retardo**. Lo
  llevan las filas de Proyectos. **Reemplaza al `border-top`**: un borde no se puede dibujar de
  izquierda a derecha, y además ocupaba 1px de caja que el prototipo no gasta — por eso la sección
  pasó de medir 2px de más a **coincidir exacto** con el prototipo (1289px las dos).

Las abre el mismo observador de `Reveal.astro`, con el mismo umbral (−14%) y una sola vez. Es el
único observador de entrada del sitio.

### Punto 6 — reduced-motion global: ya estaba

**El auditor se equivocó.** La regla global a 1ms existe desde el principio en `theme/tokens.css`
§ final (`*,*::before,*::after { animation-duration:1ms; animation-iteration-count:1;
transition-duration:1ms }`), que es copia literal del documento de diseño. No estaba "solo en Reveal
y 7 componentes": esos son guardas adicionales de cada componente. Medido en el navegador: con
`prefers-reduced-motion` la duración computada de las transiciones es 0.001s.

### Punto 5 — parallax: no está en el prototipo tampoco

**Hay que decidirlo, no implementarlo a ciegas.** El prototipo declara el parallax (`parallaxActivo`
por defecto en `true`, el método `queueParallax` con el ±4,5%, transform puro, apagado en móvil y con
reduced-motion) pero **nunca lo conecta**: `parallaxRef` se expone en `renderVals` y no aparece en
ningún elemento del markup, así que `this.parEl` queda `undefined` y el método sale en la primera
línea en cada scroll. Es decir: **el prototipo servido, que es la referencia de fidelidad, no hace
parallax en ninguna banda**.

Implementarlo sería apartarse de la referencia, no acercarse. Y la regla del handoff no dice cuál de
las bandas a sangre lo lleva. Queda como decisión del usuario: o se descarta (el diseño en marcha
nunca lo mostró) o se elige la banda y se implementa contra la regla escrita, no contra el prototipo.

### Verificación

Checklist de aceptación: **11 en verde, la 03 medida sin veredicto** — sin cambios. Medido además en
el navegador sobre el build: cinco aperturas fundiendo y los cinco bloques repetidos en opacidad 1 y
sin desplazamiento; máscara `inset(0 0 14%)` → `inset(0)` con `clip-path 0.66s cubic-bezier(.37,0,
.63,1)`; filete `0px 1px` → `100% 1px` con 0.12s de retardo y `linear-gradient(#D9D9D9,#D9D9D9)`;
`border-top` de las filas en 0px; capa saliente del hero en opacidad 1 y z-index 1 mientras la
entrante sube con `1.2s cubic-bezier(.37,0,.63,1)`. Sin JavaScript y con movimiento reducido: todo en
su estado final (`clip-path: none`, filete entero, aperturas visibles).

---

## 19. Registro de ejecución — tramo central del home, Propuesta 1 v2 (2026-09-04)

Importado del proyecto de diseño con el MCP de Claude Design. El paquete vive en
`design/handoff-p1-v2/README.md` y la referencia servible en
`design/publicar/Propuesta 1 v2.dc.html`, al lado de la v1, que **sigue vigente** para todo lo que
no cambia. Comprobado: la v1 del paquete es byte a byte igual a la que ya teníamos, así que el diff
entre las dos delimita exactamente el alcance y la línea base de fidelidad de la Fase 2 sigue valiendo.

### Alcance

No es un rediseño. **Sale 02 · Proyectos, entra 02 · Compara, entra una banda a sangre nueva y
Historia cambia de mecanismo.** Renumeración 01 Ambientes · 02 Compara · 03 Historia ·
04 Profesionales · 05 Encuéntranos. Todo lo demás —telón, headers, megamenú, menú móvil, hero,
Ambientes, la cita, Profesionales, Encuéntranos, pie, cromo y tokens— queda idéntico.

### 02 · Compara (`components/home/Compara.astro`)

Comparador de arrastre, dos filas, la segunda espejada en desktop. La capa de encima se recorta con
`clip-path` desde la derecha y ocupa el lado izquierdo. Mientras se arrastra no hay transición (con
ella la imagen va 180ms por detrás del dedo); al soltar vuelven los 180ms de la curva de interfaz.
Teclado ←/→ 2%, Shift 10%, Home/End a los extremos, `role="slider"` con `aria-valuenow`.

**Estado degradado por instancia**: si una capa no carga, esa fila pierde el mecanismo y queda como
foto legible —`role="img"`, fuera del tabulador, sin `touch-action`— y el pie pasa a nombrar el
diseño que quedó con su spec leída del catálogo. La otra fila sigue viva.

### Banda de obra (`components/home/BandaObra.astro`)

Franja a sangre entre Compara e Historia. La macro **se repite a lo ancho** (`repeat-x`,
`background-size: auto 100%`), no se estira: estirada queda blanda y sin juntas. Va por
`background-image` y no por `<img>` porque `repeat-x` no existe para imágenes; por eso pide la URL
procesada a `astro:assets` a mano. La capa sobresale 5% arriba y abajo para que el parallax no
descubra el borde.

**Acá se resuelve la decisión D1 del parallax**: el mecanismo no tenía consumidor porque la banda a
sangre a la que servía había desaparecido en una recomposición. Esta banda lo revive. Implementado
con `requestAnimationFrame` (el prototipo escribe en el handler de scroll porque en su entorno rAF
no ejecuta callbacks — fontanería de ese entorno, no diseño), ±4,5% del alto, transform puro,
apagado en móvil y con movimiento reducido.

### 03 · Historia (`components/home/Historia.astro`, reescrito)

Sale el hilo conducido por scroll (100vh + 5×40vh) y entra un índice con riel de cinco miniaturas.
El hito cambia al pasar el cursor y al enfocar, sin clic; clic y Enter/Espacio hacen lo mismo. No
hay auto-avance (decisión del cliente). **Con esto el sitio ya no tiene ninguna sección que fije el
scroll**: se cierra la única excepción de movimiento que quedaba.

Las cinco fotos se relevan con el **fundido apilado del hero** y van por `background-image`: con
`<img>` el marcador de carga (§17) pelearía con la opacidad del fundido. Por lo mismo, las
miniaturas inactivas se atenúan con un velo encima y no bajándole la opacidad a la foto.

### Modelo de contenido

- **`comparacion`** (objeto nuevo) — cada par referencia DOS productos y lleva DOS fotos de ambiente.
  El nombre, la spec (`formato` + `brillo`) y la macro **se leen del producto**: el editor carga dos
  fotos por par, no cuatro, y no puede desincronizar una spec del catálogo. Las fotos de ambiente sí
  van por par porque el comparador exige el MISMO ENCUADRE entre las dos, y la que cada producto
  trae en su ficha está tomada desde otro ángulo.
- **`banda`** — un `reference` a producto. Su macro y su rótulo salen de ahí.
- **`historia.etiqueta`** — la sección estrena numeral: el viejo `titulo` ("Historia") pasa a
  etiqueta y el título toma el h2 del diseño.
- **`proyectos` se conserva** con su contenido y pasa a llamarse "Proyectos (no se muestra)" en el
  Studio. Decisión del usuario: se borra cuando la versión definitiva esté confirmada. Salió por
  falta de material fotográfico de obra, no porque sobre.
- Carga con `scripts/importar-tramo-v2.mjs`, que hace `patch().set()` de los tres campos y **no
  toca el resto del singleton** — `importar-contenido.mjs` hace `createOrReplace` del documento
  entero y acá borraría todo lo cargado después.

### Dos hallazgos de la implementación

1. **El estado degradado del comparador entra en bucle infinito en un navegador real.** En el
   prototipo el `onError` vuelve a marcar la fila en cada render y el ref se recrea con él: React
   aborta con "Maximum update depth exceeded" y la página queda en blanco. Se disparó solo, por una
   foto que falta. Acá la marca es idempotente (el propio atributo hace de guarda). **Conviene
   avisarle al lado de diseño.**
2. **`avila-geometrico-cliente-espejo.jpg` no se pudo importar por el MCP**: pasa de 256 KiB y la
   lectura se corta ahí. Mientras faltó, el cargador la tuvo en una lista `SUSTITUTOS` que **impide
   subir al CMS** cualquier archivo que no sea material del cliente, y el par Ávila Gris / Ávila
   Geométrico quedó sin cargar en vez de subir una foto fabricada. **El usuario la subió a mano el
   mismo día** (2384×1760, misma proporción que su par) y el par entró: la lista quedó vacía y la
   sección muestra las dos filas.

Descartado por el usuario el aviso del handoff sobre "Sanare Marrón": el nombre sí corresponde a su
foto y la banda usa esa macro.

### Verificación

**Fidelidad al píxel contra el prototipo v2, a 1504, 1024 y 390** — Compara entera (1366px a 1504,
el número del handoff), su cabecera, las dos filas, los dos comparadores, las columnas de macros, la
baldosa, la manija, el pie de figura, la banda, Historia entera, su cabecera, su grilla y su riel:
**todos coinciden exactamente en los tres anchos**. La segunda fila queda espejada en desktop
(comparador en x=560, macros en x=72) y los dos comparadores se arrastran independientes. Dos diferencias de 2px
aparecieron y se corrigieron: el pie de figura declara `line-height: 1.5` y el token está
redefinido a `normal` en `base.css` (manda la página, `Tokens v0` §10), y la manija mide 40px más su
borde porque en el prototipo la caja es content-box.

Checklist de aceptación: **11 en verde, la 03 medida sin veredicto**. El recorrido con teclado pasó
de 33 a **44 paradas** (los dos comparadores, las cinco miniaturas y las cuatro macros). Medido además: el
divisor y el borde del recorte coinciden dentro de 1px en todas las posiciones; el relevo de
Historia deja la capa saliente opaca en z-index 1 mientras la entrante sube; el parallax da −8,2px
entrando y +6,7px saliendo sobre un tope de ±13,5px, y no corre ni en móvil ni con movimiento
reducido; y los dos casos de capa caída nombran el diseño correcto sin tumbar la página.

---

## 20. Auditoría de estados y tanda 1 de correcciones (2026-09-04)

### Por qué

Seis defectos aparecidos el mismo día —menú móvil anclado al pie y en burdeos, portada del video sin
centrar, umbral del header en 8px, banda que aparece de golpe— compartían una causa. La Fase 2 midió
la fidelidad **por sección y en capturas quietas**, y por eso las secciones dan al píxel. Lo que
depende de una **acción** (bajar, abrir un panel, cambiar de ancho) se verificó de forma funcional
—¿abre?, ¿cierra?, ¿mide 44px?— pero **nunca se comparó contra el prototipo**. Ahí se coló todo.

### La auditoría

Tres subagentes en paralelo, por zonas que no se pisan (cabecera · capas y pie · estados
interactivos de las secciones), midiendo contra el prototipo a 1440, 1024 y 390. Se les pidió
**medir, no juzgar**: reportar el número de los dos lados, clasificar cada diferencia en (a)
implementación, (b) selectores que no apuntan a lo mismo, (c) contenido distinto, y buscar si había
decisión registrada. El juicio quedó del lado de la coordinación.

**109 comprobaciones, 21 diferencias reales.** Repartidas de forma muy desigual:

| Zona | Comprobaciones | Diferencias |
|---|---|---|
| Secciones y sus estados interactivos | ~25 | **2** |
| Cáscara (cabecera, megamenú, menú móvil, pie) | ~84 | **19** |

### Los tres antipatrones, con evidencia

1. **Token elegido por NOMBRE y no por VALOR.** Los enlaces del menú móvil usaban
   `--text-title-sm` ("título light de card", 300). El que correspondía es `--text-heading-lg`, que
   es calco carácter por carácter de lo que declara el prototipo. Mismo patrón en Encuéntranos:
   `--color-surface-sunken` —token de superficie— usado como color de borde. `Tokens v0` §10 tiene
   la regla escrita: "auditar por VALOR y no por nombre". En las secciones se aplicó; en la cáscara
   no.
2. **Tokens generales de espaciado donde el diseño pone `clamp()` propios.** El pie usaba
   `--space-section`, `--space-12/16`, `--space-10`. En escritorio los valores coincidían por
   casualidad y en móvil el pie salía **19% más alto**.
3. **Mecanismos simplificados**: `auto-fit` en vez de repartir por cantidad de materias, dos listas
   en `grid` sin `gap`, y la banda del header cambiando de estado en vez de deslizarse.

### Un hallazgo que corrige el método

Reporté como defecto que la cabecera fuera sólida en móvil, midiendo el prototipo en marcha, que a
390 la muestra transparente. **Estaba mal**: `design/Responsividad v0.dc.html`, fila "Header y nav",
lo fija por escrito — *"La banda sólida es siempre sólida: no hay header transparente en móvil"*. El
que no cumple su propia especificación es el prototipo. **Cuando el documento escrito y el prototipo
en marcha discrepan, manda el documento.**

### Tanda 1 (aplicada)

- **Menú móvil**: tipografía al token correcto (500/22px), `gap: 4px` entre enlaces, padding 20px
  uniforme.
- **Pie**: `clamp()` propios en padding, gap de columnas y separación de la franja legal; `gap: 12px`
  en las listas; el párrafo y la dirección al gris secundario; el teléfono con Work Sans y
  `tabular-nums`; el correo subrayado.
- **Megamenú**: las columnas salen de la CANTIDAD de materias (`repeat(var(--materias), 1fr)` desde
  1024). Con `auto-fit` entraban 3 a 1024px, envolvía a dos filas y el panel pasaba de 394 a 628px.
  Miniaturas a 4:3, que estaban cuadradas.
- **Cabecera**: la banda crema ya no aparece, **baja**. El fondo vive en su propia capa
  (`.cabecera__fondo`) que se desliza 240ms con la curva del prototipo, en los dos sentidos. Se dejó
  de alternar `fixed`/`sticky`, que reservaba 63px en el flujo al cruzar el umbral y empujaba la
  página entera de golpe; y el alto de banda (84→63) ahora transiciona.

Se eligió una sola cabecera con el fondo deslizante en vez de portar las dos piezas del prototipo:
dos barras significan dos `<nav>` landmarks y el doble de paradas de teclado, y hay que sostener
`aria-hidden` + `inert` en la inactiva. El resultado visible es el mismo.

**Divergencia justificada, anotada:** el pie es ~115px más alto que el prototipo en teléfono porque
nuestros enlaces miden 44px de área tocable (prueba 11 del checklist) y los del prototipo 21. Manda
el checklist.

### El arnés que faltaba: `scripts/qa/estados.mjs`

`diff.mjs` compara secciones en capturas quietas. `estados.mjs` compara **estados**: prepara la
página (scroll, panel abierto), mide lo mismo en los dos lados y compara clave por clave, con
tolerancias declaradas. Levanta los dos servidores solo. Hoy: **26 comprobaciones, 0 en falla**.

Es lo que faltaba en el arnés y la razón por la que nada de esto saltó antes.

### Tanda 2 (aplicada)

- **Filete entre filas de Encuéntranos**: `#E4E1DC` literal y marcado. Estaba
  `--color-surface-sunken` (`#ECE9E4`), un token de SUPERFICIE usado como color de borde — el mismo
  antipatrón nº1, elegido por parecido de valor y no por su papel. La primera fila ya coincidía
  (`--color-border-hairline`).
- **Diálogo de ficha del catálogo**: le faltaba el filete. El prototipo lo declara
  `border: 1px solid #D9D9D9` alrededor de 880px de contenido; nuestra caja blanca flotaba sin
  borde contra el velo. Con el filete puesto mide los 882px del prototipo. Se pidieron enteros
  (`min(100%, 882px)` en border-box) en vez de usar `content-box`, que a anchos justos habría
  desbordado 2px; comprobado a 800px: cero desborde.
  **La prueba 07 del checklist afirmaba 880px** — el número que teníamos nosotros, no el del
  diseño. Se corrigió a 882 con la explicación al lado.

Decidido por el usuario: el alto de cabecera de las páginas internas queda **unificado en 85px**,
contra los 63/56/56 del prototipo. Una sola cáscara es condición del proyecto y el prototipo tiene
un archivo por página, así que lo más probable es que sea artefacto de la herramienta.

`estados.mjs` cubre ahora las dos: **30 comprobaciones, 0 en falla**.
