import { useEffect, useRef, useState } from 'react'
import {
  getLiveStreamUrl,
  getStreamInfo,
  isStreamActive,
} from '../services/videoService.js'

const POLL_INTERVAL_MS = 4000

/**
 * Hook para consumir el stream MJPEG del backend (/video/live).
 * Consulta /video/stream-info periódicamente y expone el estado
 * de conexión para DroneVideoPlayer.
 * Reutilizable por Admin y Guardia.
 */
export function useLiveVideoStream() {
  const [info, setInfo] = useState(null)
  const [connectionState, setConnectionState] = useState('connecting')
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    let timeoutId = null

    async function poll() {
      try {
        const data = await getStreamInfo()
        if (!isMounted.current) return
        setInfo(data)
        setConnectionState(isStreamActive(data) ? 'connected' : 'disconnected')
      } catch (error) {
        if (!isMounted.current) return
        setInfo(null)
        setConnectionState(error?.isOffline ? 'disconnected' : 'failed')
      } finally {
        if (isMounted.current) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS)
        }
      }
    }

    poll()
    return () => {
      isMounted.current = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  const isLive = connectionState === 'connected'

  return {
    streamUrl: isLive ? getLiveStreamUrl() : null,
    isLive,
    connectionState, // 'connecting' | 'connected' | 'disconnected' | 'failed'
    info,
  }
}

export default useLiveVideoStream
