# Fase 3 — Catálogo (bitácora de ejecución)

*Inicio: 2026-08-25 · Entregable (plan maestro §6): el admin crea, edita y despublica un producto,
y el sitio lo muestra filtrable.*

## Alcance

| # | Bloque | Estado |
|---|---|---|
| 3.1 | Los 126 productos cargados en Sanity con sus fotos y marcas de ejemplo | en curso |
| 3.2 | Página de catálogo: grilla de 24 en 24, cinco filtros combinables, orden y estados vacíos | pendiente |
| 3.3 | Contrato de URL e historial (filtros sin ensuciar historial, ficha con entrada propia, atrás cierra lo de encima) | pendiente |
| 3.4 | Ficha de producto: overlay en el catálogo y página propia indexable por producto | pendiente |
| 3.5 | Megamenú de Catálogo enlazando por materia, y las tarjetas del home enlazando a su producto | pendiente |
| 3.6 | QA: pruebas 05, 06, 07 y 10 del checklist, sumadas a `scripts/qa/aceptacion.mjs` | pendiente |

## Reglas heredadas que gobiernan esta fase

- **Filtros client-side sobre JSON embebido en el build.** Cero peticiones a Sanity en runtime y
  ningún servicio externo de búsqueda.
- **Listas cerradas**: los cinco ejes son selects; un valor fuera de lista deja al producto fuera
  del filtro. Nunca texto libre.
- **Fila sin dato desaparece** de la ficha: ni en blanco ni "no especificado".
- **Sección bajo su mínimo se oculta entera.**
- Grillas de **24 en 24**; reacomodo animado al filtrar.
- Cada producto tiene **página propia indexable** además del overlay (decisión cerrada, anexo §3-4
  de `modelo-de-contenido.md`).
- Imágenes procesadas en build; `cdn.sanity.io` nunca en producción.
- Los avisos de "foto de ejemplo" se ven **solo en el preview del admin**, nunca en producción.

## Pendiente del cliente que afecta a esta fase

1. **La columna de materia** de los 126 productos — 29 no la tienen. No rompe nada (no aparecen al
   filtrar por ese eje), pero el handoff lo llama "el único pedido que detiene el catálogo".
2. **Fotos reales de 95 productos**: 66 llevan hoy una foto de ejemplo que no corresponde al
   producto que ilustra, y 29 no tienen foto.
3. Si el cliente decide **agrupar variantes por diseño** en vez de 1 fila = 1 producto, cambia el
   modelo. Está en consulta desde el handoff y conviene cerrarlo antes de cargar contenido real.

## Decisiones de esta fase

*(se registran acá a medida que aparecen)*
