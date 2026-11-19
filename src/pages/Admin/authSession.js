/**
 * Gestión de Sesión y Control de Acceso Basado en Roles (RBAC) para AeroLuferan.
 * Preparado para conectarse con el sistema RBAC del backend y base de datos.
 */

export const SESSION_STORAGE_KEY = 'aeroluferan_session'

export const DEFAULT_ADMIN_USER = {
  id: 'usr-admin-01',
  role: 'admin',
  roleKey: 'admin',
  roleDisplayName: 'Académico: Admin',
  rbacLabel: 'Rol: Admin. académico',
  rbacBadge: 'RBAC: Académico',
  name: 'Lu Bazaldúa',
  email: 'lubazadmin@admin.uaq.mx',
  position: 'Coordinador de Software',
  credentialStatus: 'Credencial Activa',
  photoUrl: null,
  permissions: ['flight:view', 'flight:schedule', 'flight:audit', 'geofence:edit', 'users:read', 'settings:edit'],
  token: 'simulated_jwt_token_admin',
}

export const DEFAULT_GUARD_USER = {
  id: 'usr-guard-01',
  role: 'guard',
  roleKey: 'guard',
  roleDisplayName: 'Seguridad: Guardia',
  rbacLabel: 'Rol: Guardia de Seguridad (Supervisor)',
  rbacBadge: 'RBAC: Seguridad',
  name: 'NombreGuardia',
  email: 'guard.seguridad@admin.uaq.mx',
  position: 'Guardia Supervisor',
  credentialStatus: 'Credencial Activa',
  photoUrl: null,
  permissions: ['flight:view', 'flight:control_emergency', 'alerts:resolve'],
  token: 'simulated_jwt_token_guard',
}

/**
 * Obtiene el usuario autenticado actualmente desde el almacenamiento local o sesión predeterminada.
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.role) {
        return parsed
      }
    }
  } catch (error) {
    console.error('Error al recuperar sesión de usuario:', error)
  }
  // Si no hay sesión previa, iniciar con el usuario de la captura de Figma (Académico: Admin)
  return DEFAULT_ADMIN_USER
}

/**
 * Establece el usuario autenticado.
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
 * Actualiza los datos de perfil del usuario garantizando que el correo no sea modificado.
 * Preparado para emitir llamadas a la API del backend / base de datos.
 */
export function updateUserProfile(updates) {
  const current = getCurrentUser()
  // El correo NO debe ser editable según la regla de negocio solicitada
  const { email, ...allowedUpdates } = updates
  const updated = {
    ...current,
    ...allowedUpdates,
    email: current.email, // Mantiene estrictamente el correo institucional original
  }
  setCurrentUser(updated)
  return updated
}

/**
 * Cierra la sesión activa y limpia los datos de autenticación.
 */
export function logoutUser() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('aeroluferan_session_changed', { detail: null }))
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
}

export const REGISTERED_USERS_KEY = 'aeroluferan_registered_users'

export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (error) {
    console.error('Error al leer usuarios registrados:', error)
  }
  return []
}

/**
 * Registra una nueva cuenta institucional ("guard" o "admin").
 * Rechaza correos personales y almacena la sesión para la interfaz y futura BD.
 */
export function registerUser({ name, email, password, role }) {
  const personalDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'live.com', 'icloud.com']
  const domain = email.split('@')[1]?.toLowerCase()
  if (personalDomains.includes(domain)) {
    throw new Error('Solo se permiten correos institucionales (@admin.uaq.mx o dominio universitario). No se permiten correos personales.')
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    role: role || 'guard',
    roleKey: role || 'guard',
    roleDisplayName: role === 'admin' ? 'Académico: Admin' : 'Seguridad: Guardia',
    rbacLabel: role === 'admin' ? 'Rol: Admin. académico' : 'Rol: Guardia de Seguridad (Supervisor)',
    rbacBadge: role === 'admin' ? 'RBAC: Académico' : 'RBAC: Seguridad',
    name: name.trim(),
    email: email.trim().toLowerCase(),
    position: role === 'admin' ? 'Coordinador de Software' : 'Guardia Supervisor',
    credentialStatus: 'Credencial Activa',
    photoUrl: null,
    createdAt: new Date().toISOString(),
  }

  // Guardar en repositorio de usuarios
  const users = getRegisteredUsers()
  users.push(newUser)
  try {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users))
  } catch (error) {
    console.error('Error al guardar nuevo usuario:', error)
  }

  // Activar sesión inmediata del usuario registrado
  setCurrentUser(newUser)
  return newUser
}
