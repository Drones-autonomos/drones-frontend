/**
 * Servicio de Asistencia de Video y Descarga para la Bitácora de AeroLuferan.
 * Solo grabaciones reales: cuando el vuelo tiene `video.recordingId` en el
 * backend, reproduce/descarga el MP4 descifrado vía
 * /recordings/{id}/stream|download. Sin grabación real → null (la UI muestra
 * "Grabación no disponible"); no se sintetizan videos de demostración.
 */

import {
  downloadRecordingFile,
  getRecordingPlaybackUrl,
} from '../../services/flightLogService.js'

/**
 * Devuelve la URL reproducible de la grabación del vuelo, o null si el
 * backend no tiene video para ese vuelo.
 */
export async function getOrCreateFlightVideoUrl(flight) {
  // Grabación real almacenada en el backend (cifrada en reposo, descifrada al servirla)
  if (flight?.video?.recordingId) {
    try {
      return await getRecordingPlaybackUrl(flight)
    } catch (error) {
      console.warn('No se pudo obtener la grabación del backend:', error?.message)
      return null
    }
  }

  // Si el vuelo ya cuenta con una URL externa proporcionada por el backend, utilizarla
  if (flight?.videoUrl && flight.videoUrl.trim() !== '') {
    return flight.videoUrl
  }

  return null
}

/**
 * Descarga el archivo de video de la grabación seleccionada
 */
export async function downloadFlightRecording(flight, retentionStatus) {
  // Grabación real en el backend: descarga autenticada (solo ADMIN según la API)
  if (flight?.video?.recordingId) {
    return await downloadRecordingFile(flight)
  }

  // Verificación de expiración (Regla 14)
  if (retentionStatus.isExpired) {
    return {
      success: false,
      reason: 'expired',
      message: 'La grabación ha expirado tras superar los 30 días reglamentarios de retención.',
    }
  }

  // Generar nombre de archivo identificable y limpio
  const cleanMissionName = flight.missionName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `AeroLuferan_Vuelo_${flight.flightNumber}_${cleanMissionName}.mp4`

  try {
    const videoUrl = await getOrCreateFlightVideoUrl(flight)

    if (videoUrl) {
      const a = document.createElement('a')
      a.href = videoUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return {
        success: true,
        filename,
        message: `Iniciando descarga: ${filename}`,
      }
    }

    // Fallback: Descarga de archivo de metadatos del vuelo si no hay stream binario
    const flightReport = {
      sistema: 'AeroLuferan - Módulo Bitácora',
      vueloId: flight.id,
      vueloNumero: flight.flightNumber,
      mision: flight.missionName,
      operador: flight.operator,
      horario: flight.dateDisplay,
      telemetria: flight.telemetry,
      incidentes: flight.incidents,
      integridadCriptografica: flight.integrity,
      retencionDiasRestantes: retentionStatus.daysRemaining,
      aviso: 'Grabación de video disponible mediante el servicio de almacenamiento del backend.',
    }

    const dataBlob = new Blob([JSON.stringify(flightReport, null, 2)], {
      type: 'application/json',
    })
    const jsonUrl = URL.createObjectURL(dataBlob)
    const jsonLink = document.createElement('a')
    jsonLink.href = jsonUrl
    jsonLink.download = `AeroLuferan_Vuelo_${flight.flightNumber}_Registro.json`
    document.body.appendChild(jsonLink)
    jsonLink.click()
    document.body.removeChild(jsonLink)

    return {
      success: true,
      filename: `AeroLuferan_Vuelo_${flight.flightNumber}_Registro.json`,
      message: `Descargando registro histórico del Vuelo #${flight.flightNumber}`,
    }
  } catch (error) {
    console.error('Error al descargar grabación:', error)
    return {
      success: false,
      reason: 'error',
      message: 'Ocurrió un error al preparar la descarga del archivo.',
    }
  }
}
