/**
 * Servicio de Control del Dron para AeroLuferan.
 * Preparado para conectarse con el backend y el controlador de vuelo (MavLink/ROS2).
 * 
 * Regla de negocio: Mientras no exista integración real con el controlador,
 * no simular acciones ficticias e indicar explícitamente que el controlador
 * no está conectado.
 */

class DroneControlService {
  constructor() {
    this.isConnected = false
    this.controllerEndpoint = null
  }

  /**
   * Configura el endpoint del controlador / backend.
   */
  setControllerEndpoint(endpoint) {
    this.controllerEndpoint = endpoint
  }

  /**
   * Verifica si el controlador de vuelo está enlazado.
   */
  checkConnection() {
    return this.isConnected
  }

  _requireConnection(commandName) {
    if (!this.isConnected) {
      throw new Error(
        `No se pudo ejecutar "${commandName}": el controlador del dron aún no está conectado al sistema backend.`,
      )
    }
  }

  /**
   * Solicita la pausa de la misión activa.
   */
  async pauseFlight() {
    this._requireConnection('Pausar Vuelo')
    // Preparado para llamada HTTP/WebSocket al backend:
    // return await fetch(`${this.controllerEndpoint}/mission/pause`, { method: 'POST' })
    return { success: true, status: 'Vuelo pausado' }
  }

  /**
   * Solicita la reanudación del vuelo previamente pausado.
   */
  async resumeFlight() {
    this._requireConnection('Reanudar Vuelo')
    // Preparado para llamada HTTP/WebSocket al backend:
    // return await fetch(`${this.controllerEndpoint}/mission/resume`, { method: 'POST' })
    return { success: true, status: 'En Patrullaje' }
  }

  /**
   * Solicita el regreso del dron al helipuerto asignado.
   */
  async returnToBase(heliportId = 'Heliport-01') {
    this._requireConnection('Volver a Base')
    // Preparado para llamada HTTP/WebSocket al backend:
    // return await fetch(`${this.controllerEndpoint}/mission/return-to-base`, {
    //   method: 'POST',
    //   body: JSON.stringify({ heliportId }),
    // })
    return { success: true, status: 'Regresando a Base', heliportId }
  }

  /**
   * Solicita la parada de emergencia inmediata mediante mecanismo de seguridad del controlador.
   */
  async emergencyStop() {
    this._requireConnection('Parada Inmediata')
    // Preparado para llamada HTTP/WebSocket al backend:
    // return await fetch(`${this.controllerEndpoint}/safety/emergency-stop`, { method: 'POST' })
    return { success: true, status: 'Detenido por Emergencia' }
  }
}

export const droneControlService = new DroneControlService()
export default droneControlService
