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

export async function requestSetFailsafe(enabled) {
  return await droneControlService.configureFailsafe(enabled)
}

export async function requestArmFailsafe() {
  return await requestSetFailsafe(true)
}

export async function requestPreflightCheck() {
  return await droneControlService.preflightCheck()
}

export async function requestFailsafeStatus() {
  return await droneControlService.getFailsafeStatus()
}

export async function requestDisconnect() {
  return await droneControlService.disconnect()
}

export async function requestChargingBases() {
  return await droneControlService.listChargingBases()
}
