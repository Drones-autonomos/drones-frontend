/**
 * Servicio de Bitácora de Vuelos e Integridad Criptográfica para AeroLuferan.
 * Compone el historial de vuelos a partir de los endpoints reales del backend:
 *   GET /flight-logs/            → bitácora inmutable con cadena SHA-256 y operador real
 *   GET /flight-logs/{id}/verify → verificación criptográfica en servidor
 *   GET /missions/               → vuelos (misiones ejecutadas o programadas)
 *   GET /telemetry/log           → métricas agregadas por misión
 *   GET /recordings/             → grabaciones cifradas (stream con HTTP Range + purga normativa)
 *   GET /events/                 → incidencias con detecciones asociadas
 */

import apiClient, { buildApiUrl, getAuthToken } from './apiClient.js'
import { BITACORA_SYNCED_KEY } from '../pages/Admin/bitacoraData.js'

export const BITACORA_UPDATED_EVENT = 'aeroluferan_bitacora_updated'
export const MAX_RETENTION_DAYS = 30

let syncState = 'idle'

export function getFlightLogSyncState() {
  return syncState
}

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

function aggregateTelemetry(entries) {
  const ordered = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const last = ordered[ordered.length - 1] || null

  let distanceMeters = 0
  let maxAltitude = null
  let maxSpeedMs = null
  let maxWindKmH = null
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
    if (typeof e.viento_velocidad_kmh === 'number') {
      maxWindKmH = maxWindKmH === null ? e.viento_velocidad_kmh : Math.max(maxWindKmH, e.viento_velocidad_kmh)
    }
  })

  const battery = typeof last?.bateria_porcentaje === 'number' ? Math.round(last.bateria_porcentaje) : null
  const distanceKm = distanceMeters / 1000
  const windDisplay =
    maxWindKmH !== null
      ? `Viento: ${Math.round(maxWindKmH)} km/h`
      : maxSpeedMs !== null
        ? `Vel. máx: ${(maxSpeedMs * 3.6).toFixed(0)} km/h`
        : 'Viento: —'

  return {
    battery: battery !== null ? `${battery}% Batería` : '— Batería',
    batteryNumeric: battery,
    distance: distanceMeters > 0 ? `${distanceKm.toFixed(1)} km` : '— km',
    distanceKm,
    altitude: maxAltitude !== null ? `Alt: ${Math.round(maxAltitude)} m` : 'Alt: —',
    altitudeMeters: maxAltitude,
    wind: windDisplay,
    windSpeedKmH: maxWindKmH ?? (maxSpeedMs !== null ? maxSpeedMs * 3.6 : null),
    samples: entries.length,
  }
}

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
        : '—',
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

function composeFlight(mission, { recordings = [], telemetry = [], incidents = [], flightLog = null }) {
  const recording = recordings[0] || null
  const tele = aggregateTelemetry(telemetry)
  const startIso = mission.iniciada_at || flightLog?.fecha_inicio || telemetry[telemetry.length - 1]?.timestamp
  const endIso = mission.finalizada_at || flightLog?.fecha_fin || recording?.fecha_grabacion
  const storedAt =
    recording?.fecha_grabacion || endIso || mission.created_at || new Date().toISOString()
  const estado = String(mission.estado || flightLog?.estado_final || '').toUpperCase()

  let durationMinutes = 0
  const start = toDate(startIso)
  const end = toDate(endIso)
  if (start && end && end > start) durationMinutes = Math.round((end - start) / 60000)
  else if (flightLog?.duracion_segundos) durationMinutes = Math.round(flightLog.duracion_segundos / 60)
  else if (recording?.duracion_segundos) durationMinutes = Math.round(recording.duracion_segundos / 60)

  const operatorName = flightLog?.operador_nombre || 'Piloto automático'
  const operatorRole =
    flightLog?.operador_rol || MISSION_STATE_LABELS[estado] || 'Misión'

  const sealHash = flightLog?.hash_sha256 || recording?.checksum_sha256 || null
  const sealBlock = flightLog?.id
    ? `Bitácora #${flightLog.id}`
    : recording?.id
      ? `Grabación #${recording.id}`
      : '—'
  const isPurged = Boolean(recording?.purgado)

  return {
    id: `flight-${mission.id}`,
    backendId: mission.id,
    flightLogId: flightLog?.id ?? null,
    flightNumber: mission.id,
    flightNumberLabel: 'Vuelo',
    flightCode: `#${mission.id}`,
    missionId: `m-${mission.id}`,
    missionName: mission.nombre || `Misión ${mission.id}`,
    zone: mission.descripcion || '—',
    circuitLabel: `· ${mission.nombre || `Misión ${mission.id}`}`,
    estadoMision: estado,
    operator: {
      name: operatorName,
      role: operatorRole,
      isAutonomous: !flightLog?.operador_nombre,
      displayText: `Operador: ${operatorName} (${operatorRole})`,
    },
    flightDate: (toDate(startIso) || toDate(storedAt) || new Date()).toISOString().slice(0, 10),
    timeStart: toDate(startIso)?.toTimeString().slice(0, 5) || '—',
    timeEnd: toDate(endIso)?.toTimeString().slice(0, 5) || '—',
    durationMinutes,
    dateDisplay: formatDateDisplay(startIso, endIso, mission.created_at),
    storedAt,
    video: recording
      ? {
          title: isPurged
            ? 'Video purgado por retención · Sello conservado'
            : `Video HD Grabado · ${durationMinutes || Math.round(recording.duracion_segundos / 60)} min`,
          resolution: 'MP4 (AES-GCM)',
          durationSeconds: recording.duracion_segundos,
          videoUrl: '',
          recordingId: isPurged ? null : recording.id,
          isPurged,
          poster: null,
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
          isPurged: false,
          poster: null,
          quality: '—',
        },
    telemetry: tele,
    incidents,
    incidentBadge: buildIncidentBadge(incidents),
    integrity: sealHash
      ? {
          hash: `#${sealHash.slice(0, 6).toUpperCase()}... Inmutable`,
          shortHash: `#${sealHash.slice(0, 6).toUpperCase()}...`,
          fullHash: sealHash,
          prevHash: flightLog?.prev_hash || null,
          blockNumber: sealBlock,
          isImmutable: true,
          timestamp: flightLog?.fecha_inicio || recording?.fecha_grabacion || storedAt,
        }
      : {
          hash: 'Sin sellado criptográfico',
          shortHash: '—',
          fullHash: 'Sin registro criptográfico asociado a este vuelo.',
          prevHash: null,
          blockNumber: '—',
          isImmutable: false,
          timestamp: storedAt,
        },
    buttonVariant: recording && !isPurged ? 'solid' : 'soft',
  }
}

export async function refreshFlightLog() {
  if (!getAuthToken()) {
    syncState = 'unauthenticated'
    return []
  }
  syncState = 'syncing'
  try {
    const [missions, recordings, events, flightLogs] = await Promise.all([
      apiClient.get('/missions/', { query: { limit: 100 }, skipAuthRedirect: true }),
      apiClient.get('/recordings/', { query: { limit: 100, include_purged: true }, skipAuthRedirect: true }).catch(() => []),
      apiClient.get('/events/', { query: { limit: 50 }, skipAuthRedirect: true }).catch(() => []),
      apiClient.get('/flight-logs/', { query: { limit: 100 }, skipAuthRedirect: true }).catch(() => []),
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

    const logsByMission = {}
    ;(flightLogs || []).forEach((log) => {
      if (log?.vuelo_id != null && !logsByMission[log.vuelo_id]) {
        logsByMission[log.vuelo_id] = log
      }
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

    // Solo vuelos reales: una misión PROGRAMADA (o terminada sin iniciada_at)
    // todavía no despegó y no es un registro de vuelo.
    const FLIGHT_STATES = new Set(['EN_CURSO', 'CANCELANDO', 'RECUPERACION'])
    const flownMissions = (missions || [])
      .map((mission, idx) => [mission, telemetryByMission[idx] || []])
      .filter(([mission]) => {
        const estado = String(mission.estado || '').toUpperCase()
        return Boolean(mission.iniciada_at) || FLIGHT_STATES.has(estado)
      })

    const flights = flownMissions.map(([mission, telemetry]) =>
      composeFlight(mission, {
        recordings: (recordings || []).filter((r) => r.vuelo_id === mission.id),
        telemetry,
        incidents: incidentsByFlight[mission.id] || [],
        flightLog: logsByMission[mission.id] || null,
      }),
    )

    try {
      localStorage.setItem('aeroluferan_bitacora_flights', JSON.stringify(flights))
      localStorage.setItem(BITACORA_SYNCED_KEY, '1')
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

/**
 * Retorna la URL directa autenticada con soporte nativo HTTP Range (206 Partial Content).
 */
export async function getRecordingPlaybackUrl(flight) {
  const recordingId = flight?.video?.recordingId
  if (!recordingId || flight?.video?.isPurged) return null
  const token = getAuthToken()
  return buildApiUrl(`/recordings/${recordingId}/stream`, token ? { token } : undefined)
}

/**
 * Verifica en tiempo real el sello SHA-256 y la cadena previa en el servidor.
 */
export async function verifyFlightLogIntegrity(flight) {
  if (!flight?.flightLogId || !getAuthToken()) return null
  try {
    return await apiClient.get(`/flight-logs/${flight.flightLogId}/verify`, {
      skipAuthRedirect: true,
    })
  } catch {
    return null
  }
}

/**
 * Descarga el archivo de grabación (endpoint restringido a ADMIN y auditado).
 */
export async function downloadRecordingFile(flight) {
  if (flight?.video?.isPurged) {
    return {
      success: false,
      reason: 'purged',
      message: 'El video fue purgado por retención normativa; su sello SHA-256 permanece en Bitácora.',
    }
  }
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
 * Genera el archivo de auditoría con datos reales de auditoría, bitácora, telemetría y grabaciones.
 */
export async function generateAuditExportFile() {
  const [auditExport, flightLogs, telemetry, recordings] = await Promise.all([
    apiClient.get('/audit/export', { skipAuthRedirect: true }).catch(() => null),
    apiClient.get('/flight-logs/', { query: { limit: 50 }, skipAuthRedirect: true }).catch(() => []),
    apiClient.get('/telemetry/log', { query: { limit: 20 }, skipAuthRedirect: true }).catch(() => []),
    apiClient.get('/recordings/', { query: { limit: 20, include_purged: true }, skipAuthRedirect: true }).catch(() => []),
  ])

  const auditReport = auditExport || {
    sistema: 'AeroLuferan - Sistema Autónomo de Vigilancia Aérea',
    entidad: 'Facultad de Informática - Universidad Autónoma de Querétaro',
    fechaGeneracion: new Date().toISOString(),
    resumenSeguridad: {
      cifrado: 'AES-GCM en reposo (grabaciones)',
      bitacoraInmutableRegistros: flightLogs?.length ?? 0,
      muestrasTelemetria: telemetry?.length ?? 0,
      grabacionesRegistradas: recordings?.length ?? 0,
    },
    bitacoraVuelosInmutable: flightLogs || [],
    registrosTelemetriaRecientes: telemetry || [],
    grabaciones: recordings || [],
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
