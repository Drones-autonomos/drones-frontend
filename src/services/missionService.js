/**
 * Servicio de Misiones para AeroLuferan.
 * Conecta con el backend real: GET/POST/PUT /api/v1/missions y acciones
 * /start, /cancel y /confirm-landed.
 *
 * Reglas del backend (ver drones-backend/docs/API.md):
 *  - Crear/editar/iniciar misión: solo rol ADMIN.
 *  - Listar/ver/cancelar: ADMIN y GUARDIA.
 *  - Waypoints: mínimo 2, orden único y consecutivo desde 1, altitud 2–200 m.
 *  - Estados: PROGRAMADA, EN_CURSO, CANCELANDO, FINALIZADA, CANCELADA, FALLIDA, RECUPERACION.
 */

import apiClient from './apiClient.js'

export const MISSIONS_UPDATED_EVENT = 'aeroluferan_missions_updated'

export const MISSION_ESTADOS = {
  PROGRAMADA: 'PROGRAMADA',
  EN_CURSO: 'EN_CURSO',
  CANCELANDO: 'CANCELANDO',
  FINALIZADA: 'FINALIZADA',
  CANCELADA: 'CANCELADA',
  FALLIDA: 'FALLIDA',
  RECUPERACION: 'RECUPERACION',
}

const ESTADO_UI = {
  PROGRAMADA: { statusType: 'proximo', badge: 'PROGRAMADA' },
  EN_CURSO: { statusType: 'encurso', badge: 'EN CURSO' },
  CANCELANDO: { statusType: 'cancelando', badge: 'CANCELANDO' },
  FINALIZADA: { statusType: 'finalizada', badge: 'FINALIZADA' },
  CANCELADA: { statusType: 'cancelada', badge: 'CANCELADA' },
  FALLIDA: { statusType: 'fallida', badge: 'FALLIDA' },
  RECUPERACION: { statusType: 'recuperacion', badge: 'RECUPERACIÓN' },
}

export const CANCELLABLE_ESTADOS = new Set(['PROGRAMADA', 'EN_CURSO'])
export const STARTABLE_ESTADOS = new Set(['PROGRAMADA'])

function notifyMissionsUpdated(detail = null) {
  try {
    window.dispatchEvent(new CustomEvent(MISSIONS_UPDATED_EVENT, { detail }))
  } catch {
    // SSR / entornos sin window
  }
}

/**
 * El backend guarda `horario_inicio_programado` como timestamp UTC sin zona.
 * Se interpreta como UTC y se formatea a la hora local del navegador.
 */
function parseBackendDate(value) {
  if (!value) return null
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
  const date = new Date(hasZone ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTimeDisplay(mission) {
  const start = parseBackendDate(mission.horario_inicio_programado)
  if (!start) return 'Sin horario'
  const hhmm = start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${hhmm} HRS`
}

/** Descripciones generadas por ProgramarRuta siguen el formato "Zona · Tipo · Frecuencia · Origen → Destino · N min". */
function parseDescriptionMetadata(descripcion) {
  const meta = { zone: 'Campus FIF', patrolType: '', duration: '' }
  if (!descripcion || typeof descripcion !== 'string') return meta
  const parts = descripcion.split(' · ').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return meta
  meta.zone = parts[0]
  if (parts[1]) meta.patrolType = parts[1]
  const durationPart = parts.find((p) => /^\d+\s*min$/i.test(p))
  if (durationPart) meta.duration = durationPart.replace(/\s*min$/i, ' min')
  return meta
}

/**
 * Mapea una misión del backend (MisionResponse) al shape que consumen
 * las tarjetas de Rutas/Guardia y el mapa Leaflet.
 * Los campos que el backend no provee (sensor, batería requerida) se
 * muestran como '—' en lugar de inventarse.
 */
export function mapBackendMission(mission) {
  if (!mission || typeof mission !== 'object') return null

  const sortedWaypoints = [...(mission.waypoints || [])].sort(
    (a, b) => (a.orden_waypoint || 0) - (b.orden_waypoint || 0),
  )
  const latLngWaypoints = sortedWaypoints.map((wp) => [wp.latitud, wp.longitud])

  const meta = parseDescriptionMetadata(mission.descripcion)
  const estado = (mission.estado || 'PROGRAMADA').toUpperCase()
  const estadoUi = ESTADO_UI[estado] || { statusType: 'agendado', badge: estado }

  const start = parseBackendDate(mission.horario_inicio_programado)
  const iconType = meta.patrolType
    ? meta.patrolType.toLowerCase().includes('matutino') ? 'sun' : 'moon'
    : start && start.getHours() >= 6 && start.getHours() < 13
      ? 'sun'
      : 'moon'

  return {
    id: mission.id,
    name: mission.nombre,
    iconType,
    timeDisplay: formatTimeDisplay(mission),
    zone: meta.zone,
    status: estado,
    statusBadge: mission.error_ejecucion ? 'FALLIDA' : estadoUi.badge,
    statusType: mission.error_ejecucion ? 'fallida' : estadoUi.statusType,
    duration: meta.duration || '—',
    batteryRequired: '—',
    opticalSensor: '—',
    sensorColor: 'blue',
    waypoints: latLngWaypoints,
    // Campos crudos del backend para lógica (inicio, cancelación, métricas)
    estado,
    descripcion: mission.descripcion || '',
    creado_por: mission.creado_por,
    horario_inicio_programado: mission.horario_inicio_programado,
    created_at: mission.created_at,
    iniciada_at: mission.iniciada_at,
    finalizada_at: mission.finalizada_at,
    waypoints_completados: mission.waypoints_completados ?? 0,
    error_ejecucion: mission.error_ejecucion || null,
    backendWaypoints: sortedWaypoints,
  }
}

export async function listMissions({ estado, skip = 0, limit = 50 } = {}) {
  const data = await apiClient.get('/missions/', {
    query: { estado, skip, limit },
  })
  const list = Array.isArray(data) ? data : []
  return list.map(mapBackendMission).filter(Boolean)
}

export async function getMission(id) {
  const data = await apiClient.get(`/missions/${id}`)
  return mapBackendMission(data)
}

/**
 * Crea una misión en el backend.
 * @param {object} input
 * @param {string} input.nombre 3–100 caracteres
 * @param {string} [input.descripcion]
 * @param {string|Date} [input.horarioInicio] fecha/hora programada
 * @param {Array<[number, number]>} input.waypoints lista de [lat, lng]
 * @param {number} [input.altitudMetros] altitud AGL por waypoint (2–200)
 */
export async function createMission({ nombre, descripcion, horarioInicio, waypoints, altitudMetros }) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('La ruta debe contener al menos dos waypoints.')
  }
  const altitud = Number.isFinite(altitudMetros) ? altitudMetros : 15
  const payload = {
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
    horario_inicio_programado: horarioInicio
      ? (horarioInicio instanceof Date ? horarioInicio : new Date(horarioInicio)).toISOString()
      : null,
    waypoints: waypoints.map((pt, index) => ({
      orden_waypoint: index + 1,
      latitud: pt[0],
      longitud: pt[1],
      altitud_metros: altitud,
    })),
  }
  const created = await apiClient.post('/missions/', payload)
  notifyMissionsUpdated({ type: 'created', mission: created })
  return mapBackendMission(created)
}

export async function updateMission(id, fields) {
  const payload = {}
  if (fields.nombre !== undefined) payload.nombre = fields.nombre
  if (fields.descripcion !== undefined) payload.descripcion = fields.descripcion
  if (fields.horarioInicio !== undefined) {
    payload.horario_inicio_programado = fields.horarioInicio
      ? new Date(fields.horarioInicio).toISOString()
      : null
  }
  const updated = await apiClient.put(`/missions/${id}`, payload)
  notifyMissionsUpdated({ type: 'updated', mission: updated })
  return mapBackendMission(updated)
}

/** Inicia la ejecución de una misión PROGRAMADA (solo ADMIN). */
export async function startMission(id) {
  const updated = await apiClient.post(`/missions/${id}/start`)
  notifyMissionsUpdated({ type: 'started', mission: updated })
  return mapBackendMission(updated)
}

/** Cancela una misión (ADMIN y GUARDIA). EN_CURSO pasa a CANCELANDO con RTL. */
export async function cancelMission(id) {
  const updated = await apiClient.post(`/missions/${id}/cancel`)
  notifyMissionsUpdated({ type: 'cancelled', mission: updated })
  return mapBackendMission(updated)
}

/** Libera una reserva huérfana tras confirmar que el dron aterrizó (solo ADMIN). */
export async function confirmMissionLanded(id) {
  const updated = await apiClient.post(`/missions/${id}/confirm-landed`)
  notifyMissionsUpdated({ type: 'landed', mission: updated })
  return mapBackendMission(updated)
}

/** Obtiene la misión actualmente en ejecución, si existe. */
export async function getActiveMission() {
  const activas = await listMissions({ estado: 'EN_CURSO', limit: 1 })
  return activas[0] || null
}

const missionService = {
  listMissions,
  getMission,
  createMission,
  updateMission,
  startMission,
  cancelMission,
  confirmMissionLanded,
  getActiveMission,
  mapBackendMission,
}

export default missionService
