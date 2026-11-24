/**
 * Datos y servicios de la Bitácora de Vuelos de AeroLuferan.
 * Estructurado para conectarse con backend, base de datos, agente de IA y sistema del dron.
 */

export const BITACORA_STORAGE_KEY = 'aeroluferan_bitacora_flights'
export const BITACORA_SYNCED_KEY = 'aeroluferan_bitacora_synced'
export const MAX_RETENTION_DAYS = 30

/**
 * Calcula dinámicamente los días restantes de retención de una grabación según su fecha de almacenamiento.
 * Regla 14: Las grabaciones solamente están disponibles durante 30 días.
 */
export function calculateRetention(storedAt, retentionDays = MAX_RETENTION_DAYS) {
  const storedDate = new Date(storedAt)
  const now = new Date()
  const diffMs = now.getTime() - storedDate.getTime()
  const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const daysRemaining = retentionDays - elapsedDays

  if (daysRemaining <= 0) {
    return {
      isExpired: true,
      daysRemaining: 0,
      label: 'Grabación expirada',
      statusType: 'expired',
      description: 'El video ha superado el periodo de retención de 30 días.',
    }
  }

  if (daysRemaining === 1) {
    return {
      isExpired: false,
      daysRemaining: 1,
      label: 'Último día',
      statusType: 'critical',
      description: 'La grabación expirará hoy a la medianoche.',
    }
  }

  if (daysRemaining <= 3) {
    return {
      isExpired: false,
      daysRemaining,
      label: `${daysRemaining} días restantes`,
      statusType: 'warning',
      description: `Quedan ${daysRemaining} días antes del vencimiento del video.`,
    }
  }

  return {
    isExpired: false,
    daysRemaining,
    label: `${daysRemaining} días restantes`,
    statusType: 'normal',
    description: `Grabación respaldada durante ${daysRemaining} días más.`,
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
