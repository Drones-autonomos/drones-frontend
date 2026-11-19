import { NavLink, useLocation } from 'react-router-dom'
import {
  BellIcon,
  BookIcon,
  LiveIcon,
  RouteIcon,
  SettingsIcon,
} from './EnVivoIcons.jsx'
import useAlerts from '../hooks/useAlerts.js'
import './GuardiaBottomNav.css'

const guardNavigationItems = [
  { to: '/guardia/en-vivo', label: 'En Vivo', Icon: LiveIcon, aliases: ['/guardia/live', '/guardia/envivo'] },
  { to: '/guardia/alertas', label: 'Alertas', Icon: BellIcon, showBadge: true },
  { to: '/guardia/rutas', label: 'Rutas', Icon: RouteIcon },
  { to: '/guardia/bitacora', label: 'Bitácora', Icon: BookIcon },
  { to: '/guardia/ajustes', label: 'Ajustes', Icon: SettingsIcon },
]

function GuardiaBottomNav({ pendingAlerts = null, activePath = null }) {
  const { pendingAlertsCount } = useAlerts('guard')
  const location = useLocation()
  const displayAlerts = pendingAlerts !== null ? pendingAlerts : pendingAlertsCount
  const currentPath = activePath !== null ? activePath : location.pathname

  return (
    <nav className="guardia-bottom-nav" aria-label="Navegación de guardia de seguridad">
      {guardNavigationItems.map(({ to, label, Icon, showBadge, aliases = [] }) => {
        const isItemActive = currentPath === to || aliases.includes(currentPath)
        return (
          <NavLink
            key={to}
            className={`guardia-nav-link${isItemActive ? ' is-active' : ''}`}
            to={to}
            end={to === '/guardia/en-vivo'}
          >
            <span className="guardia-nav-icon">
              <Icon />
              {showBadge && displayAlerts > 0 && (
                <span className="guardia-nav-badge" aria-label={`${displayAlerts} alertas pendientes`}>
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

export default GuardiaBottomNav
