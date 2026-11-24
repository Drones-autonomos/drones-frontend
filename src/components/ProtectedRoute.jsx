import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { fetchCurrentUser, getAuthenticatedUser } from '../pages/Admin/authSession.js'
import { normalizeRole } from '../services/alertService.js'

/**
 * Guarda de rutas con verificación de JWT y rol RBAC ('admin' | 'guard').
 * Revalida silenciosamente contra GET /auth/me; si el backend está sin conexión,
 * conserva la sesión local válida sin provocar cierres inesperados ni crashes.
 */
export default function ProtectedRoute({ allowedRoles = ['admin', 'guard'], children }) {
  const location = useLocation()
  const [session, setSession] = useState(getAuthenticatedUser)

  useEffect(() => {
    function handleSessionSync() {
      setSession(getAuthenticatedUser())
    }

    window.addEventListener('aeroluferan_session_changed', handleSessionSync)
    window.addEventListener('aeroluferan_unauthorized', handleSessionSync)
    return () => {
      window.removeEventListener('aeroluferan_session_changed', handleSessionSync)
      window.removeEventListener('aeroluferan_unauthorized', handleSessionSync)
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!session?.token) return undefined

    fetchCurrentUser()
      .then((updated) => {
        if (active && updated) {
          setSession(updated)
        }
      })
      .catch((error) => {
        // Si es 401, apiClient ya limpia la sesión y redirige.
        // Si no hay conexión (isOffline), mantenemos la sesión local para degradar con aviso.
        if (!error?.isOffline && error?.status === 401 && active) {
          setSession(null)
        }
      })

    return () => {
      active = false
    }
  }, [session?.token])

  if (!session?.token) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  const userRole = normalizeRole(session.role || session.backendRole)
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    const fallbackPath = userRole === 'admin' ? '/admin/en-vivo' : '/guardia/en-vivo'
    return <Navigate to={fallbackPath} replace />
  }

  return children
}
