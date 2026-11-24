/**
 * Servicio Centralizado de Alertas y Notificaciones para AeroLuferan.
 * Sincroniza con el backend institucional (sin consultas N+1):
 *   GET   /alerts/              → listado enriquecido con evento, detecciones y estado por usuario
 *   POST  /alerts/read-all      → marcar todas como leídas para el usuario actual
 *   PATCH /alerts/{id}/read     → marcar como leída para el usuario actual
 *   PATCH /alerts/{id}/dismiss  → descartar alerta para el usuario actual (persistido en BD)
 *   PATCH /events/{id}/status   → despachar guardia (EN_REVISION) o cerrar incidente (RESUELTO)
 *   GET   /detections/{id}/frame?token=... → evidencia visual autenticada sin 404
 *   WS    /alerts/ws/notifications → alertas y cambios de estado en tiempo real
 */

import apiClient, { API_URL, buildApiUrl, buildWsUrl, getAuthToken, getStoredSession } from './apiClient.js'
import alertVanguard01 from '../assets/alert-vanguard-01.png'
import alertVanguard02 from '../assets/alert-vanguard-02.png'

export const ALERTS_STORAGE_KEY = 'aeroluferan_alerts_data'
export const ALERTS_CHANGED_EVENT = 'aeroluferan_alerts_changed'
export const CRITICAL_PUSH_EVENT = 'aeroluferan_critical_push'
const ALERTS_OVERLAY_KEY = 'aeroluferan_alerts_overlay'
const AJUSTES_CACHE_KEY = 'aeroluferan_settings'
const SYNC_INTERVAL_MS = 15000
const WS_RECONNECT_MS = 5000
const ALERTS_PAGE_SIZE = 100
const ALERTS_MAX_FETCH = 500

let alertsRepository = loadStoredAlerts()
let syncState = 'idle'
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

function resolveStoredImage(alert) {
  if (alert.deteccionId) {
    const token = getAuthToken()
    return buildApiUrl(`/detections/${alert.deteccionId}/frame`, token ? { token } : undefined)
  }
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
  const backendRead = Boolean(alert.leidaPorUsuario)
  const backendDismissed = Boolean(alert.descartadaPorUsuario)
  return {
    ...alert,
    viewedBy: {
      guard: backendRead || Boolean(o.viewedBy?.guard),
      admin: backendRead || Boolean(o.viewedBy?.admin),
    },
    dismissedBy: {
      guard: backendDismissed || Boolean(o.dismissedBy?.guard),
      admin: backendDismissed || Boolean(o.dismissedBy?.admin),
    },
    auditTrail: o.auditTrail || [],
  }
}

/* ==========================================================================
   Mapeo backend → forma que consumen las pantallas Admin/Guardia
   ========================================================================== */

const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '')

function resolveDetectionImage(deteccion) {
  if (!deteccion) return alertVanguard02
  if (deteccion.id && deteccion.frame_url) {
    const token = getAuthToken()
    return buildApiUrl(`/detections/${deteccion.id}/frame`, token ? { token } : undefined)
  }
  if (deteccion.frame_url && /^https?:\/\//.test(deteccion.frame_url)) {
    return deteccion.frame_url
  }
  if (deteccion.frame_url) {
    return `${API_ORIGIN}/${String(deteccion.frame_url).replace(/^\/+/, '')}`
  }
  return alertVanguard02
}

function formatCoords(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '—'
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

export function mapBackendAlert(detail) {
  const evento = detail.evento || {}
  const deteccion = evento.detecciones?.[0] || null
  const tipo = evento.tipo === 'HUMO_DETECTADO' ? 'humo' : 'intruso'
  const nivel = String(detail.nivel_criticidad || evento.nivel_criticidad || 'MEDIA').toUpperCase()
  const coords =
    deteccion?.latitud != null && deteccion?.longitud != null
      ? formatCoords(Number(deteccion.latitud), Number(deteccion.longitud))
      : '—'
  const estadoEvento = String(evento.estado || 'PENDIENTE').toUpperCase()
  const timestampIso = detail.timestamp_envio || evento.created_at
  const droneName = 'AeroLuferan'
  const altMeters = deteccion?.altitud_metros
  const altitudeLabel =
    typeof altMeters === 'number' && Number.isFinite(altMeters)
      ? `${Math.round(altMeters)}m AGL`
      : 'N/A'

  const checksum = deteccion?.checksum_sha256 || null
  const auditSeal = checksum
    ? {
        text: 'Evidencia sellada SHA-256',
        code: `#${checksum.slice(0, 8).toUpperCase()}`,
        fullHash: checksum,
      }
    : null

  return {
    id: detail.id,
    backendId: detail.id,
    eventoId: detail.evento_id ?? evento.id ?? null,
    deteccionId: deteccion?.id ?? null,
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
        : evento.tipo === 'PERSONA_ZONA_RESTRINGIDA'
          ? 'Intruso en zona restringida'
          : deteccion?.tipo === 'PERSONA'
            ? 'Persona detectada'
            : `Evento ${evento.tipo || 'de seguridad'}`,
    detectionType: tipo === 'humo' ? 'thermal' : 'motion',
    confidence:
      typeof deteccion?.nivel_confianza === 'number'
        ? `IA ${(deteccion.nivel_confianza * 100).toFixed(1)}%`
        : 'IA —',
    coordinates: coords,
    altitude: altitudeLabel,
    timestamp: formatTime(timestampIso),
    image: resolveDetectionImage(deteccion),
    incidentTitle: detail.titulo || 'Incidente de seguridad',
    description: evento.descripcion || detail.mensaje || 'Sin descripción disponible.',
    audit: auditSeal,
    dispatchButtonTheme: nivel === 'CRITICA' ? 'critical' : 'dark',
    estadoEvento,
    status: EVENT_STATUS_LABELS[estadoEvento] || 'Pendiente',
    attentionStatus: EVENT_STATUS_LABELS[estadoEvento] || 'Pendiente',
    notasResolucion: evento.notas_resolucion || null,
    dispatched: estadoEvento === 'EN_REVISION' || estadoEvento === 'RESUELTO',
    resolved: estadoEvento === 'RESUELTO',
    leida: Boolean(detail.leida),
    leidaPorUsuario: Boolean(detail.leida_por_usuario ?? detail.leida),
    descartadaPorUsuario: Boolean(detail.descartada),
    destinatarioRol: detail.destinatario_rol,
    viewedBy: { guard: false, admin: false },
    dismissedBy: { guard: false, admin: false },
    telemetry: {
      droneId: droneName,
      battery: '—',
      altitude: altitudeLabel,
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
   Sincronización con el backend (REST enriquecido + WebSocket)
   ========================================================================== */

export function getAlertsSyncState() {
  return syncState
}

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
    // GET /alerts/ ya incluye evento + detecciones; solo consulta /{id} si algún registro antiguo no lo trajera.
    const enriched = await Promise.all(
      (list || []).map((a) =>
        a.evento
          ? Promise.resolve(a)
          : apiClient.get(`/alerts/${a.id}`, { skipAuthRedirect: true }).catch(() => a),
      ),
    )
    alertsRepository = (enriched || []).map((d) => applyOverlay(mapBackendAlert(d)))
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

export function isCriticalPushEnabledForCurrentUser() {
  if (typeof window === 'undefined') return true
  const prefs = getStoredSession()?.preferencias
  if (prefs && typeof prefs === 'object') {
    if (typeof prefs.critical_push_enabled === 'boolean') return prefs.critical_push_enabled
    if (typeof prefs.criticalPushEnabled === 'boolean') return prefs.criticalPushEnabled
  }
  try {
    const rawSettings = localStorage.getItem(AJUSTES_CACHE_KEY)
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings)
      if (typeof parsed?.criticalPushEnabled === 'boolean') return parsed.criticalPushEnabled
    }
  } catch {
    // ignore malformed local cache
  }
  return true
}

export function getBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return window.Notification.permission
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (window.Notification.permission !== 'default') return window.Notification.permission
  try {
    return await window.Notification.requestPermission()
  } catch {
    return window.Notification.permission
  }
}

function handleIncomingRealtimeMessage(rawData) {
  syncAlertsFromBackend()
  if (!rawData || typeof window === 'undefined') return
  let payload
  try {
    payload = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
  } catch {
    return
  }
  if (!payload || payload.type !== 'NEW_ALERT') return
  if (payload.push_enabled === false || !isCriticalPushEnabledForCurrentUser()) return

  window.dispatchEvent(new CustomEvent(CRITICAL_PUSH_EVENT, { detail: payload }))

  if ('Notification' in window && window.Notification.permission === 'granted') {
    try {
      new window.Notification(payload.titulo || 'Alerta de Seguridad AeroLuferan', {
        body: payload.mensaje || 'Se registró un nuevo incidente en patrullaje aéreo.',
        tag: `aeroluferan-alert-${payload.alerta_id || Date.now()}`,
      })
    } catch {
      // ignore desktop notification restrictions
    }
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

  notifySocket.onmessage = (event) => {
    handleIncomingRealtimeMessage(event?.data)
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
   API pública
   ========================================================================== */

export function normalizeRole(role) {
  if (!role) return 'guard'
  const lower = String(role).toLowerCase()
  if (lower.includes('admin')) return 'admin'
  return 'guard'
}

export function getVisibleAlerts(role = 'guard') {
  const normRole = normalizeRole(role)
  return alertsRepository.filter((alert) => !alert.dismissedBy?.[normRole])
}

export function getPendingAlertsCount(role = 'guard') {
  const normRole = normalizeRole(role)
  return alertsRepository.filter(
    (alert) => !alert.dismissedBy?.[normRole] && !alert.viewedBy?.[normRole],
  ).length
}

export function getAllAlerts() {
  return [...alertsRepository]
}

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

export function markAlertAsViewed(alertId, role = 'guard') {
  const normRole = normalizeRole(role)
  updateAlertOverlay(alertId, (o) => ({
    ...o,
    viewedBy: { ...o.viewedBy, [normRole]: true },
  }))
  patchAlertInRepository(alertId, (alert) => ({
    ...alert,
    leidaPorUsuario: true,
    viewedBy: { ...alert.viewedBy, [normRole]: true },
  }))

  const alert = alertsRepository.find((a) => a.id === alertId)
  if (typeof alert?.backendId === 'number') {
    apiClient
      .patch(`/alerts/${alert.backendId}/read`, null, { skipAuthRedirect: true })
      .catch(() => {})
  }
}

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
    leidaPorUsuario: true,
    viewedBy: {
      ...alert.viewedBy,
      [normRole]: alert.dismissedBy?.[normRole] ? alert.viewedBy?.[normRole] : true,
    },
  }))
  notifyListeners()

  if (getAuthToken()) {
    apiClient.post('/alerts/read-all', null, { skipAuthRedirect: true }).catch(() => {})
  }
}

export function dismissAlert(alertId, role = 'guard') {
  const normRole = normalizeRole(role)
  const target = alertsRepository.find((a) => a.id === alertId)
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
    descartadaPorUsuario: true,
    dismissedBy: { ...alert.dismissedBy, [normRole]: true },
    auditTrail: [...(alert.auditTrail || []), entry],
  }))

  if (typeof target?.backendId === 'number' && getAuthToken()) {
    apiClient
      .patch(`/alerts/${target.backendId}/dismiss`, null, { skipAuthRedirect: true })
      .catch(() => {})
  }
}

export function dispatchGuard(alertId, role = 'guard', note = '') {
  const normRole = normalizeRole(role)
  const target = alertsRepository.find((a) => a.id === alertId)
  const entry = {
    action: 'DISPATCH_GUARD',
    role: normRole,
    timestamp: new Date().toISOString(),
    note: note || `Despacho de guardia registrado desde perfil ${normRole}.`,
  }
  updateAlertOverlay(alertId, (o) => ({
    ...o,
    viewedBy: { ...o.viewedBy, [normRole]: true },
    auditTrail: [...(o.auditTrail || []), entry],
  }))
  patchAlertInRepository(alertId, (alert) => ({
    ...alert,
    estadoEvento: 'EN_REVISION',
    attentionStatus: 'En atención (Guardia despachado)',
    status: 'En atención',
    dispatched: true,
    dispatchedAt: entry.timestamp,
    dispatchedBy: normRole,
    viewedBy: { ...alert.viewedBy, [normRole]: true },
    auditTrail: [...(alert.auditTrail || []), entry],
  }))

  if (typeof target?.eventoId === 'number') {
    apiClient
      .patch(
        `/events/${target.eventoId}/status`,
        {
          estado: 'EN_REVISION',
          ...(note ? { notas_resolucion: note } : {}),
        },
        { skipAuthRedirect: true },
      )
      .catch(() => {})
  }
}

export async function resolveAlertIncident(alertId, role = 'guard', notasResolucion = '') {
  const normRole = normalizeRole(role)
  const target = alertsRepository.find((a) => a.id === alertId)
  const cleanNote = (notasResolucion || '').trim() || 'Incidente atendido y verificado en sitio.'
  const entry = {
    action: 'RESOLVE_INCIDENT',
    role: normRole,
    timestamp: new Date().toISOString(),
    note: cleanNote,
  }

  updateAlertOverlay(alertId, (o) => ({
    ...o,
    viewedBy: { ...o.viewedBy, [normRole]: true },
    auditTrail: [...(o.auditTrail || []), entry],
  }))
  patchAlertInRepository(alertId, (alert) => ({
    ...alert,
    estadoEvento: 'RESUELTO',
    attentionStatus: 'Resuelto',
    status: 'Resuelto',
    dispatched: true,
    resolved: true,
    notasResolucion: cleanNote,
    viewedBy: { ...alert.viewedBy, [normRole]: true },
    auditTrail: [...(alert.auditTrail || []), entry],
  }))

  if (typeof target?.eventoId === 'number' && getAuthToken()) {
    await apiClient.patch(
      `/events/${target.eventoId}/status`,
      { estado: 'RESUELTO', notas_resolucion: cleanNote },
      { skipAuthRedirect: true },
    )
  }
}

export function resetAlertsDemo() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ALERTS_OVERLAY_KEY)
  }
  return syncAlertsFromBackend()
}

export function setAlertsFromBackend(alertsList) {
  if (Array.isArray(alertsList)) {
    alertsRepository = alertsList.map((a) => applyOverlay(a))
    notifyListeners()
  }
}
