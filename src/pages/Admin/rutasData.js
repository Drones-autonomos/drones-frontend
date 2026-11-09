/**
 * Estructuras de datos y validaciones geométricas para el módulo Rutas de AeroLuferan.
 * Preparado para conectarse con backend, base de datos, agente de IA y sistema del dron.
 */

// Coordenadas base del campus (Facultad de Informática UAQ - Campus Juriquilla)
export const CAMPUS_CENTER = [20.7032, -100.4435]
export const CAMPUS_DEFAULT_ZOOM = 17

export const HELIPUERTOS = [
  'Helipuerto Base Norte',
  'Helipuerto Base Sur',
]

export const MISSIONS_STORAGE_KEY = 'aeroluferan_missions'
export const GEOFENCES_STORAGE_KEY = 'aeroluferan_geofences'

/**
 * Checklist de Vuelo Aprobado (Demostración y preparación para telemetría real)
 */
export const initialChecklistData = {
  batteryPercent: 92,
  batteryMinRequired: 35,
  windKmH: 4,
  windMaxAllowed: 25,
  rbacStatus: 'OK',
  rbacAuthorized: true,
  latencyMs: 18,
  isApproved: true,
}

/**
 * Zonas y geocercas predeterminadas (demostración fiel a la captura de Figma)
 */
export const initialGeofences = [
  {
    id: 'geo-e2',
    name: 'Acceso Norte',
    badgeCode: 'E2',
    type: 'informativa', // 'informativa' | 'advertencia' | 'restringida'
    color: '#0284c7',
    bounds: [
      [20.7042, -100.4449],
      [20.7048, -100.4441],
    ],
    status: 'Activa',
    description: 'Punto de control y acceso vehicular norte.',
    restrictionReason: '',
  },
  {
    id: 'geo-a1',
    name: 'Aulas',
    badgeCode: 'A1',
    type: 'informativa',
    color: '#0284c7',
    bounds: [
      [20.7032, -100.4448],
      [20.7038, -100.4440],
    ],
    status: 'Activa',
    description: 'Área académica de aulas y docencia.',
    restrictionReason: '',
  },
  {
    id: 'geo-alta-tension',
    name: 'Alta Tensión',
    badgeCode: 'Riesgo EM',
    type: 'advertencia',
    color: '#f59e0b',
    bounds: [
      [20.7041, -100.4437],
      [20.7046, -100.4429],
    ],
    status: 'Precaución',
    description: 'Líneas de media/alta tensión contiguas.',
    restrictionReason: 'Riesgo de interferencia electromagnética (EM) en brújula y telemetría.',
  },
  {
    id: 'geo-arcotecho',
    name: 'Arcotecho',
    badgeCode: 'Tope de altura',
    type: 'restringida',
    color: '#ef4444',
    bounds: [
      [20.7027, -100.4438],
      [20.7032, -100.4430],
    ],
    status: 'Restringida',
    description: 'Estructura metálica curva deportiva.',
    restrictionReason: 'Tope de altura física (18m AGL) con riesgo de colisión estructural.',
  },
  {
    id: 'geo-laboratorios',
    name: 'Laboratorios',
    badgeCode: 'L',
    type: 'informativa',
    color: '#0284c7',
    bounds: [
      [20.7018, -100.4442],
      [20.7024, -100.4432],
    ],
    status: 'Activa',
    description: 'Complejo de laboratorios especializados.',
    restrictionReason: '',
  },
]

/**
 * Rutas de vuelo programadas predeterminadas
 */
export const initialScheduledMissions = [
  {
    id: 'm-matutino',
    name: 'Circuito Matutino',
    iconType: 'sun',
    startTime: '07:00',
    endTime: '07:35',
    timeDisplay: '07:00 – 07:35 HRS',
    zone: 'Zona Norte',
    status: 'Próximo',
    statusBadge: 'PRÓXIMO',
    statusType: 'proximo',
    duration: '35 min',
    batteryRequired: '42% Batt',
    opticalSensor: 'RGB 4K + IR',
    sensorColor: 'blue',
    droneId: 'Vanguard-01',
    departureHelipad: 'Helipuerto Base Norte',
    arrivalHelipad: 'Helipuerto Base Norte',
    frequency: 'Lun → Vie',
    patrolType: 'Patrullaje matutino',
    operatingHeight: 60,
    date: '2026-11-09',
    waypoints: [
      [20.7045, -100.4445],
      [20.7043, -100.4433],
      [20.7035, -100.4436],
      [20.7035, -100.4445],
      [20.7045, -100.4445],
    ],
  },
  {
    id: 'm-vespertino',
    name: 'Circuito Vespertino',
    iconType: 'moon',
    startTime: '19:00',
    endTime: '19:30',
    timeDisplay: '19:00 – 19:30 HRS',
    zone: 'Perímetro Total',
    status: 'Agendado',
    statusBadge: 'AGENDADO',
    statusType: 'agendado',
    duration: '30 min',
    batteryRequired: '48% Batt',
    opticalSensor: 'Térmica FLIR',
    sensorColor: 'purple',
    droneId: 'Vanguard-01',
    departureHelipad: 'Helipuerto Base Norte',
    arrivalHelipad: 'Helipuerto Base Sur',
    frequency: 'Lun → Vie',
    patrolType: 'Patrullaje vespertino',
    operatingHeight: 80,
    date: '2026-11-09',
    waypoints: [
      [20.7046, -100.4448],
      [20.7044, -100.4428],
      [20.7018, -100.4430],
      [20.7019, -100.4448],
      [20.7046, -100.4448],
    ],
  },
]

/**
 * Telemetría de Verificación Prevuelo y Techo Operativo
 */
export const initialPreflightData = {
  overallStatus: 'Todo Listo',
  isReady: true,
  operatingCeiling: {
    height: '80m AGL',
    regulatoryLimit: '< 200m',
    complianceText: 'CUMPLE NORMATIVA',
    isCompliant: true,
  },
  metrics: {
    wind: {
      label: 'Viento',
      value: '8 km/h',
      numeric: 8,
      statusLabel: 'Óptimo',
      statusType: 'success',
      maxLimit: 25, // km/h
    },
    battery: {
      label: 'Batería',
      value: '100%',
      numeric: 100,
      statusLabel: 'Carga Plena',
      statusType: 'success',
      minLimit: 35, // %
    },
    rfSignal: {
      label: 'Señal RF',
      value: '-58 dBm',
      numeric: -58,
      statusLabel: 'Excelente',
      statusType: 'success',
      minAcceptableDbm: -85, // dBm
    },
  },
}

/**
 * Estado general del sistema de comunicación del dron
 */
export const initialDroneCommState = {
  droneName: 'AeroLuferan',
  model: 'Vanguard-01',
  isConnected: true,
  signalQuality: 98, // Representa calidad de enlace RF, no batería
  latencyMs: 42,
  status: 'online', // 'online' | 'degraded' | 'disconnected'
}

/**
 * Cálculo de distancia Haversine en metros entre dos coordenadas [lat, lng]
 */
export function calculateDistanceMeters(p1, p2) {
  const [lat1, lon1] = p1
  const [lat2, lon2] = p2
  const R = 6371e3 // radio de la Tierra en metros
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Distancia total acumulada de una trayectoria de waypoints
 */
export function calculatePathDistance(waypoints) {
  if (!waypoints || waypoints.length < 2) return 0
  let total = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistanceMeters(waypoints[i], waypoints[i + 1])
  }
  return Math.round(total)
}

/**
 * Capa de persistencia compartida (Misiones)
 */
export function getStoredMissions() {
  try {
    const raw = localStorage.getItem(MISSIONS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  return initialScheduledMissions
}

export function saveMission(newMission) {
  const current = getStoredMissions()
  const updated = [newMission, ...current]
  try {
    localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('aeroluferan_missions_updated', { detail: updated }))
  } catch {
    // ignore
  }
  return updated
}

/**
 * Capa de persistencia compartida (Geocercas)
 */
export function getStoredGeofences() {
  try {
    const raw = localStorage.getItem(GEOFENCES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  return initialGeofences
}

export function saveGeofences(geofences) {
  try {
    localStorage.setItem(GEOFENCES_STORAGE_KEY, JSON.stringify(geofences))
    window.dispatchEvent(new CustomEvent('aeroluferan_geofences_updated', { detail: geofences }))
  } catch {
    // ignore
  }
}

/**
 * Utilidad geométrica: Comprueba si un punto [lat, lng] está dentro de un bounding box [[latMin, lngMin], [latMax, lngMax]]
 */
export function isPointInsideBounds(point, bounds) {
  const [lat, lng] = point
  const [[latMin, lngMin], [latMax, lngMax]] = bounds
  const minLat = Math.min(latMin, latMax)
  const maxLat = Math.max(latMin, latMax)
  const minLng = Math.min(lngMin, lngMax)
  const maxLng = Math.max(lngMin, lngMax)

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
}

/**
 * Utilidad geométrica: Comprueba si un segmento de línea intersecta otro segmento
 */
function lineSegmentsIntersect(p1, p2, p3, p4) {
  function ccw(a, b, c) {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])
  }
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  )
}

/**
 * Utilidad geométrica: Comprueba si un segmento cruza el rectángulo de una geocerca
 */
function segmentIntersectsBounds(p1, p2, bounds) {
  const [[lat1, lng1], [lat2, lng2]] = bounds
  const minLat = Math.min(lat1, lat2)
  const maxLat = Math.max(lat1, lat2)
  const minLng = Math.min(lng1, lng2)
  const maxLng = Math.max(lng1, lng2)

  // 4 esquinas del rectángulo
  const c1 = [minLat, minLng]
  const c2 = [minLat, maxLng]
  const c3 = [maxLat, maxLng]
  const c4 = [maxLat, minLng]

  // Si cualquiera de los extremos está adentro
  if (isPointInsideBounds(p1, bounds) || isPointInsideBounds(p2, bounds)) {
    return true
  }

  // Comprobar intersección con las 4 aristas
  return (
    lineSegmentsIntersect(p1, p2, c1, c2) ||
    lineSegmentsIntersect(p1, p2, c2, c3) ||
    lineSegmentsIntersect(p1, p2, c3, c4) ||
    lineSegmentsIntersect(p1, p2, c4, c1)
  )
}

/**
 * Validación completa de ruta frente a todas las geocercas registradas.
 * Retorna las zonas intersectadas diferenciando entre informativas, advertencias y restringidas.
 */
export function validateRouteAgainstGeofences(waypoints, geofences) {
  if (!waypoints || waypoints.length < 2) return { conflicts: [], warnings: [], hasCriticalConflict: false }

  const detectedConflicts = []

  for (const zone of geofences) {
    if (zone.status === 'Inactiva') continue
    let intersects = false

    // Verificar si algún waypoint cae dentro de la zona
    for (const pt of waypoints) {
      if (isPointInsideBounds(pt, zone.bounds)) {
        intersects = true
        break
      }
    }

    // Verificar si algún segmento de la ruta cruza los límites de la zona
    if (!intersects) {
      for (let i = 0; i < waypoints.length - 1; i++) {
        if (segmentIntersectsBounds(waypoints[i], waypoints[i + 1], zone.bounds)) {
          intersects = true
          break
        }
      }
    }

    if (intersects) {
      detectedConflicts.push({
        zoneId: zone.id,
        zoneName: zone.name,
        type: zone.type,
        reason: zone.restrictionReason || zone.description,
        isRestricted: zone.type === 'restringida',
        isWarning: zone.type === 'advertencia',
      })
    }
  }

  const hasCriticalConflict = detectedConflicts.some((c) => c.isRestricted)

  return {
    conflicts: detectedConflicts,
    hasCriticalConflict,
  }
}
