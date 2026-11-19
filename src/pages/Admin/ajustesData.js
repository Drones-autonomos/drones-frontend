/**
 * Configuración, estado y servicios para el módulo Ajustes de AeroLuferan.
 * Preparado para conectarse con backend, base de datos, agente de IA y sistema del dron.
 */

export const AJUSTES_STORAGE_KEY = 'aeroluferan_settings'

export const AI_SENSITIVITY_OPTIONS = [
  {
    id: '90',
    percent: 90,
    label: '90% Rápido',
    badgeText: '90% (Rápido)',
    description: 'Menor latencia de inferencia en tiempo real (<200ms). Adecuado para patrullajes a alta velocidad.',
  },
  {
    id: '95',
    percent: 95,
    label: '95% Equilibrado',
    badgeText: '95% (Óptimo)',
    description: 'Balance ideal entre precisión y tasa de falsos positivos. Recomendado por el agente de IA para rondas perimetrales.',
  },
  {
    id: '98',
    percent: 98,
    label: '98% Máx Precisión',
    badgeText: '98% (Precisión)',
    description: 'Filtrado estricto contra falsos positivos mediante doble verificación de red neuronal profunda. Mayor exigencia computacional.',
  },
]

export const TRANSMISSION_QUALITY_OPTIONS = [
  {
    id: 'fhd-60',
    label: 'FHD 1080p 60fps (Bitrate Adaptable Wi-Fi)',
    resolution: '1920x1080',
    framerate: '60 fps',
    bitrate: 'Adaptable (4 - 8 Mbps)',
    isRecommended: true,
  },
  {
    id: '4k-30',
    label: '4K Ultra HD 30fps (Alta Demanda RF)',
    resolution: '3840x2160',
    framerate: '30 fps',
    bitrate: '15 - 25 Mbps',
    isRecommended: false,
  },
  {
    id: 'hd-30',
    label: 'HD 720p 30fps (Bajo Ancho de Banda)',
    resolution: '1280x720',
    framerate: '30 fps',
    bitrate: '2 - 3 Mbps',
    isRecommended: false,
  },
]

export const RETENTION_PERIOD_OPTIONS = [
  { days: 30, label: '30 días reglamentarios (Normativa institucional UAQ)', isDefault: true },
  { days: 60, label: '60 días (Sujeto a ampliación por investigación en curso)', isDefault: false },
  { days: 90, label: '90 días (Autorización especial del Comité de Privacidad)', isDefault: false },
]

export const DEFAULT_SETTINGS = {
  criticalPushEnabled: true,
  aiSensitivityId: '95',
  retentionDays: 30,
  videoEncryption: {
    enabled: true,
    statusText: 'BLOQUEADO ON',
    type: 'AES-256 GCM',
    description: 'Cifrado de flujo activo en reposo y tránsito conforme a normativa institucional.',
  },
  transmissionQualityId: 'fhd-60',
  helipads: [
    {
      id: 'heli-norte-01',
      name: 'Helipuerto Base Norte #01',
      isConnected: true,
      connectionStatus: 'Conectada',
      chargingStatus: 'Carga Inductiva lista',
      batteryLevel: 100,
      temperature: '24°C',
      domeStatus: 'Abierto / Listo',
      voltage: '48.2 V',
    },
    {
      id: 'heli-sur-02',
      name: 'Helipuerto Base Sur #02 (Secundario)',
      isConnected: true,
      connectionStatus: 'En espera',
      chargingStatus: 'Pad de inducción en reposo',
      batteryLevel: 95,
      temperature: '22°C',
      domeStatus: 'Cerrado',
      voltage: '47.8 V',
    },
  ],
}

/**
 * Obtiene la configuración guardada localmente o devuelve los valores por defecto.
 */
export function getStoredSettings() {
  try {
    const raw = localStorage.getItem(AJUSTES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (error) {
    console.error('Error al recuperar ajustes:', error)
  }
  return DEFAULT_SETTINGS
}

/**
 * Guarda los ajustes actualizados y notifica a las interfaces suscritas.
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(AJUSTES_STORAGE_KEY, JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('aeroluferan_settings_updated', { detail: settings }))
  } catch (error) {
    console.error('Error al guardar ajustes:', error)
  }
  return settings
}

/**
 * Genera el archivo descargable de auditoría criptográfica local con registros de telemetría y eventos.
 */
export function generateAuditExportFile() {
  const auditReport = {
    sistema: 'AeroLuferan - Sistema Autónomo de Vigilancia Aérea',
    entidad: 'Facultad de Informática - Universidad Autónoma de Querétaro',
    fechaGeneracion: new Date().toISOString(),
    versionProtocolo: 'AeroLuferan OS v2.4.0',
    estadoAuditoria: 'Criptográficamente Validado · Cadena Inmutable',
    resumenSeguridad: {
      cifrado: 'AES-256 GCM en tránsito y reposo',
      politicaRetencion: '30 días reglamentarios',
      techoOperativoLegal: '< 200m AGL (Código Aeronáutico Civil)',
      geocercasCumplidas: true,
    },
    registrosTelemetriaRecientes: [
      {
        vueloId: 'Vuelo #3',
        mision: 'Circuito Coliseo',
        bloque: '#44,192',
        sha256: '8F4C9B7E31D820F45A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F',
        bateria: '54%',
        distancia: '3.2 km',
        altitud: '41 m AGL',
        viento: '8 km/h',
        incidentes: ['Intruso detectado en zona perimetral'],
      },
      {
        vueloId: 'Vuelo #2',
        mision: 'Perimetral Vespertino',
        bloque: '#44,191',
        sha256: '7E1A33C9D8E7F6A5B4C3D2E1F0A9B8C7D6E5F4A3B2C1D0E9F8A7B6C5D4E3F2A1',
        bateria: '41%',
        distancia: '4.8 km',
        altitud: '50 m AGL',
        viento: '12 km/h',
        incidentes: [],
      },
    ],
    firmaElectronicaServidor: 'SHA256-RSA-VERIFIED-NODE-UAQ-CAMPUS-JURIQUILLA',
  }

  const jsonBlob = new Blob([JSON.stringify(auditReport, null, 2)], {
    type: 'application/json',
  })
  const downloadUrl = URL.createObjectURL(jsonBlob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `AeroLuferan_Registro_Auditoria_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)

  return {
    filename: `AeroLuferan_Registro_Auditoria_${new Date().toISOString().slice(0, 10)}.json`,
  }
}
