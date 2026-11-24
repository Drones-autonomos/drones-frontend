/**
 * Rutas de patrullaje preprogramadas.
 *
 * Fuente de verdad: drones-backend/app/core/patrol_routes.py, expuesta en
 * GET /api/v1/missions/presets. Este archivo mantiene una copia estática como
 * fallback offline (mismo trayecto: RUTA_TRASLADO + BASE_1 + RUTAS_BARRIDO +
 * BASE_2 + RUTA_REGRESO + BASE_1); si cambian las coordenadas en el backend
 * hay que sincronizarla manualmente.
 *
 * fetchPresetRoutes() consulta el backend y sobreescribe el cache en memoria;
 * getPresetRoutes() devuelve lo último conocido (cache o fallback).
 *
 * El barrido usa altitud de crucero 30 m como el script; el tercer valor de
 * los tuples del script (segundos de hover) viaja en el campo hover_s del
 * backend pero no aplica a las misiones del backend.
 */

import apiClient from '../../services/apiClient.js'

const HOME = [20.70428, -100.44358] // Facultad de Informática (despegue SITL)
const BASE_1 = [20.701383, -100.441494] // Base 1 · acceso sureste
const BASE_2 = [20.705145, -100.444093] // Base 2 · estacionamiento noroeste

const TRASLADO = [
  [20.704086, -100.443178],
  [20.703742, -100.442974],
  [20.703169, -100.44283],
  [20.702729, -100.442544],
  [20.702175, -100.442258],
  [20.70164, -100.441911],
]

const REGRESO = [
  [20.704908, -100.443566],
  [20.704411, -100.443239],
  [20.703723, -100.442974],
  [20.702901, -100.442544],
  [20.702098, -100.442176],
  [20.701601, -100.441849],
]

const BARRIDO_CLASICA = [
  [20.70164, -100.441931],
  [20.701984, -100.442135],
  [20.701984, -100.443096],
  [20.701984, -100.443974],
  [20.702194, -100.443974],
  [20.702194, -100.442708],
  [20.702423, -100.44234],
  [20.702882, -100.442544],
  [20.703169, -100.44283],
  [20.703169, -100.443791],
  [20.703589, -100.443688],
  [20.703952, -100.443586],
  [20.703933, -100.443035],
  [20.704296, -100.443178],
  [20.70438, -100.443811],
  [20.704698, -100.443361],
  [20.704965, -100.443484],
  [20.704965, -100.443893],
]

const BARRIDO_INTERIOR = [
  [20.70164, -100.441931],
  [20.70195, -100.4421],
  [20.7024, -100.44234],
  [20.70286, -100.44254],
  [20.7032, -100.44284],
  [20.70374, -100.442974],
  [20.704086, -100.443178],
  [20.70438, -100.443811],
  [20.704698, -100.443361],
  [20.704965, -100.443484],
  [20.704965, -100.443893],
]

const BARRIDO_CANCHAS = [
  [20.70164, -100.441931],
  [20.702014, -100.442135],
  [20.702014, -100.443096],
  [20.702014, -100.443974],
  [20.702224, -100.443974],
  [20.702224, -100.442708],
  [20.702423, -100.44234],
  [20.702882, -100.442544],
  [20.7032, -100.44284],
  [20.7032, -100.44374],
  [20.7036, -100.4437],
  [20.70399, -100.44358],
  [20.70438, -100.443811],
  [20.704698, -100.443361],
  [20.704965, -100.443484],
  [20.704965, -100.443893],
]

function buildPatrolRoute(barrido) {
  return [
    ...TRASLADO,
    BASE_1,
    ...barrido,
    BASE_2,
    ...REGRESO,
    BASE_1,
  ]
}

export const PRESET_ROUTES = [
  {
    id: 'clasica',
    nombre: 'Patrullaje Clásica',
    descripcion:
      'Barrido completo S→N del campus: explanadas del este, biblioteca, corredor central, canchas, FIF y estacionamientos.',
    waypoints: buildPatrolRoute(BARRIDO_CLASICA),
    altitudSugerida: 30,
  },
  {
    id: 'interior',
    nombre: 'Patrullaje Interior',
    descripcion:
      'Corredor interior este y plaza norte: traslado corto, barrido por dentro de los edificios y regreso a Base 1.',
    waypoints: buildPatrolRoute(BARRIDO_INTERIOR),
    altitudSugerida: 30,
  },
  {
    id: 'canchas',
    nombre: 'Patrullaje Canchas',
    descripcion:
      'Sector sur y canchas: rodeo de zonas de interferencia, cancha techada, campo de futbol y estacionamientos.',
    waypoints: buildPatrolRoute(BARRIDO_CANCHAS),
    altitudSugerida: 30,
  },
]

export const PATROL_BASES = [
  { id: 'home', label: 'HOME', tooltip: 'Base principal · Facultad de Informática', coords: HOME },
  { id: 'base1', label: 'B1', tooltip: 'Base 1 · acceso sureste del campus', coords: BASE_1 },
  { id: 'base2', label: 'B2', tooltip: 'Base 2 · base de carga (estacionamiento noroeste)', coords: BASE_2 },
]

export { HOME }

// ---------------------------------------------------------------------------
// Fetch dinámico desde GET /api/v1/missions/presets con fallback offline.
// ---------------------------------------------------------------------------

// Cache en memoria: null = aún no se ha consultado al backend esta sesión.
let presetRoutesCache = null

/**
 * Normaliza un preset del backend al shape interno que usa ProgramarRuta:
 * { id, nombre, descripcion, waypoints: [[lat, lng], ...], altitudSugerida }.
 * Los waypoints del backend son objetos {latitud, longitud, hover_s?}.
 */
function mapBackendPreset(preset) {
  if (!preset || typeof preset !== 'object') return null
  const rawWaypoints = Array.isArray(preset.waypoints) ? preset.waypoints : []
  const waypoints = rawWaypoints
    .map((wp) => {
      if (Array.isArray(wp)) return [wp[0], wp[1]]
      if (wp && typeof wp === 'object') return [wp.latitud, wp.longitud]
      return null
    })
    .filter((pt) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
  if (waypoints.length < 2) return null
  return {
    id: preset.id,
    nombre: preset.name || preset.id,
    descripcion: preset.description || '',
    waypoints,
    altitudSugerida: Number.isFinite(preset.altitude_m) ? preset.altitude_m : 30,
    routeLengthM: preset.route_length_m ?? null,
    clearanceM: preset.clearance_m ?? null,
  }
}

/** Devuelve las rutas conocidas: última respuesta del backend o fallback estático. */
export function getPresetRoutes() {
  return presetRoutesCache || PRESET_ROUTES
}

/**
 * Consulta GET /missions/presets y sobreescribe el cache en memoria.
 * Si el backend no responde o devuelve datos incompletos, conserva/devuelve
 * el fallback estático (modo offline). Nunca lanza excepción.
 *
 * @returns {Promise<Array>} lista de presets en el shape interno del front.
 */
export async function fetchPresetRoutes() {
  try {
    const data = await apiClient.get('/missions/presets')
    const list = Array.isArray(data) ? data : data?.presets || []
    const mapped = list.map(mapBackendPreset).filter(Boolean)
    if (mapped.length > 0) {
      presetRoutesCache = mapped
    }
  } catch (error) {
    // Backend inalcanzable o sin sesión: se sigue con el fallback estático.
    console.warn('presetRoutes: usando datos locales (backend no disponible)', error)
  }
  return getPresetRoutes()
}
