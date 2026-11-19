import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import brandLogo from '../../assets/aeroluferan-logo.png'
import {
  DEFAULT_ADMIN_USER,
  DEFAULT_GUARD_USER,
  setCurrentUser,
} from '../Admin/authSession.js'
import './Login.css'

const accountTypes = {
  guard: {
    label: 'Guardia Operativo',
    email: 'guard.seguridad@admin.uaq.mx',
  },
  admin: {
    label: 'Administrador Académico',
    email: 'admin.academico@admin.uaq.mx',
  },
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
  // Ningún tipo de usuario seleccionado inicialmente
  const [accountType, setAccountType] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Selección del tipo de usuario (únicamente una opción a la vez, sin navegar inmediatamente)
  function selectAccount(type) {
    setAccountType(type)
    setErrorMessage('')
    setEmail(accountTypes[type].email)
  }

  function handleSubmit(event) {
    event.preventDefault()

    // Validación obligatoria: si ninguna opción está seleccionada, bloquear avance y mostrar mensaje
    if (!accountType) {
      setErrorMessage(
        'Es necesario seleccionar un tipo de usuario (Seguridad: Guardia o Académico: Admin) para iniciar sesión.',
      )
      return
    }

    setErrorMessage('')

    // Establecer usuario autenticado según el rol seleccionado
    if (accountType === 'guard') {
      const user = { ...DEFAULT_GUARD_USER, email: email || accountTypes.guard.email }
      setCurrentUser(user)
      navigate('/guardia/live')
    } else if (accountType === 'admin') {
      const user = { ...DEFAULT_ADMIN_USER, email: email || accountTypes.admin.email }
      setCurrentUser(user)
      navigate('/admin/live')
    }
  }

  return (
    <main className="login-page">
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
              {accountType ? accountTypes[accountType].label : 'Selecciona una cuenta'}
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
              placeholder={accountType ? accountTypes[accountType].email : 'nombre.apellido@admin.uaq.mx'}
              autoComplete="username"
            />
          </div>

          <label className="field-label password-label" htmlFor="password">
            <span>Contraseña</span>
            <span className="field-link">¿Ayuda con PIN?</span>
          </label>
          <div className="input-shell">
            <LockIcon />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
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

          <button className="login-submit" type="submit">
            Iniciar Sesión
          </button>
          <p className="register-prompt">
            ¿No tienes una cuenta? <Link to="/registro">Regístrate aquí</Link>
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
