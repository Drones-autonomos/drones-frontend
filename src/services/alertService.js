/**
 * Servicio Centralizado de Alertas y Notificaciones para AeroLuferan.
 * Sincroniza con el backend institucional:
 *   GET   /alerts/            → historial de alertas
 *   GET   /alerts/{id}        → detalle con evento y detecciones asociadas
 *   PATCH /alerts/{id}/read   → marcar como leída (estado global)
 *   PATCH /events/{id}/status → despachar guardia (EN_REVISION)
 *   WS    /alerts/ws/notifications → nuevas alertas en tiempo real
 *
 * La visualización/descarte por rol (guard|admin) se conserva en un overlay
 * local porque la API no persiste estado por usuario.
 */

import apiClient, { API_URL, buildWsUrl, getAuthToken } from './apiClient.js'
import alertVanguard01 from '../assets/alert-vanguard-01.png'
import alertVanguard02 from '../assets/alert-vanguard-02.png'

export const ALERTS_STORAGE_KEY = 'aeroluferan_alerts_data'
export const ALERTS_CHANGED_EVENT = 'aeroluferan_alerts_changed'
const ALERTS_OVERLAY_KEY = 'aeroluferan_alerts_overlay'
const SYNC_INTERVAL_MS = 15000
const WS_RECONNECT_MS = 5000
const ALERTS_PAGE_SIZE = 100
const ALERTS_MAX_FETCH = 500


/* ==========================================================================
   Estado del repositorio, overlay local y sincronización con el backend
   ========================================================================== */

let alertsRepository = loadStoredAlerts()
let syncState = 'idle' // 'idle' | 'syncing' | 'connected' | 'offline' | 'unauthenticated'
let syncTimer = null
let notifySocket = null
let wsReconnectTimer = null

function loadStoredAlerts() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((a) => ({
          ...a,
          image: resolveStoredImage(a),
        }))
      }
    }
  } catch (error) {
    console.error('Error al cargar alertas almacenadas:', error)
  }
  return []
}

/** Las rutas de assets empaquetados no sobreviven a localStorage entre builds;
 * restaura la imagen por defecto cuando la alerta guardada usaba un asset local. */
function resolveStoredImage(alert) {
  if (alert.imageAsset === 'vanguard-01') return alertVanguard01
  if (alert.imageAsset === 'vanguard-02') return alertVanguard02
  if (typeof alert.image === 'string' && alert.image.startsWith('http')) return alert.image
  if (alert.id === 'vanguard-01') return alertVanguard01
  return alert.image || alertVanguard02
}

function persistAlerts() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alertsRepository))
  } catch (error) {
    console.error('Error al persistir alertas:', error)
  }
}

function loadOverlay() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(ALERTS_OVERLAY_KEY)) || {}
  } catch {
    return {}
  }
}

function persistOverlay(overlay) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ALERTS_OVERLAY_KEY, JSON.stringify(overlay))
  } catch (error) {
    console.error('Error al persistir estado de alertas:', error)
  }
}

function getAlertOverlay(alertId) {
  const overlay = loadOverlay()
  return overlay[alertId] || { viewedBy: {}, dismissedBy: {}, auditTrail: [] }
}

function updateAlertOverlay(alertId, updater) {
  const overlay = loadOverlay()
  const current = overlay[alertId] || { viewedBy: {}, dismissedBy: {}, auditTrail: [] }
  overlay[alertId] = updater(current)
  persistOverlay(overlay)
}

function applyOverlay(alert) {
  const o = getAlertOverlay(alert.id)
  return {
    ...alert,
    viewedBy: { guard: false, admin: false, ...o.viewedBy },
    dismissedBy: { guard: false, admin: false, ...o.dismissedBy },
    auditTrail: o.auditTrail || [],
  }
}

/* ==========================================================================
   Mapeo backend → forma que consumen las pantallas Admin/Guardia
   ========================================================================== */

const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '')

function resolveFrameUrl(frameUrl) {
  if (!frameUrl) return alertVanguard02
  if (/^https?:\/\//.test(frameUrl)) return frameUrl
  return `${API_ORIGIN}/${String(frameUrl).replace(/^\/+/, '')}`
}

function formatCoords(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return 'Zona de patrullaje'
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`
}

function formatTime(isoString) {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toTimeString().slice(0, 5)} hrs`
}

function formatAge(isoString) {
  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return ''
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (diffMin < 1) return 'Hace un momento'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH} h`
  return `Hace ${Math.floor(diffH / 24)} d`
}

const SEVERITY_LABELS = {
  CRITICA: 'ALERTA CRÍTICA',
  ALTA: 'ALERTA ALTA',
  MEDIA: 'ALERTA MEDIA',
  BAJA: 'ALERTA BAJA',
}

const EVENT_STATUS_LABELS = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En atención',
  RESUELTO: 'Resuelto',
}

/**
 * Convierte una alerta del backend (AlertaDetailResponse) al shape
 * que consumen las tarjetas de alertas.
 */
export function mapBackendAlert(detail) {
  const evento = detail.evento || {}
  const deteccion = evento.detecciones?.[0] || null
  const tipo = evento.tipo === 'HUMO_DETECTADO' ? 'humo' : 'intruso'
  const nivel = String(detail.nivel_criticidad || evento.nivel_criticidad || 'MEDIA').toUpperCase()
  const coords = deteccion ? formatCoords(deteccion.latitud, deteccion.longitud) : 'Zona de patrullaje'
  const estadoEvento = String(evento.estado || 'PENDIENTE').toUpperCase()
  const timestampIso = detail.timestamp_envio || evento.created_at
  const droneName = 'AeroLuferan'

  return {
    id: detail.id,
    backendId: detail.id,
    eventoId: detail.evento_id ?? evento.id ?? null,
    droneId: droneName,
    droneName,
    badgeNumber: String(detail.id),
    badgeType: 'number',
    type: tipo,
    severity: nivel === 'CRITICA' ? 'critical' : 'medium',
    severityLabel: SEVERITY_LABELS[nivel] || `ALERTA ${nivel}`,
    age: formatAge(timestampIso),
    location: coords,
    detection:
      deteccion?.tipo === 'HUMO'
        ? 'Humo detectado'
        : deteccion?.tipo === 'PERSONA'
          ? 'Persona detectada'
          : `Evento ${evento.tipo || 'de seguridad'}`,
    detectionType: tipo === 'humo' ? 'thermal' : 'motion',
    confidence:
      typeof deteccion?.nivel_confianza === 'number'
        ? `IA ${(deteccion.nivel_confianza * 100).toFixed(1)}%`
        : 'IA —',
    coordinates: coords,
    altitude: 'N/A',
    timestamp: formatTime(timestampIso),
    image: deteccion ? resolveFrameUrl(deteccion.frame_url) : alertVanguard02,
    incidentTitle: detail.titulo || 'Incidente de seguridad',
    description: evento.descripcion || detail.mensaje || 'Sin descripción disponible.',
    audit: null,
    dispatchButtonTheme: nivel === 'CRITICA' ? 'critical' : 'dark',
    status: EVENT_STATUS_LABELS[estadoEvento] || 'Pendiente',
    attentionStatus: EVENT_STATUS_LABELS[estadoEvento] || 'Pendiente',
    leida: Boolean(detail.leida),
    destinatarioRol: detail.destinatario_rol,
    viewedBy: { guard: false, admin: false },
    dismissedBy: { guard: false, admin: false },
    telemetry: {
      droneId: droneName,
      battery: '—',
      altitude: '—',
      windSpeed: '—',
      gps: coords,
      heading: '—',
      tilt: '—',
      captureTime: formatTime(timestampIso),
      streamStatus: 'En patrullaje activo',
    },
    auditTrail: [],
  }
}

/* ==========================================================================
   Sincronización con el backend (REST + WebSocket de notificaciones)
   ========================================================================== */

export function getAlertsSyncState() {
  return syncState
}

/* El backend limita cada página a ALERTS_PAGE_SIZE; se recorren páginas
   hasta agotar el historial o alcanzar ALERTS_MAX_FETCH. */
async function fetchAllAlerts() {
  const collected = []
  let skip = 0
  while (collected.length < ALERTS_MAX_FETCH) {
    const page = await apiClient.get('/alerts/', {
      query: { skip, limit: ALERTS_PAGE_SIZE },
      skipAuthRedirect: true,
    })
    const items = Array.isArray(page) ? page : []
    collected.push(...items)
    if (items.length < ALERTS_PAGE_SIZE) break
    skip += ALERTS_PAGE_SIZE
  }
  return collected
}

export async function syncAlertsFromBackend() {
  if (!getAuthToken()) {
    syncState = 'unauthenticated'
    return []
  }
  syncState = 'syncing'
  try {
    const list = await fetchAllAlerts()
    const details = await Promise.all(
      (list || []).map((a) =>
        apiClient
          .get(`/alerts/${a.id}`, { skipAuthRedirect: true })
          .catch(() => a),
      ),
    )
    alertsRepository = (details || []).map((d) => applyOverlay(mapBackendAlert(d)))
    persistAlerts()
    syncState = 'connected'
    notifyListeners()
    return alertsRepository
  } catch (error) {
    console.warn('No se pudieron sincronizar las alertas del backend:', error?.message)
    syncState = 'offline'
    notifyListeners()
    return alertsRepository
  }
}

function connectNotificationsSocket() {
  if (typeof window === 'undefined' || notifySocket) return
  const token = getAuthToken()
  if (!token) return

  try {
    notifySocket = new WebSocket(buildWsUrl('/alerts/ws/notifications', { token }))
  } catch {
    notifySocket = null
    return
  }

  notifySocket.onmessage = () => {
    syncAlertsFromBackend()
  }
  notifySocket.onclose = () => {
    notifySocket = null
    if (getAuthToken()) {
      wsReconnectTimer = setTimeout(connectNotificationsSocket, WS_RECONNECT_MS)
    }
  }
  notifySocket.onerror = () => {
    notifySocket?.close()
  }
}

function ensureSyncLoop() {
  syncAlertsFromBackend()
  connectNotificationsSocket()
  if (!syncTimer) {
    syncTimer = setInterval(() => {
      syncAlertsFromBackend()
      if (!notifySocket) connectNotificationsSocket()
    }, SYNC_INTERVAL_MS)
  }
}

export function stopAlertsSync() {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer)
    wsReconnectTimer = null
  }
  if (notifySocket) {
    notifySocket.onclose = null
    notifySocket.close()
    notifySocket = null
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
        detail: { alerts: alertsRepository, syncState },
      }),
    )
  }
}

/* ==========================================================================
   API pública (misma interfaz que la versión demo)
   ========================================================================== */

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
  ensureSyncLoop()

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

function patchAlertInRepository(alertId, updater) {
  alertsRepository = alertsRepository.map((alert) =>
    alert.id === alertId ? updater(alert) : alert,
  )
  notifyListeners()
}

/**
 * Marca una alerta como vista por un rol específico (e.g., 'guard' o 'admin').
 * Además notifica al backend (PATCH /alerts/{id}/read) de forma best-effort.
 */
export function markAlertAsViewed(alertId, role = 'guard') {
  const normRole = normalizeRole(role)
  updateAlertOverlay(alertId, (o) => ({
    ...o,
    viewedBy: { ...o.viewedBy, [normRole]: true },
  }))
  patchAlertInRepository(alertId, (alert) => ({
    ...alert,
    viewedBy: { ...alert.viewedBy, [normRole]: true },
  }))

  const alert = alertsRepository.find((a) => a.id === alertId)
  if (typeof alert?.backendId === 'number') {
    apiClient
      .patch(`/alerts/${alert.backendId}/read`, null, { skipAuthRedirect: true })
      .catch(() => {})
  }
}

/**
 * Marca todas las alertas visibles como vistas por el rol especificado.
 */
export function markAllAlertsAsViewed(role = 'guard') {
  const normRole = normalizeRole(role)
  alertsRepository.forEach((alert) => {
    if (!alert.dismissedBy?.[normRole]) {
      updateAlertOverlay(alert.id, (o) => ({
        ...o,
        viewedBy: { ...o.viewedBy, [normRole]: true },
      }))
    }
  })
  alertsRepository = alertsRepository.map((alert) => ({
    ...alert,
    viewedBy: {
      ...alert.viewedBy,
      [normRole]: alert.dismissedBy?.[normRole] ? alert.viewedBy?.[normRole] : true,
    },
  }))
  notifyListeners()

  alertsRepository
    .filter((alert) => typeof alert?.backendId === 'number')
    .forEach((alert) => {
      apiClient
        .patch(`/alerts/${alert.backendId}/read`, null, { skipAuthRedirect: true })
        .catch(() => {})
    })
}

/**
 * Descarta una alerta para el rol especificado (retirándola de su vista visible).
 * Conserva trazabilidad de auditoría local; la API no expone descarte por usuario.
 */
export function dismissAlert(alertId, role = 'guard') {
  const normRole = normalizeRole(role)
  const entry = {
    action: 'DISMISS_ALERT',
    role: normRole,
    timestamp: new Date().toISOString(),
    note: `Alerta descartada por ${normRole}.`,
  }
  updateAlertOverlay(alertId, (o) => ({
    ...o,
    dismissedBy: { ...o.dismissedBy, [normRole]: true },
    auditTrail: [...(o.auditTrail || []), entry],
  }))
  patchAlertInRepository(alertId, (alert) => ({
    ...alert,
    dismissedBy: { ...alert.dismissedBy, [normRole]: true },
    auditTrail: [...(alert.auditTrail || []), entry],
  }))
}

/**
 * Registra la solicitud de despacho de guardia.
 * Persiste el estado EN_REVISION del evento en el backend (best-effort)
 * y actualiza el estado de atención local con trazabilidad.
 */
export function dispatchGuard(alertId, role = 'guard') {
  const normRole = normalizeRole(role)
  const entry = {
    action: 'DISPATCH_GUARD',
    role: normRole,
    timestamp: new Date().toISOString(),
    note: `Despacho de guardia solicitado desde perfil ${normRole}.`,
  }
  updateAlertOverlay(alertId, (o) => ({
    ...o,
    viewedBy: { ...o.viewedBy, [normRole]: true },
    auditTrail: [...(o.auditTrail || []), entry],
  }))
  patchAlertInRepository(alertId, (alert) => ({
    ...alert,
    attentionStatus: 'En atención (Guardia despachado)',
    status: 'En atención',
    dispatched: true,
    dispatchedAt: entry.timestamp,
    dispatchedBy: normRole,
    viewedBy: { ...alert.viewedBy, [normRole]: true },
    auditTrail: [...(alert.auditTrail || []), entry],
  }))

  const alert = alertsRepository.find((a) => a.id === alertId)
  if (typeof alert?.eventoId === 'number') {
    apiClient
      .patch(
        `/events/${alert.eventoId}/status`,
        { estado: 'EN_REVISION' },
        { skipAuthRedirect: true },
      )
      .catch(() => {})
  }
}

/**
 * Vuelve a sincronizar las alertas desde el backend
 * (conserva el nombre histórico usado por las pantallas).
 */
export function resetAlertsDemo() {
  return syncAlertsFromBackend()
}

/**
 * Permite al backend inicializar o sustituir el conjunto de alertas.
 */
export function setAlertsFromBackend(alertsList) {
  if (Array.isArray(alertsList)) {
    alertsRepository = alertsList.map((a) => applyOverlay(a))
    notifyListeners()
  }
}
