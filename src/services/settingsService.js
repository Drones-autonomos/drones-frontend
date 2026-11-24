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
 *
 * También consume los ajustes operativos persistidos en BD:
 *   GET /settings/operator  → OperatorSettings (ADMIN y GUARDIA)
 *   PUT /settings/operator  → actualizar OperatorSettings (solo ADMIN)
 *
 * OperatorSettings (API, snake_case): {
 *   critical_push_enabled    (bool)
 *   ai_sensitivity_id        ("90" | "95" | "98")
 *   retention_days           (30 | 60 | 90)
 *   transmission_quality_id  ("fhd-60" | "4k-30" | "hd-30")
 * }
 * El servicio traduce a/desde camelCase, que es la forma que usa
 * ajustesData.js (criticalPushEnabled, aiSensitivityId, ...).
 */

import apiClient, { getStoredSession } from './apiClient.js'

let cachedConfig = null
let cachedOperatorSettings = null

function isAdminSession() {
  const session = getStoredSession()
  return session?.role === 'admin' || session?.backendRole === 'ADMIN'
}

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

/**
 * Traduce la respuesta snake_case del backend a las claves camelCase
 * que maneja el estado local de ajustes (ajustesData.js).
 * Ignora campos ajenos a los ajustes operativos (videoEncryption, helipads).
 */
function mapOperatorSettingsFromApi(payload) {
  if (!payload || typeof payload !== 'object') return null
  const mapped = {}
  if (payload.critical_push_enabled !== undefined) {
    mapped.criticalPushEnabled = Boolean(payload.critical_push_enabled)
  }
  if (payload.ai_sensitivity_id !== undefined) {
    mapped.aiSensitivityId = String(payload.ai_sensitivity_id)
  }
  if (payload.retention_days !== undefined) {
    mapped.retentionDays = Number(payload.retention_days)
  }
  if (payload.transmission_quality_id !== undefined) {
    mapped.transmissionQualityId = String(payload.transmission_quality_id)
  }
  return mapped
}

/**
 * Obtiene los ajustes operativos persistidos en el servidor (ADMIN y GUARDIA).
 * Retorna el objeto en camelCase listo para mergear con DEFAULT_SETTINGS,
 * o null si el backend no responde (la UI conserva el caché localStorage).
 */
export async function fetchOperatorSettings() {
  try {
    const payload = await apiClient.get('/settings/operator', {
      skipAuthRedirect: true,
    })
    cachedOperatorSettings = mapOperatorSettingsFromApi(payload)
    return cachedOperatorSettings
  } catch {
    return null
  }
}

export function getCachedOperatorSettings() {
  return cachedOperatorSettings
}

/**
 * Traduce las preferencias personales de /auth/me a camelCase.
 * Preferencias por usuario: push críticas y calidad de transmisión
 * (accesibles también para GUARDIA vía PATCH /auth/me/preferences).
 */
function mapUserPreferencesFromApi(preferencias) {
  if (!preferencias || typeof preferencias !== 'object') return null
  const mapped = {}
  if (preferencias.critical_push_enabled !== undefined) {
    mapped.criticalPushEnabled = Boolean(preferencias.critical_push_enabled)
  }
  if (preferencias.transmission_quality_id !== undefined) {
    mapped.transmissionQualityId = String(preferencias.transmission_quality_id)
  }
  return Object.keys(mapped).length ? mapped : null
}

/**
 * Lee las preferencias personales del usuario autenticado (GET /auth/me).
 * Retorna el subconjunto camelCase o null si no hay preferencias/servidor.
 */
export async function fetchUserPreferences() {
  try {
    const profile = await apiClient.get('/auth/me', { skipAuthRedirect: true })
    return mapUserPreferencesFromApi(profile?.preferencias)
  } catch {
    return null
  }
}

/**
 * Actualiza los ajustes operativos en el servidor:
 *  - Preferencias personales (push críticas, calidad de transmisión) →
 *    PATCH /auth/me/preferences para TODOS los roles (evita el 403 de GUARDIA).
 *  - Ajustes globales (sensibilidad IA, retención, etc.) → PUT /settings/operator
 *    solo cuando la sesión es ADMIN; un 403 no rompe el guardado de preferencias.
 * Acepta el objeto de ajustes del frontend (camelCase) o el payload de la API
 * (snake_case) y retorna el objeto aplicado en camelCase.
 */
export async function updateOperatorSettings(settings) {
  const criticalPush = Boolean(
    settings.criticalPushEnabled ?? settings.critical_push_enabled,
  )
  const qualityId = String(
    settings.transmissionQualityId ?? settings.transmission_quality_id,
  )

  // Preferencias personales: válidas para GUARDIA y ADMIN.
  try {
    await apiClient.patch(
      '/auth/me/preferences',
      {
        critical_push_enabled: criticalPush,
        transmission_quality_id: qualityId,
      },
      { skipAuthRedirect: true },
    )
  } catch (error) {
    if (!error?.isOffline) throw error
  }

  // Ajustes globales del sistema: solo ADMIN (GUARDIA recibe 403 del backend).
  if (isAdminSession()) {
    const updated = await apiClient.put('/settings/operator', {
      critical_push_enabled: criticalPush,
      ai_sensitivity_id: String(settings.aiSensitivityId ?? settings.ai_sensitivity_id),
      retention_days: Number(settings.retentionDays ?? settings.retention_days),
      transmission_quality_id: qualityId,
    })
    cachedOperatorSettings = mapOperatorSettingsFromApi(updated)
    return cachedOperatorSettings
  }

  return {
    ...(cachedOperatorSettings || {}),
    criticalPushEnabled: criticalPush,
    aiSensitivityId: String(settings.aiSensitivityId ?? settings.ai_sensitivity_id),
    retentionDays: Number(settings.retentionDays ?? settings.retention_days),
    transmissionQualityId: qualityId,
  }
}
