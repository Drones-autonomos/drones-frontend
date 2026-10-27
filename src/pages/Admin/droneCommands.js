function reportDisconnectedCommand(commandName) {
  throw new Error(
    `No se envió el comando "${commandName}": el control del dron todavía no está conectado.`,
  )
}

export async function requestPauseFlight() {
  reportDisconnectedCommand('pausar vuelo')
}

export async function requestReturnToBase() {
  reportDisconnectedCommand('volver a base')
}

export async function requestEmergencyStop() {
  reportDisconnectedCommand('parada inmediata')
}
