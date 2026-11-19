import { NavLink } from 'react-router-dom'
import {
  BellIcon,
  BookIcon,
  LiveIcon,
  RouteIcon,
  SettingsIcon,
} from './EnVivoIcons.jsx'
import useAlerts from '../hooks/useAlerts.js'
import './AdminBottomNav.css'

const navigationItems = [
  { to: '/admin/live', label: 'En Vivo', Icon: LiveIcon },
  { to: '/admin/alertas', label: 'Alertas', Icon: BellIcon, showBadge: true },
  { to: '/admin/rutas', label: 'Rutas', Icon: RouteIcon },
  { to: '/admin/bitacora', label: 'Bitácora', Icon: BookIcon },
  { to: '/admin/ajustes', label: 'Ajustes', Icon: SettingsIcon },
]

function AdminBottomNav({ pendingAlerts = null, activePath = null }) {
  const { pendingAlertsCount } = useAlerts('admin')
  const displayAlerts = pendingAlerts !== null ? pendingAlerts : pendingAlertsCount

  return (
    <nav className="admin-bottom-nav" aria-label="Navegación de administrador">
      {navigationItems.map(({ to, label, Icon, showBadge }) => {
        return (
          <NavLink
            key={to}
            className={({ isActive }) =>
              `admin-nav-link${(activePath !== null ? activePath === to : isActive) ? ' is-active' : ''}`
            }
            to={to}
            end={to === '/admin/live'}
          >
            <span className="admin-nav-icon">
              <Icon />
              {showBadge && displayAlerts > 0 && (
                <span className="admin-nav-badge" aria-label={`${displayAlerts} alertas pendientes`}>
                  {displayAlerts}
                </span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default AdminBottomNav
