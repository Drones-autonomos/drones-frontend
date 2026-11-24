import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import { BackArrowIcon, ShieldSmallCheckIcon, UserVerifiedBadgeIcon } from '../../components/AjustesIcons.jsx'
import aeroluferanLogo from '../../assets/aeroluferan-logo.png'
import { CloseModalIcon } from '../../components/BitacoraIcons.jsx'
import {
  deleteUserAdmin,
  fetchCurrentUser,
  fetchRolesAdmin,
  fetchUsersAdmin,
  getCurrentUser,
  getRegisteredUsers,
  registerUser,
  resetUserPasswordAdmin,
  updateUserAdmin,
} from './authSession.js'
import './Ajustes.css'
import '../Registro/Registro.css'

function ShieldUserIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 27 7v8c0 7.2-4.6 12.1-11 14-6.4-1.9-11-6.8-11-14V7l11-4Z" />
      <circle cx="16" cy="12" r="3.2" />
      <path d="M10.5 21c1.3-3.1 3.1-4.5 5.5-4.5s4.2 1.4 5.5 4.5c-1.5 1.4-3.3 2.2-5.5 2.7-2.2-.5-4-1.3-5.5-2.7Z" />
    </svg>
  )
}

function AdminUserIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="12" cy="9" r="4" />
      <path d="M4.5 24c.5-4.4 3.1-6.7 7.5-6.7 2 0 3.6.5 4.8 1.5M4 28h12" />
      <path d="m23.5 16 .8 1.7 1.8-.5 1 1.8-1.3 1.3.8 1.7-1.8 1-1.3-1.3-1.7.8-1-1.8.5-1.8-1.3-1.3 1-1.8 1.8.5.7-1.7Z" />
      <circle cx="23.5" cy="21.5" r="2.1" />
    </svg>
  )
}

function AtIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="10.5" />
      <path d="M18.5 18v-6a4.5 4.5 0 1 0-1.4 3.3c.4 1.2 1.4 2.2 2.9 2.2 2.1 0 3.5-1.7 3.5-4.4" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <rect x="5" y="12" width="18" height="13" rx="2" />
      <path d="M9 12V8a5 5 0 0 1 10 0v4" />
      <circle cx="14" cy="18" r="1.4" />
    </svg>
  )
}

function EyeIcon({ visible }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path d="M2.5 14s4.1-7 11.5-7 11.5 7 11.5 7-4.1 7-11.5 7S2.5 14 2.5 14Z" />
      <circle cx="14" cy="14" r="3.5" />
      {!visible && <path d="m5 5 18 18" />}
    </svg>
  )
}

// Dominios de correo personal rechazados también por el backend (/auth/register).
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'hotmail.com',
  'hotmail.es',
  'hotmail.com.mx',
  'yahoo.com',
  'yahoo.es',
  'yahoo.com.mx',
  'outlook.com',
  'outlook.es',
  'outlook.com.mx',
  'live.com',
  'live.com.mx',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
])

/**
 * Gestión de Usuarios dentro del módulo Administrador.
 * Alta vía POST /api/v1/auth/register y administración real contra
 * GET/PATCH/DELETE /api/v1/users (lista real de la BD; el listado local
 * actúa solo como respaldo cuando el backend no responde).
 */
// IDs de rol por defecto mientras GET /users/roles responde (o si falla)
const DEFAULT_ROLE_IDS = { ADMIN: 1, GUARDIA: 2 }

export default function Usuarios() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(getCurrentUser)
  const [usersList, setUsersList] = useState(getRegisteredUsers)
  const [isOffline, setIsOffline] = useState(false)
  const [busyUserId, setBusyUserId] = useState(null)
  const [roleIds, setRoleIds] = useState(DEFAULT_ROLE_IDS)

  // Búsqueda y filtro de estado del listado (GET /users/?q=&activo=)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos') // 'todos' | 'activos' | 'inactivos'

  // Campos de creación
  const [accountType, setAccountType] = useState('guard') // 'guard' | 'admin' (IDs reales vía /users/roles)
  const [nombre, setNombre] = useState('')
  const [puesto, setPuesto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Modales propios (reemplazan window.prompt / window.confirm)
  const [editTarget, setEditTarget] = useState(null) // usuario a editar (nombre/puesto)
  const [editForm, setEditForm] = useState({ nombre: '', puesto: '' })
  const [resetTarget, setResetTarget] = useState(null) // usuario para restablecer clave
  const [resetPassword, setResetPassword] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null) // usuario a dar de baja
  const [modalBusy, setModalBusy] = useState(false)
  const [modalError, setModalError] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadUsers({ fallbackToLocal = true, q, activo } = {}) {
    try {
      const remoteUsers = await fetchUsersAdmin({ q, activo })
      setUsersList(remoteUsers)
      setIsOffline(false)
      return remoteUsers
    } catch (error) {
      if (error?.isOffline) setIsOffline(true)
      if (fallbackToLocal) setUsersList(getRegisteredUsers())
      return null
    }
  }

  function currentFilters() {
    return {
      q: searchQuery.trim() || undefined,
      activo:
        statusFilter === 'activos' ? true : statusFilter === 'inactivos' ? false : undefined,
    }
  }

  useEffect(() => {
    let mounted = true
    fetchCurrentUser()
      .then((updated) => {
        if (!mounted) return
        if (updated) setCurrentUser(updated)
      })
      .catch((error) => {
        if (!mounted) return
        if (error?.isOffline) setIsOffline(true)
      })
      .finally(() => {
        if (mounted) loadUsers(currentFilters())
      })

    // Resolución dinámica de IDs de rol (GET /users/roles, solo ADMIN)
    fetchRolesAdmin()
      .then((map) => {
        if (mounted && map && Object.keys(map).length > 0) setRoleIds(map)
      })
      .catch(() => {})

    function handleUsersChanged() {
      loadUsers(currentFilters())
    }
    window.addEventListener('aeroluferan_users_changed', handleUsersChanged)
    return () => {
      mounted = false
      window.removeEventListener('aeroluferan_users_changed', handleUsersChanged)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recarga del listado al aplicar búsqueda/filtro
  function handleApplyFilters() {
    loadUsers(currentFilters())
  }

  // Acciones administrativas sobre una cuenta (toggle activo, toggle rol)
  async function handleAdminAction(userItem, action) {
    if (busyUserId !== null) return
    setBusyUserId(userItem.id)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      if (action === 'toggle-activo') {
        await updateUserAdmin(userItem.id, { activo: !userItem.activo })
        setSuccessMessage(
          `Cuenta de ${userItem.nombre || userItem.email} ${userItem.activo ? 'desactivada' : 'reactivada'}.`,
        )
      } else if (action === 'toggle-rol') {
        const targetRolId =
          userItem.rolId === roleIds.ADMIN ? roleIds.GUARDIA : roleIds.ADMIN
        await updateUserAdmin(userItem.id, { rol_id: targetRolId })
        setSuccessMessage(
          `Rol de ${userItem.nombre || userItem.email} actualizado a ${targetRolId === roleIds.ADMIN ? 'ADMIN' : 'GUARDIA'}.`,
        )
      }
      await loadUsers(currentFilters())
    } catch (error) {
      if (error?.isOffline) {
        setIsOffline(true)
        setErrorMessage('Sin conexión con el backend. No es posible administrar usuarios ahora.')
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'No fue posible completar la acción.')
      }
    } finally {
      setBusyUserId(null)
    }
  }

  // Apertura de modales propios ---------------------------------------------
  function openEditModal(userItem) {
    setEditTarget(userItem)
    setEditForm({ nombre: userItem.nombre || userItem.name || '', puesto: userItem.puesto || '' })
    setModalError('')
  }

  function openResetModal(userItem) {
    setResetTarget(userItem)
    setResetPassword('')
    setModalError('')
  }

  function openDeleteModal(userItem) {
    setDeleteTarget(userItem)
    setModalError('')
  }

  function closeModals() {
    if (modalBusy) return
    setEditTarget(null)
    setResetTarget(null)
    setDeleteTarget(null)
    setModalError('')
  }

  // Edición de nombre/puesto (PATCH /users/{id})
  async function handleSubmitEdit(event) {
    event.preventDefault()
    if (modalBusy || !editTarget) return
    const cleanName = editForm.nombre.trim()
    if (cleanName.length < 2 || cleanName.length > 100) {
      setModalError('El nombre debe contener entre 2 y 100 caracteres.')
      return
    }
    try {
      setModalBusy(true)
      setModalError('')
      await updateUserAdmin(editTarget.id, {
        nombre: cleanName,
        puesto: editForm.puesto.trim() || null,
      })
      setEditTarget(null)
      setSuccessMessage(`Perfil de ${cleanName} actualizado.`)
      await loadUsers(currentFilters())
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'No fue posible actualizar el usuario.')
    } finally {
      setModalBusy(false)
    }
  }

  // Restablecer contraseña (POST /users/{id}/reset-password)
  async function handleSubmitReset(event) {
    event.preventDefault()
    if (modalBusy || !resetTarget) return
    if (resetPassword.length < 8) {
      setModalError('La contraseña debe contener al menos 8 caracteres.')
      return
    }
    try {
      setModalBusy(true)
      setModalError('')
      await resetUserPasswordAdmin(resetTarget.id, resetPassword)
      const email = resetTarget.email
      setResetTarget(null)
      setSuccessMessage(`Contraseña de ${email} restablecida correctamente.`)
      await loadUsers(currentFilters())
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'No fue posible restablecer la contraseña.')
    } finally {
      setModalBusy(false)
    }
  }

  // Dar de baja (DELETE /users/{id} → activo=false)
  async function handleConfirmDelete() {
    if (modalBusy || !deleteTarget) return
    try {
      setModalBusy(true)
      setModalError('')
      await deleteUserAdmin(deleteTarget.id)
      const email = deleteTarget.email
      setDeleteTarget(null)
      setSuccessMessage(`Cuenta de ${email} dada de baja.`)
      await loadUsers(currentFilters())
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'No fue posible dar de baja la cuenta.')
    } finally {
      setModalBusy(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    setErrorMessage('')
    setSuccessMessage('')

    const cleanName = nombre.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (cleanName.length < 2 || cleanName.length > 100) {
      setErrorMessage('El nombre debe contener entre 2 y 100 caracteres.')
      return
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido.')
      return
    }

    const emailDomain = cleanEmail.split('@').pop().toLowerCase()
    if (PERSONAL_EMAIL_DOMAINS.has(emailDomain)) {
      setErrorMessage('Se requiere un correo institucional; no se permiten dominios personales.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe contener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)
    try {
      const rolId = accountType === 'admin' ? roleIds.ADMIN : roleIds.GUARDIA
      const created = await registerUser({
        nombre: cleanName,
        email: cleanEmail,
        password,
        rol_id: rolId,
        puesto: puesto.trim() || undefined,
      })

      setIsOffline(false)
      setNombre('')
      setPuesto('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      await loadUsers(currentFilters())
      setSuccessMessage(
        `Usuario "${created.nombre}" (${created.rol?.nombre || (rolId === roleIds.ADMIN ? 'ADMIN' : 'GUARDIA')}) registrado correctamente.`,
      )
    } catch (error) {
      if (error?.isOffline) {
        setIsOffline(true)
        setErrorMessage('Sin conexión con el backend. No es posible registrar usuarios ahora.')
      } else {
        setErrorMessage(
          error instanceof Error ? error.message : 'No fue posible registrar el usuario.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="ajustes-page">
      <div className="ajustes-shell">
        <header className="ajustes-header">
          <div className="ajustes-brand" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="edit-profile-back-btn"
                style={{ position: 'static' }}
                onClick={() => navigate('/admin/ajustes')}
                aria-label="Volver a Ajustes"
              >
                <BackArrowIcon size={18} />
              </button>
              <img
                src={aeroluferanLogo}
                alt="Emblema AeroLuferan"
                style={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0 }}
              />
              <h1 className="ajustes-brand-title">Gestión de Usuarios</h1>
            </div>
            <span className="profile-rbac-badge">Solo ADMIN</span>
          </div>
        </header>

        <main className="ajustes-content" style={{ paddingBottom: '28px' }}>
          {isOffline && (
            <div
              role="status"
              style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                color: '#9a3412',
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              Estado: Sin conexión con el servidor backend. El alta de usuarios requiere conexión activa.
            </div>
          )}

          {/* Formulario de alta conectado a POST /auth/register */}
          <h2 className="ajustes-section-title">REGISTRAR NUEVA CUENTA</h2>
          <section className="account-creation-section" style={{ marginBottom: '4px' }}>
            <div className="account-options-grid">
              <button
                type="button"
                className={`account-option-card${accountType === 'guard' ? ' is-selected' : ''}`}
                aria-pressed={accountType === 'guard'}
                onClick={() => {
                  setAccountType('guard')
                  setErrorMessage('')
                }}
              >
                <div className="account-icon-box" aria-hidden="true">
                  <ShieldUserIcon />
                </div>
                <div className="account-text-box">
                  <strong>Seguridad</strong>
                  <span>Guardia (Rol {roleIds.GUARDIA ?? '—'})</span>
                </div>
              </button>

              <button
                type="button"
                className={`account-option-card${accountType === 'admin' ? ' is-selected' : ''}`}
                aria-pressed={accountType === 'admin'}
                onClick={() => {
                  setAccountType('admin')
                  setErrorMessage('')
                }}
              >
                <div className="account-icon-box" aria-hidden="true">
                  <AdminUserIcon />
                </div>
                <div className="account-text-box">
                  <strong>Académico</strong>
                  <span>Admin (Rol {roleIds.ADMIN ?? '—'})</span>
                </div>
              </button>
            </div>
          </section>

          <form className="registro-card" onSubmit={handleSubmit} noValidate>
            <div className="registro-field">
              <label className="registro-field-label" htmlFor="admin-reg-nombre">
                Nombre completo
              </label>
              <div className="registro-input-shell">
                <input
                  id="admin-reg-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  autoComplete="off"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="registro-field">
              <label className="registro-field-label" htmlFor="admin-reg-puesto">
                Puesto / Cargo
              </label>
              <div className="registro-input-shell">
                <input
                  id="admin-reg-puesto"
                  type="text"
                  value={puesto}
                  onChange={(e) => setPuesto(e.target.value)}
                  placeholder="Ej. Guardia Supervisor (opcional)"
                  autoComplete="off"
                  disabled={isSubmitting}
                  maxLength={100}
                />
              </div>
            </div>

            <div className="registro-field">
              <label className="registro-field-label" htmlFor="admin-reg-email">
                Correo Institucional
              </label>
              <div className="registro-input-shell">
                <span className="registro-input-icon" aria-hidden="true">
                  <AtIcon />
                </span>
                <input
                  id="admin-reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@uaq.mx"
                  autoComplete="off"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="registro-field">
              <label className="registro-field-label" htmlFor="admin-reg-password">
                Contraseña inicial
              </label>
              <div className="registro-input-shell">
                <span className="registro-input-icon" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="admin-reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="registro-toggle-pwd"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div className="registro-field">
              <label className="registro-field-label" htmlFor="admin-reg-confirm">
                Confirmar contraseña
              </label>
              <div className="registro-input-shell">
                <span className="registro-input-icon" aria-hidden="true">
                  <LockIcon />
                </span>
                <input
                  id="admin-reg-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="registro-toggle-pwd"
                  aria-label={
                    showConfirmPassword
                      ? 'Ocultar confirmación de contraseña'
                      : 'Ver confirmación de contraseña'
                  }
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  <EyeIcon visible={showConfirmPassword} />
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="registro-feedback-error" role="alert">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <div
                role="status"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <ShieldSmallCheckIcon size={18} />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-submit-registro"
              style={{ marginTop: '6px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registrando usuario...' : 'Crear Usuario'}
            </button>
          </form>

          {/* Listado real de cuentas (GET /users) con controles de administración */}
          <h2 className="ajustes-section-title">CUENTAS REGISTRADAS ({usersList.length})</h2>

          {/* Búsqueda por texto (?q=) y filtro de estado (?activo=) */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleApplyFilters()
            }}
            style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o puesto…"
              aria-label="Buscar usuarios"
              style={{ flex: '1 1 200px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado"
              style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
            <button
              type="submit"
              className="btn-submit-registro"
              style={{ marginTop: 0, padding: '9px 16px', width: 'auto' }}
            >
              Buscar
            </button>
          </form>

          <section className="ajustes-group-card" aria-label="Listado de usuarios registrados">
            {usersList.length === 0 ? (
              <div className="ajustes-item-row">
                <p className="ajustes-item__subtitle">
                  Aún no hay usuarios registrados. Sesión actual: {currentUser.email}
                </p>
              </div>
            ) : (
              usersList.map((userItem) => {
                const isCurrent =
                  String(userItem.email).toLowerCase() === String(currentUser.email).toLowerCase()
                const isUserAdmin =
                  userItem.rolNombre === 'ADMIN' ||
                  userItem.role === 'admin' ||
                  userItem.rolId === roleIds.ADMIN
                const isActive = userItem.activo !== false
                const rowBusy = busyUserId === userItem.id
                const actionBtnStyle = {
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  cursor: rowBusy ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap',
                }
                return (
                  <div key={userItem.id || userItem.email} className="ajustes-item-row" style={{ flexWrap: 'wrap' }}>
                    <div className="ajustes-item__left">
                      <div
                        className={`ajustes-item__icon-wrap ${
                          isUserAdmin
                            ? 'ajustes-item__icon-wrap--blue'
                            : 'ajustes-item__icon-wrap--green'
                        }`}
                        aria-hidden="true"
                      >
                        <UserVerifiedBadgeIcon size={20} />
                      </div>
                      <div className="ajustes-item__texts">
                        <strong className="ajustes-item__title-line">
                          <span style={{ opacity: isActive ? 1 : 0.5 }}>
                            {userItem.nombre || userItem.name}
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#dbeafe',
                                color: '#1d4ed8',
                                padding: '2px 6px',
                                borderRadius: '999px',
                              }}
                            >
                              Tú
                            </span>
                          )}
                          {!isActive && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '2px 6px',
                                borderRadius: '999px',
                              }}
                            >
                              Inactiva
                            </span>
                          )}
                        </strong>
                        <p className="ajustes-item__subtitle">
                          {userItem.email}
                          {userItem.puesto ? ` · ${userItem.puesto}` : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="ai-sensitivity-badge">
                        {isUserAdmin ? 'ADMIN' : 'GUARDIA'}
                      </span>
                      {!isCurrent && userItem.id != null && (
                        <>
                          <button
                            type="button"
                            style={actionBtnStyle}
                            disabled={rowBusy}
                            onClick={() => handleAdminAction(userItem, 'toggle-activo')}
                          >
                            {isActive ? 'Desactivar' : 'Reactivar'}
                          </button>
                          <button
                            type="button"
                            style={actionBtnStyle}
                            disabled={rowBusy}
                            onClick={() => handleAdminAction(userItem, 'toggle-rol')}
                          >
                            → {isUserAdmin ? 'GUARDIA' : 'ADMIN'}
                          </button>
                          <button
                            type="button"
                            style={actionBtnStyle}
                            disabled={rowBusy}
                            onClick={() => openEditModal(userItem)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            style={actionBtnStyle}
                            disabled={rowBusy}
                            onClick={() => openResetModal(userItem)}
                          >
                            Restablecer clave
                          </button>
                          {isActive && (
                            <button
                              type="button"
                              style={{ ...actionBtnStyle, borderColor: '#fecaca', color: '#b91c1c' }}
                              disabled={rowBusy}
                              onClick={() => openDeleteModal(userItem)}
                            >
                              Dar de baja
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </section>
        </main>

        <AdminBottomNav activePath="/admin/ajustes" />
      </div>

      {/* Modal: Editar usuario (PATCH /users/{id} → nombre + puesto) */}
      {editTarget && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="edit-user-title">Editar usuario</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={closeModals}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit}>
              <div className="ajustes-modal-body">
                <p style={{ fontSize: '13px' }}>
                  Correo: <strong>{editTarget.email}</strong>
                </p>
                <div className="modal-options-list">
                  <label className="form-label-block" style={{ display: 'block' }}>
                    <span>Nombre completo</span>
                    <input
                      type="text"
                      value={editForm.nombre}
                      onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </label>
                  <label className="form-label-block" style={{ display: 'block' }}>
                    <span>Puesto / Cargo</span>
                    <input
                      type="text"
                      value={editForm.puesto}
                      onChange={(e) => setEditForm({ ...editForm, puesto: e.target.value })}
                      placeholder="Ej. Guardia Supervisor (opcional)"
                      maxLength={100}
                    />
                  </label>
                </div>
                {modalError && (
                  <p style={{ fontSize: '12px', color: '#dc2626' }} role="alert">
                    {modalError}
                  </p>
                )}
              </div>
              <div className="ajustes-modal-actions">
                <button
                  type="button"
                  className="btn-ajustes-modal-cancel"
                  onClick={closeModals}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-ajustes-modal-confirm"
                  disabled={modalBusy}
                >
                  {modalBusy ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Restablecer contraseña (POST /users/{id}/reset-password) */}
      {resetTarget && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-pwd-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="reset-pwd-title">Restablecer contraseña</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={closeModals}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitReset}>
              <div className="ajustes-modal-body">
                <p style={{ fontSize: '13px' }}>
                  Nueva contraseña temporal para <strong>{resetTarget.email}</strong>.
                  Sus sesiones activas serán revocadas.
                </p>
                <div className="modal-options-list">
                  <label className="form-label-block" style={{ display: 'block' }}>
                    <span>Nueva contraseña (mín. 8 caracteres)</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      required
                    />
                  </label>
                </div>
                {modalError && (
                  <p style={{ fontSize: '12px', color: '#dc2626' }} role="alert">
                    {modalError}
                  </p>
                )}
              </div>
              <div className="ajustes-modal-actions">
                <button
                  type="button"
                  className="btn-ajustes-modal-cancel"
                  onClick={closeModals}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-ajustes-modal-confirm"
                  disabled={modalBusy}
                >
                  {modalBusy ? 'Restableciendo…' : 'Restablecer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar baja de cuenta (DELETE /users/{id}) */}
      {deleteTarget && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="delete-user-title">Dar de baja cuenta</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={closeModals}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <div className="ajustes-modal-body">
              <p>
                ¿Dar de baja la cuenta de{' '}
                <strong>{deleteTarget.nombre || deleteTarget.email}</strong>? El usuario
                perderá el acceso al sistema y sus sesiones activas serán revocadas.
              </p>
              {modalError && (
                <p style={{ fontSize: '12px', color: '#dc2626' }} role="alert">
                  {modalError}
                </p>
              )}
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={closeModals}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-ajustes-modal-confirm"
                onClick={handleConfirmDelete}
                disabled={modalBusy}
              >
                {modalBusy ? 'Procesando…' : 'Dar de baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
