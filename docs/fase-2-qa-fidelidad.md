# Fase 2 — QA de fidelidad (parte de defectos)

*Abierto: 2026-08-25, tras la revisión manual del usuario.*

## Herramientas

**El prototipo ya se ejecuta.** Al bundle le faltaba `support.js` —su runtime—, que sí estaba en
el proyecto de Claude Design y se recuperó por el MCP el 2026-08-25. Sin él las páginas quedaban
como plantillas crudas con los `{{ }}` sin resolver. Ahora la referencia es el prototipo corriendo,
como manda el contrato de fidelidad.

```bash
# Servir las dos puntas
(cd design/publicar && python3 -m http.server 4500 &)     # prototipo  → :4500
npm run build && (cd dist/client && python3 -m http.server 4600 &)   # nuestro sitio → :4600

# Comparar píxel a píxel una sección (deja proto/nuestro/diff en DESTINO)
DESTINO=/ruta node scripts/qa/diff.mjs '[data-screen-label="Hero"]' '.hero' hero 1440 900
PLANO=1 DESTINO=/ruta node scripts/qa/diff.mjs '[data-screen-label="Hero"]' '.hero' hero 1440 900

# Medir caja y estilos calculados de un elemento en ambas puntas
node scripts/qa/medir.mjs '[data-screen-label="Hero"] h1' '.hero__titular' 1440 900

# Mirar solo nuestras secciones (sin comparar)
DESTINO=/ruta node scripts/qa/mirar.mjs
```

`PLANO=1` apaga las imágenes: mide **solo composición y tipografía**. Sin eso, una foto distinta o
un carrusel en otro estado ensucian el número y esconden los desajustes de maquetación.

El build local necesita `.env` con el `PUBLIC_SANITY_PROJECT_ID` real; con `placeholder` la home
sale vacía y no hay nada que comparar.

## Defectos abiertos (revisión del 2026-08-25)

| # | Dónde | Defecto |
|---|---|---|
| 1 | Hero | Alto: el prototipo usa 78dvh en desktop; `Responsividad v0` §02 pide **100dvh (mín. 560)**. Corregido a 78/88/100 por rango. |
| 2 | Cabecera | "Dónde comprar" aparece **dos veces**: como enlace de nav y como CTA. En el prototipo la nav es Catálogo + Contacto y el CTA es Dónde comprar. |
| 3 | Cabecera | Alto sobre el hero: el prototipo usa **84px**; la banda compacta al scrollear, 63px. |
| 4 | Ambientes | El bloque de intro (eyebrow, título, pestañas, flechas) queda **pegado al borde izquierdo**, sin el gutter de página. El "01" se corta. |
| 5 | Proyectos | La cabecera debe ser de **dos columnas** (título · bajada de 44ch), no apilada a la izquierda. |
| 6 | Proyectos | Las obras se apilan a ancho completo; el prototipo usa grilla (`proyGridCols` / `proSplitCols`). |
| 7 | Global | Movimiento: duración y curva no coincidían. El valor real del prototipo para apariciones es **480ms con `cubic-bezier(0.2,0,0,1)`**, umbral cuando el elemento entró (top < 86% del alto de ventana) y cascada **60 + i×70ms**. Corregido en `Reveal.astro`. |
| 8 | Global | Faltan dos efectos del prototipo: la **máscara de imagen** (`clip-path: inset(0 0 14% 0)` → `inset(0)`, 480ms ease-out) y el **filete que se dibuja** (`background-size: 0 1px` → `100% 1px`, 480ms ease-out con 120ms de retraso). |

## Hallazgos de fondo (2026-08-25)

1. **La tipografía no era la del diseño.** `@fontsource-variable/*` declara las familias como
   "Work Sans Variable" y "Open Sans Variable", pero los tokens piden "Work Sans" y "Open Sans":
   el navegador caía a Arial en TODO el sitio. Se cambió a `@fontsource/work-sans` 300/500/600 y
   `@fontsource/open-sans` 400 — exactamente los pesos que carga el prototipo. Tras el cambio, el
   titular del hero mide idéntico al diseño (misma caja, 27 propiedades calculadas iguales).
2. **`Reveal` no reenviaba el scope de estilos del padre.** Cualquier regla CSS escrita en una
   sección que apuntara a un elemento envuelto en `<Reveal>` no hacía match y moría en silencio:
   por eso Proyectos se apilaba pese a tener las reglas correctas. Corregido: `Reveal` ahora
   reenvía todos los atributos, como ya hacía `Seccion`.
3. **El hero del prototipo mide 100dvh en desktop**, confirmado con el prototipo en marcha. La
   tabla de `Responsividad v0` §02 tenía razón y el valor por defecto del prototipo (78dvh) era
   un tweak de su entorno.

## Movimiento: los valores reales del diseño (medidos 2026-08-25)

El prototipo servido corre con **`data-mov="editorial"` y `data-heroms="700"` activados**. Esa
calibración —que el propio documento describe como "reversible"— es la que está puesta en el
diseño entregado, así que es la que manda. Es más lenta y con otra curva que la del bloque de
tokens, y explica la sensación de "movimiento demasiado rápido".

| Qué | Valor medido en el prototipo |
|---|---|
| Entrada del hero | **700ms**, `cubic-bezier(0.37, 0, 0.63, 1)`, translateY **10px**, escalonado 0 / 90 / 180ms |
| Aparición al entrar en pantalla | **660ms**, misma curva, translateY 10px, cascada 60 + i×70ms |
| Máscara de imagen | 660ms, misma curva, `clip-path: inset(0 0 14%)` → `inset(0)` |
| Respuesta a una acción (pestañas, tiles) | **180ms**, `cubic-bezier(0.4, 0, 0.2, 1)` |
| Enlaces de nav | 240ms, `cubic-bezier(0.2, 0, 0, 1)` |

La curva simétrica en las entradas es deliberada: el ease-out fuerte queda para lo que responde a
una acción del usuario, donde arrancar inmediato es lo correcto. Estos valores viven en
`src/theme/base.css` como `--ease-editorial`, `--dur-entrada`, `--dur-aparicion`,
`--desplazamiento-entrada`, `--dur-respuesta` y `--ease-respuesta` — no en `tokens.css`, que es
copia literal del documento de diseño.

## Reglas del arreglo

- El árbitro de valores es el marcado del prototipo; ante ambigüedad, `Tokens v0` y `Responsividad v0`.
- Mobile-first, media queries CSS, nunca breakpoints en JS.
- Solo opacity y transform (la máscara de imagen usa clip-path, que el propio prototipo declara).
- Verificar con capturas antes de dar por cerrado un arreglo.
