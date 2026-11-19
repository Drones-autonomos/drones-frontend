import { NavLink, useLocation } from 'react-router-dom'
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
  { to: '/admin/en-vivo', label: 'En Vivo', Icon: LiveIcon, aliases: ['/admin/live'] },
  { to: '/admin/alertas', label: 'Alertas', Icon: BellIcon, showBadge: true },
  { to: '/admin/rutas', label: 'Rutas', Icon: RouteIcon },
  { to: '/admin/bitacora', label: 'Bitácora', Icon: BookIcon },
  { to: '/admin/ajustes', label: 'Ajustes', Icon: SettingsIcon },
]

function AdminBottomNav({ pendingAlerts = null, activePath = null }) {
  const { pendingAlertsCount } = useAlerts('admin')
  const location = useLocation()
  const displayAlerts = pendingAlerts !== null ? pendingAlerts : pendingAlertsCount
  const currentPath = activePath !== null ? activePath : location.pathname

  return (
    <nav className="admin-bottom-nav" aria-label="Navegación de administrador">
      {navigationItems.map(({ to, label, Icon, showBadge, aliases = [] }) => {
        const isItemActive = currentPath === to || aliases.includes(currentPath)
        return (
          <NavLink
            key={to}
            className={`admin-nav-link${isItemActive ? ' is-active' : ''}`}
            to={to}
            end={to === '/admin/en-vivo'}
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
