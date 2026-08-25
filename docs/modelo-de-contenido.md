# Modelo de contenido — Fase 0 (derivado del handoff de Claude Design)

*Fecha: 2026-08-24 · Estado: **propuesta para aprobación** · Fuente: `design/` (bundle Etapa 1.3, regenerado 2026-08-24)*

## 0. Qué es el sitio (según el diseño final)

**5 páginas, ninguna más**: Home (`Propuesta 1`), Catálogo (`catalogo-c5`), Contacto, Dónde comprar, 404.
No existe en el diseño un constructor de páginas libres: las páginas son composiciones fijas cuyo **contenido** es editable. Lo que el admin gestiona: productos (colección), distribuidores (colección), y el contenido de cada sección de las páginas (singletons). ⚠️ Esto ajusta el plan original que hablaba de "crear páginas nuevas componiendo bloques" — ver Decisiones abiertas.

El diseño es **monolingüe (es-VE)**. No hay selector de idioma en ninguna plantilla. ⚠️ Ver Decisiones abiertas.

## 1. Colecciones (Sanity)

### 1.1 `producto` — 126 documentos (fuente: `design/publicar/data/catalogo.json`)

Unidad: **una fila del archivo del cliente = un producto** (la agrupación por diseño quedó en consulta con el cliente — "Ejemplo - SKU o diseno").

| Campo | Tipo | Regla |
|---|---|---|
| `nombre` | string, requerido | con advertencia de longitud (validation warning) |
| `slug` | slug (de nombre) | URL de la ficha; minúsculas sin acentos con guiones |
| `serie` | select: `Regular` \| `Venezuela` | **navegación, no faceta de filtro** |
| `materia` | select opcional: Madera · Mármol · Cemento · Piedra · Terrazo · Otros | sin valor → no aparece al filtrar por materia y la fila se oculta en la ficha |
| `materiaOrigen` | select (solo lectura para admins normales): cliente · tipología · formato · nombre · supuesto · pendiente | auditoría de dato deducido; al editar materia un admin, pasa a `cliente` |
| `formato` | select: 60×60 · 60×120 · 25×120 | **lista cerrada** (30×60 no existe — no reintroducir) |
| `formatoReal` | string opcional | medida real de fábrica si difiere |
| `brillo` | array de select: Mate · Brillante · Satinado | **multivalor** (ej. "Mate · Satinado") |
| `textura` | select: Liso · Estructurado · Rústico | |
| `uso` | select: Interiores · Alto tránsito | |
| `pei` | select: I–V | fila oculta si vacío |
| `mohs` | number opcional | fila oculta si vacío |
| `mtsCaja` | number opcional | fila oculta si vacío |
| `fotos` | array de image **con hotspot** (máx 4) | foto 1 = macro de la baldosa (obligatoria si hay fotos); 2+ = ambientes. Hotspot de Sanity = el "punto focal" que exige Requisitos técnicos. Cada foto lleva flag `esEjemplo` (bool) → badge visible SOLO en preview de admin, nunca en producción |
| publicado/despublicado | drafts nativos de Sanity | |

Reglas duras del diseño: **los valores de filtro son listas cerradas** (un valor inventado deja al producto fuera de los filtros — por eso todos son `select`, nunca texto libre); **la fila sin dato desaparece** de la ficha (ni en blanco ni "no especificado").

Estado del dato (LEEME): materia declarada por cliente solo en 26; 71 deducidas; **29 sin materia**. Fotos reales solo 31 productos; 66 con foto de ejemplo ajena; 29 sin foto. *"Pedir la columna de materia es el único pedido que detiene el catálogo."*

### 1.2 `distribuidor` — ~24 documentos (hoy 100% placeholder)

`nombre`, `estado` (select: lista cerrada de los estados de Venezuela, con alias Vargas→La Guaira y Distrito Federal→Distrito Capital), `ciudad`, `direccion`, `telefono`, `whatsapp`, `correo`, `horario`, `ubicacion` (geopoint), `esEjemplo` (bool).

**Cargados el 2026-08-25**: los 24 del prototipo (`design/publicar/donde-comprar.html`, constante `DIST`) — 20 estados, 23 ciudades, exactamente el agregado que el home declara. **Los 24 quedan con `esEjemplo: true`**: el LEEME del handoff avisa que solo el reparto por estado tiene criterio, y que nombres, direcciones y teléfonos son inventados (los correos son `@placeholder.com`). El Studio lo muestra en el listado; el sitio no lo dibuja. Reemplazarlos sigue siendo condición de lanzamiento público.

Alimenta: página Dónde comprar (mapa D3 + índice + tarjetas), sección Encuéntranos del home (**conteos derivados por código, nunca escritos a mano** — regla del prototipo), y JSON-LD LocalBusiness por punto de venta (bloqueante SEO).

### 1.3 `materia` — 6 documentos (megamenú de Catálogo + secciones del home)

`nombre` (mismo select del producto), `claim` (una línea, ej. "La calidez de la veta, sin su mantenimiento."), `fotoTextura` (macro), `fotoAmbiente`. El **conteo de diseños por materia se deriva del catálogo**, no se escribe.

## 2. Singletons (contenido por página)

### 2.1 `home`
- **Hero**: 1 video (archivo + poster; con Save-Data/conexión lenta solo poster) + N capas de imagen, cada una = referencia a producto (label del carrusel = nombre del diseño) o imagen con etiqueta. Mínimo **2 estados** o la sección se oculta.
- **Ambientes**: pestañas (Baños, Salas, Cocinas, …) → cada una con fichas {referencia a producto + foto de ambiente}. Mínimo **3 fichas por pestaña**.
- **Cita**: texto destacado.
- **Proyectos**: obras {nombre, ciudad, referencia a producto/diseño, specs, foto}. Mínimo **2 obras**. (Hoy: 2 placeholders.)
- **Historia**: hitos {año, título, texto, imagen}. Mínimo **3 hitos**. (Hoy: 5 placeholders; solo 1956 es dato del cliente.)
- **Profesionales**: textos + imagen + **video de instalación** (archivo + etiqueta corta, ej. "Video · 3:47"). Sin video no se dibujan ni el play ni la etiqueta. Los botones de redes de esta sección salen de `ajustes.redes`, no de aquí: son dato de sitio.
- **Encuéntranos**: textos del encabezado + `foto` (el ambiente que corona el panel derecho) + `estadosDestacados` (los estados que el home lista, en orden — el prototipo lista 6 de 20 y el resto vive en Dónde comprar; vacío = todos). Los **datos y conteos** salen de `distribuidor` y se derivan por código, nunca se escriben.
- Fijo (no editable): telón de entrada, header/megamenú (estructura), footer (estructura), animaciones, orden de secciones.

### 2.2 `contacto`
Hero (imagen + textos), horario, correo, sedes[] {nombre, dirección, teléfono, geopoint} (hoy 2: Valencia y Guacara — **coordenadas aproximadas, pendientes**), textos del bloque de formulario. Datos reales confirmados por LEEME (salvo coordenadas).

### 2.3 `dondeComprar`
Hero (imagen + textos), número de **WhatsApp central** (hoy placeholder `584140000000` — pendiente del cliente), textos de estados vacíos y del cierre.

### 2.4 `ajustes` (sitio)
Título, descripción, imagen OG por defecto, teléfono/correo/WhatsApp globales, **`redes[]`** {nombre (lista cerrada: Instagram, YouTube, TikTok, Facebook, LinkedIn), url} — dato de marca, lo consume la sección Profesionales del home y podrá consumirlo el pie sin duplicar carga; **hoy vacío, pendiente del cliente** —, texto de política de privacidad (el formulario la enlaza), año de fundación (1956 — confirmado por cliente).

## 3. Contrato de implementación (del handoff — resumen operativo)

Detalle completo en `design/Requisitos tecnicos v0.dc.html`, `design/Responsividad v0.dc.html`, `design/Tokens v0.dc.html`, `design/Primitivas v1.dc.html`. Lo estructural:

1. **Una sola app, cáscara compartida** — header/footer no se remontan al navegar, sin destello blanco, cada página con URL propia. En Astro: `ClientRouter` (View Transitions) + `transition:persist` en la cáscara. *(Es la decisión "más cara de revertir" según el handoff.)*
2. **Media queries CSS mobile-first, breakpoints 760 y 1024** — NUNCA breakpoints en JS (el prototipo lo hace por limitación de su entorno). Tablet = degradación declarada. Container queries para la card de diseño.
3. **Catálogo**: filtros (5 ejes: materia, formato, uso, brillo, textura) y ficha **viven en la URL** — filtros con `replaceState` (sin entradas de historial), ficha/hoja/menú con `pushState` (atrás cierra lo de encima). Grillas de 24 en 24. Client-side sobre JSON embebido en el build; sin servicio externo.
4. **Imágenes**: procesadas en build (varios anchos + srcset, WebP/AVIF ≤400KB servido, respaldo JPG); proporción reservada (sin salto de layout); lazy salvo primera pantalla; hero precargado; **punto focal** por foto (hotspot de Sanity → `object-position`); el mismo recorte para todos los rangos.
5. **Autosuficiencia**: GeoJSON de Venezuela servido desde el propio sitio (ya descargado en `design/publicar/data/venezuela.geojson`, 26 estados ✓); Leaflet/d3/topojson empaquetados vía npm, no CDN; tipografías self-hosted (@fontsource: Work Sans 300/500/600 + Open Sans 400). Prueba de aceptación: desconectar todo CDN externo y el sitio funciona.
6. **SEO/semántica** (bloqueantes): `lang="es-VE"`, canonical por página, OG por página (WhatsApp es el canal), JSON-LD de empresa y distribuidores (NO de producto — descartado por decisión), un solo h1 y jerarquía sin saltos, roles ARIA en selectores/pestañas, skip link.
7. **Movimiento**: reduced-motion colapsa todo a 1ms; solo opacity/transform; nada scroll-driven en móvil; reacomodo animado de la grilla al filtrar (recomendado).
8. **Contenido defensivo**: sección bajo su mínimo se oculta entera; fila de ficha sin dato desaparece; avisos internos (foto faltante) solo en preview de admin; límites de texto con advertencia en el CMS.
9. **Móvil**: 44px tocable, safe-areas, sin hover-only, hojas con arrastre para cerrar, "acción al pulgar" por página (Filtrar/Llamar/WhatsApp), menú anclado al pie.
10. **PWA (recomendado)**: manifest + caché de páginas visitadas (conexión intermitente en Venezuela); video no se descarga con Save-Data.
11. **404 del servidor** apuntando a la página 404 del sitio (config de Cloudflare).
12. **Formulario de contacto**: el prototipo NO envía nada — producción necesita un receptor (ver Decisiones abiertas).

## 4. Mapa editable / fijo (resumen)

**Editable (CMS)**: todos los productos y sus fotos; distribuidores; materias (claim + fotos); todas las fotos/videos/textos de secciones del home; datos de contacto y sedes; WhatsApp central; textos legales; metadatos OG.
**Fijo (código)**: layout y orden de secciones, telón de entrada, header/megamenú/footer (estructura), tokens (colores #6B0F1A/#55000F/#F5F3F0/#E6C0A8…, tipografías, espaciados), animaciones, mapa (geometría), lógica de filtros, 404.

## 5. Decisiones abiertas (requieren respuesta antes o durante Fase 1)

1. **"Crear páginas nuevas"**: el diseño no contempla páginas libres. Propuesta: cumplirlo como "el admin edita todo el contenido existente + productos + distribuidores"; una plantilla de página simple (hero + texto) puede añadirse después si el cliente la pide. **Decidir si se comunica así al cliente.**
2. **Multiidioma**: ~~pendiente~~ **CERRADO (2026-08-24): fuera del alcance.** Sitio es-VE monolingüe; schemas sin localización.
3. **Formulario de contacto**: receptor propuesto — Cloudflare Worker + servicio de email con tier gratis (o Formspree free). Definir correo destino y anti-spam (Turnstile de Cloudflare, gratis).
4. **SKU vs diseño** (consulta ya abierta con el cliente en el handoff): hoy 1 fila = 1 producto; si el cliente decide agrupar variantes por diseño, cambia el schema — mejor cerrarla antes de cargar contenido.
5. **Preview de admin**: Presentation Tool de Sanity requiere las rutas server-rendered para preview — confirmado en arquitectura (preview dinámico en Cloudflare, producción estática).

## 6. Pedidos al cliente (heredados del handoff, bloquean contenido real — no el desarrollo)

1. **Columna de materia** de los 126 productos (único pedido que detiene el catálogo).
2. Fotos reales de los 95 productos sin fotografía propia (66 con foto ajena + 29 sin foto).
3. Validar los 5 hitos de Historia (solo 1956 es dato real).
4. Proyectos reales (las 2 obras actuales son ejemplo).
5. Red de distribuidores real (nombres, direcciones, teléfonos, WhatsApp — todo lo actual es inventado).
6. Coordenadas exactas de las dos plantas.
7. Número de WhatsApp central y correo destino del formulario.
8. Video del hero en calidad final (el actual es prueba 1280×720).

## 7. Pendiente logístico

Los **assets binarios** (~60 webp/jpg de catálogo, video, uploads) no pueden extraerse por la vía MCP usada para el texto. Opciones: descargar el zip del proyecto desde Claude Design y copiar `publicar/assets/` + `publicar/uploads/` a `design/publicar/`, o traerlos uno a uno en la sesión de ejecución. Los 2 logos SVG y el GeoJSON ya están en el repo.

---

## Anexo — Decisiones cerradas el 2026-08-24 (revisión con el usuario)

1. **Telón de entrada**: se muestra **una vez por sesión** (sessionStorage), no en cada visita. Aprobado.
2. **Cáscara compartida / sin recarga**: se implementa como *mejora progresiva* con View Transitions de Astro (`ClientRouter` + `transition:persist`). No se persigue el 100% SPA; el criterio de éxito es el checklist de aceptación en teléfono real. Aprobado.
3. **Unidad del catálogo**: se mantiene **1 fila del cliente = 1 producto = 1 página propia** (126 páginas indexables con URL, fotos y specs propias). La agrupación por diseño queda solo como posible refinamiento VISUAL de la grilla a futuro, sin cambiar el modelo de datos. Aprobado con recomendación SEO.
4. **Ruta estática por producto**: además del overlay del catálogo (prueba 07), cada producto genera su página estática indexable. Aprobado.
5. **Entrega con contenido de referencia**: el sitio se entrega con el contenido actual (placeholders marcados) y el cliente edita/carga/elimina desde el admin. **Condición de lanzamiento público**: antes de quitar la contraseña deben reemplazarse los placeholders críticos — distribuidores (teléfonos/direcciones inventados), WhatsApp central, materia pendiente y fotos marcadas `esEjemplo` en productos destacados. El admin ve los badges de "ejemplo/pendiente" en preview.
