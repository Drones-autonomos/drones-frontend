/**
 * Servicio de Asistencia de Video y Descarga para la Bitácora de AeroLuferan.
 * Cuando el vuelo tiene una grabación real en el backend (`video.recordingId`),
 * reproduce/descarga el MP4 descifrado vía /recordings/{id}/stream|download.
 * En su defecto, conserva la generación de streams de demostración locales.
 */

import {
  downloadRecordingFile,
  getRecordingPlaybackUrl,
} from '../../services/flightLogService.js'

// Cache de blobs generados por identificador de vuelo para rendimiento óptimo
const videoBlobCache = new Map()

/**
 * Genera un Blob de video WebM/MP4 ligero en el navegador simulando la captura de cámara del dron
 * con HUD de telemetría superpuesto en tiempo real.
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
  if (flight.videoUrl && flight.videoUrl.trim() !== '') {
    return flight.videoUrl
  }

  // Si ya tenemos el blob en cache para este vuelo
  if (videoBlobCache.has(flight.id)) {
    return videoBlobCache.get(flight.id)
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    const ctx = canvas.getContext('2d')

    if (!canvas.captureStream || typeof MediaRecorder === 'undefined') {
      // Fallback para entornos donde MediaRecorder no esté disponible
      return null
    }

    const stream = canvas.captureStream(24) // 24 fps
    let mimeType = 'video/webm'
    if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4'
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9'
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8'
    }

    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks = []

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    const recordPromise = new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        const url = URL.createObjectURL(blob)
        videoBlobCache.set(flight.id, url)
        resolve(url)
      }
    })

    recorder.start()

    // Renderizar animación breve de 48 frames (2 segundos de loop de patrullaje)
    const isVespertino = flight.missionName.toLowerCase().includes('vespertino')
    const totalFrames = 48
    let currentFrame = 0

    function drawFrame() {
      // Cielo
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 360)
      if (isVespertino) {
        skyGrad.addColorStop(0, '#37474F')
        skyGrad.addColorStop(0.6, '#546E7A')
        skyGrad.addColorStop(1, '#CFD8DC')
      } else {
        skyGrad.addColorStop(0, '#1E88E5')
        skyGrad.addColorStop(0.6, '#64B5F6')
        skyGrad.addColorStop(1, '#E3F2FD')
      }
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, 640, 360)

      // Suelo / Césped en movimiento
      const groundGrad = ctx.createLinearGradient(0, 160, 0, 360)
      if (isVespertino) {
        groundGrad.addColorStop(0, '#556B2F')
        groundGrad.addColorStop(1, '#283618')
      } else {
        groundGrad.addColorStop(0, '#7CB342')
        groundGrad.addColorStop(1, '#33691E')
      }
      ctx.fillStyle = groundGrad
      ctx.beginPath()
      ctx.moveTo(0, 160)
      ctx.quadraticCurveTo(320, 140 + Math.sin(currentFrame * 0.1) * 5, 640, 170)
      ctx.lineTo(640, 360)
      ctx.lineTo(0, 360)
      ctx.closePath()
      ctx.fill()

      // Edificio en perspectiva
      ctx.fillStyle = isVespertino ? '#BDB19B' : '#EFEBE9'
      ctx.fillRect(160 + Math.sin(currentFrame * 0.05) * 8, 110, 320, 110)
      ctx.strokeStyle = '#795548'
      ctx.lineWidth = 1.5
      ctx.strokeRect(160 + Math.sin(currentFrame * 0.05) * 8, 110, 320, 110)

      // HUD de telemetría del dron
      ctx.strokeStyle = '#00E5FF'
      ctx.lineWidth = 1.5

      // Retícula central (Crosshair)
      const cx = 320
      const cy = 180
      ctx.beginPath()
      ctx.arc(cx, cy, 32, 0, Math.PI * 2)
      ctx.moveTo(cx - 45, cy)
      ctx.lineTo(cx - 20, cy)
      ctx.moveTo(cx + 20, cy)
      ctx.lineTo(cx + 45, cy)
      ctx.moveTo(cx, cy - 45)
      ctx.lineTo(cx, cy - 20)
      ctx.moveTo(cx, cy + 20)
      ctx.lineTo(cx, cy + 45)
      ctx.stroke()

      // Texto HUD superior
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '12px "Inter", sans-serif'
      ctx.fillText(`REC [HD 1080p 60FPS] · ${flight.video.title}`, 24, 28)
      ctx.fillText(`VUELO: #${flight.flightNumber} · ${flight.missionName}`, 24, 46)

      // Telemetría HUD inferior
      ctx.fillStyle = '#00E5FF'
      ctx.fillText(`${flight.telemetry.altitude} | ${flight.telemetry.wind} | BATT: ${flight.telemetry.battery}`, 24, 340)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(`GPS 3D FIX: 20.7032°N, 100.4435°W`, 410, 340)

      currentFrame++
      if (currentFrame < totalFrames) {
        requestAnimationFrame(drawFrame)
      } else {
        recorder.stop()
      }
    }

    drawFrame()
    return await recordPromise
  } catch (error) {
    console.warn('No se pudo generar stream de video interactivo:', error)
    return null
  }
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
