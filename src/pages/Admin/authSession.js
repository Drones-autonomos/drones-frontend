/**
 * Gestión de Sesión JWT Real y Control de Acceso Basado en Roles (RBAC) para AeroLuferan.
 * Conectado con /api/v1/auth/login, /api/v1/auth/me y /api/v1/auth/register.
 */

import apiClient, {
  getStoredSession,
  SESSION_STORAGE_KEY,
} from '../../services/apiClient.js'
import { normalizeRole } from '../../services/alertService.js'

export { SESSION_STORAGE_KEY }

export const REGISTERED_USERS_KEY = 'aeroluferan_registered_users'

export const DEFAULT_ADMIN_USER = {
  id: null,
  role: 'admin',
  roleKey: 'admin',
  backendRole: 'ADMIN',
  rolId: 1,
  roleDisplayName: 'Académico: Admin',
  rbacLabel: 'Rol: Admin. académico',
  rbacBadge: 'RBAC: Académico',
  name: 'Administrador',
  email: 'Sin sesión activa',
  position: 'Administrador Académico',
  credentialStatus: 'Sin conexión',
  photoUrl: null,
  permissions: ['flight:view', 'flight:schedule', 'flight:audit', 'geofence:edit', 'users:write', 'settings:edit'],
  token: null,
}

export const DEFAULT_GUARD_USER = {
  id: null,
  role: 'guard',
  roleKey: 'guard',
  backendRole: 'GUARDIA',
  rolId: 2,
  roleDisplayName: 'Seguridad: Guardia',
  rbacLabel: 'Rol: Guardia de Seguridad',
  rbacBadge: 'RBAC: Seguridad',
  name: 'Guardia Operativo',
  email: 'Sin sesión activa',
  position: 'Guardia de Seguridad',
  credentialStatus: 'Sin conexión',
  photoUrl: null,
  permissions: ['flight:view', 'flight:control_emergency', 'alerts:resolve'],
  token: null,
}

/**
 * Transforma UserResponse del backend ({id, nombre, email, activo, rol, created_at})
 * al formato de sesión consumido por las vistas Admin y Guardia.
 */
export function mapBackendUserToSession(profile, token, previousSession = null) {
  const backendRoleName = profile?.rol?.nombre || 'GUARDIA'
  const mappedRole = normalizeRole(backendRoleName)
  const isAdmin = mappedRole === 'admin'
  const sameUser = previousSession && String(previousSession.email).toLowerCase() === String(profile?.email).toLowerCase()

  return {
    id: profile.id,
    role: mappedRole,
    roleKey: mappedRole,
    backendRole: backendRoleName,
    rolId: profile?.rol?.id ?? (isAdmin ? 1 : 2),
    roleDisplayName: isAdmin ? 'Académico: Admin' : 'Seguridad: Guardia',
    rbacLabel: isAdmin ? 'Rol: Admin. académico' : 'Rol: Guardia de Seguridad',
    rbacBadge: isAdmin ? 'RBAC: Académico' : 'RBAC: Seguridad',
    name: profile.nombre,
    email: profile.email,
    activo: Boolean(profile.activo),
    position:
      (sameUser && previousSession?.customPosition) ||
      profile?.rol?.descripcion ||
      (isAdmin ? 'Administrador Académico' : 'Guardia de Seguridad'),
    customPosition: sameUser ? previousSession?.customPosition || null : null,
    credentialStatus: profile.activo ? 'Credencial Activa' : 'Cuenta Inactiva',
    photoUrl: sameUser ? previousSession?.photoUrl || null : null,
    permissions: isAdmin
      ? ['flight:view', 'flight:schedule', 'flight:audit', 'geofence:edit', 'users:write', 'settings:edit']
      : ['flight:view', 'flight:control_emergency', 'alerts:resolve'],
    createdAt: profile.created_at,
    token,
  }
}

function upsertKnownUser(userProfile) {
  if (typeof window === 'undefined' || !userProfile?.email) return
  try {
    const users = getRegisteredUsers()
    const normalizedEmail = String(userProfile.email).toLowerCase()
    const mappedRole = normalizeRole(userProfile?.rol?.nombre || userProfile?.role)
    const entry = {
      id: userProfile.id,
      name: userProfile.nombre || userProfile.name,
      nombre: userProfile.nombre || userProfile.name,
      email: userProfile.email,
      activo: userProfile.activo ?? true,
      role: mappedRole,
      rolId: userProfile?.rol?.id ?? (mappedRole === 'admin' ? 1 : 2),
      rolNombre: userProfile?.rol?.nombre || (mappedRole === 'admin' ? 'ADMIN' : 'GUARDIA'),
      rolDescripcion:
        userProfile?.rol?.descripcion ||
        (mappedRole === 'admin' ? 'Administrador del sistema' : 'Guardia de seguridad de la facultad'),
      createdAt: userProfile.created_at || userProfile.createdAt || new Date().toISOString(),
    }

    const existingIdx = users.findIndex((u) => String(u.email).toLowerCase() === normalizedEmail)
    if (existingIdx >= 0) {
      users[existingIdx] = { ...users[existingIdx], ...entry }
    } else {
      users.unshift(entry)
    }
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users))
    window.dispatchEvent(new CustomEvent('aeroluferan_users_changed', { detail: users }))
  } catch (error) {
    console.error('Error al sincronizar directorio local de usuarios:', error)
  }
}

/**
 * Retorna la sesión autenticada real (con JWT válido) o null si no ha iniciado sesión.
 */
export function getAuthenticatedUser() {
  return getStoredSession()
}

export function isAuthenticated() {
  return Boolean(getStoredSession()?.token)
}

/**
 * Obtiene el usuario autenticado actualmente o una estructura vacía segura para renderizado.
 */
export function getCurrentUser() {
  const session = getStoredSession()
  if (session && session.role) {
    return session
  }
  return DEFAULT_ADMIN_USER
}

/**
 * Establece el usuario autenticado en localStorage.
 */
export function setCurrentUser(user) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user))
    window.dispatchEvent(new CustomEvent('aeroluferan_session_changed', { detail: user }))
  } catch (error) {
    console.error('Error al guardar sesión de usuario:', error)
  }
}

/**
 * Inicia sesión real contra POST /auth/login y obtiene el perfil real con GET /auth/me.
 */
export async function loginUser({ email, password }) {
  const cleanEmail = String(email || '').trim()
  const tokenResp = await apiClient.post(
    '/auth/login',
    { email: cleanEmail, password },
    { auth: false, skipAuthRedirect: true },
  )

  const accessToken = tokenResp?.access_token
  if (!accessToken) {
    throw new Error('El servidor no devolvió un token de acceso válido.')
  }

  const profile = await apiClient.get('/auth/me', {
    token: accessToken,
    skipAuthRedirect: true,
  })

  const previous = getStoredSession()
  const sessionUser = mapBackendUserToSession(profile, accessToken, previous)
  setCurrentUser(sessionUser)
  upsertKnownUser(profile)
  return sessionUser
}

/**
 * Refresca los datos de la sesión activa consultando GET /auth/me.
 */
export async function fetchCurrentUser() {
  const current = getStoredSession()
  if (!current?.token) return null

  const profile = await apiClient.get('/auth/me')
  const updated = mapBackendUserToSession(profile, current.token, current)
  setCurrentUser(updated)
  upsertKnownUser(profile)
  return updated
}

/**
 * Actualiza metadatos locales de visualización de perfil (foto o cargo local)
 * preservando el correo institucional y token JWT.
 */
export function updateUserProfile(updates) {
  const current = getCurrentUser()
  const allowedUpdates = { ...updates }
  delete allowedUpdates.email
  delete allowedUpdates.token
  delete allowedUpdates.role

  const updated = {
    ...current,
    ...allowedUpdates,
    customPosition: allowedUpdates.position ?? current.customPosition ?? null,
    email: current.email,
  }
  if (current.token) {
    setCurrentUser(updated)
  }
  return updated
}

/**
 * Cierra la sesión activa y limpia aeroluferan_session.
 */
export function logoutUser() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('aeroluferan_session_changed', { detail: null }))
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
}

export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (error) {
    console.error('Error al leer usuarios registrados:', error)
  }
  return []
}

/**
 * Registra un nuevo usuario en el backend vía POST /auth/register (requiere rol ADMIN).
 * rol_id: 1 = ADMIN, 2 = GUARDIA. No reemplaza la sesión activa del administrador.
 */
export async function registerUser({ nombre, name, email, password, role, rol_id }) {
  const finalName = String(nombre ?? name ?? '').trim()
  const finalEmail = String(email ?? '').trim().toLowerCase()
  const resolvedRoleId =
    rol_id !== undefined && rol_id !== null
      ? Number(rol_id)
      : normalizeRole(role) === 'admin'
        ? 1
        : 2

  const created = await apiClient.post('/auth/register', {
    nombre: finalName,
    email: finalEmail,
    password,
    rol_id: resolvedRoleId,
  })

  upsertKnownUser(created)
  return created
}
