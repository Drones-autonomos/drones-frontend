/**
 * Datos y servicios de la Bitácora de Vuelos de AeroLuferan.
 * Estructurado para conectarse con backend, base de datos, agente de IA y sistema del dron.
 */

export const BITACORA_STORAGE_KEY = 'aeroluferan_bitacora_flights'
export const BITACORA_SYNCED_KEY = 'aeroluferan_bitacora_synced'
export const MAX_RETENTION_DAYS = 30

function getConfiguredRetentionDays() {
  if (typeof window === 'undefined') return MAX_RETENTION_DAYS
  try {
    const raw = localStorage.getItem('aeroluferan_settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed?.retentionDays === 'number' && parsed.retentionDays > 0) {
        return parsed.retentionDays
      }
    }
  } catch {
    // ignore malformed local cache
  }
  return MAX_RETENTION_DAYS
}

/**
 * Calcula dinámicamente los días restantes de retención de una grabación según
 * los metadatos reales del backend (`expiresAt` / `daysRemaining`) o el periodo
 * normativo configurado en Ajustes (30 / 60 / 90 días).
 */
export function calculateRetention(storedAt, options = undefined) {
  const videoMeta = typeof options === 'object' && options !== null ? options : null
  const configuredDays =
    typeof options === 'number' && options > 0
      ? options
      : typeof videoMeta?.retentionDays === 'number' && videoMeta.retentionDays > 0
        ? videoMeta.retentionDays
        : getConfiguredRetentionDays()

  if (videoMeta?.isPurged) {
    return {
      isExpired: true,
      daysRemaining: 0,
      configuredDays,
      label: 'Grabación purgada',
      statusType: 'expired',
      description: `El archivo fue purgado conforme a la política de ${configuredDays} días; se conserva el sello SHA-256.`,
    }
  }

  let daysRemaining
  if (videoMeta?.expiresAt) {
    const expDate = new Date(videoMeta.expiresAt)
    if (!Number.isNaN(expDate.getTime())) {
      daysRemaining = Math.max(0, Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    }
  }
  if (daysRemaining === undefined && typeof videoMeta?.daysRemaining === 'number') {
    daysRemaining = Math.max(0, Math.round(videoMeta.daysRemaining))
  }
  if (daysRemaining === undefined) {
    const storedDate = new Date(storedAt)
    const now = new Date()
    const diffMs = now.getTime() - storedDate.getTime()
    const elapsedDays = Number.isNaN(storedDate.getTime()) ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24))
    daysRemaining = configuredDays - elapsedDays
  }

  if (daysRemaining <= 0) {
    return {
      isExpired: true,
      daysRemaining: 0,
      configuredDays,
      label: 'Grabación expirada',
      statusType: 'expired',
      description: `El video ha superado el periodo de retención de ${configuredDays} días.`,
    }
  }

  if (daysRemaining === 1) {
    return {
      isExpired: false,
      daysRemaining: 1,
      configuredDays,
      label: 'Último día',
      statusType: 'critical',
      description: 'La grabación expirará hoy a la medianoche.',
    }
  }

  if (daysRemaining <= 3) {
    return {
      isExpired: false,
      daysRemaining,
      configuredDays,
      label: `${daysRemaining} días restantes`,
      statusType: 'warning',
      description: `Quedan ${daysRemaining} días antes del vencimiento del video.`,
    }
  }

  return {
    isExpired: false,
    daysRemaining,
    configuredDays,
    label: `${daysRemaining} días restantes`,
    statusType: 'normal',
    description: `Grabación respaldada durante ${daysRemaining} días más (ciclo ${configuredDays}d).`,
  }
}


/**
 * Obtiene la lista completa de vuelos registrados en la bitácora
 */
export function getStoredFlights() {
  try {
    const raw = localStorage.getItem(BITACORA_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (error) {
    console.error('Error al leer historial de bitácora:', error)
  }
  return []
}

/**
 * Guarda un vuelo nuevo o actualizado en la bitácora
 */
export function saveFlightRecord(newFlight) {
  const current = getStoredFlights()
  const exists = current.some((f) => f.id === newFlight.id)
  const updated = exists
    ? current.map((f) => (f.id === newFlight.id ? newFlight : f))
    : [newFlight, ...current]

  try {
    localStorage.setItem(BITACORA_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('aeroluferan_bitacora_updated', { detail: updated }))
  } catch (error) {
    console.error('Error al guardar vuelo en bitácora:', error)
  }
  return updated
}
