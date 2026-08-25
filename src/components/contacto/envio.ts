/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AQUÍ SE CONECTA EL FORMULARIO DE CONTACTO. En ningún otro lugar.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El receptor del formulario es una DECISIÓN ABIERTA: `docs/modelo-de-contenido.md`
 * §5.3 la tiene pendiente ("Cloudflare Worker + servicio de email con tier
 * gratis, o Formspree free. Definir correo destino y anti-spam — Turnstile de
 * Cloudflare, gratis") y §6, pedido 7, todavía espera del cliente el correo
 * destino. Inventar un receptor sería peor que no tenerlo: un formulario que
 * dice "gracias" y tira el mensaje a la basura es una falla silenciosa.
 *
 * Por eso el formulario está COMPLETO —campos, teclados, validación, estado de
 * éxito y estado de error— y el envío entra y sale por esta única función.
 *
 * ── PARA CONECTARLO (tres pasos, ningún otro archivo) ──────────────────────
 *
 *   1. Poner la dirección del receptor en `RECEPTOR` (o, mejor, en la variable
 *      de entorno `PUBLIC_RECEPTOR_FORMULARIO`, que ya se lee acá abajo: así el
 *      endpoint no viaja en el repositorio y cada entorno usa el suyo).
 *   2. Si el receptor espera otro formato que un POST de JSON, cambiar el
 *      `fetch` de `enviar()`. El contrato hacia afuera —recibe `Mensaje`,
 *      resuelve si llegó, lanza si no— no cambia.
 *   3. Anti-spam: el sitio corre en Cloudflare, así que Turnstile es la opción
 *      sin costo ni tercero nuevo. El widget se monta en el formulario y su
 *      token se agrega a `Mensaje` y al cuerpo del POST. Mientras no exista esa
 *      decisión no se agrega nada: un campo trampa a medias da falsa seguridad.
 *
 * Autosuficiencia (plan maestro §3): el receptor que se elija tiene que ser
 * nuestro origen (una Function/Worker de Cloudflare bajo el mismo dominio) o
 * quedar detrás de él. Un endpoint de tercero llamado desde el navegador
 * volvería a meter una petición ajena en la página, que es justo lo que la
 * condición prohíbe.
 */

/** Lo que el formulario recoge. Es el contrato entre la página y el receptor. */
export interface Mensaje {
  nombre: string
  correo: string
  /** Opcional: el visitante puede no dejar teléfono. */
  telefono?: string
  asunto: string
  mensaje: string
}

/**
 * Dirección del receptor. `null` = todavía no hay ninguno decidido.
 * Se puede fijar sin tocar código con `PUBLIC_RECEPTOR_FORMULARIO` en el .env.
 */
const RECEPTOR: string | null = import.meta.env.PUBLIC_RECEPTOR_FORMULARIO || null

/** El envío no está conectado. No es un fallo de red: es la decisión pendiente. */
export class SinReceptor extends Error {
  constructor() {
    super('El formulario todavía no tiene receptor conectado.')
    this.name = 'SinReceptor'
  }
}

/**
 * Manda el mensaje. Resuelve si llegó; lanza si no.
 *
 * El formulario solo distingue tres desenlaces: resolvió (éxito), lanzó
 * `SinReceptor` (avisa que hay que escribir o llamar) o lanzó cualquier otra
 * cosa (falló el envío, se puede reintentar).
 */
export async function enviar(mensaje: Mensaje): Promise<void> {
  if (!RECEPTOR) throw new SinReceptor()

  const respuesta = await fetch(RECEPTOR, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(mensaje),
  })

  if (!respuesta.ok) throw new Error(`El receptor respondió ${respuesta.status}.`)
}

/** ¿Hay receptor? Lo usa el formulario para no prometer lo que no puede cumplir. */
export const hayReceptor = () => RECEPTOR !== null
