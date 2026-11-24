/**
 * Configuración, estado y servicios para el módulo Ajustes de AeroLuferan.
 * Preparado para conectarse con backend, base de datos, agente de IA y sistema del dron.
 *
 * Persistencia: localStorage actúa como caché inmediato; la fuente de verdad
 * compartida es el backend (GET/PUT /settings/operator, tabla ajustes_operativos).
 */

import {
  fetchOperatorSettings,
  fetchUserPreferences,
  updateOperatorSettings,
} from '../../services/settingsService.js'

export const AJUSTES_STORAGE_KEY = 'aeroluferan_settings'

export const AI_SENSITIVITY_OPTIONS = [
  {
    id: '90',
    percent: 90,
    label: '90% Rápido',
    badgeText: '90% (Rápido)',
    description: 'Menor latencia de inferencia en tiempo real (<200ms). Adecuado para patrullajes a alta velocidad.',
  },
  {
    id: '95',
    percent: 95,
    label: '95% Equilibrado',
    badgeText: '95% (Óptimo)',
    description: 'Balance ideal entre precisión y tasa de falsos positivos. Recomendado por el agente de IA para rondas perimetrales.',
  },
  {
    id: '98',
    percent: 98,
    label: '98% Máx Precisión',
    badgeText: '98% (Precisión)',
    description: 'Filtrado estricto contra falsos positivos mediante doble verificación de red neuronal profunda. Mayor exigencia computacional.',
  },
]

export const TRANSMISSION_QUALITY_OPTIONS = [
  {
    id: 'fhd-60',
    label: 'FHD 1080p 60fps (Bitrate Adaptable Wi-Fi)',
    resolution: '1920x1080',
    framerate: '60 fps',
    bitrate: 'Adaptable (4 - 8 Mbps)',
    isRecommended: true,
  },
  {
    id: '4k-30',
    label: '4K Ultra HD 30fps (Alta Demanda RF)',
    resolution: '3840x2160',
    framerate: '30 fps',
    bitrate: '15 - 25 Mbps',
    isRecommended: false,
  },
  {
    id: 'hd-30',
    label: 'HD 720p 30fps (Bajo Ancho de Banda)',
    resolution: '1280x720',
    framerate: '30 fps',
    bitrate: '2 - 3 Mbps',
    isRecommended: false,
  },
]

export const RETENTION_PERIOD_OPTIONS = [
  { days: 30, label: '30 días reglamentarios (Normativa institucional UAQ)', isDefault: true },
  { days: 60, label: '60 días (Sujeto a ampliación por investigación en curso)', isDefault: false },
  { days: 90, label: '90 días (Autorización especial del Comité de Privacidad)', isDefault: false },
]

export const DEFAULT_SETTINGS = {
  criticalPushEnabled: true,
  aiSensitivityId: '95',
  retentionDays: 30,
  videoEncryption: {
    enabled: true,
    statusText: 'BLOQUEADO ON',
    type: 'AES-256 GCM',
    description: 'Cifrado de flujo activo en reposo y tránsito conforme a normativa institucional.',
  },
  transmissionQualityId: 'fhd-60',
}

/**
 * Obtiene la configuración guardada localmente o devuelve los valores por defecto.
 */
export function getStoredSettings() {
  try {
    const raw = localStorage.getItem(AJUSTES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Sanea el caché: `helipads` contenía estaciones inventadas; las
      // estaciones reales se consultan en GET /drone/charging-bases.
      delete parsed.helipads
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (error) {
    console.error('Error al recuperar ajustes:', error)
  }
  return DEFAULT_SETTINGS
}

/**
 * Guarda los ajustes actualizados y notifica a las interfaces suscritas.
 * Escribe el caché localStorage de inmediato y devuelve la promesa real de
 * persistencia en el backend para que la UI pueda mostrar errores honestos
 * (4xx/5xx). Si el backend está offline resuelve con el objeto local.
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(AJUSTES_STORAGE_KEY, JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('aeroluferan_settings_updated', { detail: settings }))
  } catch (error) {
    console.error('Error al guardar ajustes:', error)
  }
  return updateOperatorSettings(settings).catch((error) => {
    console.error('No se pudieron persistir los ajustes en el servidor:', error?.message || error)
    if (error?.isOffline || error?.status === 0) return settings
    throw error
  })
}

/**
 * Carga inicial desde el backend: consulta GET /settings/operator y, si
 * responde, mergea los ajustes operativos sobre el caché local + defaults.
 * Encima aplica las preferencias personales del usuario (GET /auth/me →
 * preferencias: push críticas y calidad de transmisión por usuario, así las
 * opciones de GUARDIA también persisten entre dispositivos).
 * Reescribe localStorage y notifica a las vistas suscritas
 * (aeroluferan_settings_updated). Si el backend no responde retorna null y
 * se conserva el caché local. No dispara PUT (es solo sincronización de lectura).
 */
export async function syncSettingsFromBackend() {
  const remote = await fetchOperatorSettings()
  const userPrefs = await fetchUserPreferences()
  if (!remote && !userPrefs) return null
  // Las preferencias personales solo se aplican a `criticalPushEnabled`
  // (preferencia por usuario). Sensibilidad IA, retención y calidad de
  // transmisión son ajustes GLOBALES de la fila ajustes_operativos: nunca se
  // sobrescriben con preferencias locales o por-usuario obsoletas.
  const personalPrefs =
    userPrefs && userPrefs.criticalPushEnabled !== undefined
      ? { criticalPushEnabled: userPrefs.criticalPushEnabled }
      : {}
  const merged = { ...getStoredSettings(), ...(remote || {}), ...personalPrefs }
  try {
    localStorage.setItem(AJUSTES_STORAGE_KEY, JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent('aeroluferan_settings_updated', { detail: merged }))
  } catch (error) {
    console.error('Error al sincronizar ajustes desde el servidor:', error)
  }
  return merged
}

