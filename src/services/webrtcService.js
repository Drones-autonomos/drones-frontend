/**
 * Servicio WebRTC para la transmisión de video del dron en tiempo real.
 * Diseñado para ser reutilizado por los perfiles Admin y Guardia.
 * 
 * Separa la lógica de conexión WebRTC de la interfaz visual.
 * Deja preparados los mecanismos de señalización, negociación SDP,
 * recolección de ICE candidates y recepción del MediaStream para cuando
 * el backend y el sistema del dron estén listos para transmitir.
 */

export class DroneWebRTCManager {
  constructor() {
    this.peerConnection = null
    this.remoteStream = null
    this.connectionState = 'idle' // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'
    this.stats = {
      resolution: '1080p',
      fps: 60,
      bitrate: null,
      packetsLost: 0,
    }
    this.listeners = new Set()
    this.signalingHandler = null
  }

  /**
   * Suscribe observadores al cambio de estado y recepción de stream.
   */
  subscribe(listener) {
    this.listeners.add(listener)
    // Notificar estado actual inmediatamente
    try {
      listener({
        state: this.connectionState,
        stream: this.remoteStream,
        stats: this.stats,
      })
    } catch (err) {
      console.error('Error al notificar suscriptor WebRTC:', err)
    }

    return () => {
      this.listeners.delete(listener)
    }
  }

  _notify() {
    const payload = {
      state: this.connectionState,
      stream: this.remoteStream,
      stats: this.stats,
    }
    this.listeners.forEach((listener) => {
      try {
        listener(payload)
      } catch (err) {
        console.error('Error en listener de WebRTC:', err)
      }
    })
  }

  /**
   * Configura el conector de señalización provisto por el backend (p. ej. WebSocket o HTTP).
   * No inventa endpoints ni servidores ficticios.
   */
  setSignalingHandler(handler) {
    this.signalingHandler = handler
  }

  /**
   * Inicializa la RTCPeerConnection utilizando la configuración provista por el backend.
   * Si no se proveen servidores ICE, se inicializa sin servidores STUN/TURN inventados.
   */
  async initialize({ rtcConfiguration = {} } = {}) {
    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      console.warn('WebRTC no está soportado en este entorno.')
      this.connectionState = 'failed'
      this._notify()
      return null
    }

    // Cerrar conexión previa si existiera
    this.disconnect()

    this.connectionState = 'connecting'
    this._notify()

    try {
      // Inicializar RTCPeerConnection con la configuración del backend (sin STUN inventado)
      this.peerConnection = new RTCPeerConnection(rtcConfiguration)

      // Manejo de recepción de pista de video (MediaStream)
      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0]
        } else {
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream()
          }
          this.remoteStream.addTrack(event.track)
        }
        this.connectionState = 'connected'
        this._notify()
      }

      // Manejo de ICE Candidates para enviar a la señalización del backend
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.signalingHandler && typeof this.signalingHandler.sendCandidate === 'function') {
          this.signalingHandler.sendCandidate(event.candidate)
        }
      }

      // Monitoreo de estado de la conexión
      this.peerConnection.onconnectionstatechange = () => {
        if (!this.peerConnection) return
        const state = this.peerConnection.connectionState
        if (state === 'connected') {
          this.connectionState = 'connected'
        } else if (state === 'connecting') {
          this.connectionState = 'connecting'
        } else if (state === 'disconnected' || state === 'closed') {
          this.connectionState = 'disconnected'
        } else if (state === 'failed') {
          this.connectionState = 'failed'
        }
        this._notify()
      }

      return this.peerConnection
    } catch (error) {
      console.error('Error al inicializar RTCPeerConnection:', error)
      this.connectionState = 'failed'
      this._notify()
      return null
    }
  }

  /**
   * Genera una oferta SDP (offer) para iniciar la negociación con el dron / backend.
   */
  async createOffer() {
    if (!this.peerConnection) {
      throw new Error('La RTCPeerConnection no ha sido inicializada.')
    }
    const offer = await this.peerConnection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: false,
    })
    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  /**
   * Aplica la respuesta SDP (answer) recibida desde el backend / dron.
   */
  async handleRemoteAnswer(sdpAnswer) {
    if (!this.peerConnection) {
      throw new Error('La RTCPeerConnection no ha sido inicializada.')
    }
    const description = new RTCSessionDescription(sdpAnswer)
    await this.peerConnection.setRemoteDescription(description)
  }

  /**
   * Agrega un candidato ICE recibido del backend.
   */
  async addRemoteCandidate(candidate) {
    if (!this.peerConnection) {
      throw new Error('La RTCPeerConnection no ha sido inicializada.')
    }
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  /**
   * Cierra la conexión activa y libera recursos.
   */
  disconnect() {
    if (this.peerConnection) {
      try {
        this.peerConnection.close()
      } catch (err) {
        console.error('Error al cerrar peer connection:', err)
      }
      this.peerConnection = null
    }

    if (this.remoteStream) {
      try {
        this.remoteStream.getTracks().forEach((track) => track.stop())
      } catch (err) {
        console.error('Error al detener tracks:', err)
      }
      this.remoteStream = null
    }

    this.connectionState = 'idle'
    this._notify()
  }

  /**
   * Retorna el estado actual de la conexión.
   */
  getConnectionState() {
    return this.connectionState
  }

  /**
   * Retorna si existe un stream de video en vivo activo.
   */
  isStreaming() {
    return this.connectionState === 'connected' && Boolean(this.remoteStream)
  }
}

// Instancia compartida reutilizable por ambos perfiles
export const droneWebRTC = new DroneWebRTCManager()

export default droneWebRTC
