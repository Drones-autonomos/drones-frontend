/**
 * Cliente HTTP centralizado para comunicación con FastAPI (/api/v1).
 * Adjunta Bearer JWT desde aeroluferan_session, maneja cierre de sesión en 401
 * y normaliza errores {detail} de FastAPI o fallos de red ("sin conexión").
 */

export const SESSION_STORAGE_KEY = 'aeroluferan_session'

export const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
).replace(/\/+$/, '')

export const WS_URL = (
  import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1'
).replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, { status = 0, detail = null, isOffline = false, cause = undefined } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.isOffline = isOffline
  }
}

export function isSimulatedToken(token) {
  return !token || typeof token !== 'string' || token.startsWith('simulated_jwt_token')
}

export function getStoredSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const token = parsed.token || parsed.access_token
    if (isSimulatedToken(token)) return null
    return parsed
  } catch {
    return null
  }
}

export function getAuthToken() {
  const session = getStoredSession()
  return session?.token || session?.access_token || null
}

export function clearSessionAndRedirect() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('aeroluferan_session_changed', { detail: null }))
    window.dispatchEvent(new CustomEvent('aeroluferan_unauthorized'))
  } catch (error) {
    console.error('Error al limpiar sesión tras 401:', error)
  }

  if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
    window.location.replace('/')
  }
}

export function parseApiErrorDetail(payload, fallback = 'Error en la solicitud al servidor.') {
  if (!payload) return fallback
  const detail = payload.detail ?? payload.message
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim()
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        const field = Array.isArray(item?.loc) ? item.loc.slice(1).join('.') : ''
        const msg = item?.msg || 'Valor inválido'
        return field ? `${field}: ${msg}` : msg
      })
      .join(' · ')
  }
  return fallback
}

function appendQuery(baseUrl, query) {
  if (!query || typeof query !== 'object') return baseUrl
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value))
    }
  })
  const qs = params.toString()
  if (!qs) return baseUrl
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${qs}`
}

export function buildApiUrl(path, query) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return appendQuery(`${API_URL}${normalizedPath}`, query)
}

export function buildWsUrl(path, query) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return appendQuery(`${WS_URL}${normalizedPath}`, query)
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    query,
    auth = true,
    token: explicitToken,
    skipAuthRedirect = false,
    responseType = 'json',
    signal,
  } = options

  const url = buildApiUrl(path, query)
  const finalHeaders = new Headers(headers)

  if (auth) {
    const token = explicitToken || getAuthToken()
    if (token) {
      finalHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  let requestBody = body
  if (
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof URLSearchParams) &&
    typeof body !== 'string'
  ) {
    if (!finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json')
    }
    requestBody = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: requestBody,
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error
    }
    throw new ApiError('Sin conexión con el servidor backend.', {
      status: 0,
      isOffline: true,
      cause: error,
    })
  }

  if (!response.ok) {
    let errorPayload = null
    const contentType = response.headers.get('content-type') || ''
    try {
      if (contentType.includes('application/json')) {
        errorPayload = await response.json()
      } else {
        const text = await response.text()
        if (text) errorPayload = { detail: text }
      }
    } catch {
      errorPayload = null
    }

    if (response.status === 401 && !skipAuthRedirect) {
      clearSessionAndRedirect()
    }

    const fallbackMsg =
      response.status === 401
        ? 'Sesión no válida o expirada.'
        : response.status === 403
          ? 'Operación no permitida para el rol asignado.'
          : response.status === 503
            ? 'Servicio o dron sin conexión disponible.'
            : `Error HTTP ${response.status}`

    throw new ApiError(parseApiErrorDetail(errorPayload, fallbackMsg), {
      status: response.status,
      detail: errorPayload?.detail ?? null,
      isOffline: false,
    })
  }

  if (response.status === 204) {
    return null
  }

  if (responseType === 'raw') return response
  if (responseType === 'blob') return response.blob()
  if (responseType === 'text') return response.text()

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const apiClient = {
  get: (path, options = {}) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' }),
}

export default apiClient
