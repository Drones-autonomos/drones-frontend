/**
 * Servicio de Geocercas para AeroLuferan.
 * Sincroniza las zonas operativas autorizadas del backend:
 *   GET    /geofences/              → listar (ADMIN y GUARDIA)
 *   POST   /geofences/              → crear (solo ADMIN)
 *   PATCH  /geofences/{id}/toggle   → activar/desactivar (solo ADMIN)
 *   DELETE /geofences/{id}          → eliminar (solo ADMIN)
 *   POST   /geofences/validate-point → validar coordenada contra geocercas activas
 *
 * Semántica del backend:
 *   /geofences/        → zonas AUTORIZADAS de operación (UI 'informativa')
 *   /exclusion-zones/  → zonas de exclusión rectangulares
 *                        (UI 'restringida' | 'advertencia')
 * Las zonas creadas offline se conservan con source='local' hasta que el
 * operador pueda registrarlas en el servidor.
 */

import apiClient from './apiClient.js'
import { getStoredGeofences, saveGeofences } from '../pages/Admin/rutasData.js'

const METERS_PER_DEG_LAT = 111320

/* ==========================================================================
   Mapeo backend → forma de zona que consume la UI (rutasData.js)
   ========================================================================== */

function boundsFromPolygon(poligono) {
  const lats = poligono.map((p) => p[0])
  const lngs = poligono.map((p) => p[1])
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ]
}

function boundsFromCircle(centroLat, centroLon, radioMetros) {
  const dLat = radioMetros / METERS_PER_DEG_LAT
  const dLng = radioMetros / (METERS_PER_DEG_LAT * Math.cos((centroLat * Math.PI) / 180))
  return [
    [centroLat - dLat, centroLon - dLng],
    [centroLat + dLat, centroLon + dLng],
  ]
}

export function mapBackendGeofence(g) {
  const bounds =
    g.tipo === 'POLIGONO' && Array.isArray(g.poligono) && g.poligono.length > 0
      ? boundsFromPolygon(g.poligono)
      : boundsFromCircle(g.centro_lat ?? 0, g.centro_lon ?? 0, g.radio_metros ?? 50)

  return {
    id: `geo-be-${g.id}`,
    backendId: g.id,
    backendKind: 'geocerca',
    source: 'backend',
    name: g.nombre,
    badgeCode: g.codigo_badge || `G${g.id}`,
    type: 'informativa', // Zona autorizada de operación
    color: '#0284c7',
    bounds,
    poligono: g.poligono || null,
    circulo:
      g.tipo === 'CIRCULAR'
        ? { centro: [g.centro_lat, g.centro_lon], radioMetros: g.radio_metros }
        : null,
    status: g.activa ? 'Activa' : 'Inactiva',
    description:
      g.descripcion ||
      (g.tipo === 'CIRCULAR'
        ? `Zona operativa autorizada · radio ${Math.round(g.radio_metros)} m`
        : 'Zona operativa autorizada (perímetro)'),
    restrictionReason:
      g.motivo ||
      `Vuelo autorizado dentro del perímetro · ${Math.round(g.altitud_min_m)}–${Math.round(g.altitud_max_m)} m AGL`,
    altitudMin: g.altitud_min_m,
    altitudMax: g.altitud_max_m,
    createdAt: g.created_at,
  }
}

/* ==========================================================================
   Mapeo UI → payload de creación del backend
   ========================================================================== */

export function mapZoneToCreatePayload(zone) {
  const [[latMin, lngMin], [latMax, lngMax]] = zone.bounds
  const poligono = [
    [latMin, lngMin],
    [latMin, lngMax],
    [latMax, lngMax],
    [latMax, lngMin],
  ]
  return {
    nombre: String(zone.name || 'Zona').slice(0, 100),
    tipo: 'POLIGONO',
    activa: zone.status !== 'Inactiva',
    poligono,
    altitud_min_m: 2,
    altitud_max_m: 200,
    motivo: zone.restrictionReason || null,
    descripcion: zone.description || null,
    codigo_badge: zone.badgeCode || null,
  }
}

/* ==========================================================================
   Zonas de exclusión del backend → shape de zona que consume la UI
   ========================================================================== */

export function mapBackendExclusionZone(z) {
  return {
    id: `exz-be-${z.id}`,
    backendId: z.id,
    backendKind: 'exclusion',
    source: 'backend',
    name: z.nombre,
    badgeCode: z.codigo_badge || `X${z.id}`,
    type: z.clasificacion === 'advertencia' ? 'advertencia' : 'restringida',
    color: z.clasificacion === 'advertencia' ? '#f59e0b' : '#ef4444',
    bounds: [
      [z.lat_min, z.lon_min],
      [z.lat_max, z.lon_max],
    ],
    poligono: null,
    circulo: null,
    status: z.activa ? 'Activa' : 'Inactiva',
    description: z.descripcion || 'Zona de exclusión del campus.',
    restrictionReason: z.motivo || '',
    // altitud_max_m en una exclusión es el TOPE de la estructura: la zona
    // bloquea el vuelo por debajo de ese techo (no limita el techo operativo).
    altitudMin: null,
    altitudMax: null,
    estructuraTopeM: z.altitud_max_m ?? null,
    createdAt: z.created_at,
  }
}

export function mapZoneToExclusionPayload(zone) {
  const [[latMin, lngMin], [latMax, lngMax]] = zone.bounds
  return {
    nombre: String(zone.name || 'Zona').slice(0, 100),
    lat_min: Math.min(latMin, latMax),
    lat_max: Math.max(latMin, latMax),
    lon_min: Math.min(lngMin, lngMax),
    lon_max: Math.max(lngMin, lngMax),
    activa: zone.status !== 'Inactiva',
    clasificacion: zone.type === 'advertencia' ? 'advertencia' : 'restringida',
    motivo: zone.restrictionReason || null,
    descripcion: zone.description || null,
    codigo_badge: zone.badgeCode || null,
  }
}

/* ==========================================================================
   Llamadas a la API
   ========================================================================== */

export async function listBackendGeofences() {
  const rows = await apiClient.get('/geofences/', { skipAuthRedirect: true })
  return (rows || []).map(mapBackendGeofence)
}

export async function createGeofence(zone) {
  const created = await apiClient.post('/geofences/', mapZoneToCreatePayload(zone))
  return mapBackendGeofence(created)
}

export async function updateBackendGeofence(backendId, fields) {
  const payload = {}
  if (fields.name !== undefined) payload.nombre = fields.name
  if (fields.restrictionReason !== undefined) payload.motivo = fields.restrictionReason || null
  if (fields.description !== undefined) payload.descripcion = fields.description || null
  if (fields.badgeCode !== undefined) payload.codigo_badge = fields.badgeCode || null
  const updated = await apiClient.put(`/geofences/${backendId}`, payload)
  return mapBackendGeofence(updated)
}

export async function toggleBackendGeofence(backendId) {
  const updated = await apiClient.patch(`/geofences/${backendId}/toggle`, null, {
    skipAuthRedirect: true,
  })
  return mapBackendGeofence(updated)
}

export async function deleteBackendGeofence(backendId) {
  await apiClient.delete(`/geofences/${backendId}`, { skipAuthRedirect: true })
}

export async function listBackendExclusionZones() {
  const rows = await apiClient.get('/exclusion-zones/', {
    query: { solo_activas: false },
    skipAuthRedirect: true,
  })
  return (rows || []).map(mapBackendExclusionZone)
}

export async function createExclusionZone(zone) {
  const created = await apiClient.post('/exclusion-zones/', mapZoneToExclusionPayload(zone))
  return mapBackendExclusionZone(created)
}

export async function updateExclusionZone(backendId, zone) {
  const payload = mapZoneToExclusionPayload(zone)
  delete payload.activa // el estado se controla con /toggle, no con PUT
  const updated = await apiClient.put(`/exclusion-zones/${backendId}`, payload)
  return mapBackendExclusionZone(updated)
}

export async function toggleBackendExclusionZone(backendId) {
  const updated = await apiClient.patch(`/exclusion-zones/${backendId}/toggle`, null, {
    skipAuthRedirect: true,
  })
  return mapBackendExclusionZone(updated)
}

export async function deleteBackendExclusionZone(backendId) {
  await apiClient.delete(`/exclusion-zones/${backendId}`, { skipAuthRedirect: true })
}

/**
 * Valida una coordenada contra las geocercas activas del backend.
 * Retorna { permitido, motivo } — o null si el backend no respondió.
 */
export async function validatePointAgainstGeofences(latitud, longitud, altitudMetros = 15) {
  try {
    return await apiClient.post(
      '/geofences/validate-point',
      { latitud, longitud, altitud_metros: altitudMetros },
      { skipAuthRedirect: true },
    )
  } catch {
    return null
  }
}

/* ==========================================================================
   Sincronización: backend (zonas autorizadas) + zonas locales de exclusión
   ========================================================================== */

/**
 * Trae las geocercas del backend y las fusiona con las zonas locales
 * (advertencia/restringida y zonas creadas offline), persistiendo el
 * resultado y emitiendo 'aeroluferan_geofences_updated'.
 * Retorna la lista fusionada, o null si el backend no respondió.
 */
export async function syncGeofences() {
  try {
    const [backendZones, exclusionZones] = await Promise.all([
      listBackendGeofences(),
      listBackendExclusionZones(),
    ])
    const stored = getStoredGeofences()
    // Conserva únicamente las zonas creadas en modo offline que aún no se
    // registran en el servidor; el resto proviene del backend.
    const localZones = stored.filter((z) => z.source === 'local')
    const merged = [...backendZones, ...exclusionZones, ...localZones]
    saveGeofences(merged)
    return merged
  } catch {
    return null
  }
}
