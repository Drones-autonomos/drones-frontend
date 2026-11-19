import { useEffect, useState } from 'react'
import {
  getTelemetryData,
  subscribeTelemetry,
  updateSignalPercentage,
  updateTelemetryData,
} from '../services/telemetryService.js'

export function useDroneTelemetry() {
  const [telemetry, setTelemetry] = useState(getTelemetryData)

  useEffect(() => {
    const unsubscribe = subscribeTelemetry((newData) => {
      setTelemetry({ ...newData })
    })
    return unsubscribe
  }, [])

  return {
    ...telemetry,
    updateTelemetry: updateTelemetryData,
    setSignal: updateSignalPercentage,
  }
}

export default useDroneTelemetry
