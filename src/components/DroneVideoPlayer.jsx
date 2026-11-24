import { useEffect, useRef, useState } from 'react'
import campusReference from '../assets/campus-reference.svg'
import {
  CompassIcon,
  CompressIcon,
  ExpandIcon,
  ShieldIcon,
} from './EnVivoIcons.jsx'

export function DroneVideoPlayer({
  stream = null,
  streamUrl = null,
  isLive = false,
  connectionState = 'idle',
  preview = {
    status: 'EN VIVO',
    resolution: '1080p 60fps',
    encryption: 'AES-256',
    observedArea: 'Coliseo',
    areaStatus: 'Despejado',
    heading: 'HDG 142° SE',
    tilt: 'Tilt -35°',
  },
  posterImage = campusReference,
}) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')

  // Conectar el MediaStream de WebRTC al elemento HTML5 video cuando esté disponible
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch((err) => {
        console.warn('Reproducción automática de video WebRTC restringida:', err)
      })
    }
  }, [stream])

  // Escuchar cambios de estado de pantalla completa (incluyendo tecla Escape)
  useEffect(() => {
    function handleFullscreenChange() {
      const activeElement = document.fullscreenElement
      setIsFullscreen(Boolean(activeElement && activeElement === containerRef.current))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  async function toggleFullscreen() {
    try {
      setFullscreenError('')
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen()
      } else {
        setFullscreenError('La pantalla completa no está soportada en este navegador.')
      }
    } catch (err) {
      setFullscreenError(
        err instanceof Error ? err.message : 'No se pudo cambiar el modo de pantalla completa.',
      )
    }
  }

  return (
    <section className="live-preview-section" aria-label="Transmisión y vista previa del dron">
      <div
        className={`live-preview${isFullscreen ? ' is-fullscreen' : ''}`}
        ref={containerRef}
      >
        {isLive && streamUrl ? (
          <img
            className="live-preview__video"
            src={streamUrl}
            alt="Transmisión en tiempo real del dron (MJPEG)"
          />
        ) : isLive && stream ? (
          <video
            ref={videoRef}
            className="live-preview__video"
            autoPlay
            playsInline
            muted
            aria-label="Transmisión en tiempo real del dron mediante WebRTC"
          />
        ) : (
          <img
            className="live-preview__image"
            src={posterImage}
            alt="Vista de referencia provisional del campus mientras se establece la conexión WebRTC"
          />
        )}

        {/* Encabezado superior del overlay de video */}
        <div className="preview-topline">
          {isLive ? (
            <span className="preview-live-indicator">
              <span className="preview-live-dot" />
              EN VIVO
            </span>
          ) : (
            <span className="preview-live-indicator preview-live-indicator--pending">
              <span className="preview-live-dot preview-live-dot--pending" />
              {connectionState === 'connecting'
                ? 'CONECTANDO...'
                : connectionState === 'disconnected'
                  ? 'SIN SEÑAL DE VIDEO'
                  : 'VISTA PREVIA'}
            </span>
          )}

          <span className="preview-quality">{preview.resolution}</span>
          <span className="preview-encryption">
            <ShieldIcon />
            {preview.encryption}
          </span>
        </div>

        {/* Aviso de vista de referencia cuando no hay transmisión activa */}
        {!isLive && (
          <span className="preview-demo-note" role="status">
            VISTA DE REFERENCIA · STREAM DE VIDEO NO DISPONIBLE
          </span>
        )}

        {/* Retícula central de detección / enfoque visual */}
        <div className="preview-crosshair" aria-hidden="true">
          <span />
        </div>

        {/* Estado de la zona observada */}
        <div className="preview-area-status">
          <span className="preview-area-dot" />
          <span>
            <strong>✓ {preview.observedArea}</strong>
            <span>{preview.areaStatus}</span>
          </span>
        </div>

        {/* Indicadores de telemetría de cámara HUD (HDG y Tilt) */}
        <div className="preview-readings">
          <span className="preview-reading">
            <CompassIcon />
            {preview.heading}
          </span>
          <span className="preview-reading">{preview.tilt}</span>
        </div>

        {/* Botón de pantalla completa / regresar a vista normal */}
        <button
          className="preview-fullscreen"
          type="button"
          aria-label={
            isFullscreen
              ? 'Regresar a la visualización normal'
              : 'Expandir video a pantalla completa'
          }
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
        </button>
      </div>

      {fullscreenError && (
        <p className="preview-message" role="status">
          {fullscreenError}
        </p>
      )}
    </section>
  )
}

export default DroneVideoPlayer
