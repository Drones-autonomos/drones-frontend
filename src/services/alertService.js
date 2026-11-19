/**
 * Servicio Centralizado de Alertas y Notificaciones para AeroLuferan.
 * Compartido entre perfiles Admin y Guardia con persistencia y estado
 * independiente de visualización y descarte por usuario/rol.
 * Preparado para conectarse con el Agente de IA y backend institucional.
 */

import alertVanguard01 from '../assets/alert-vanguard-01.png'
import alertVanguard02 from '../assets/alert-vanguard-02.png'

export const ALERTS_STORAGE_KEY = 'aeroluferan_alerts_data'
export const ALERTS_CHANGED_EVENT = 'aeroluferan_alerts_changed'

export const INITIAL_DEMO_ALERTS = [
  {
    id: 'vanguard-01',
    droneId: 'Vanguard-01',
    droneName: 'Vanguard-01',
    badgeNumber: '1',
    badgeType: 'number',
    type: 'humo', // Filtro: Humo / Fuego
    severity: 'critical', // Alerta crítica
    severityLabel: 'ALERTA CRÍTICA',
    age: 'Hace 5 min',
    location: 'Edificio B · Laboratorio',
    detection: 'Detección Térmica: 88°C',
    detectionType: 'thermal',
    confidence: 'IA 96.4%',
    coordinates: '19.3324° N, 99.1872° W',
    altitude: 'Alt: 38m',
    timestamp: '22:45 hrs',
    image: alertVanguard01,
    incidentTitle: 'Posible inicio de conato de incendio',
    description:
      'El dron identificó una columna de humo denso con anomalía de calor sobre la ventilación secundaria. Zona sensible por almacenamiento contiguo de solventes orgánicos.',
    audit: null,
    dispatchButtonTheme: 'critical',
    status: 'Pendiente',
    attentionStatus: 'Pendiente',
    viewedBy: {
      guard: false,
      admin: false,
    },
    dismissedBy: {
      guard: false,
      admin: false,
    },
    telemetry: {
      droneId: 'Vanguard-01',
      battery: '84%',
      altitude: '38m',
      windSpeed: '12 km/h',
      gps: '19.3324° N, 99.1872° W',
      heading: '142° SE',
      tilt: '3°',
      captureTime: '22:45:10 hrs',
      streamStatus: 'En patrullaje activo',
    },
    auditTrail: [],
  },
  {
    id: 'vanguard-02',
    droneId: 'Vanguard-02',
    droneName: 'Vanguard-02',
    badgeNumber: '?',
    badgeType: 'question',
    type: 'intruso', // Filtro: Intrusos
    severity: 'medium', // Alerta media
    severityLabel: 'ALERTA MEDIA',
    age: 'Hace 18 min',
    location: 'Estacionamiento Docente Poniente',
    detection: 'Sujeto en movimiento',
    detectionType: 'motion',
    confidence: 'IA 94.0%',
    coordinates: 'Acceso Puerta 3',
    altitude: 'N/A',
    timestamp: '22:12 hrs',
    image: alertVanguard02,
    incidentTitle: 'Persona no autorizada fuera de horario',
    description:
      'Se detectó a una persona sin credencial activa transitando entre vehículos luego del horario permitido (cierre 21:30 hrs).',
    audit: {
      text: 'Registro Criptográfico Inmutable',
      code: '#8F4C-A03E',
    },
    dispatchButtonTheme: 'dark',
    status: 'Pendiente',
    attentionStatus: 'Pendiente',
    viewedBy: {
      guard: false,
      admin: false,
    },
    dismissedBy: {
      guard: false,
      admin: false,
    },
    telemetry: {
      droneId: 'Vanguard-02',
      battery: '72%',
      altitude: '25m',
      windSpeed: '10 km/h',
      gps: '19.3315° N, 99.1865° W',
      heading: '085° E',
      tilt: '1.5°',
      captureTime: '22:12:04 hrs',
      streamStatus: 'En patrullaje activo',
    },
    auditTrail: [],
  },
  {
    id: 'vanguard-03',
    droneId: 'Vanguard-03',
    droneName: 'Vanguard-03',
    badgeNumber: '2',
    badgeType: 'number',
    type: 'intruso', // Filtro: Intrusos
    severity: 'medium',
    severityLabel: 'ALERTA MEDIA',
    age: 'Hace 28 min',
    location: 'Acceso Perimetral Norte · Geocerca 2',
    detection: 'Movimiento en zona restringida',
    detectionType: 'motion',
    confidence: 'IA 91.8%',
    coordinates: '19.3338° N, 99.1855° W',
    altitude: 'Alt: 30m',
    timestamp: '21:58 hrs',
    image: alertVanguard02,
    incidentTitle: 'Cruce no autorizado de perímetro',
    description:
      'Se detectó silueta en movimiento traspasando la delimitación perimetral exterior hacia el área deportiva luego del horario habilitado.',
    audit: {
      text: 'Registro Criptográfico Inmutable',
      code: '#9B1A-D421',
    },
    dispatchButtonTheme: 'dark',
    status: 'Pendiente',
    attentionStatus: 'Pendiente',
    viewedBy: {
      guard: false,
      admin: false,
    },
    dismissedBy: {
      guard: false,
      admin: false,
    },
    telemetry: {
      droneId: 'Vanguard-03',
      battery: '65%',
      altitude: '30m',
      windSpeed: '14 km/h',
      gps: '19.3338° N, 99.1855° W',
      heading: '210° SW',
      tilt: '2°',
      captureTime: '21:58:30 hrs',
      streamStatus: 'En patrullaje activo',
    },
    auditTrail: [],
  },
]

function loadStoredAlerts() {
  if (typeof window === 'undefined') return INITIAL_DEMO_ALERTS
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Aseguramos que las referencias de imagen e integridad existan
        return parsed.map((a) => {
          if (a.id === 'vanguard-01') a.image = alertVanguard01
          if (a.id === 'vanguard-02') a.image = alertVanguard02
          if (a.id === 'vanguard-03' && !a.image) a.image = alertVanguard02
          return a
        })
      }
    }
  } catch (error) {
    console.error('Error al cargar alertas almacenadas:', error)
  }
  return INITIAL_DEMO_ALERTS
}

let alertsRepository = loadStoredAlerts()

function persistAlerts() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alertsRepository))
  } catch (error) {
    console.error('Error al persistir alertas:', error)
  }
}

// Suscriptores en memoria
const listeners = new Set()

function notifyListeners() {
  persistAlerts()
  listeners.forEach((listener) => {
    try {
      listener(alertsRepository)
    } catch (err) {
      console.error('Error en listener de alertas:', err)
    }
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ALERTS_CHANGED_EVENT, {
        detail: { alerts: alertsRepository },
      }),
    )
  }
}

/**
 * Normaliza el rol ('guard' o 'admin')
 */
export function normalizeRole(role) {
  if (!role) return 'guard'
  const lower = String(role).toLowerCase()
  if (lower.includes('admin')) return 'admin'
  return 'guard'
}

/**
 * Obtiene todas las alertas no descartadas para el rol especificado.
 */
export function getVisibleAlerts(role = 'guard') {
  const normRole = normalizeRole(role)
  return alertsRepository.filter((alert) => !alert.dismissedBy?.[normRole])
}

/**
 * Obtiene la cantidad de alertas nuevas / no visualizadas por el usuario del rol especificado.
 * Si no hay alertas no visualizadas, retorna 0 (no mostrar contador ni círculo).
 */
export function getPendingAlertsCount(role = 'guard') {
  const normRole = normalizeRole(role)
  return alertsRepository.filter(
    (alert) => !alert.dismissedBy?.[normRole] && !alert.viewedBy?.[normRole],
  ).length
}

/**
 * Retorna todas las alertas en memoria (incluidas descartadas para auditoría).
 */
export function getAllAlerts() {
  return [...alertsRepository]
}

/**
 * Suscribe una función para recibir actualizaciones cuando cambie el repositorio.
 * Retorna una función para cancelar la suscripción.
 */
export function subscribeAlerts(listener, role = 'guard') {
  const normRole = normalizeRole(role)
  const wrappedListener = (allAlerts) => {
    const unreadCount = allAlerts.filter(
      (alert) => !alert.dismissedBy?.[normRole] && !alert.viewedBy?.[normRole],
    ).length
    listener(unreadCount, allAlerts)
  }

  listeners.add(wrappedListener)

  // Disparar inmediatamente el estado actual
  try {
    const currentUnread = getPendingAlertsCount(normRole)
    listener(currentUnread, alertsRepository)
  } catch (err) {
    console.error('Error al emitir alerta inicial:', err)
  }

  return () => {
    listeners.delete(wrappedListener)
  }
}

/**
 * Marca una alerta como vista por un rol específico (e.g., 'guard' o 'admin').
 * No afecta el estado de visualización del otro rol.
 */
export function markAlertAsViewed(alertId, role = 'guard') {
  const normRole = normalizeRole(role)
  alertsRepository = alertsRepository.map((alert) => {
    if (alert.id === alertId) {
      return {
        ...alert,
        viewedBy: {
          ...alert.viewedBy,
          [normRole]: true,
        },
      }
    }
    return alert
  })
  notifyListeners()
}

/**
 * Marca todas las alertas visibles como vistas por el rol especificado.
 */
export function markAllAlertsAsViewed(role = 'guard') {
  const normRole = normalizeRole(role)
  alertsRepository = alertsRepository.map((alert) => ({
    ...alert,
    viewedBy: {
      ...alert.viewedBy,
      [normRole]: true,
    },
  }))
  notifyListeners()
}

/**
 * Descarta una alerta para el rol especificado (retirándola de su vista visible).
 * Conserva trazabilidad de auditoría.
 */
export function dismissAlert(alertId, role = 'guard') {
  const normRole = normalizeRole(role)
  alertsRepository = alertsRepository.map((alert) => {
    if (alert.id === alertId) {
      const trail = alert.auditTrail || []
      return {
        ...alert,
        dismissedBy: {
          ...alert.dismissedBy,
          [normRole]: true,
        },
        auditTrail: [
          ...trail,
          {
            action: 'DISMISS_ALERT',
            role: normRole,
            timestamp: new Date().toISOString(),
            note: `Alerta descartada por ${normRole}.`,
          },
        ],
      }
    }
    return alert
  })
  notifyListeners()
}

/**
 * Registra la solicitud de despacho de guardia (interacción local simulada).
 * Marca la alerta como vista por el rol y actualiza su estado de atención.
 */
export function dispatchGuard(alertId, role = 'guard') {
  const normRole = normalizeRole(role)
  alertsRepository = alertsRepository.map((alert) => {
    if (alert.id === alertId) {
      const trail = alert.auditTrail || []
      return {
        ...alert,
        attentionStatus: 'En atención (Guardia despachado)',
        status: 'En atención',
        dispatched: true,
        dispatchedAt: new Date().toISOString(),
        dispatchedBy: normRole,
        viewedBy: {
          ...alert.viewedBy,
          [normRole]: true,
        },
        auditTrail: [
          ...trail,
          {
            action: 'DISPATCH_GUARD',
            role: normRole,
            timestamp: new Date().toISOString(),
            note: `Despacho de guardia solicitado desde perfil ${normRole}.`,
          },
        ],
      }
    }
    return alert
  })
  notifyListeners()
}

/**
 * Restablece las alertas a la demostración inicial (3 alertas nuevas).
 */
export function resetAlertsDemo() {
  alertsRepository = INITIAL_DEMO_ALERTS.map((a) => ({
    ...a,
    viewedBy: { guard: false, admin: false },
    dismissedBy: { guard: false, admin: false },
    attentionStatus: 'Pendiente',
    status: 'Pendiente',
    auditTrail: [],
  }))
  notifyListeners()
}

/**
 * Permite al backend inicializar o sustituir el conjunto de alertas.
 */
export function setAlertsFromBackend(alertsList) {
  if (Array.isArray(alertsList)) {
    alertsRepository = [...alertsList]
    notifyListeners()
  }
}
