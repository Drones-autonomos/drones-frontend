/**
 * Servicio de Video en Vivo del dron para AeroLuferan.
 * Consume los endpoints MJPEG del backend:
 *   GET /video/stream-info  → estado y métricas del stream
 *   GET /video/live         → stream MJPEG (multipart/x-mixed-replace)
 *   GET /video/snapshot     → último frame JPEG
 */

import { apiClient, buildApiUrl } from './apiClient.js'

/**
 * Consulta el estado del stream de video en el backend.
 * Retorna { stream_url, protocolo, estado_camara, resolucion, fps,
 *           frames_publicados, reconexiones, ultimo_frame_at }.
 * Lanza ApiError si el backend no responde.
 */
export function getStreamInfo() {
  return apiClient.get('/video/stream-info', { skipAuthRedirect: true })
}

/** URL del stream MJPEG para usar en <img src>. */
export function getLiveStreamUrl() {
  return buildApiUrl('/video/live')
}

/** URL del último frame JPEG para usar en <img src> o descarga. */
export function getSnapshotUrl() {
  return buildApiUrl('/video/snapshot')
}

/**
 * Indica si el stream reporta señal activa según stream-info.
 * El backend expone /video/live solo cuando hay frames publicados.
 */
export function isStreamActive(info) {
  if (!info) return false
  return Boolean(info.frames_publicados > 0 || info.ultimo_frame_at)
}
