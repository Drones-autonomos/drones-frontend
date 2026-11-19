import { getTelemetryData } from '../../services/telemetryService.js'

const telemetryState = getTelemetryData()

export const enVivoDemoData = {
  drone: {
    name: telemetryState.drone.name,
    model: telemetryState.drone.model,
    patrolStatus: telemetryState.drone.patrolStatus,
    signal: `${telemetryState.drone.signalPercentage}% Señal`,
  },
  flight: {
    route: telemetryState.flight.route,
    milestone: telemetryState.flight.milestone,
    totalMilestones: telemetryState.flight.totalMilestones,
  },
  preview: telemetryState.preview,
  telemetry: telemetryState.cards,
  quickActions: {
    mode: telemetryState.flight.mode,
  },
  heliport: telemetryState.heliport,
  pendingAlerts: 0,
}

export default enVivoDemoData
