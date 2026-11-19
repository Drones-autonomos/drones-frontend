import { useEffect, useState } from 'react'
import {
  getAllAlerts,
  getPendingAlertsCount,
  subscribeAlerts,
} from '../services/alertService.js'

export function useAlerts() {
  const [pendingCount, setPendingCount] = useState(getPendingAlertsCount)
  const [alerts, setAlerts] = useState(getAllAlerts)

  useEffect(() => {
    const unsubscribe = subscribeAlerts((count, currentAlerts) => {
      setPendingCount(count)
      setAlerts([...currentAlerts])
    })
    return unsubscribe
  }, [])

  return {
    pendingAlertsCount: pendingCount,
    alerts,
  }
}

export default useAlerts
