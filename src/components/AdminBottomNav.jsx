import { NavLink } from 'react-router-dom'
import {
  BellIcon,
  BookIcon,
  LiveIcon,
  RouteIcon,
  SettingsIcon,
} from './EnVivoIcons.jsx'
import './AdminBottomNav.css'

const navigationItems = [
  { to: '/admin/live', label: 'En Vivo', Icon: LiveIcon },
  { to: '/admin/alertas', label: 'Alertas', Icon: BellIcon, showBadge: true },
  { to: '/admin/rutas', label: 'Rutas', Icon: RouteIcon },
  { to: '/admin/bitacora', label: 'Bitácora', Icon: BookIcon },
  { to: '/admin/ajustes', label: 'Ajustes', Icon: SettingsIcon },
]

function AdminBottomNav({ pendingAlerts = 0 }) {
  return (
    <nav className="admin-bottom-nav" aria-label="Navegación de administrador">
      {navigationItems.map(({ to, label, Icon, showBadge }) => (
        <NavLink
          key={to}
          className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}
          to={to}
          end={to === '/admin/live'}
        >
          <span className="admin-nav-icon">
            <Icon />
            {showBadge && pendingAlerts > 0 && (
              <span className="admin-nav-badge" aria-label={`${pendingAlerts} alertas pendientes`}>
                {pendingAlerts}
              </span>
            )}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default AdminBottomNav
