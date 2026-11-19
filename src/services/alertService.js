/**
 * Servicio de Alertas y Notificaciones para AeroLuferan.
 * Preparado para conectarse con el Agente de IA (detección de anomalías en video)
 * y con el backend de eventos de seguridad.
 */

// Evento para notificar cambios en la sesión de alertas
const ALERTS_CHANGED_EVENT = 'aeroluferan_alerts_changed'

// Lista inicial de alertas (puede sincronizarse con localStorage o backend)
let currentAlerts = [
  {
    id: 'alt-001',
    title: 'Humo en Edificio B',
    type: 'humo',
    severity: 'critical',
    status: 'Pendiente', // 'Pendiente' | 'Revisado' | 'Resuelto'
    isUnread: true,
    timestamp: new Date().toISOString(),
  },
]

// Suscriptores en memoria
const listeners = new Set()

function notifyListeners() {
  const count = getPendingAlertsCount()
  listeners.forEach((listener) => {
    try {
      listener(count, currentAlerts)
    } catch (err) {
      console.error('Error en listener de alertas:', err)
    }
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ALERTS_CHANGED_EVENT, {
        detail: { count, alerts: currentAlerts },
      }),
    )
  }
}

/**
 * Obtiene la cantidad de alertas nuevas o pendientes (no resueltas).
 * Retorna 0 cuando no hay alertas pendientes.
 */
export function getPendingAlertsCount() {
  return currentAlerts.filter(
    (alert) => alert.status === 'Pendiente' || alert.isUnread === true,
  ).length
}

/**
 * Obtiene todas las alertas registradas.
 */
export function getAllAlerts() {
  return [...currentAlerts]
}

/**
 * Suscribe una función para recibir actualizaciones cuando cambie el conteo o lista de alertas.
 * Retorna una función para cancelar la suscripción.
 */
export function subscribeAlerts(listener) {
  listeners.add(listener)
  // Notificar estado actual inmediatamente
  try {
    listener(getPendingAlertsCount(), currentAlerts)
  } catch (err) {
    console.error('Error al emitir alerta inicial:', err)
  }

  return () => {
    listeners.delete(listener)
  }
}

/**
 * Agrega una nueva alerta emitida por el backend o el agente de IA.
 */
export function addAlert(newAlert) {
  const alertWithDefaults = {
    id: newAlert.id || `alt-${Date.now()}`,
    title: newAlert.title || 'Alerta de vigilancia',
    severity: newAlert.severity || 'medium',
    status: 'Pendiente',
    isUnread: true,
    timestamp: newAlert.timestamp || new Date().toISOString(),
    ...newAlert,
  }

  currentAlerts = [alertWithDefaults, ...currentAlerts]
  notifyListeners()
  return alertWithDefaults
}

/**
 * Marca una alerta como revisada o resuelta.
 */
export function resolveAlert(alertId) {
  currentAlerts = currentAlerts.map((alert) =>
    alert.id === alertId ? { ...alert, status: 'Revisado', isUnread: false } : alert,
  )
  notifyListeners()
}

/**
 * Limpia o marca todas las alertas como leídas.
 */
export function markAllAlertsAsRead() {
  currentAlerts = currentAlerts.map((alert) => ({
    ...alert,
    isUnread: false,
    status: alert.status === 'Pendiente' ? 'Revisado' : alert.status,
  }))
  notifyListeners()
}

/**
 * Permite al backend inicializar o sustituir el conjunto de alertas.
 */
export function setAlertsFromBackend(alertsList) {
  if (Array.isArray(alertsList)) {
    currentAlerts = [...alertsList]
    notifyListeners()
  }
}
