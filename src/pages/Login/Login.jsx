import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import brandLogo from '../../assets/aeroluferan-logo.png'
import { getAuthenticatedUser, loginUser } from '../Admin/authSession.js'
import { normalizeRole } from '../../services/alertService.js'
import { getTheme, toggleTheme, THEME_CHANGED_EVENT } from '../../services/themeService.js'
import './Login.css'

const accountTypes = {
  guard: {
    label: 'Guardia Operativo',
    placeholder: 'seguridad@uaq.mx',
    backendRole: 'GUARDIA',
  },
  admin: {
    label: 'Administrador Académico',
    placeholder: 'academico@uaq.mx',
    backendRole: 'ADMIN',
  },
}

// Cuentas de prueba (existen en el backend). Solo en modo dev la tarjeta de
// rol autocompleta credenciales y "Iniciar Sesión" vacío usa estas cuentas.
const TEST_CREDENTIALS = {
  guard: { email: 'seguridad@uaq.mx', password: 'seguridad' },
  admin: { email: 'academico@uaq.mx', password: 'academico' },
}

function BrandMark() {
  return (
    <img
      src={brandLogo}
      className="login-brand-mark"
      alt="Emblema de AeroLuferan: casco de vigilancia y dos drones"
    />
  )
}

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

function Login() {
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [theme, setTheme] = useState(getTheme)

  useEffect(() => {
    function syncTheme() {
      setTheme(getTheme())
    }
    window.addEventListener(THEME_CHANGED_EVENT, syncTheme)
    return () => window.removeEventListener(THEME_CHANGED_EVENT, syncTheme)
  }, [])

  useEffect(() => {
    const existing = getAuthenticatedUser()
    if (existing?.token) {
      const role = normalizeRole(existing.role || existing.backendRole)
      navigate(role === 'admin' ? '/admin/en-vivo' : '/guardia/en-vivo', { replace: true })
    }
  }, [navigate])

  function selectAccount(type) {
    setAccountType(type)
    setErrorMessage('')
    if (import.meta.env.DEV) {
      setEmail(TEST_CREDENTIALS[type].email)
      setPassword(TEST_CREDENTIALS[type].password)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    let trimmedEmail = email.trim()
    let pass = password

    // Dev: Enter sin campos → entra con la cuenta de prueba del rol elegido
    // (o Admin si no se seleccionó tarjeta).
    if (import.meta.env.DEV && !trimmedEmail && !pass) {
      const creds = TEST_CREDENTIALS[accountType || 'admin']
      trimmedEmail = creds.email
      pass = creds.password
    }

    if (!trimmedEmail) {
      setErrorMessage('Ingresa tu correo electrónico institucional para iniciar sesión.')
      return
    }

    if (!pass || pass.length < 6) {
      setErrorMessage('Ingresa tu contraseña (mínimo 6 caracteres).')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const sessionUser = await loginUser({
        email: trimmedEmail,
        password: pass,
        expectedRole: accountType ? accountTypes[accountType].backendRole : undefined,
      })

      const realRole = normalizeRole(sessionUser.role || sessionUser.backendRole)
      if (realRole === 'admin') {
        navigate('/admin/en-vivo', { replace: true })
      } else {
        navigate('/guardia/en-vivo', { replace: true })
      }
    } catch (error) {
      if (error?.isOffline) {
        setErrorMessage(
          'Sin conexión con el servidor. Verifica que la API del backend esté en ejecución.',
        )
      } else {
        setErrorMessage(
          error instanceof Error ? error.message : 'No fue posible iniciar sesión.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <button
        type="button"
        className="login-theme-toggle"
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        onClick={() => toggleTheme()}
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>
      <div className="login-content">
        <header className="login-header">
          <BrandMark />
          <div className="login-brand-name">
            <h1>AeroLuferan</h1>
            <span className="login-brand-badge">FIF</span>
          </div>
        </header>

        <section className="account-section" aria-labelledby="account-heading">
          <h2 id="account-heading">ELIGE TU CUENTA</h2>
          <div className="account-options">
            <button
              className={`account-option${accountType === 'guard' ? ' is-selected' : ''}`}
              type="button"
              aria-pressed={accountType === 'guard'}
              onClick={() => selectAccount('guard')}
            >
              <span className="account-icon">
                <ShieldUserIcon />
              </span>
              <span className="account-option-copy">
                <strong>Seguridad</strong>
                <span>Guardia</span>
              </span>
            </button>
            <button
              className={`account-option${accountType === 'admin' ? ' is-selected' : ''}`}
              type="button"
              aria-pressed={accountType === 'admin'}
              onClick={() => selectAccount('admin')}
            >
              <span className="account-icon">
                <AdminUserIcon />
              </span>
              <span className="account-option-copy">
                <strong>Académico</strong>
                <span>Admin</span>
              </span>
            </button>
          </div>
        </section>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {errorMessage && (
            <div className="login-error-alert" role="alert">
              <span className="login-error-dot" />
              <span>{errorMessage}</span>
            </div>
          )}

          <label className="field-label" htmlFor="institutional-email">
            <span>Correo Institucional</span>
            <span className="account-label">
              {accountType ? accountTypes[accountType].label : 'Acceso autenticado'}
            </span>
          </label>
          <div className="input-shell">
            <AtIcon />
            <input
              id="institutional-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setErrorMessage('')
              }}
              placeholder={
                accountType
                  ? accountTypes[accountType].placeholder
                  : 'nombre.apellido@uaq.mx'
              }
              autoComplete="username"
              disabled={isSubmitting}
            />
          </div>

          <label className="field-label password-label" htmlFor="password">
            <span>Contraseña</span>
            <span className="field-link">JWT · 8h</span>
          </label>
          <div className="input-shell">
            <LockIcon />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setErrorMessage('')
              }}
              placeholder="••••••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((isVisible) => !isVisible)}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
          {import.meta.env.DEV && (
            <p className="register-prompt">
              Pruebas: seguridad@uaq.mx / seguridad · academico@uaq.mx / academico
            </p>
          )}
          <p className="register-prompt">
            El alta de nuevas cuentas está reservada al Administrador Académico.
          </p>
        </form>
      </div>

      <footer className="login-footer">
        <p>Uso reservado al personal habilitado de la Facultad.</p>
        <p>Monitoreo seguro conforme a normativas de privacidad.</p>
      </footer>
    </main>
  )
}

export default Login
