/**
 * Arrastrar hacia abajo para cerrar una Hoja (`Responsividad v0` §03, "Cierre de
 * las hojas"): cerrar deja de exigir llegar al aspa, que está arriba del todo y
 * lejos del pulgar.
 *
 * Dos reglas que no son de gusto:
 *   · **El área de arrastre es el asa y la barra de título, nunca el cuerpo.**
 *     En el cuerpo manda el scroll: si el arrastre lo capturara, la hoja se
 *     cerraría al intentar leer la tabla.
 *   · **Ni un botón arrastra.** Empezar el gesto sobre el aspa tiene que poder
 *     terminar en un clic.
 *
 * Umbral: 96px recorridos, o un gesto rápido (más de 28px en menos de 260ms).
 * Si no llega, la hoja vuelve a su lugar. Solo se anima `transform`.
 *
 * Lo usan las dos hojas del catálogo —filtros y ficha—, que hasta la fase 3
 * tenían el mismo bloque copiado.
 */
export interface OpcionesArrastre {
  /** Selector del área que sí arrastra, dentro del panel. */
  asa: string
  /** Qué hacer cuando el gesto pasa el umbral. */
  cerrar: () => void
}

export function habilitarArrastre(panel: HTMLElement, {asa, cerrar}: OpcionesArrastre): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  const dur = () => (reduce.matches ? 1 : 220)

  let y0: number | null = null
  let dy = 0
  let t0 = 0

  panel.addEventListener('pointerdown', (evento) => {
    const objetivo = evento.target as HTMLElement | null
    if (!objetivo?.closest(asa) || objetivo.closest('button, a')) return
    y0 = evento.clientY
    dy = 0
    t0 = Date.now()
    panel.style.transition = 'none'
    try {
      panel.setPointerCapture(evento.pointerId)
    } catch {
      /* el navegador puede negarse: el arrastre sigue funcionando sin captura */
    }
  })

  panel.addEventListener('pointermove', (evento) => {
    if (y0 === null) return
    dy = Math.max(0, evento.clientY - y0)
    panel.style.transform = `translateY(${dy}px)`
  })

  const soltar = () => {
    if (y0 === null) return
    const rapido = dy > 28 && Date.now() - t0 < 260
    y0 = null
    panel.style.transition = `transform ${dur()}ms var(--ease-out)`
    if (dy > 96 || rapido) {
      panel.style.transform = 'translateY(100%)'
      window.setTimeout(() => {
        panel.style.transition = ''
        panel.style.transform = ''
        cerrar()
      }, dur())
      return
    }
    panel.style.transform = 'none'
  }

  panel.addEventListener('pointerup', soltar)
  panel.addEventListener('pointercancel', soltar)
}
