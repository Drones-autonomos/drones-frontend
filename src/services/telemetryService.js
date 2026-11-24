/**
 * Servicio de Telemetría para AeroLuferan.
 * Conecta en tiempo real con el backend FastAPI:
 *
 *   - WebSocket  /api/v1/video/ws/telemetry  (protocolo petición/respuesta:
 *     el cliente envía "status" y recibe un snapshot JSON; "ping" → "pong";
 *     el servidor cierra si no recibe mensajes en ~5 s).
 *   - REST       GET /api/v1/telemetry/current  (fallback y campos extra:
 *     velocidad, rumbo, voltaje, heartbeat).
 *   - REST       GET /api/v1/missions/?estado=EN_CURSO (misión activa).
 *   - REST       GET /api/v1/drone/charging-base (estado del helipuerto).
 *
 * Estrategia de transporte:
 *   1. WS como canal primario (envía "status" cada 2 s), con reconexión
 *      exponencial (1 s → 30 s máx., con jitter).
 *   2. Polling REST cada 5 s siempre activo: aporta los campos que el WS
 *      no publica y actúa como fallback cuando el WS no responde.
 *   3. Si el backend no es alcanzable, el estado se reporta como
 *      "sin conexión" sin inventar datos.
 */

import apiClient, { ApiError, buildWsUrl, getAuthToken } from './apiClient.js'
import { getActiveMission } from './missionService.js'

const WS_STATUS_INTERVAL_MS = 2000
const REST_POLL_INTERVAL_MS = 5000
const MISSION_POLL_INTERVAL_MS = 15000
const BASE_POLL_INTERVAL_MS = 20000
const WS_RECONNECT_MIN_MS = 1000
const WS_RECONNECT_MAX_MS = 30000

// Estado inicial de telemetría (valores neutros hasta recibir datos reales)
let currentTelemetry = {
  drone: {
    name: 'AeroLuferan',
    model: 'Vanguard-01',
    patrolStatus: 'Sin conexión',
    signalPercentage: 0,
    signalLabel: 'Señal',
  },
  flight: {
    route: 'Sin misión activa',
    milestone: 0,
    totalMilestones: 0,
    mode: '—',
    isPaused: false,
    isReturningToBase: false,
  },
  preview: {
    status: 'SIN SEÑAL',
    resolution: '—',
    encryption: 'AES-256',
    observedArea: 'Campus FIF',
    areaStatus: '—',
    heading: 'HDG —',
    tilt: '—',
  },
  cards: [
    { id: 'battery', value: '—', percentage: 0, detail: 'Sin datos', status: '', label: 'Batería', unit: '%' },
    { id: 'altitude', value: '—', meters: 0, detail: 'Sin datos', status: '', label: 'Altitud', unit: 'm' },
    { id: 'wind', value: '—', speedKmh: null, detail: 'Sin estación', status: '', label: 'Viento', unit: 'km/h' },
    { id: 'gps', value: 'Sin fix', satellites: null, detail: 'Sin datos', status: '', label: 'GPS', unit: 'Sat' },
  ],
  heliport: {
    name: 'Helipuerto Norte #01',
    stationNumber: '01',
    landingSystem: 'Pad de inducción magnética',
    availability: '—',
    protectionDome: 'Domo protector abierto',
    landingStatus: 'Sin datos',
  },
  link: {
    backendReachable: false,
    droneConnected: false,
    transport: 'offline', // 'ws' | 'polling' | 'offline'
    lastUpdate: null,
  },
  position: { lat: null, lon: null },
  raw: null,
}

// Último snapshot normalizado del vehículo (unión de WS + REST)
let vehicle = {
  connected: false,
  armed: false,
  mode: null,
  lat: null,
  lon: null,
  alt: null,
  batt: null,
  voltaje: null,
  vel: null,
  rumbo: null,
  enlace: 'DESCONECTADO',
  heartbeatAge: null,
  timestamp: null,
  stream: null,
}

let activeMission = null
let chargingBase = null
const linkState = {
  backendReachable: false,
  droneConnected: false,
  transport: 'offline',
  lastUpdate: null,
}

// ---------------------------------------------------------------------------
// Suscriptores
// ---------------------------------------------------------------------------

const telemetryListeners = new Set()

function notifyTelemetry() {
  telemetryListeners.forEach((listener) => {
    try {
      listener(currentTelemetry)
    } catch (err) {
      console.error('Error en listener de telemetría:', err)
    }
  })
}

/**
 * Obtiene el estado actual de la telemetría del dron.
 */
export function getTelemetryData() {
  return { ...currentTelemetry }
}

/**
 * Suscribe un observador a las actualizaciones de telemetría.
 * Al primer suscriptor arranca el transporte (WS + polling); al quedar
 * sin suscriptores se detiene. Retorna la función para cancelar.
 */
export function subscribeTelemetry(listener) {
  telemetryListeners.add(listener)
  if (telemetryListeners.size === 1) {
    startTelemetry()
  }
  try {
    listener(currentTelemetry)
  } catch (err) {
    console.error('Error al emitir telemetría inicial:', err)
  }

  return () => {
    telemetryListeners.delete(listener)
    if (telemetryListeners.size === 0) {
      stopTelemetry()
    }
  }
}

/**
 * Actualiza la información de telemetría recibida desde el backend o dron.
 */
export function updateTelemetryData(partial) {
  currentTelemetry = {
    ...currentTelemetry,
    ...partial,
    drone: {
      ...currentTelemetry.drone,
      ...(partial.drone || {}),
    },
    flight: {
      ...currentTelemetry.flight,
      ...(partial.flight || {}),
    },
    preview: {
      ...currentTelemetry.preview,
      ...(partial.preview || {}),
    },
    heliport: {
      ...currentTelemetry.heliport,
      ...(partial.heliport || {}),
    },
    link: {
      ...currentTelemetry.link,
      ...(partial.link || {}),
    },
    position: {
      ...currentTelemetry.position,
      ...(partial.position || {}),
    },
    cards: partial.cards || currentTelemetry.cards,
  }
  notifyTelemetry()
}

/**
 * Actualiza el porcentaje de señal de comunicación del dron dinámicamente.
 */
export function updateSignalPercentage(percentage) {
  updateTelemetryData({
    drone: {
      ...currentTelemetry.drone,
      signalPercentage: Math.max(0, Math.min(100, Math.round(percentage))),
    },
  })
}

// ---------------------------------------------------------------------------
// Mapeo backend → shape de la UI
// ---------------------------------------------------------------------------

function compassDirection(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(((deg % 360) / 45)) % 8]
}

function computeSignalPercentage() {
  if (!linkState.backendReachable || !vehicle.connected) return 0
  if (vehicle.enlace === 'PERDIDA_SENAL') return 12
  if (vehicle.heartbeatAge != null) {
    return Math.max(10, Math.min(98, Math.round(100 - vehicle.heartbeatAge * 12)))
  }
  return 92
}

function computePatrolStatus() {
  if (!linkState.backendReachable) return 'Sin conexión'
  if (!vehicle.connected) return 'Dron sin conexión'
  if (vehicle.mode === 'RTL') return 'Regresando a Base'
  if (vehicle.armed) return 'En Patrullaje'
  return 'En tierra'
}

const BASE_ESTADO_UI = {
  IDLE: { availability: 'DISPONIBLE', landingStatus: 'Listo para aterrizaje' },
  DOCKED: { availability: 'ACOPLADO', landingStatus: 'Dron acoplado en base' },
  CHARGING: { availability: 'RECARGANDO', landingStatus: 'Recarga en curso' },
  CHARGED: { availability: '100% LISTA', landingStatus: 'Carga completa' },
}

function buildCards() {
  const hasData = linkState.backendReachable
  return [
    {
      id: 'battery',
      value: vehicle.batt != null ? `${Math.round(vehicle.batt)}%` : '—',
      percentage: vehicle.batt != null ? Math.round(vehicle.batt) : 0,
      detail: vehicle.voltaje != null ? `${Number(vehicle.voltaje).toFixed(1)} V` : hasData ? 'Sin datos' : 'Sin conexión',
      status: vehicle.batt != null && vehicle.batt < 20 ? 'warning' : 'ok',
      label: 'Batería',
      unit: '%',
    },
    {
      id: 'altitude',
      value: vehicle.alt != null ? `${Number(vehicle.alt).toFixed(1)} m` : '—',
      meters: vehicle.alt != null ? Number(vehicle.alt) : 0,
      detail: vehicle.connected ? 'Telemetría real' : hasData ? 'Dron sin enlace' : 'Sin conexión',
      status: vehicle.alt != null ? 'ok' : '',
      label: 'Altitud',
      unit: 'm',
    },
    {
      id: 'wind',
      value: '—',
      speedKmh: null,
      detail: 'Sin estación',
      status: '',
      label: 'Viento',
      unit: 'km/h',
    },
    {
      id: 'gps',
      value: vehicle.connected && vehicle.lat != null ? 'GPS Fix' : 'Sin fix',
      satellites: null,
      detail:
        vehicle.lat != null && vehicle.lon != null
          ? `${Number(vehicle.lat).toFixed(5)}, ${Number(vehicle.lon).toFixed(5)}`
          : hasData
            ? 'Sin posición'
            : 'Sin conexión',
      status: vehicle.lat != null ? 'ok' : '',
      label: 'GPS',
      unit: 'Sat',
    },
  ]
}

function buildHeliport() {
  const base = currentTelemetry.heliport
  if (!chargingBase) {
    return {
      ...base,
      availability: linkState.backendReachable ? '—' : 'SIN CONEXIÓN',
      landingStatus: linkState.backendReachable ? 'Sin datos' : 'Backend sin conexión',
    }
  }
  const estadoUi = BASE_ESTADO_UI[chargingBase.estado] || {
    availability: chargingBase.estado || '—',
    landingStatus: chargingBase.estado || '—',
  }
  return {
    ...base,
    availability: estadoUi.availability,
    landingStatus:
      chargingBase.bateria_porcentaje != null
        ? `${estadoUi.landingStatus} · ${Math.round(chargingBase.bateria_porcentaje)}%`
        : estadoUi.landingStatus,
  }
}

function rebuildTelemetry() {
  const stream = vehicle.stream
  const rumbo = vehicle.rumbo
  updateTelemetryData({
    drone: {
      patrolStatus: computePatrolStatus(),
      signalPercentage: computeSignalPercentage(),
    },
    flight: {
      route: activeMission?.name || 'Sin misión activa',
      milestone: activeMission?.waypoints_completados ?? 0,
      totalMilestones: activeMission?.waypoints?.length ?? 0,
      mode: vehicle.mode || '—',
      isPaused: false,
      isReturningToBase: vehicle.mode === 'RTL',
    },
    quickActions: { mode: vehicle.mode || '—' },
    preview: {
      status: vehicle.connected ? 'EN VIVO' : 'SIN SEÑAL',
      resolution:
        stream && stream.resolucion
          ? `${stream.resolucion}${stream.fps ? ` ${stream.fps}fps` : ''}`
          : '—',
      encryption: 'AES-256',
      observedArea: 'Campus FIF',
      areaStatus: vehicle.connected ? 'Monitoreo' : '—',
      heading: rumbo != null ? `HDG ${Math.round(rumbo)}° ${compassDirection(rumbo)}` : 'HDG —',
      tilt: '—',
    },
    cards: buildCards(),
    heliport: buildHeliport(),
    link: { ...linkState },
    position: { lat: vehicle.lat, lon: vehicle.lon },
    raw: { ...vehicle, mission: activeMission, chargingBase },
  })
}

// ---------------------------------------------------------------------------
// Normalización de snapshots (WS y REST usan claves distintas)
// ---------------------------------------------------------------------------

function mergeSnapshot(payload, source) {
  if (!payload || typeof payload !== 'object') return

  vehicle = {
    connected: payload.connected ?? vehicle.connected,
    armed: payload.armado ?? payload.armed ?? vehicle.armed,
    mode: payload.modo_vuelo ?? payload.mode ?? vehicle.mode,
    lat: payload.latitud ?? vehicle.lat,
    lon: payload.longitud ?? vehicle.lon,
    alt: payload.altitud_metros ?? payload.altitud_m ?? vehicle.alt,
    batt: payload.bateria_porcentaje ?? payload.bateria_pct ?? vehicle.batt,
    voltaje: payload.voltaje_bateria ?? vehicle.voltaje,
    vel: payload.velocidad_tierra_ms ?? vehicle.vel,
    rumbo: payload.rumbo_grados ?? vehicle.rumbo,
    enlace: payload.estado_enlace ?? (source === 'ws' ? vehicle.enlace : 'OK'),
    heartbeatAge: payload.heartbeat_age_s ?? vehicle.heartbeatAge,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    stream: payload.stream ?? vehicle.stream,
  }

  linkState.backendReachable = true
  linkState.droneConnected = Boolean(vehicle.connected)
  linkState.lastUpdate = new Date().toISOString()
  if (source === 'ws') linkState.transport = 'ws'
  else if (linkState.transport !== 'ws') linkState.transport = 'polling'

  rebuildTelemetry()
}

function markBackendUnreachable() {
  linkState.backendReachable = false
  linkState.droneConnected = false
  vehicle.connected = false
  rebuildTelemetry()
}

// ---------------------------------------------------------------------------
// Transporte WebSocket con reconexión exponencial
// ---------------------------------------------------------------------------

let ws = null
let wsStatusTimer = null
let wsReconnectTimer = null
let wsReconnectDelay = WS_RECONNECT_MIN_MS
let telemetryStarted = false

function clearWsTimers() {
  if (wsStatusTimer) {
    window.clearInterval(wsStatusTimer)
    wsStatusTimer = null
  }
}

function scheduleWsReconnect() {
  if (!telemetryStarted || wsReconnectTimer) return
  const jitter = Math.floor(Math.random() * 400)
  wsReconnectTimer = window.setTimeout(() => {
    wsReconnectTimer = null
    openTelemetrySocket()
  }, wsReconnectDelay + jitter)
  wsReconnectDelay = Math.min(wsReconnectDelay * 2, WS_RECONNECT_MAX_MS)
}

function openTelemetrySocket(socketUrl) {
  const url = socketUrl || buildWsUrl('/video/ws/telemetry')
  let socket
  try {
    socket = new WebSocket(url)
  } catch (error) {
    console.warn('[TelemetryService] No se pudo crear WebSocket:', error)
    scheduleWsReconnect()
    return null
  }

  ws = socket

  socket.onopen = () => {
    wsReconnectDelay = WS_RECONNECT_MIN_MS
    linkState.transport = 'ws'
    try {
      socket.send('status')
    } catch {
      // ignora
    }
    clearWsTimers()
    // El servidor cierra si no recibe mensajes en ~5 s: pedir estado cada 2 s
    wsStatusTimer = window.setInterval(() => {
      try {
        if (socket.readyState === WebSocket.OPEN) socket.send('status')
      } catch {
        // ignora
      }
    }, WS_STATUS_INTERVAL_MS)
    rebuildTelemetry()
  }

  socket.onmessage = (event) => {
    const data = event?.data
    if (typeof data !== 'string' || data === 'pong') return
    try {
      mergeSnapshot(JSON.parse(data), 'ws')
    } catch {
      // mensaje no JSON → ignorar
    }
  }

  socket.onerror = () => {
    // onclose se encargará de la reconexión
  }

  socket.onclose = () => {
    clearWsTimers()
    if (ws === socket) {
      ws = null
      if (linkState.transport === 'ws') linkState.transport = 'polling'
      rebuildTelemetry()
      scheduleWsReconnect()
    }
  }

  return socket
}

// ---------------------------------------------------------------------------
// Polling REST (fallback + campos enriquecidos + misión activa + base de carga)
// ---------------------------------------------------------------------------

let restPollTimer = null
let missionPollTimer = null
let basePollTimer = null

async function pollRestTelemetry() {
  if (!getAuthToken()) return
  try {
    const snapshot = await apiClient.get('/telemetry/current')
    mergeSnapshot(snapshot, 'rest')
  } catch (error) {
    if (error instanceof ApiError && error.isOffline) {
      markBackendUnreachable()
    }
    // 401/403/5xx: el apiClient ya gestiona la sesión; mantener último estado
  }
}

async function pollActiveMission() {
  if (!getAuthToken()) return
  try {
    activeMission = await getActiveMission()
    rebuildTelemetry()
  } catch (error) {
    if (error instanceof ApiError && error.isOffline) {
      markBackendUnreachable()
    }
  }
}

async function pollChargingBase() {
  if (!getAuthToken()) return
  try {
    chargingBase = await apiClient.get('/drone/charging-base')
    rebuildTelemetry()
  } catch (error) {
    if (error instanceof ApiError && error.isOffline) {
      markBackendUnreachable()
    }
  }
}

/**
 * Arranca el transporte de telemetría (WS + fallback REST). Idempotente.
 */
export function startTelemetry() {
  if (telemetryStarted) return
  telemetryStarted = true

  openTelemetrySocket()
  pollRestTelemetry()
  pollActiveMission()
  pollChargingBase()

  restPollTimer = window.setInterval(pollRestTelemetry, REST_POLL_INTERVAL_MS)
  missionPollTimer = window.setInterval(pollActiveMission, MISSION_POLL_INTERVAL_MS)
  basePollTimer = window.setInterval(pollChargingBase, BASE_POLL_INTERVAL_MS)
}

/**
 * Detiene todos los transportes de telemetría.
 */
export function stopTelemetry() {
  telemetryStarted = false
  clearWsTimers()
  if (wsReconnectTimer) {
    window.clearTimeout(wsReconnectTimer)
    wsReconnectTimer = null
  }
  if (ws) {
    const socket = ws
    ws = null
    try {
      socket.close()
    } catch {
      // ignora
    }
  }
  if (restPollTimer) {
    window.clearInterval(restPollTimer)
    restPollTimer = null
  }
  if (missionPollTimer) {
    window.clearInterval(missionPollTimer)
    missionPollTimer = null
  }
  if (basePollTimer) {
    window.clearInterval(basePollTimer)
    basePollTimer = null
  }
  linkState.transport = 'offline'
  linkState.backendReachable = false
  linkState.droneConnected = false
  rebuildTelemetry()
}

/**
 * Fuerza una actualización inmediata de telemetría y misión activa.
 */
export async function refreshTelemetry() {
  await Promise.allSettled([pollRestTelemetry(), pollActiveMission(), pollChargingBase()])
}

/**
 * Conector explícito a un socket de telemetría (compatibilidad).
 * Devuelve un handle con disconnect().
 */
export function connectTelemetrySocket(socketUrl) {
  const socket = openTelemetrySocket(socketUrl)
  return {
    disconnect: () => {
      if (socket) {
        try {
          socket.close()
        } catch {
          // ignora
        }
      }
    },
  }
}

const telemetryService = {
  getTelemetryData,
  subscribeTelemetry,
  updateTelemetryData,
  updateSignalPercentage,
  startTelemetry,
  stopTelemetry,
  refreshTelemetry,
  connectTelemetrySocket,
}

export default telemetryService
