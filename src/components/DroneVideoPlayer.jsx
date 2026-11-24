import { useEffect, useRef, useState } from 'react'
import campusReference from '../assets/campus-reference.svg'
import { captureSnapshotFrame } from '../services/videoService.js'
import {
  CameraIcon,
  CompassIcon,
  CompressIcon,
  ExpandIcon,
  ShieldIcon,
} from './EnVivoIcons.jsx'

const MIN_ZOOM = 1
const MAX_ZOOM = 5

// Overlay de telemetría sin datos: valores neutros hasta que el emisor
// (telemetryService) alimente la vista — nunca mediciones inventadas.
const EMPTY_PREVIEW = {
  status: '—',
  resolution: '—',
  encryption: '—',
  observedArea: '—',
  areaStatus: '—',
  heading: '—',
  tilt: '—',
}

export function DroneVideoPlayer({
  stream = null,
  streamUrl = null,
  isLive = false,
  connectionState = 'idle',
  vueloId = null,
  preview = EMPTY_PREVIEW,
  posterImage = campusReference,
}) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const mediaRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playerMessage, setPlayerMessage] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)

  // Estado de zoom/paneo de la vista (mapa de referencia o video en vivo).
  // Se mantiene en refs + estilo directo para no re-renderizar en cada frame.
  const zoomRef = useRef({ scale: 1, x: 0, y: 0 })
  const pointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const panRef = useRef(null)
  const [isZoomed, setIsZoomed] = useState(false)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch((err) => {
        console.warn('Reproducción automática de video WebRTC restringida:', err)
      })
    }
  }, [stream])

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

  // --- Zoom / paneo de la vista previa (rueda, pinzada táctil, doble clic) ---
  function clampScale(scale) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
  }

  function clampPan(scale, x, y) {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }
    const { width, height } = container.getBoundingClientRect()
    // transform-origin 0 0: x ∈ [width*(1-scale), 0], y ∈ [height*(1-scale), 0]
    return {
      x: Math.min(0, Math.max(width * (1 - scale), x)),
      y: Math.min(0, Math.max(height * (1 - scale), y)),
    }
  }

  function applyZoom() {
    const el = mediaRef.current
    if (!el) return
    const { scale, x, y } = zoomRef.current
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
    setIsZoomed(scale > MIN_ZOOM + 0.01)
  }

  // Zoom manteniendo fijo el punto `point` (coords relativas al contenedor)
  function zoomToPoint(nextScale, point) {
    const z = zoomRef.current
    const scale = clampScale(nextScale)
    const ratio = scale / z.scale
    const x = point.x - (point.x - z.x) * ratio
    const y = point.y - (point.y - z.y) * ratio
    const clamped = clampPan(scale, x, y)
    zoomRef.current = { scale, x: clamped.x, y: clamped.y }
    applyZoom()
  }

  function resetZoom() {
    zoomRef.current = { scale: 1, x: 0, y: 0 }
    panRef.current = null
    pinchRef.current = null
    pointersRef.current.clear()
    applyZoom()
  }

  function containerPoint(event) {
    const rect = containerRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  // Rueda del ratón: listener nativo no-pasivo para poder preventDefault
  useEffect(() => {
    const el = mediaRef.current
    if (!el) return
    function onWheel(event) {
      event.preventDefault()
      const factor = event.deltaY < 0 ? 1.25 : 0.8
      zoomToPoint(zoomRef.current.scale * factor, containerPoint(event))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, streamUrl])

  function handlePointerDown(event) {
    if (!mediaRef.current) return
    mediaRef.current.setPointerCapture?.(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 1) {
      panRef.current = { x: event.clientX, y: event.clientY }
    } else if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      pinchRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: zoomRef.current.scale,
      }
      panRef.current = null
    }
  }

  function handlePointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const midpoint = containerPoint({
        clientX: (a.x + b.x) / 2,
        clientY: (a.y + b.y) / 2,
      })
      zoomToPoint(
        pinchRef.current.scale * (distance / pinchRef.current.distance),
        midpoint,
      )
      return
    }

    if (panRef.current && zoomRef.current.scale > MIN_ZOOM) {
      const z = zoomRef.current
      const clamped = clampPan(
        z.scale,
        z.x + (event.clientX - panRef.current.x),
        z.y + (event.clientY - panRef.current.y),
      )
      zoomRef.current = { ...z, x: clamped.x, y: clamped.y }
      panRef.current = { x: event.clientX, y: event.clientY }
      applyZoom()
    }
  }

  function handlePointerEnd(event) {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) panRef.current = null
    else {
      const [remaining] = [...pointersRef.current.values()]
      panRef.current = { x: remaining.x, y: remaining.y }
    }
  }

  function handleDoubleClick(event) {
    if (zoomRef.current.scale > MIN_ZOOM + 0.01) {
      resetZoom()
    } else {
      zoomToPoint(2.5, containerPoint(event))
    }
  }

  // Reset del zoom cuando cambia la fuente (poster ↔ stream en vivo)
  useEffect(() => {
    resetZoom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, streamUrl, stream])

  async function toggleFullscreen() {
    try {
      setPlayerMessage('')
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen()
      } else {
        setPlayerMessage('La pantalla completa no está soportada en este navegador.')
      }
    } catch (err) {
      setPlayerMessage(
        err instanceof Error ? err.message : 'No se pudo cambiar el modo de pantalla completa.',
      )
    }
  }

  async function handleCaptureSnapshot() {
    try {
      setIsCapturing(true)
      setPlayerMessage('')
      const meta = await captureSnapshotFrame({ vueloId })
      if (meta?.checksum_sha256) {
        setPlayerMessage(
          `Evidencia sellada en servidor · SHA-256 #${meta.checksum_sha256.slice(0, 8).toUpperCase()}`,
        )
      } else {
        setPlayerMessage('Captura descargada localmente.')
      }
    } catch (err) {
      setPlayerMessage(
        err instanceof Error ? err.message : 'No se pudo capturar la evidencia del video.',
      )
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <section className="live-preview-section" aria-label="Transmisión y vista previa del dron">
      <div
        className={`live-preview${isFullscreen ? ' is-fullscreen' : ''}`}
        ref={containerRef}
      >
        <div
          ref={mediaRef}
          className={`live-preview__media${isZoomed ? ' is-zoomed' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onDoubleClick={handleDoubleClick}
        >
          {isLive && streamUrl ? (
            <img
              className="live-preview__video"
              src={streamUrl}
              alt="Transmisión en tiempo real del dron (MJPEG)"
              draggable={false}
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
              alt="Vista de referencia provisional del campus mientras se establece la conexión"
              draggable={false}
            />
          )}
        </div>

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

        {!isLive && (
          <span className="preview-demo-note" role="status">
            VISTA DE REFERENCIA · STREAM DE VIDEO NO DISPONIBLE
          </span>
        )}

        <div className="preview-crosshair" aria-hidden="true">
          <span />
        </div>

        <div className="preview-area-status">
          <span className="preview-area-dot" />
          <span>
            <strong>{preview.observedArea === '—' ? '—' : `✓ ${preview.observedArea}`}</strong>
            <span>{preview.areaStatus}</span>
          </span>
        </div>

        <div className="preview-readings">
          <span className="preview-reading">
            <CompassIcon />
            {preview.heading}
          </span>
          <span className="preview-reading">{preview.tilt}</span>
        </div>

        {isZoomed && (
          <button
            className="preview-zoom-reset"
            type="button"
            aria-label="Restablecer zoom de la vista"
            title="Restablecer zoom (1×)"
            onClick={resetZoom}
          >
            1×
          </button>
        )}

        {isLive && streamUrl && (
          <button
            className="preview-capture"
            type="button"
            aria-label="Capturar y sellar evidencia del frame actual"
            title="Capturar evidencia sellada (SHA-256)"
            disabled={isCapturing}
            onClick={handleCaptureSnapshot}
          >
            <CameraIcon />
          </button>
        )}

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

      {playerMessage && (
        <p className="preview-message" role="status">
          {playerMessage}
        </p>
      )}
    </section>
  )
}

export default DroneVideoPlayer
