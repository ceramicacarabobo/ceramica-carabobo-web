/**
 * Comportamiento de la ficha de diseño: galería de fotos y compartir.
 *
 * Vive fuera del componente porque la ficha se dibuja en dos sitios y en uno de
 * ellos —el overlay del catálogo— el marcado entra por `innerHTML`, y el HTML
 * insertado así NO ejecuta sus `<script>`. Por eso todo es delegado en
 * `document`: un solo juego de oyentes sirve para la ficha de la página propia y
 * para cuantas fichas abra y cierre el overlay.
 *
 * Los oyentes se registran UNA vez por carga del módulo (la cáscara persiste
 * entre páginas: volver a engancharlos duplicaría cada gesto, que es el defecto
 * 14 de la fase 2).
 */

/** Lo que se comparte es SIEMPRE lo que se está viendo: en el overlay, el
 * catálogo con la ficha abierta (`#diseno=…`); en la página propia, su
 * dirección. Sin caso especial y sin variable paralela. */
const enlaceActual = () => location.href

const fichaDe = (el: Element | null) => el?.closest<HTMLElement>('[data-ficha]') ?? null

const tituloDe = (ficha: HTMLElement | null) => ficha?.dataset.fichaTitulo || document.title

/** Cambia la foto grande. No se toca ningún `src`: las fotos están apiladas y
 * solo cambia cuál lleva `data-activa` (solo opacity, nada de layout). */
function elegirFoto(boton: HTMLElement) {
  const ficha = fichaDe(boton)
  if (!ficha) return
  const i = boton.dataset.mini
  ficha.querySelectorAll<HTMLElement>('[data-foto]').forEach((foto) => {
    foto.toggleAttribute('data-activa', foto.dataset.foto === i)
  })
  ficha.querySelectorAll<HTMLElement>('[data-mini]').forEach((mini) => {
    mini.setAttribute('aria-pressed', mini.dataset.mini === i ? 'true' : 'false')
  })
}

function cerrarMenus(salvo?: Element | null) {
  document.querySelectorAll<HTMLElement>('[data-menu-compartir]').forEach((menu) => {
    if (salvo && menu === salvo) return
    menu.hidden = true
    menu.parentElement?.querySelector('[data-compartir]')?.setAttribute('aria-expanded', 'false')
  })
}

function alternarCompartir(boton: HTMLElement) {
  const ficha = fichaDe(boton)
  const caja = boton.parentElement
  const menu = caja?.querySelector<HTMLElement>('[data-menu-compartir]')
  if (!menu) return

  // En táctil no se inventa interfaz: la hoja del sistema es mejor que la
  // nuestra y deja elegir el medio, que era justo el problema.
  const tactil = window.matchMedia('(pointer: coarse)').matches
  if (tactil && navigator.share) {
    const texto = tituloDe(ficha)
    navigator.share({title: texto, text: texto, url: enlaceActual()}).catch(() => {})
    return
  }

  const abierto = !menu.hidden
  cerrarMenus()
  if (abierto) return
  prepararMenu(menu, ficha)
  menu.hidden = false
  boton.setAttribute('aria-expanded', 'true')
}

/** El enlace de WhatsApp se arma al abrir el menú, no en el build: en el overlay
 * la dirección que se comparte cambia con cada ficha. */
function prepararMenu(menu: HTMLElement, ficha: HTMLElement | null) {
  const whatsapp = menu.querySelector<HTMLAnchorElement>('[data-whatsapp]')
  if (whatsapp) whatsapp.href = `https://wa.me/?text=${encodeURIComponent(`${tituloDe(ficha)} ${enlaceActual()}`)}`
  const copiar = menu.querySelector<HTMLElement>('[data-copiar]')
  if (copiar && copiar.dataset.etiqueta) copiar.textContent = copiar.dataset.etiqueta
}

let avisoCopia = 0

function copiarEnlace(boton: HTMLElement) {
  const url = enlaceActual()
  if (!boton.dataset.etiqueta) boton.dataset.etiqueta = (boton.textContent || '').trim()
  const listo = () => {
    boton.textContent = boton.dataset.copiado || 'Enlace copiado'
    clearTimeout(avisoCopia)
    avisoCopia = window.setTimeout(() => {
      boton.textContent = boton.dataset.etiqueta || 'Copiar enlace'
      cerrarMenus()
    }, 1400)
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(listo, listo)
    return
  }
  // Respaldo para navegadores sin portapapeles asíncrono (y para contextos no
  // seguros, donde `navigator.clipboard` no existe).
  const campo = document.createElement('textarea')
  campo.value = url
  campo.setAttribute('readonly', '')
  campo.style.position = 'fixed'
  campo.style.opacity = '0'
  document.body.appendChild(campo)
  campo.select()
  try {
    document.execCommand('copy')
  } catch {
    /* sin portapapeles no hay nada que hacer: el enlace igual está en la barra */
  }
  document.body.removeChild(campo)
  listo()
}

/**
 * Destapa lo que necesita JavaScript dentro de una ficha recién puesta en la
 * página. Se llama con `document` en la página propia y con el nodo insertado
 * en el overlay.
 */
export function prepararFicha(raiz: ParentNode): void {
  raiz.querySelectorAll<HTMLElement>('[data-compartir-caja]').forEach((caja) => {
    caja.hidden = false
  })
}

let enganchado = false

export function iniciarGaleria(): void {
  if (!enganchado) {
    enganchado = true
    document.addEventListener('click', (evento) => {
      const objetivo = evento.target as Element | null
      if (!objetivo) return
      const mini = objetivo.closest<HTMLElement>('[data-mini]')
      if (mini) {
        elegirFoto(mini)
        return
      }
      const compartir = objetivo.closest<HTMLElement>('[data-compartir]')
      if (compartir) {
        alternarCompartir(compartir)
        return
      }
      const copiar = objetivo.closest<HTMLElement>('[data-copiar]')
      if (copiar) {
        copiarEnlace(copiar)
        return
      }
      // Cualquier otro clic cierra el menú abierto; el enlace de WhatsApp se
      // deja navegar y el menú se va con la ficha.
      if (!objetivo.closest('[data-menu-compartir]')) cerrarMenus()
    })
  }
  prepararFicha(document)
}
