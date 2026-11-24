/**
 * Servicio de Configuración Normativa para AeroLuferan.
 * Consume la ventana operativa del backend:
 *   GET /settings/operating-window  → NormativeConfig (ADMIN y GUARDIA)
 *   PUT /settings/operating-window  → actualizar NormativeConfig (solo ADMIN)
 *
 * NormativeConfig: {
 *   altitud_minima_m  (1–50)
 *   altitud_maxima_m  (2–200)
 *   peso_maximo_kg    (0–25)
 *   hora_apertura     ("HH:MM")
 *   hora_cierre       ("HH:MM")
 * }
 */

import apiClient from './apiClient.js'

let cachedConfig = null

/**
 * Obtiene la configuración normativa vigente del servidor.
 * Retorna null si el backend no responde (la UI muestra estado sin conexión).
 */
export async function fetchOperatingWindow() {
  try {
    cachedConfig = await apiClient.get('/settings/operating-window', {
      skipAuthRedirect: true,
    })
    return cachedConfig
  } catch {
    return null
  }
}

export function getCachedOperatingWindow() {
  return cachedConfig
}

/**
 * Actualiza la configuración normativa (solo ADMIN; el backend responde 403
 * a GUARDIA). Retorna la configuración aplicada.
 * Lanza el ApiError original para que la UI muestre el detalle del servidor.
 */
export async function updateOperatingWindow(config) {
  const updated = await apiClient.put('/settings/operating-window', {
    altitud_minima_m: Number(config.altitud_minima_m),
    altitud_maxima_m: Number(config.altitud_maxima_m),
    peso_maximo_kg: Number(config.peso_maximo_kg),
    hora_apertura: String(config.hora_apertura),
    hora_cierre: String(config.hora_cierre),
  })
  cachedConfig = updated
  return updated
}
