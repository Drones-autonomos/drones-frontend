import { NavLink } from 'react-router-dom'
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
  { to: '/guardia/live', label: 'En Vivo', Icon: LiveIcon },
  { to: '/guardia/alertas', label: 'Alertas', Icon: BellIcon, showBadge: true },
  { to: '/guardia/rutas', label: 'Rutas', Icon: RouteIcon },
  { to: '/guardia/bitacora', label: 'Bitácora', Icon: BookIcon },
  { to: '/guardia/ajustes', label: 'Ajustes', Icon: SettingsIcon },
]

function GuardiaBottomNav({ pendingAlerts = null, activePath = null }) {
  const { pendingAlertsCount } = useAlerts('guard')
  const displayAlerts = pendingAlerts !== null ? pendingAlerts : pendingAlertsCount

  return (
    <nav className="guardia-bottom-nav" aria-label="Navegación de guardia de seguridad">
      {guardNavigationItems.map(({ to, label, Icon, showBadge }) => {
        return (
          <NavLink
            key={to}
            className={({ isActive }) =>
              `guardia-nav-link${(activePath !== null ? activePath === to : isActive) ? ' is-active' : ''}`
            }
            to={to}
            end={to === '/guardia/live'}
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
