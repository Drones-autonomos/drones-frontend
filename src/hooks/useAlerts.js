import { useEffect, useState } from 'react'
import {
  dismissAlert,
  dispatchGuard,
  getPendingAlertsCount,
  getVisibleAlerts,
  markAlertAsViewed,
  markAllAlertsAsViewed,
  resetAlertsDemo,
  subscribeAlerts,
} from '../services/alertService.js'

export function useAlerts(role = 'guard') {
  const [pendingCount, setPendingCount] = useState(() => getPendingAlertsCount(role))
  const [alerts, setAlerts] = useState(() => getVisibleAlerts(role))

  useEffect(() => {
    const unsubscribe = subscribeAlerts((count) => {
      setPendingCount(count)
      setAlerts(getVisibleAlerts(role))
    }, role)
    return unsubscribe
  }, [role])

  return {
    pendingAlertsCount: pendingCount,
    alerts,
    markAsViewed: (alertId) => markAlertAsViewed(alertId, role),
    markAllAsViewed: () => markAllAlertsAsViewed(role),
    dismissAlert: (alertId) => dismissAlert(alertId, role),
    dispatchGuard: (alertId) => dispatchGuard(alertId, role),
    resetDemo: () => resetAlertsDemo(),
  }
}

export default useAlerts
