import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../pages/Admin/authSession.js'
import { getTheme, toggleTheme, THEME_CHANGED_EVENT } from '../services/themeService.js'
import './UserAvatarMenu.css'

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  )
}

/**
 * Indicador de sesión en la esquina superior derecha: círculo con las
 * iniciales del usuario autenticado. Al hacer clic despliega una tarjeta
 * con los datos del perfil y el botón de cierre de sesión.
 * Se monta dentro de ProtectedRoute, por lo que aparece en todas las
 * páginas autenticadas (Admin y Guardia).
 */
export default function UserAvatarMenu({ session }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setThemeState] = useState(getTheme)
  const rootRef = useRef(null)

  // Reacciona a cambios de tema hechos desde otras vistas/componentes.
  useEffect(() => {
    function syncTheme() {
      setThemeState(getTheme())
    }
    window.addEventListener(THEME_CHANGED_EVENT, syncTheme)
    return () => window.removeEventListener(THEME_CHANGED_EVENT, syncTheme)
  }, [])

  // Cierre al hacer clic fuera del componente o pulsar Escape.
  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!session?.token) return null

  const name = session.name || session.email || 'Usuario'
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function handleLogout() {
    setIsOpen(false)
    logoutUser()
    navigate('/', { replace: true })
  }

  return (
    <div className="user-avatar-menu" ref={rootRef}>
      <button
        type="button"
        className="user-avatar-btn"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Sesión de ${name}`}
        title={name}
        onClick={() => setIsOpen((v) => !v)}
      >
        {session.photoUrl ? (
          <img src={session.photoUrl} alt="" className="user-avatar-img" />
        ) : (
          <span className="user-avatar-initials">{initials || 'U'}</span>
        )}
      </button>

      {isOpen && (
        <div className="user-avatar-dropdown" role="menu">
          <header className="user-dropdown-header">
            <span className="user-avatar-btn user-avatar-btn--lg" aria-hidden="true">
              {session.photoUrl ? (
                <img src={session.photoUrl} alt="" className="user-avatar-img" />
              ) : (
                <span className="user-avatar-initials">{initials || 'U'}</span>
              )}
            </span>
            <div className="user-dropdown-identity">
              <strong>{name}</strong>
              <span>{session.email || 'Sin correo registrado'}</span>
            </div>
          </header>

          <ul className="user-dropdown-details">
            {session.position && (
              <li>
                <span className="user-detail-label">Puesto</span>
                <span className="user-detail-value">{session.position}</span>
              </li>
            )}
            {session.rbacBadge && (
              <li>
                <span className="user-detail-label">Acceso</span>
                <span className="user-detail-value">{session.rbacBadge}</span>
              </li>
            )}
            {session.credentialStatus && (
              <li>
                <span className="user-detail-label">Credencial</span>
                <span
                  className={`user-detail-value${
                    session.activo === false ? ' user-detail-value--inactive' : ''
                  }`}
                >
                  {session.credentialStatus}
                </span>
              </li>
            )}
          </ul>

          <button
            type="button"
            className="theme-toggle-row"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={() => toggleTheme()}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </span>
            <span className="theme-toggle-copy">
              <strong>Modo oscuro</strong>
              <span>{theme === 'dark' ? 'Activado' : 'Desactivado'}</span>
            </span>
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb" />
            </span>
          </button>

          <button type="button" className="user-logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
