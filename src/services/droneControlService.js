/**
 * Servicio de Control del Dron para AeroLuferan.
 * Conecta con los endpoints reales del backend (FastAPI + DroneKit):
 *
 *   POST /drone/connect        {connection_string}   (solo ADMIN)
 *   POST /drone/takeoff        {altitude: 2–200}     (solo ADMIN)
 *   POST /drone/rtl                                (ADMIN y GUARDIA)
 *   GET  /drone/charging-base                      (ADMIN y GUARDIA)
 *   POST /drone/charging-base/dock-recharge        (solo ADMIN)
 *
 * Equivalencias del backend (no existen pause/resume/kill-switch):
 *   - pauseFlight()  → cancela la misión EN_CURSO (POST /missions/{id}/cancel),
 *     que equivale a interrumpir el vuelo: el ejecutor manda RTL.
 *   - resumeFlight() → no existe; el backend no reanuda misiones canceladas.
 *   - emergencyStop() → RTL (única acción de emergencia real disponible).
 */

import apiClient from './apiClient.js'
import { getTelemetryData } from './telemetryService.js'

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
   * Establece la conexión MAVLink con el dron (solo ADMIN).
   * @param {string} connectionString p. ej. "127.0.0.1:14550" (MAVProxy/SITL)
   */
  async connect(connectionString = DEFAULT_CONNECTION_STRING) {
    const cs = (connectionString || '').trim() || DEFAULT_CONNECTION_STRING
    const result = await apiClient.post('/drone/connect', { connection_string: cs })
    this.lastConnectionString = cs
    return { success: true, status: result?.message || 'Dron conectado exitosamente' }
  }

  /**
   * Arma motores y despega a la altitud indicada (solo ADMIN).
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
   * (ADMIN y GUARDIA).
   */
  async returnToBase(heliportId = 'Heliport-01') {
    const result = await apiClient.post('/drone/rtl')
    return {
      success: true,
      status: result?.message || 'RTL solicitado',
      heliportId,
    }
  }

  /**
   * Equivalencia de "pausar vuelo": la API no tiene pausa real, por lo que se
   * cancela la misión EN_CURSO (el ejecutor envía RTL y pasa a CANCELANDO).
   */
  async pauseFlight() {
    const missions = await apiClient.get('/missions/', {
      query: { estado: 'EN_CURSO', limit: 1 },
    })
    const active = Array.isArray(missions) ? missions[0] : null
    if (!active) {
      throw new Error('No hay una misión en curso que pausar. El backend no admite pausa manual.')
    }
    await apiClient.post(`/missions/${active.id}/cancel`)
    return {
      success: true,
      status: 'Misión en curso cancelándose (equivalente a detener el vuelo: el backend no admite pausa; el dron ejecuta RTL).',
      missionId: active.id,
    }
  }

  /**
   * No existe reanudación en el backend: una misión cancelada no puede
   * reanudarse, hay que iniciar una nueva desde Rutas.
   */
  async resumeFlight() {
    throw new Error(
      'El backend no admite reanudar una misión interrumpida. Inicia una nueva misión desde "Rutas" para retomar el patrullaje.',
    )
  }

  /**
   * Parada de emergencia: el backend no tiene kill-switch, la acción de
   * emergencia real disponible es RTL (vuelta a base y aterrizaje).
   */
  async emergencyStop() {
    const result = await apiClient.post('/drone/rtl')
    return {
      success: true,
      status: `${result?.message || 'RTL solicitado'} (acción de emergencia real: regreso y aterrizaje)`,
    }
  }

  /** Estado de la base de carga en el punto HOME (ADMIN y GUARDIA). */
  async getChargingBaseStatus() {
    return await apiClient.get('/drone/charging-base')
  }

  /** Verifica acoplamiento en HOME y ejecuta el ciclo de recarga (solo ADMIN). */
  async dockAndRecharge(targetPct = 100) {
    return await apiClient.post('/drone/charging-base/dock-recharge', null, {
      query: { target_pct: targetPct },
    })
  }

  /** Configura el failsafe de pérdida de enlace GCS (solo ADMIN). */
  async configureFailsafe(enabled = true) {
    return await apiClient.post('/drone/failsafe', null, { query: { enabled } })
  }
}

export const droneControlService = new DroneControlService()
export default droneControlService
