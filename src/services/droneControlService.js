/**
 * Servicio de Control del Dron para AeroLuferan.
 * Conecta con los endpoints reales del backend (FastAPI + DroneKit):
 *
 *   POST /drone/connect              {connection_string}   (ADMIN y GUARDIA)
 *   POST /drone/disconnect                                    (solo ADMIN)
 *   POST /drone/takeoff              {altitude: 2–200}      (ADMIN y GUARDIA)
 *   POST /drone/pause                espera BRAKE/LOITER    (ADMIN y GUARDIA)
 *   POST /drone/resume               reanuda en GUIDED      (ADMIN y GUARDIA)
 *   POST /drone/emergency-stop       aterriza de inmediato  (ADMIN y GUARDIA)
 *   POST /drone/rtl                  ?heliport_id opcional  (ADMIN y GUARDIA)
 *   GET  /drone/preflight-check      checklist prevuelo     (ADMIN y GUARDIA)
 *   GET  /drone/failsafe             estado FS_GCS          (ADMIN y GUARDIA)
 *   POST /drone/failsafe             configura FS_GCS       (solo ADMIN)
 *   GET  /drone/charging-bases       lista de estaciones    (ADMIN y GUARDIA)
 *   GET  /drone/charging-base        estado de estación     (ADMIN y GUARDIA)
 *   POST /drone/charging-base/dock-recharge                 (solo ADMIN)
 */

import apiClient, { ApiError, getStoredSession } from './apiClient.js'
import { getTelemetryData } from './telemetryService.js'
import { createMission, startMission } from './missionService.js'
import { fetchPresetRoutes } from '../pages/Admin/presetRoutes.js'

export const DEFAULT_CONNECTION_STRING = '127.0.0.1:14550'

class DroneControlService {
  constructor() {
    this.controllerEndpoint = null
    this.lastConnectionString = DEFAULT_CONNECTION_STRING
  }

  /**
   * Configura el endpoint del controlador / backend (compatibilidad).
   */
  setControllerEndpoint(endpoint) {
    this.controllerEndpoint = endpoint
  }

  /**
   * Verifica si el enlace con el dron está activo según la última
   * telemetría recibida del backend.
   */
  checkConnection() {
    return Boolean(getTelemetryData()?.link?.droneConnected)
  }

  /**
   * Establece la conexión MAVLink con el dron (ADMIN y GUARDIA).
   * @param {string} connectionString p. ej. "127.0.0.1:14550" (MAVProxy/SITL)
   */
  async connect(connectionString = DEFAULT_CONNECTION_STRING) {
    const cs = (connectionString || '').trim() || DEFAULT_CONNECTION_STRING
    const result = await apiClient.post('/drone/connect', { connection_string: cs })
    this.lastConnectionString = cs
    return { success: true, status: result?.message || 'Dron conectado exitosamente' }
  }

  /** Cierra la sesión MAVLink del backend con el dron (solo ADMIN). */
  async disconnect() {
    const result = await apiClient.post('/drone/disconnect')
    return { success: true, status: result?.message || 'Dron desconectado' }
  }

  /**
   * Arma motores y despega a la altitud indicada (ADMIN y GUARDIA).
   * Operación bloqueante en el backend hasta alcanzar ~95% del objetivo.
   */
  async takeoff(altitude = 10) {
    const alt = Number(altitude)
    if (!Number.isFinite(alt) || alt < 2 || alt > 200) {
      throw new Error('La altitud de despegue debe estar entre 2 y 200 metros.')
    }
    const result = await apiClient.post('/drone/takeoff', { altitude: alt })
    return { success: true, status: result?.message || `Despegue a ${alt} m` }
  }

  /**
   * Ordena Return to Launch: el dron vuelve al punto de despegue y aterriza
   * (ADMIN y GUARDIA). Acepta un heliport_id opcional para la bitácora.
   */
  async returnToBase(heliportId = 'Heliport-01') {
    const result = await apiClient.post('/drone/rtl', null, {
      query: heliportId ? { heliport_id: heliportId } : {},
    })
    return {
      success: true,
      status: result?.message || 'RTL solicitado',
      heliportId,
    }
  }

  /**
   * Pausa el vuelo en curso: el backend sostiene posición en BRAKE
   * (o LOITER si el firmware no acepta BRAKE). El avance de la misión
   * queda detenido hasta reanudar (ADMIN y GUARDIA).
   */
  async pauseFlight() {
    const result = await apiClient.post('/drone/pause')
    return {
      success: true,
      status: `Vuelo pausado — el dron sostiene posición en modo ${result?.modo || 'BRAKE'}.`,
      mode: result?.modo,
    }
  }

  /**
   * Reanuda el vuelo pausado: vuelve a GUIDED y reemite el waypoint en
   * curso de la misión (ADMIN y GUARDIA).
   */
  async resumeFlight() {
    const result = await apiClient.post('/drone/resume')
    return {
      success: true,
      status: 'Vuelo reanudado — el dron retoma el patrullaje en GUIDED.',
      mode: result?.modo,
    }
  }

  /**
   * Parada de emergencia real: el dron aterriza de inmediato en el punto
   * actual (modo LAND) y se registra en la bitácora de vuelos
   * (ADMIN y GUARDIA).
   */
  async emergencyStop() {
    const result = await apiClient.post('/drone/emergency-stop')
    return {
      success: true,
      status: 'Parada de emergencia ejecutada — el dron aterriza en el punto actual.',
      resultado: result?.resultado,
    }
  }

  /** Checklist prevuelo del backend: conexión, enlace, armable, batería y GPS. */
  async preflightCheck() {
    return await apiClient.get('/drone/preflight-check')
  }

  /** Estado del failsafe de pérdida de enlace GCS (FS_GCS_ENABLE). */
  async getFailsafeStatus() {
    return await apiClient.get('/drone/failsafe')
  }

  /**
   * Inicia un patrullaje preprogramado: crea la misión a partir del preset
   * del backend (/missions/presets) y la lanza de inmediato.
   * Equivale al botón "Iniciar Ruta" cuando no hay misión seleccionada.
   */
  async startPresetPatrol(presetId = 'clasica') {
    try {
      const mission = await apiClient.post(`/missions/start-preset/${encodeURIComponent(presetId)}`)
      return {
        success: true,
        status: `Patrullaje "${mission?.nombre || presetId}" iniciado.`,
        missionId: mission?.id,
      }
    } catch (error) {
      const session = getStoredSession()
      const isAdmin = session?.backendRole === 'ADMIN' || session?.role === 'admin'
      const status = error instanceof ApiError ? error.status : 0
      // Guardia debe usar el endpoint preaprobado; el flujo legacy es solo
      // compatibilidad para ADMIN mientras el endpoint de Agent 3 se despliega.
      if (!isAdmin || ![403, 404, 405].includes(status)) throw error
    }

    const presets = await fetchPresetRoutes()
    const preset = presets.find((p) => p.id === presetId) || presets[0]
    if (!preset) throw new Error('No hay rutas preprogramadas disponibles.')
    const created = await createMission({
      nombre: preset.nombre,
      descripcion: preset.descripcion,
      waypoints: preset.waypoints,
      altitudMetros: preset.altitudSugerida ?? 30,
    })
    await startMission(created.id)
    return {
      success: true,
      status: `Patrullaje "${preset.nombre}" iniciado (${preset.waypoints.length} waypoints).`,
      missionId: created.id,
    }
  }

  /** Lista todas las estaciones de carga/helipuertos del campus. */
  async listChargingBases() {
    return await apiClient.get('/drone/charging-bases')
  }

  /** Estado de una estación de carga (por defecto la principal en HOME). */
  async getChargingBaseStatus(stationId = null) {
    return await apiClient.get('/drone/charging-base', {
      query: stationId ? { station_id: stationId } : {},
    })
  }

  /** Verifica acoplamiento y ejecuta el ciclo de recarga (solo ADMIN). */
  async dockAndRecharge(targetPct = 100, stationId = null) {
    const query = { target_pct: targetPct }
    if (stationId) query.station_id = stationId
    return await apiClient.post('/drone/charging-base/dock-recharge', null, { query })
  }

  /** Configura el failsafe de pérdida de enlace GCS (solo ADMIN). */
  async configureFailsafe(enabled = true) {
    return await apiClient.post('/drone/failsafe', null, { query: { enabled } })
  }
}

export const droneControlService = new DroneControlService()
export default droneControlService
