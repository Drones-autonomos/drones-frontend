import { droneControlService } from '../../services/droneControlService.js'

export async function requestPauseFlight() {
  return await droneControlService.pauseFlight()
}

export async function requestResumeFlight() {
  return await droneControlService.resumeFlight()
}

export async function requestReturnToBase(heliportId) {
  return await droneControlService.returnToBase(heliportId)
}

export async function requestEmergencyStop() {
  return await droneControlService.emergencyStop()
}
