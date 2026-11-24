/**
 * Servicio de Video en Vivo y Evidencia Visual del dron para AeroLuferan.
 * Consume los endpoints autenticados del backend:
 *   GET  /video/stream-info       → estado, perfil de calidad y métricas del stream
 *   GET  /video/live?token=...    → stream MJPEG (multipart/x-mixed-replace)
 *   GET  /video/snapshot?token=.. → último frame JPEG
 *   POST /video/capture-evidence  → captura, anonimiza rostros y sella SHA-256 en BD
 */

import { apiClient, buildApiUrl, getAuthToken } from './apiClient.js'

/**
 * Consulta el estado del stream de video en el backend.
 */
export function getStreamInfo() {
  return apiClient.get('/video/stream-info', { skipAuthRedirect: true })
}

/** URL autenticada del stream MJPEG para usar en <img src>. */
export function getLiveStreamUrl() {
  const token = getAuthToken()
  return buildApiUrl('/video/live', token ? { token } : undefined)
}

/** URL autenticada del último frame JPEG para usar en <img src> o descarga. */
export function getSnapshotUrl() {
  const token = getAuthToken()
  return buildApiUrl('/video/snapshot', token ? { token } : undefined)
}

/**
 * Sella el frame actual en el backend con SHA-256 + coordenadas GPS (con difuminado facial)
 * y descarga además la copia JPEG local al operador.
 */
export async function captureSnapshotFrame({ vueloId = null } = {}) {
  let evidenceMeta = null
  if (getAuthToken()) {
    try {
      evidenceMeta = await apiClient.post('/video/capture-evidence', null, {
        query: {
          ...(vueloId != null ? { vuelo_id: vueloId } : {}),
          blur_faces: true,
        },
        skipAuthRedirect: true,
      })
    } catch {
      evidenceMeta = null
    }
  }

  const blob = evidenceMeta?.id
    ? await apiClient.get(`/detections/${evidenceMeta.id}/frame`, {
        responseType: 'blob',
        skipAuthRedirect: true,
      })
    : await apiClient.get('/video/snapshot', {
        responseType: 'blob',
        skipAuthRedirect: true,
      })

  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `captura-${stamp}.jpg`
  anchor.click()
  URL.revokeObjectURL(url)

  return evidenceMeta
}

/**
 * Indica si el stream reporta señal activa según stream-info.
 */
export function isStreamActive(info) {
  if (!info) return false
  return Boolean(info.frames_publicados > 0 || info.ultimo_frame_at)
}
