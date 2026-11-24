/**
 * Estructuras de datos y validaciones geométricas para el módulo Rutas de AeroLuferan.
 * Preparado para conectarse con backend, base de datos, agente de IA y sistema del dron.
 */

// Coordenadas base del campus (Facultad de Informática UAQ - Campus Juriquilla)
export const CAMPUS_CENTER = [20.7032, -100.4435]
export const CAMPUS_DEFAULT_ZOOM = 17

export const GEOFENCES_STORAGE_KEY = 'aeroluferan_geofences'

/**
 * Umbrales operativos de la verificación prevuelo (configuración del sistema,
 * no datos de telemetría). Los valores mostrados provienen de la telemetría real.
 */
export const PREFLIGHT_LIMITS = {
  windMaxKmh: 25,
  batteryMinPct: 35,
  rfMinDbm: -85,
  regulatoryCeilingM: 200,
}

/**
 * Techo operativo derivado de las zonas autorizadas activas: la menor
 * altitud máxima (AGL) entre ellas. null cuando no hay zonas activas.
 */
export function deriveOperatingCeiling(geofences) {
  const caps = (geofences || [])
    .filter((z) => z.status === 'Activa' && Number.isFinite(z.altitudMax))
    .map((z) => z.altitudMax)
  return caps.length ? Math.min(...caps) : null
}

/**
 * Estructura base de la Verificación Prevuelo: solo etiquetas, umbrales
 * (config) y placeholders. Los valores reales los inyecta la telemetría
 * en Rutas.jsx — ningún dato aquí se presenta como medición.
 */
export const PREFLIGHT_BASE = {
  overallStatus: 'Sin datos',
  isReady: false,
  operatingCeiling: {
    height: '—',
    regulatoryLimit: `< ${PREFLIGHT_LIMITS.regulatoryCeilingM}m`,
    complianceText: 'SIN ZONA ACTIVA',
    isCompliant: null,
  },
  metrics: {
    wind: {
      label: 'Viento',
      value: '—',
      numeric: null,
      statusLabel: 'Sin estación',
      statusType: '',
      maxLimit: PREFLIGHT_LIMITS.windMaxKmh,
    },
    battery: {
      label: 'Batería',
      value: '—',
      numeric: null,
      statusLabel: 'Sin datos',
      statusType: '',
      minLimit: PREFLIGHT_LIMITS.batteryMinPct,
    },
    rfSignal: {
      label: 'Señal RF',
      value: '—',
      numeric: null,
      statusLabel: 'Sin enlace',
      statusType: '',
      minAcceptableDbm: PREFLIGHT_LIMITS.rfMinDbm,
    },
  },
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
 * Capa de persistencia compartida (Geocercas).
 * Sin datos semilla: la lista la puebla syncGeofences() desde el backend
 * y las zonas de exclusión que el operador crea localmente.
 */
export function getStoredGeofences() {
  try {
    const raw = localStorage.getItem(GEOFENCES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // fallback
  }
  return []
}

export function saveGeofences(geofences) {
  try {
    localStorage.setItem(GEOFENCES_STORAGE_KEY, JSON.stringify(geofences))
    window.dispatchEvent(new CustomEvent('aeroluferan_geofences_updated', { detail: geofences }))
  } catch {
    // ignore
  }
}

export const AUTONOMOUS_STORAGE_KEY = 'aeroluferan_autonomous_flight'

export function getStoredAutonomous() {
  try {
    const raw = localStorage.getItem(AUTONOMOUS_STORAGE_KEY)
    if (raw !== null) {
      return JSON.parse(raw)
    }
  } catch {
    // fallback
  }
  return true
}

export function saveAutonomous(enabled) {
  try {
    localStorage.setItem(AUTONOMOUS_STORAGE_KEY, JSON.stringify(enabled))
    window.dispatchEvent(new CustomEvent('aeroluferan_autonomous_updated', { detail: enabled }))
  } catch {
    // ignore
  }
  return enabled
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
 *
 * Semántica (paridad con el backend):
 * - 'informativa' = perímetro operativo AUTORIZADO: no es un cruce prohibido;
 *   solo alerta cuando un waypoint sale de TODAS las geocercas operativas activas.
 * - 'restringida'/'advertencia' con `estructuraTopeM` solo bloquean/advierten
 *   puntos internos volando por debajo del tope (sobrevolar la estructura es válido).
 */
export function validateRouteAgainstGeofences(waypoints, geofences, altitudMetros = null) {
  if (!waypoints || waypoints.length < 2) return { conflicts: [], warnings: [], hasCriticalConflict: false }

  const detectedConflicts = []
  const active = (geofences || []).filter((zone) => zone.status !== 'Inactiva')
  const operativas = active.filter((zone) => zone.type === 'informativa')
  const exclusiones = active.filter((zone) => zone.type !== 'informativa')

  const waypointAlt = (pt) =>
    Number.isFinite(pt?.[2]) ? pt[2] : Number.isFinite(altitudMetros) ? altitudMetros : null

  const segmentCrosses = (zone) => {
    for (const pt of waypoints) {
      if (isPointInsideBounds(pt, zone.bounds)) return true
    }
    for (let i = 0; i < waypoints.length - 1; i++) {
      if (segmentIntersectsBounds(waypoints[i], waypoints[i + 1], zone.bounds)) return true
    }
    return false
  }

  // 1. Zonas de exclusión: conflicto al entrar en el rectángulo; con tope de
  //    estructura solo cuando el punto interno vuela a altitud <= tope.
  for (const zone of exclusiones) {
    const tope = Number.isFinite(zone.estructuraTopeM) ? zone.estructuraTopeM : null
    // Sin tope: entrar al rectángulo bloquea. Con tope: solo los waypoints
    // dentro del rectángulo volando a altitud <= tope bloquean.
    const intersects =
      tope === null
        ? segmentCrosses(zone)
        : waypoints.some((pt) => {
            const alt = waypointAlt(pt)
            return (
              isPointInsideBounds(pt, zone.bounds) && (alt === null || alt <= tope)
            )
          })

    if (intersects) {
      detectedConflicts.push({
        zoneId: zone.id,
        zoneName: zone.name,
        type: zone.type,
        reason:
          tope !== null
            ? `${zone.restrictionReason || zone.description} (tope ${tope} m)`
            : zone.restrictionReason || zone.description,
        isRestricted: zone.type === 'restringida',
        isWarning: zone.type === 'advertencia',
      })
    }
  }

  // 2. Perímetro operativo: si existen geocercas 'informativa' activas, cada
  //    waypoint debe caer dentro de al menos una — salir del perímetro alerta.
  if (operativas.length > 0) {
    const waypointsFuera = waypoints.filter(
      (pt) => !operativas.some((zone) => isPointInsideBounds(pt, zone.bounds)),
    )
    if (waypointsFuera.length > 0) {
      detectedConflicts.push({
        zoneId: 'perimetro-operativo',
        zoneName: 'Perímetro operativo autorizado',
        type: 'informativa',
        reason: `${waypointsFuera.length} waypoint(s) fuera de todas las geocercas operativas activas.`,
        isRestricted: false,
        isWarning: true,
        isPerimeterExit: true,
      })
    }
  }

  const hasCriticalConflict = detectedConflicts.some((c) => c.isRestricted)

  return {
    conflicts: detectedConflicts,
    hasCriticalConflict,
  }
}
