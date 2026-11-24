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
 * Transforma UserResponse del backend ({id, nombre, email, activo, rol,
 * puesto, foto_url, preferencias, created_at}) al formato de sesión
 * consumido por las vistas Admin y Guardia.
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
      profile?.puesto ||
      (sameUser && previousSession?.customPosition) ||
      profile?.rol?.descripcion ||
      (isAdmin ? 'Administrador Académico' : 'Guardia de Seguridad'),
    customPosition: profile?.puesto || (sameUser ? previousSession?.customPosition || null : null),
    credentialStatus: profile.activo ? 'Credencial Activa' : 'Cuenta Inactiva',
    photoUrl: profile?.foto_url || (sameUser ? previousSession?.photoUrl || null : null),
    preferencias: profile?.preferencias || null,
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
 * expectedRole ('ADMIN' | 'GUARDIA') se envía cuando el usuario eligió
 * explícitamente una tarjeta de acceso; el backend responde 403 si la cuenta
 * pertenece al otro rol.
 */
export async function loginUser({ email, password, expectedRole }) {
  const cleanEmail = String(email || '').trim()
  const payload = { email: cleanEmail, password }
  if (expectedRole) payload.expected_role = expectedRole
  const tokenResp = await apiClient.post(
    '/auth/login',
    payload,
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

// Persistencia debounced del perfil contra PATCH /auth/me para no disparar
// una petición por cada tecla al editar nombre/puesto en vivo. Las promesas
// devueltas por updateUserProfile se resuelven/rechazan al concluir el flush.
let _profilePersistTimer = null
let _profilePersistWaiters = []
const PROFILE_PERSIST_DEBOUNCE_MS = 700

function _flushProfilePersist(sessionUser) {
  const waiters = _profilePersistWaiters
  _profilePersistWaiters = []
  apiClient
    .patch(
      '/auth/me',
      {
        nombre: sessionUser.name,
        puesto: sessionUser.position ?? sessionUser.customPosition ?? null,
        foto_url: sessionUser.photoUrl ?? null,
      },
      { skipAuthRedirect: true },
    )
    .then((profile) => {
      const refreshed = mapBackendUserToSession(profile, sessionUser.token, sessionUser)
      setCurrentUser(refreshed)
      waiters.forEach(({ resolve }) => resolve(refreshed))
    })
    .catch((error) => {
      console.error('No se pudo persistir el perfil en el servidor:', error?.message || error)
      // Offline (status 0): la copia local ya fue aplicada — se resuelve sin
      // error para no generar toasts falsos cuando el backend no responde.
      if (error?.isOffline || error?.status === 0) {
        waiters.forEach(({ resolve }) => resolve(sessionUser))
      } else {
        waiters.forEach(({ reject }) => reject(error))
      }
    })
}

/**
 * Actualiza el perfil del usuario: aplica los cambios de inmediato en la sesión
 * local y los persiste en el backend (PATCH /auth/me) con debounce.
 * Devuelve una promesa que se resuelve con la sesión persistida (o la copia
 * local si el backend está offline) y rechaza si el servidor responde 4xx/5xx.
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
  if (!current.token) {
    return Promise.resolve(updated)
  }
  setCurrentUser(updated)
  if (_profilePersistTimer) clearTimeout(_profilePersistTimer)
  const promise = new Promise((resolve, reject) => {
    _profilePersistWaiters.push({ resolve, reject })
  })
  _profilePersistTimer = setTimeout(() => {
    _profilePersistTimer = null
    _flushProfilePersist(updated)
  }, PROFILE_PERSIST_DEBOUNCE_MS)
  return promise
}

/**
 * Cambia la contraseña del usuario autenticado contra POST /auth/change-password.
 * El backend revoca el token en uso; la sesión local queda inválida después.
 */
export async function changePassword({ currentPassword, newPassword }) {
  return apiClient.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}

/**
 * Renueva el JWT de la sesión activa contra POST /auth/refresh.
 */
export async function refreshSessionToken() {
  const current = getStoredSession()
  if (!current?.token) return null
  const response = await apiClient.post('/auth/refresh', {})
  const newToken = response?.access_token
  if (!newToken) return null
  const updated = { ...current, token: newToken }
  setCurrentUser(updated)
  return updated
}

/**
 * Cierra la sesión activa: revoca el JWT en el servidor (POST /auth/logout,
 * best-effort) y limpia aeroluferan_session.
 */
export function logoutUser() {
  try {
    const token = getStoredSession()?.token
    if (token) {
      apiClient
        .post('/auth/logout', {}, { token, skipAuthRedirect: true })
        .catch(() => {})
    }
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
 * Lista los usuarios reales del backend (GET /users/, solo ADMIN).
 * Los mapea al formato de tarjeta que consume Usuarios.jsx.
 */
export async function fetchUsersAdmin({ q, rolId, activo } = {}) {
  const query = {}
  if (q) query.q = q
  if (rolId !== undefined && rolId !== null) query.rol_id = rolId
  if (activo !== undefined && activo !== null) query.activo = activo
  const users = await apiClient.get('/users/', { query })
  return (users || []).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    name: u.nombre,
    email: u.email,
    puesto: u.puesto || null,
    fotoUrl: u.foto_url || null,
    activo: Boolean(u.activo),
    rolId: u.rol?.id ?? null,
    rolNombre: u.rol?.nombre || 'GUARDIA',
    role: normalizeRole(u.rol?.nombre || 'GUARDIA'),
    rolDescripcion: u.rol?.descripcion || null,
    createdAt: u.created_at,
  }))
}

/**
 * Actualiza un usuario desde el panel de administración (PATCH /users/{id}).
 * Acepta { nombre, puesto, rol_id, activo }.
 */
export async function updateUserAdmin(userId, updates) {
  return apiClient.patch(`/users/${userId}`, updates)
}

/**
 * Restablece la contraseña de un usuario (POST /users/{id}/reset-password).
 */
export async function resetUserPasswordAdmin(userId, newPassword) {
  return apiClient.post(`/users/${userId}/reset-password`, { new_password: newPassword })
}

/**
 * Da de baja lógica a un usuario (DELETE /users/{id} → activo=false).
 */
export async function deleteUserAdmin(userId) {
  return apiClient.delete(`/users/${userId}`)
}

/**
 * Lista los roles disponibles (GET /users/roles, solo ADMIN).
 * Devuelve un mapa { NOMBRE: id } para resolver dinámicamente los IDs.
 */
export async function fetchRolesAdmin() {
  const roles = await apiClient.get('/users/roles')
  const map = {}
  for (const rol of roles || []) {
    map[String(rol.nombre).toUpperCase()] = rol.id
  }
  return map
}

/**
 * Registra un nuevo usuario en el backend vía POST /auth/register (requiere rol ADMIN).
 * Acepta { nombre|name, email, password, role|rol_id, puesto }.
 * No reemplaza la sesión activa del administrador.
 */
export async function registerUser({ nombre, name, email, password, role, rol_id, puesto }) {
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
    ...(puesto ? { puesto: String(puesto).trim() } : {}),
  })

  upsertKnownUser(created)
  return created
}
