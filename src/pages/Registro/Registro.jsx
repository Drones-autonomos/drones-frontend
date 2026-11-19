import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import brandLogo from '../../assets/aeroluferan-logo.png'
import { registerUser } from '../Admin/authSession.js'
import './Registro.css'

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

export default function Registro() {
  const navigate = useNavigate()

  // 1. Tipo de cuenta: 'guard' o 'admin' (Seguridad / Académico)
  const [accountType, setAccountType] = useState('guard')

  // 2. Datos del formulario (inicializados con los datos de muestra de Figma)
  const [name, setName] = useState('lu bazaldua')
  const [email, setEmail] = useState('guard.seguridad@admin.uaq.mx')
  const [password, setPassword] = useState('••••••••••••')
  const [confirmPassword, setConfirmPassword] = useState('••••••••••••')

  // Estados de visualización de contraseña
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados de error y retroalimentación
  const [errorMessage, setErrorMessage] = useState('')

  // Al cambiar tipo de cuenta, sugerir el correo institucional correspondiente
  function handleSelectAccount(type) {
    setAccountType(type)
    setErrorMessage('')
    if (email === 'guard.seguridad@admin.uaq.mx' || email === 'admin.academico@admin.uaq.mx') {
      setEmail(type === 'admin' ? 'admin.academico@admin.uaq.mx' : 'guard.seguridad@admin.uaq.mx')
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    if (!name.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.')
      return
    }

    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu correo institucional.')
      return
    }

    // Validación obligatoria: correo institucional (no correos personales)
    const personalDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'live.com', 'icloud.com']
    const emailParts = email.trim().toLowerCase().split('@')
    if (emailParts.length !== 2 || personalDomains.includes(emailParts[1])) {
      setErrorMessage('Solo se permiten correos institucionales (@admin.uaq.mx o dominio universitario). No se permiten correos personales.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe contener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Por favor verifica ambos campos.')
      return
    }

    try {
      // Registrar la cuenta y activar la sesión (preparado para backend y base de datos)
      registerUser({
        name,
        email,
        password,
        role: accountType,
      })

      // Redirigir a la vista correspondiente
      if (accountType === 'guard') { navigate('/guardia/en-vivo') } else { navigate('/admin/en-vivo') }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al registrar la cuenta.')
    }
  }

  return (
    <main className="registro-page">
      <div className="registro-content">
        {/* ============================================================== */}
        {/* 1. ENCABEZADO Y LOGOTIPO                                       */}
        {/* ============================================================== */}
        <header className="registro-header">
          <img
            src={brandLogo}
            className="registro-brand-mark"
            alt="Emblema de AeroLuferan: casco de vigilancia y dos drones"
          />
          <div className="registro-brand-name">
            <h1>AeroLuferan</h1>
            <span className="registro-brand-badge">FIF</span>
          </div>
        </header>

        {/* ============================================================== */}
        {/* 2. SELECTOR DE TIPO DE CUENTA (CREAR CUENTA)                   */}
        {/* ============================================================== */}
        <section className="account-creation-section" aria-labelledby="crear-cuenta-heading">
          <h2 id="crear-cuenta-heading">CREAR CUENTA</h2>
          <div className="account-options-grid">
            {/* Opción 1: Seguridad (Guardia) */}
            <button
              type="button"
              className={`account-option-card${accountType === 'guard' ? ' is-selected' : ''}`}
              aria-pressed={accountType === 'guard'}
              onClick={() => handleSelectAccount('guard')}
            >
              <div className="account-icon-box" aria-hidden="true">
                <ShieldUserIcon />
              </div>
              <div className="account-text-box">
                <strong>Seguridad</strong>
                <span>Guardia</span>
              </div>
            </button>

            {/* Opción 2: Académico (Admin) */}
            <button
              type="button"
              className={`account-option-card${accountType === 'admin' ? ' is-selected' : ''}`}
              aria-pressed={accountType === 'admin'}
              onClick={() => handleSelectAccount('admin')}
            >
              <div className="account-icon-box" aria-hidden="true">
                <AdminUserIcon />
              </div>
              <div className="account-text-box">
                <strong>Académico</strong>
                <span>Admin</span>
              </div>
            </button>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. FORMULARIO DE REGISTRO                                      */}
        {/* ============================================================== */}
        <form className="registro-card" onSubmit={handleSubmit} noValidate>
          {/* Campo 1: Nombre */}
          <div className="registro-field">
            <label className="registro-field-label" htmlFor="reg-nombre">
              Nombre
            </label>
            <div className="registro-input-shell">
              <input
                id="reg-nombre"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ingresa tu nombre completo"
                autoComplete="name"
                required
              />
            </div>
          </div>

          {/* Campo 2: Correo Institucional */}
          <div className="registro-field">
            <label className="registro-field-label" htmlFor="reg-email">
              Correo Institucional
            </label>
            <div className="registro-input-shell">
              <span className="registro-input-icon" aria-hidden="true">
                <AtIcon />
              </span>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@admin.uaq.mx"
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Campo 3: Contraseña */}
          <div className="registro-field">
            <label className="registro-field-label" htmlFor="reg-password">
              Contraseña
            </label>
            <div className="registro-input-shell">
              <span className="registro-input-icon" aria-hidden="true">
                <LockIcon />
              </span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
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

          {/* Campo 4: Confirmar contraseña */}
          <div className="registro-field">
            <label className="registro-field-label" htmlFor="reg-confirm-password">
              Confirmar contraseña
            </label>
            <div className="registro-input-shell">
              <span className="registro-input-icon" aria-hidden="true">
                <LockIcon />
              </span>
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="registro-toggle-pwd"
                aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Ver confirmación de contraseña'}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                <EyeIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>

          {/* Mensaje de error de validación */}
          {errorMessage && (
            <p className="registro-feedback-error" role="alert">
              {errorMessage}
            </p>
          )}

          {/* Botón Registrarme */}
          <button type="submit" className="btn-submit-registro">
            Registrarme
          </button>

          {/* Enlace Iniciar sesión */}
          <p className="registro-login-prompt">
            Ya tienes una cuenta? <Link to="/">Iniciar sesión</Link>
          </p>
        </form>
      </div>

      {/* ============================================================== */}
      {/* 4. PIE DE PÁGINA INSTITUCIONAL                                 */}
      {/* ============================================================== */}
      <footer className="registro-footer">
        <p>Uso reservado al personal habilitado de la Facultad.</p>
        <p>Monitoreo seguro conforme a normativas de privacidad.</p>
      </footer>
    </main>
  )
}
