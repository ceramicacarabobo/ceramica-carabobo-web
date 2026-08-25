/**
 * Comportamiento del buscador de puntos de venta.
 *
 * Nada se construye acá: el HTML ya trae el índice, las tarjetas y el mapa. El
 * script decide QUÉ se ve, pinta el mapa y lo acerca al estado elegido.
 *
 * Contrato de dirección: el estado vive en el hash (`#estado=carabobo`), que es
 * el `id` del grupo de tarjetas. Las filas del índice son enlaces a ese hash, y
 * acá se interceptan para no saltar el scroll —lo mismo que hace el prototipo
 * con `pushState`—, pero el historial queda igual: un "atrás" devuelve al mapa
 * del país.
 *
 * Nada depende de hover: posar el cursor sobre una fila realza su estado en el
 * mapa, y el foco de teclado hace exactamente lo mismo. Elegir —clic, toque,
 * Enter o Espacio— es lo que selecciona.
 */
const ANCHO = 800
const ALTO = 505

interface Vista {
  k: number
  x: number
  y: number
}

const SIN_ZOOM: Vista = {k: 1, x: 0, y: 0}

/** Texto de búsqueda, con el mismo criterio que `textoBuscable` del servidor. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Estado leído de la dirección, o null si no hay ninguno. */
function estadoDeURL(): string | null {
  const encontrado = /(?:^|[#&])estado=([^&]*)/.exec(location.hash || '')
  return encontrado ? decodeURIComponent(encontrado[1]) : null
}

export function iniciarLocalizador() {
  const raiz = document.querySelector<HTMLElement>('[data-localizador]')
  if (!raiz || raiz.dataset.enganchada !== undefined) return
  raiz.dataset.enganchada = ''

  const svg = raiz.querySelector<SVGSVGElement>('[data-mapa]')
  const zoom = raiz.querySelector<SVGGElement>('[data-zoom]')
  const volver = raiz.querySelector<HTMLButtonElement>('[data-volver]')
  const verPais = raiz.querySelector<HTMLButtonElement>('[data-ver-pais]')

  // El `!` es la afirmación de que estas seis piezas están en el marcado de
  // `Localizador.astro`; la guarda de abajo es la red por si alguna vez no lo
  // están. Sin él, el estrechamiento del `if` no llega a los cuerpos de las
  // funciones declaradas más abajo y TypeScript las da por posiblemente nulas.
  const campo = raiz.querySelector<HTMLInputElement>('[data-busqueda]')!
  const conteo = raiz.querySelector<HTMLElement>('[data-conteo]')!
  const resultados = raiz.querySelector<HTMLElement>('[data-resultados]')!
  const indice = raiz.querySelector<HTMLElement>('[data-indice]')!
  const vacio = raiz.querySelector<HTMLElement>('[data-vacio]')!
  const vacioTitulo = raiz.querySelector<HTMLElement>('[data-vacio-titulo]')!
  if (!campo || !conteo || !resultados || !indice || !vacio || !vacioTitulo) return

  const formas = [...raiz.querySelectorAll<SVGPathElement>('[data-estado]')]
  const pines = [...raiz.querySelectorAll<SVGGElement>('.pin')]
  const grupos = [...raiz.querySelectorAll<HTMLElement>('[data-grupo]')]
  const filas = [...raiz.querySelectorAll<HTMLAnchorElement>('[data-fila]')]
  const tarjetas = [...raiz.querySelectorAll<HTMLElement>('[data-punto]')]

  const total = Number(raiz.dataset.total ?? tarjetas.length)
  const conteoBase = raiz.dataset.conteoBase ?? ''

  let elegido: string | null = null
  let busqueda = ''
  let vista: Vista = SIN_ZOOM

  /** Nombre visible de un estado: el del índice si tiene puntos; si no, el del mapa. */
  const nombreDe = (clave: string) => {
    const fila = filas.find((f) => f.dataset.fila === clave)
    if (fila) return fila.querySelector('.fila__estado')?.textContent?.trim() ?? clave
    const forma = formas.find((f) => f.dataset.estado === clave)
    return forma?.dataset.nombre ?? clave
  }

  // ── Mapa ────────────────────────────────────────────────────────────────
  function aplicarVista() {
    if (!zoom) return
    zoom.setAttribute('transform', `translate(${vista.x},${vista.y}) scale(${vista.k})`)
    for (const pin of pines) {
      const px = Number(pin.dataset.x ?? 0)
      const py = Number(pin.dataset.y ?? 0)
      pin.setAttribute('transform', `translate(${px * vista.k + vista.x},${py * vista.k + vista.y})`)
      const suyo = elegido !== null && pin.dataset.estado === elegido
      const rotulo = pin.querySelector('text')
      rotulo?.setAttribute('opacity', elegido && suyo ? '1' : '0')
      pin.toggleAttribute('data-en-elegido', suyo)
      pin.style.opacity = elegido ? (suyo ? '1' : '0.25') : '1'
    }
  }

  /** Acerca el mapa a la caja envolvente del estado — la cuenta del prototipo. */
  function acercar(clave: string | null) {
    const forma = clave ? formas.find((f) => f.dataset.estado === clave) : undefined
    const caja = forma?.dataset.caja?.split(' ').map(Number)
    if (!caja || caja.length !== 4) {
      vista = SIN_ZOOM
      aplicarVista()
      return
    }
    const [x0, y0, x1, y1] = caja
    const ancho = Math.max(x1 - x0, 1)
    const alto = Math.max(y1 - y0, 1)
    const k = Math.min(7, 0.72 * Math.min(ANCHO / ancho, ALTO / alto))
    vista = {k, x: ANCHO / 2 - (k * (x0 + x1)) / 2, y: ALTO / 2 - (k * (y0 + y1)) / 2}
    aplicarVista()
  }

  function pintarMapa() {
    const q = normalizar(busqueda)
    for (const forma of formas) {
      const clave = forma.dataset.estado ?? ''
      const tiene = forma.classList.contains('estado--con')
      forma.toggleAttribute('data-elegido', elegido === clave)
      let atenuado = false
      if (elegido) atenuado = clave !== elegido
      else if (q) atenuado = !tiene || !hayCoincidenciaEn(clave, q)
      forma.toggleAttribute('data-atenuado', atenuado)
    }
  }

  const hayCoincidenciaEn = (clave: string, q: string) =>
    tarjetas.some((t) => t.closest('[data-grupo]')?.getAttribute('data-grupo') === clave && (t.dataset.buscable ?? '').includes(q))

  /** Realce del estado al recorrer el índice: lo que en el prototipo hace el
      cursor lo hace acá también el foco. */
  function realzar(clave: string | null) {
    for (const forma of formas) forma.toggleAttribute('data-realce', !elegido && forma.dataset.estado === clave)
  }

  // ── Panel ───────────────────────────────────────────────────────────────
  function pintarPanel() {
    const q = normalizar(busqueda)
    if (volver) volver.hidden = !elegido
    if (verPais) verPais.hidden = !elegido

    if (elegido) {
      const grupo = grupos.find((g) => g.dataset.grupo === elegido)
      const puntos = grupo ? grupo.querySelectorAll('[data-punto]').length : 0
      conteo.textContent = `${nombreDe(elegido)} · ${plural(puntos, 'distribuidor', 'distribuidores')}`
      mostrarGrupos(grupo ? [grupo] : [], null)
      if (!grupo) mostrarVacio(`Todavía no hay distribuidor en ${nombreDe(elegido)}`)
      return
    }

    if (q) {
      const visibles = grupos.filter((grupo) => {
        let algunaVisible = false
        for (const tarjeta of grupo.querySelectorAll<HTMLElement>('[data-punto]')) {
          const coincide = (tarjeta.dataset.buscable ?? '').includes(q)
          tarjeta.hidden = !coincide
          if (coincide) algunaVisible = true
        }
        return algunaVisible
      })
      const hallados = tarjetas.filter((t) => !t.hidden).length
      conteo.textContent = `${hallados} de ${plural(total, 'distribuidor', 'distribuidores')}`
      mostrarGrupos(visibles, null)
      if (hallados === 0) mostrarVacio(`Todavía no llegamos a «${busqueda.trim()}»`)
      return
    }

    conteo.textContent = conteoBase
    for (const tarjeta of tarjetas) tarjeta.hidden = false
    mostrarGrupos([], indice)
  }

  function mostrarGrupos(visibles: HTMLElement[], listaVisible: HTMLElement | null) {
    indice.hidden = listaVisible !== indice
    vacio.hidden = true
    for (const grupo of grupos) grupo.hidden = !visibles.includes(grupo)
    resultados.dataset.modo = listaVisible === indice ? 'estados' : 'puntos'
  }

  function mostrarVacio(titulo: string) {
    vacioTitulo.textContent = titulo
    vacio.hidden = false
  }

  // ── Navegación ──────────────────────────────────────────────────────────
  function pintar() {
    pintarMapa()
    pintarPanel()
    acercar(elegido)
  }

  function elegir(clave: string, desdeURL: boolean) {
    elegido = clave
    busqueda = ''
    campo.value = ''
    realzar(null)
    pintar()
    if (desdeURL) return
    const destino = `#estado=${encodeURIComponent(clave)}`
    if ((location.hash || '') !== destino) {
      history.pushState({localizador: true}, '', destino)
    }
  }

  function limpiar(desdeURL: boolean) {
    // Si el estado se abrió desde acá, se sale por el historial: así el botón
    // atrás del sistema y este botón hacen lo mismo y no quedan pares
    // abrir/cerrar en la pila.
    if (!desdeURL && history.state && (history.state as {localizador?: boolean}).localizador) {
      history.back()
      return
    }
    elegido = null
    pintar()
    if (!desdeURL && location.hash) {
      history.replaceState(history.state, '', location.pathname + location.search)
    }
  }

  function sincronizarConURL() {
    const clave = estadoDeURL()
    if (clave && clave !== elegido) elegir(clave, true)
    else if (!clave && elegido) limpiar(true)
  }

  // ── Enganches ───────────────────────────────────────────────────────────
  for (const fila of filas) {
    const clave = fila.dataset.fila ?? ''
    fila.addEventListener('click', (evento) => {
      // El enlace es real (sin JavaScript lleva al grupo de tarjetas); acá se
      // intercepta para no mover el scroll, como hace el prototipo.
      evento.preventDefault()
      elegir(clave, false)
    })
    fila.addEventListener('focus', () => realzar(clave))
    fila.addEventListener('blur', () => realzar(null))
    fila.addEventListener('mouseenter', () => {
      if (window.matchMedia('(hover: hover)').matches) realzar(clave)
    })
    fila.addEventListener('mouseleave', () => {
      if (window.matchMedia('(hover: hover)').matches) realzar(null)
    })
  }

  for (const forma of formas) {
    if (!forma.classList.contains('estado--con')) continue
    const clave = forma.dataset.estado ?? ''
    forma.addEventListener('click', () => elegir(clave, false))
    forma.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Enter' && evento.key !== ' ') return
      evento.preventDefault()
      elegir(clave, false)
    })
  }

  campo.addEventListener('input', () => {
    busqueda = campo.value
    if (elegido) {
      elegido = null
      if (location.hash) history.replaceState(history.state, '', location.pathname + location.search)
    }
    pintar()
  })

  volver?.addEventListener('click', () => limpiar(false))
  verPais?.addEventListener('click', () => limpiar(false))

  window.addEventListener('popstate', sincronizarConURL)
  window.addEventListener('hashchange', sincronizarConURL)
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && elegido) limpiar(false)
  })

  // El mapa ya está dibujado en el HTML: acá solo se aplica el estado inicial,
  // que puede venir de un enlace compartido.
  svg?.setAttribute('data-listo', '')
  const inicial = estadoDeURL()
  if (inicial) elegir(inicial, true)
  else pintar()
}
