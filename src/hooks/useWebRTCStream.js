import { useEffect, useState } from 'react'
import { droneWebRTC } from '../services/webrtcService.js'

/**
 * Hook para integrar la conexión WebRTC del dron en componentes React.
 * Reutilizable tanto por Admin como por Guardia.
 */
export function useWebRTCStream() {
  const [stream, setStream] = useState(droneWebRTC.remoteStream)
  const [connectionState, setConnectionState] = useState(droneWebRTC.getConnectionState())
  const [stats, setStats] = useState(droneWebRTC.stats)

  useEffect(() => {
    const unsubscribe = droneWebRTC.subscribe((data) => {
      setStream(data.stream)
      setConnectionState(data.state)
      setStats(data.stats)
    })
    return unsubscribe
  }, [])

  return {
    stream,
    connectionState, // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'
    isLive: connectionState === 'connected' && Boolean(stream),
    stats,
    connect: (config) => droneWebRTC.initialize(config),
    disconnect: () => droneWebRTC.disconnect(),
  }
}

export default useWebRTCStream
