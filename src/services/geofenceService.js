/**
 * Servicio de Geocercas para AeroLuferan.
 * Sincroniza las zonas operativas autorizadas del backend:
 *   GET    /geofences/              → listar (ADMIN y GUARDIA)
 *   POST   /geofences/              → crear (solo ADMIN)
 *   PATCH  /geofences/{id}/toggle   → activar/desactivar (solo ADMIN)
 *   DELETE /geofences/{id}          → eliminar (solo ADMIN)
 *   POST   /geofences/validate-point → validar coordenada contra geocercas activas
 *
 * Semántica: las geocercas del backend son ZONAS AUTORIZADAS de operación
 * (los waypoints de misión deben caer dentro de al menos una activa).
 * Las clasificaciones de UI 'advertencia' y 'restringida' no existen en la API
 * y se conservan como zonas locales de exclusión/precaución.
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
    source: 'backend',
    name: g.nombre,
    badgeCode: `G${g.id}`,
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
      g.tipo === 'CIRCULAR'
        ? `Zona operativa autorizada · radio ${Math.round(g.radio_metros)} m`
        : 'Zona operativa autorizada (perímetro)',
    restrictionReason: `Vuelo autorizado dentro del perímetro · ${Math.round(g.altitud_min_m)}–${Math.round(g.altitud_max_m)} m AGL`,
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

export async function toggleBackendGeofence(backendId) {
  const updated = await apiClient.patch(`/geofences/${backendId}/toggle`, null, {
    skipAuthRedirect: true,
  })
  return mapBackendGeofence(updated)
}

export async function deleteBackendGeofence(backendId) {
  await apiClient.delete(`/geofences/${backendId}`, { skipAuthRedirect: true })
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
    const backendZones = await listBackendGeofences()
    const stored = getStoredGeofences()
    // Conserva zonas creadas localmente y las zonas de exclusión/precaución,
    // que no tienen representación en el modelo del backend.
    const localZones = stored.filter(
      (z) => z.source === 'local' || (z.source !== 'backend' && z.type !== 'informativa'),
    )
    const merged = [...backendZones, ...localZones]
    saveGeofences(merged)
    return merged
  } catch {
    return null
  }
}
