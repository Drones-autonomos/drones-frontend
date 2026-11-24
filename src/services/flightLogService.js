/**
 * Servicio de Bitácora de Vuelos para AeroLuferan.
 * Compone el historial de vuelos a partir de los endpoints reales del backend:
 *   GET /missions/          → vuelos (misiones ejecutadas o programadas)
 *   GET /telemetry/log      → métricas agregadas por misión
 *   GET /recordings/        → grabaciones cifradas (stream/download + purga 30d)
 *   GET /events/{id}        → incidencias con detecciones asociadas
 *
 * Persiste el resultado en localStorage y emite 'aeroluferan_bitacora_updated'
 * para que las pantallas de Bitácora (Admin/Guardia) se refresquen solas.
 */

import apiClient, { getAuthToken } from './apiClient.js'
import campusReference from '../assets/campus-reference.svg'

export const BITACORA_UPDATED_EVENT = 'aeroluferan_bitacora_updated'
export const MAX_RETENTION_DAYS = 30

let syncState = 'idle' // 'idle' | 'syncing' | 'connected' | 'offline' | 'unauthenticated'
const recordingBlobCache = new Map()

export function getFlightLogSyncState() {
  return syncState
}

/* ==========================================================================
   Utilidades de formato y geometría
   ========================================================================== */

function haversineMeters(p1, p2) {
  const [lat1, lon1] = p1
  const [lat2, lon2] = p2
  const R = 6371e3
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const a =
    Math.sin(((lat2 - lat1) * Math.PI) / 360) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(((lon2 - lon1) * Math.PI) / 360) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toDate(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDateDisplay(startIso, endIso, fallbackIso) {
  const start = toDate(startIso) || toDate(fallbackIso)
  const end = toDate(endIso)
  if (!start) return 'Fecha no disponible'

  const today = new Date()
  const sameDay = start.toDateString() === today.toDateString()
  const dateLabel = sameDay
    ? 'Hoy'
    : start.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hhmm = (d) => d.toTimeString().slice(0, 5)

  if (end && end > start) {
    const mins = Math.round((end - start) / 60000)
    return `${dateLabel}, ${hhmm(start)} - ${hhmm(end)} · ${mins} min de vuelo`
  }
  return `${dateLabel}, ${hhmm(start)} hrs`
}

const MISSION_STATE_LABELS = {
  PROGRAMADA: 'Misión programada',
  EN_CURSO: 'Misión en curso',
  FINALIZADA: 'Misión finalizada',
  CANCELADA: 'Misión cancelada',
  CANCELANDO: 'Cancelación en curso',
  FALLIDA: 'Misión fallida',
  RECUPERACION: 'En recuperación',
}

/* ==========================================================================
   Mapeo de telemetría agregada por misión
   ========================================================================== */

function aggregateTelemetry(entries) {
  const ordered = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const last = ordered[ordered.length - 1] || null

  let distanceMeters = 0
  let maxAltitude = null
  let maxSpeedMs = null
  const points = []

  ordered.forEach((e) => {
    if (typeof e.latitud === 'number' && typeof e.longitud === 'number') {
      const pt = [e.latitud, e.longitud]
      if (points.length > 0) distanceMeters += haversineMeters(points[points.length - 1], pt)
      points.push(pt)
    }
    if (typeof e.altitud_metros === 'number') {
      maxAltitude = maxAltitude === null ? e.altitud_metros : Math.max(maxAltitude, e.altitud_metros)
    }
    if (typeof e.velocidad_tierra_ms === 'number') {
      maxSpeedMs = maxSpeedMs === null ? e.velocidad_tierra_ms : Math.max(maxSpeedMs, e.velocidad_tierra_ms)
    }
  })

  const battery = typeof last?.bateria_porcentaje === 'number' ? Math.round(last.bateria_porcentaje) : null
  const distanceKm = distanceMeters / 1000

  return {
    battery: battery !== null ? `${battery}% Batería` : '— Batería',
    batteryNumeric: battery,
    distance: distanceMeters > 0 ? `${distanceKm.toFixed(1)} km` : '— km',
    distanceKm,
    altitude: maxAltitude !== null ? `Alt: ${Math.round(maxAltitude)} m` : 'Alt: —',
    altitudeMeters: maxAltitude,
    wind: maxSpeedMs !== null ? `Vel. máx: ${(maxSpeedMs * 3.6).toFixed(0)} km/h` : 'Vel: —',
    windSpeedKmH: maxSpeedMs !== null ? maxSpeedMs * 3.6 : null,
    samples: entries.length,
  }
}

/* ==========================================================================
   Mapeo de incidencias (eventos + detecciones) por vuelo
   ========================================================================== */

function mapIncidentFromEvent(eventDetail) {
  const det = eventDetail.detecciones?.[0] || {}
  return {
    id: `evt-${eventDetail.id}`,
    type: eventDetail.tipo === 'HUMO_DETECTADO' ? 'humo' : 'intruso',
    typeLabel: eventDetail.tipo === 'HUMO_DETECTADO' ? 'Humo' : 'Intruso',
    severity: String(eventDetail.nivel_criticidad || '').toUpperCase() === 'CRITICA' ? 'critical' : 'medium',
    location:
      typeof det.latitud === 'number'
        ? `${Math.abs(det.latitud).toFixed(4)}° N, ${Math.abs(det.longitud).toFixed(4)}° W`
        : 'Zona de patrullaje',
    timestamp: toDate(eventDetail.created_at)?.toTimeString().slice(0, 5) || '—',
    aiConfidence:
      typeof det.nivel_confianza === 'number' ? `${(det.nivel_confianza * 100).toFixed(1)}%` : '—',
    description: eventDetail.descripcion || '',
    state: eventDetail.estado || 'PENDIENTE',
  }
}

function buildIncidentBadge(incidents) {
  const count = incidents.length
  return {
    hasIncidents: count > 0,
    count,
    textLine1: `${count} Incidencia${count === 1 ? '' : 's'} ·`,
    textLine2: count > 0 ? 'Revisar evidencia' : 'Despejado',
    type: count > 0 ? 'danger' : 'success',
  }
}

/* ==========================================================================
   Composición del vuelo (tarjeta de Bitácora)
   ========================================================================== */

function composeFlight(mission, { recordings = [], telemetry = [], incidents = [] }) {
  const recording = recordings[0] || null
  const tele = aggregateTelemetry(telemetry)
  const startIso = mission.iniciada_at || telemetry[telemetry.length - 1]?.timestamp
  const endIso = mission.finalizada_at || recording?.fecha_grabacion
  const storedAt =
    recording?.fecha_grabacion || endIso || mission.created_at || new Date().toISOString()
  const estado = String(mission.estado || '').toUpperCase()

  let durationMinutes = 0
  const start = toDate(startIso)
  const end = toDate(endIso)
  if (start && end && end > start) durationMinutes = Math.round((end - start) / 60000)
  else if (recording?.duracion_segundos) durationMinutes = Math.round(recording.duracion_segundos / 60)

  return {
    id: `flight-${mission.id}`,
    backendId: mission.id,
    flightNumber: mission.id,
    flightNumberLabel: 'Vuelo',
    flightCode: `#${mission.id}`,
    missionId: `m-${mission.id}`,
    missionName: mission.nombre || `Misión ${mission.id}`,
    zone: mission.descripcion || 'Campus Juriquilla',
    circuitLabel: `· ${mission.nombre || `Misión ${mission.id}`}`,
    estadoMision: estado,
    operator: {
      name: 'Piloto automático',
      role: MISSION_STATE_LABELS[estado] || 'Misión',
      isAutonomous: true,
      displayText: `Operador: Piloto automático (${MISSION_STATE_LABELS[estado] || 'Misión'})`,
    },
    flightDate: (toDate(startIso) || toDate(storedAt) || new Date()).toISOString().slice(0, 10),
    timeStart: toDate(startIso)?.toTimeString().slice(0, 5) || '—',
    timeEnd: toDate(endIso)?.toTimeString().slice(0, 5) || '—',
    durationMinutes,
    dateDisplay: formatDateDisplay(startIso, endIso, mission.created_at),
    storedAt,
    video: recording
      ? {
          title: `Video HD Grabado · ${durationMinutes || Math.round(recording.duracion_segundos / 60)} min`,
          resolution: 'MP4 (AES-GCM)',
          durationSeconds: recording.duracion_segundos,
          videoUrl: '',
          recordingId: recording.id,
          poster: campusReference,
          quality: 'HD',
          sizeBytes: recording.tamano_bytes,
          expiresAt: recording.fecha_purga,
          daysRemaining: recording.dias_restantes_purga,
        }
      : {
          title: 'Sin grabación disponible',
          resolution: '—',
          durationSeconds: 0,
          videoUrl: '',
          recordingId: null,
          poster: campusReference,
          quality: '—',
        },
    telemetry: tele,
    incidents,
    incidentBadge: buildIncidentBadge(incidents),
    integrity: recording
      ? {
          hash: `#${recording.checksum_sha256.slice(0, 6).toUpperCase()}... Inmutable`,
          shortHash: `#${recording.checksum_sha256.slice(0, 6).toUpperCase()}...`,
          fullHash: recording.checksum_sha256,
          blockNumber: `Grabación #${recording.id}`,
          isImmutable: true,
          timestamp: recording.fecha_grabacion,
          isSimulated: false,
        }
      : {
          hash: 'Sin sellado criptográfico',
          shortHash: '—',
          fullHash: 'Sin grabación asociada a este vuelo.',
          blockNumber: '—',
          isImmutable: false,
          timestamp: storedAt,
          isSimulated: false,
        },
    buttonVariant: recording ? 'solid' : 'soft',
  }
}

/* ==========================================================================
   Sincronización con el backend
   ========================================================================== */

export async function refreshFlightLog() {
  if (!getAuthToken()) {
    syncState = 'unauthenticated'
    return []
  }
  syncState = 'syncing'
  try {
    const [missions, recordings, events] = await Promise.all([
      apiClient.get('/missions/', { query: { limit: 100 }, skipAuthRedirect: true }),
      apiClient.get('/recordings/', { query: { limit: 100 }, skipAuthRedirect: true }).catch(() => []),
      apiClient.get('/events/', { query: { limit: 50 }, skipAuthRedirect: true }).catch(() => []),
    ])

    const eventDetails = await Promise.all(
      (events || []).map((e) =>
        apiClient.get(`/events/${e.id}`, { skipAuthRedirect: true }).catch(() => null),
      ),
    )

    const incidentsByFlight = {}
    ;(eventDetails || []).forEach((detail) => {
      if (!detail) return
      const vueloId = detail.detecciones?.find((d) => d.vuelo_id != null)?.vuelo_id
      if (vueloId == null) return
      if (!incidentsByFlight[vueloId]) incidentsByFlight[vueloId] = []
      incidentsByFlight[vueloId].push(mapIncidentFromEvent(detail))
    })

    const telemetryByMission = await Promise.all(
      (missions || []).map((m) =>
        apiClient
          .get('/telemetry/log', {
            query: { mision_id: m.id, limit: 500 },
            skipAuthRedirect: true,
          })
          .catch(() => []),
      ),
    )

    const flights = (missions || []).map((mission, idx) =>
      composeFlight(mission, {
        recordings: (recordings || []).filter((r) => r.vuelo_id === mission.id),
        telemetry: telemetryByMission[idx] || [],
        incidents: incidentsByFlight[mission.id] || [],
      }),
    )

    try {
      localStorage.setItem('aeroluferan_bitacora_flights', JSON.stringify(flights))
      window.dispatchEvent(new CustomEvent(BITACORA_UPDATED_EVENT, { detail: flights }))
    } catch (error) {
      console.error('Error al persistir bitácora:', error)
    }

    syncState = 'connected'
    return flights
  } catch (error) {
    console.warn('No se pudo sincronizar la bitácora con el backend:', error?.message)
    syncState = 'offline'
    return null
  }
}

/* ==========================================================================
   Reproducción y descarga de grabaciones cifradas (vía fetch con Bearer)
   ========================================================================== */

/**
 * Obtiene una URL de objeto reproducible para la grabación de un vuelo.
 * Descarga el MP4 descifrado como Blob autenticado y lo cachea en memoria.
 */
export async function getRecordingPlaybackUrl(flight) {
  const recordingId = flight?.video?.recordingId
  if (!recordingId) return null
  if (recordingBlobCache.has(recordingId)) return recordingBlobCache.get(recordingId)

  const blob = await apiClient.get(`/recordings/${recordingId}/stream`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(blob)
  recordingBlobCache.set(recordingId, url)
  return url
}

/**
 * Descarga el archivo de grabación (endpoint restringido a ADMIN).
 */
export async function downloadRecordingFile(flight) {
  const recordingId = flight?.video?.recordingId
  if (!recordingId) {
    return {
      success: false,
      reason: 'no-recording',
      message: 'Este vuelo no tiene una grabación asociada en el servidor.',
    }
  }
  try {
    const blob = await apiClient.get(`/recordings/${recordingId}/download`, {
      responseType: 'blob',
    })
    const cleanName = String(flight.missionName || 'vuelo').replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = `AeroLuferan_Vuelo_${flight.flightNumber}_${cleanName}.mp4`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return { success: true, filename, message: `Descargando ${filename}` }
  } catch (error) {
    return {
      success: false,
      reason: 'error',
      message:
        error?.status === 403
          ? 'La descarga de grabaciones está restringida al perfil Administrador.'
          : 'No se pudo descargar la grabación desde el servidor.',
    }
  }
}

/**
 * Genera el archivo de auditoría con datos reales de telemetría y grabaciones.
 */
export async function generateAuditExportFile() {
  const [telemetry, recordings] = await Promise.all([
    apiClient
      .get('/telemetry/log', { query: { limit: 20 }, skipAuthRedirect: true })
      .catch(() => []),
    apiClient.get('/recordings/', { query: { limit: 20 }, skipAuthRedirect: true }).catch(() => []),
  ])

  const auditReport = {
    sistema: 'AeroLuferan - Sistema Autónomo de Vigilancia Aérea',
    entidad: 'Facultad de Informática - Universidad Autónoma de Querétaro',
    fechaGeneracion: new Date().toISOString(),
    resumenSeguridad: {
      cifrado: 'AES-GCM en reposo (grabaciones)',
      politicaRetencion: '30 días reglamentarios',
      muestrasTelemetria: telemetry?.length ?? 0,
      grabacionesRegistradas: recordings?.length ?? 0,
    },
    registrosTelemetriaRecientes: (telemetry || []).map((t) => ({
      id: t.id,
      misionId: t.mision_id,
      timestamp: t.timestamp,
      latitud: t.latitud,
      longitud: t.longitud,
      altitudMetros: t.altitud_metros,
      bateriaPorcentaje: t.bateria_porcentaje,
      velocidadTierraMs: t.velocidad_tierra_ms,
      modoVuelo: t.modo_vuelo,
      estadoEnlace: t.estado_enlace,
    })),
    grabaciones: (recordings || []).map((r) => ({
      id: r.id,
      vueloId: r.vuelo_id,
      fechaGrabacion: r.fecha_grabacion,
      fechaPurga: r.fecha_purga,
      duracionSegundos: r.duracion_segundos,
      tamanoBytes: r.tamano_bytes,
      checksumSha256: r.checksum_sha256,
    })),
  }

  const filename = `AeroLuferan_Registro_Auditoria_${new Date().toISOString().slice(0, 10)}.json`
  const jsonBlob = new Blob([JSON.stringify(auditReport, null, 2)], { type: 'application/json' })
  const downloadUrl = URL.createObjectURL(jsonBlob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)
  return { filename }
}
