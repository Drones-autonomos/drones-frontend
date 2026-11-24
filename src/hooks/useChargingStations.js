import { useCallback, useEffect, useState } from 'react'
import { droneControlService } from '../services/droneControlService.js'

/**
 * Carga las estaciones de carga/helipuertos del campus
 * (GET /drone/charging-bases a través de droneControlService).
 *
 * Expone `error` normalizado (ApiError) para que la UI muestre
 * placeholders honestos en lugar de inventar estaciones.
 */
export function useChargingStations() {
  const [stations, setStations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true
    const run = async () => {
      try {
        const list = await droneControlService.listChargingBases()
        if (!isMounted) return
        setStations(Array.isArray(list) ? list : [])
        setError(null)
      } catch (err) {
        if (!isMounted) return
        setStations([])
        setError(err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    // Carga inicial diferida: la regla react-hooks/set-state-in-effect
    // prohíbe setState síncrono dentro de useEffect.
    const timer = window.setTimeout(run, 0)
    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [reloadKey])

  const reload = useCallback(() => {
    setIsLoading(true)
    setReloadKey((key) => key + 1)
  }, [])

  return { stations, isLoading, error, reload }
}

export default useChargingStations
