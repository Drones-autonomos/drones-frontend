import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    <svg
      className="login-brand-mark"
      viewBox="0 0 440 390"
      role="img"
      aria-label="Emblema de AeroLuferan: casco de vigilancia y dos drones"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 196c38-49 92-91 151-122l34 31-29 34c-38 12-79 37-109 66l46 8c-39 13-76 34-100 57-14 14-8 28 12 27 29-2 67-22 102-44" strokeWidth="9" />
        <path d="M218 74c65-26 143-43 188-39 16 2 17 8 6 19-27 28-76 50-130 63l-39 14-30-27z" strokeWidth="9" />
        <path d="M72 188c32-33 73-62 113-82M256 91c40-17 84-29 125-33-25 20-59 34-95 43" strokeWidth="5" />
      </g>
      <g fill="currentColor">
        <path d="M177 244c7-66 43-103 99-103 19 0 37 6 52 17l20-21c36 38 56 87 62 138 2 16-8 21-19 7l-31-39-76-19-47 18 79 26 38 91c-46 0-94-8-137-30-37-4-79-3-119 4 21-30 34-59 40-89 7 1 13 1 20 0l19 0z" />
        <path d="M149 159c-10 0-17 7-17 16 0 7 4 13 11 15l11 2 10-8-2-16-8-9zM331 85c-10 0-17 7-17 16 0 7 4 13 11 15l11 2 10-8-2-16-8-9z" />
        <path d="M143 161l18-19 4 4-13 22zM325 87l18-19 4 4-13 22z" />
        <circle cx="151" cy="168" r="4" />
        <circle cx="333" cy="94" r="4" />
      </g>
    </svg>
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
  const [accountType, setAccountType] = useState('guard')
  const [email, setEmail] = useState(accountTypes.guard.email)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function selectAccount(type) {
    setAccountType(type)
    setEmail(accountTypes[type].email)

    if (type === 'admin') {
      navigate('/admin/live')
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
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

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="institutional-email">
            <span>Correo Institucional</span>
            <span className="account-label">{accountTypes[accountType].label}</span>
          </label>
          <div className="input-shell">
            <AtIcon />
            <input
              id="institutional-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
