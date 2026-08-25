/** Fragmentos GROQ compartidos. Todas las queries viven en esta carpeta. */

export const IMAGEN = /* groq */ `{
  "ref": asset._ref,
  "alt": coalesce(alt, ""),
  "focal": select(defined(hotspot) => {"x": hotspot.x, "y": hotspot.y})
}`

export const FOTO_PRODUCTO = /* groq */ `{
  "ref": asset._ref,
  "alt": coalesce(alt, ""),
  "focal": select(defined(hotspot) => {"x": hotspot.x, "y": hotspot.y}),
  "tipo": coalesce(tipo, "ambiente"),
  "esEjemplo": coalesce(esEjemplo, false)
}`
