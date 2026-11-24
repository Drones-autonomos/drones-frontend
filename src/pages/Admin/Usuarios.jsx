import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import { BackArrowIcon, ShieldSmallCheckIcon, UserVerifiedBadgeIcon } from '../../components/AjustesIcons.jsx'
import { AeroHelmetLogo } from '../../components/BitacoraIcons.jsx'
import {
  fetchCurrentUser,
  getCurrentUser,
  getRegisteredUsers,
  registerUser,
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

/**
 * Gestión de Usuarios dentro del módulo Administrador.
 * Conecta exclusivamente con POST /api/v1/auth/register (rol_id: 1=ADMIN, 2=GUARDIA).
 */
export default function Usuarios() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(getCurrentUser)
  const [usersList, setUsersList] = useState(getRegisteredUsers)
  const [isOffline, setIsOffline] = useState(false)

  // Campos de creación
  const [accountType, setAccountType] = useState('guard') // 'guard' -> rol_id 2 | 'admin' -> rol_id 1
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let mounted = true
    fetchCurrentUser()
      .then((updated) => {
        if (!mounted) return
        setIsOffline(false)
        if (updated) setCurrentUser(updated)
        setUsersList(getRegisteredUsers())
      })
      .catch((error) => {
        if (!mounted) return
        if (error?.isOffline) {
          setIsOffline(true)
        }
      })

    function handleUsersChanged() {
      setUsersList(getRegisteredUsers())
    }
    window.addEventListener('aeroluferan_users_changed', handleUsersChanged)
    return () => {
      mounted = false
      window.removeEventListener('aeroluferan_users_changed', handleUsersChanged)
    }
  }, [])

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
      const rolId = accountType === 'admin' ? 1 : 2
      const created = await registerUser({
        nombre: cleanName,
        email: cleanEmail,
        password,
        rol_id: rolId,
      })

      setIsOffline(false)
      setNombre('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setUsersList(getRegisteredUsers())
      setSuccessMessage(
        `Usuario "${created.nombre}" (${created.rol?.nombre || (rolId === 1 ? 'ADMIN' : 'GUARDIA')}) registrado correctamente.`,
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
              <AeroHelmetLogo size={34} />
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
                  <span>Guardia (Rol 2)</span>
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
                  <span>Admin (Rol 1)</span>
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

          {/* Listado de cuentas registradas en esta consola + sesión actual */}
          <h2 className="ajustes-section-title">CUENTAS REGISTRADAS ({usersList.length})</h2>
          <section className="ajustes-group-card" aria-label="Listado de usuarios registrados">
            {usersList.length === 0 ? (
              <div className="ajustes-item-row">
                <p className="ajustes-item__subtitle">
                  Aún no hay usuarios registrados en esta consola. Sesión actual: {currentUser.email}
                </p>
              </div>
            ) : (
              usersList.map((userItem) => {
                const isCurrent =
                  String(userItem.email).toLowerCase() === String(currentUser.email).toLowerCase()
                const isUserAdmin = userItem.role === 'admin' || userItem.rolNombre === 'ADMIN'
                return (
                  <div key={userItem.id || userItem.email} className="ajustes-item-row">
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
                          <span>{userItem.nombre || userItem.name}</span>
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
                        </strong>
                        <p className="ajustes-item__subtitle">{userItem.email}</p>
                      </div>
                    </div>
                    <span className="ai-sensitivity-badge">
                      {isUserAdmin ? 'ADMIN' : 'GUARDIA'}
                    </span>
                  </div>
                )
              })
            )}
          </section>
        </main>

        <AdminBottomNav activePath="/admin/ajustes" />
      </div>
    </div>
  )
}
