/**
 * Datos y servicios de la Bitácora de Vuelos de AeroLuferan.
 * Estructurado para conectarse con backend, base de datos, agente de IA y sistema del dron.
 */

import campusColiseo from '../../assets/campus-coliseo.svg'
import campusVespertino from '../../assets/campus-vespertino.svg'
import campusReference from '../../assets/campus-reference.svg'

export const BITACORA_STORAGE_KEY = 'aeroluferan_bitacora_flights'
export const MAX_RETENTION_DAYS = 30

/**
 * Calcula dinámicamente los días restantes de retención de una grabación según su fecha de almacenamiento.
 * Regla 14: Las grabaciones solamente están disponibles durante 30 días.
 */
export function calculateRetention(storedAt, retentionDays = MAX_RETENTION_DAYS) {
  const storedDate = new Date(storedAt)
  const now = new Date()
  const diffMs = now.getTime() - storedDate.getTime()
  const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const daysRemaining = retentionDays - elapsedDays

  if (daysRemaining <= 0) {
    return {
      isExpired: true,
      daysRemaining: 0,
      label: 'Grabación expirada',
      statusType: 'expired',
      description: 'El video ha superado el periodo de retención de 30 días.',
    }
  }

  if (daysRemaining === 1) {
    return {
      isExpired: false,
      daysRemaining: 1,
      label: 'Último día',
      statusType: 'critical',
      description: 'La grabación expirará hoy a la medianoche.',
    }
  }

  if (daysRemaining <= 3) {
    return {
      isExpired: false,
      daysRemaining,
      label: `${daysRemaining} días restantes`,
      statusType: 'warning',
      description: `Quedan ${daysRemaining} días antes del vencimiento del video.`,
    }
  }

  return {
    isExpired: false,
    daysRemaining,
    label: `${daysRemaining} días restantes`,
    statusType: 'normal',
    description: `Grabación respaldada durante ${daysRemaining} días más.`,
  }
}

/**
 * Registros históricos iniciales fieles a la captura de Figma
 */
export const initialFlightRecords = [
  // =========================================================================
  // Vuelo #3: Circuito Coliseo (Tarjeta principal superior en Figma)
  // =========================================================================
  {
    id: 'flight-03',
    flightNumber: 3,
    flightNumberLabel: 'Vuelo',
    flightCode: '#3',
    missionId: 'm-coliseo',
    missionName: 'Circuito Coliseo',
    zone: 'Circuito Coliseo',
    circuitLabel: '· Circuito Coliseo',
    operator: {
      name: 'NombreGuardia',
      role: 'Guardia Supervisor',
      isAutonomous: false,
      displayText: 'Operador: NombreGuardia (Guardia Supervisor)',
    },
    // Fecha y horario exacto de Figma: "Hoy, 14:20 - 14:55 · 35 min de vuelo"
    flightDate: '2026-11-17',
    timeStart: '14:20',
    timeEnd: '14:55',
    durationMinutes: 35,
    dateDisplay: 'Hoy, 14:20 - 14:55 · 35 min de vuelo',
    // Almacenado hoy -> 30 días restantes
    storedAt: '2026-11-17T14:55:00',
    video: {
      title: 'Video HD Grabado · 35 min',
      resolution: '1080p 60fps',
      durationSeconds: 2100,
      videoUrl: '', // Preparado para backend
      poster: campusColiseo,
      quality: 'HD',
    },
    telemetry: {
      battery: '54% Batería',
      batteryNumeric: 54,
      distance: '3.2 km',
      distanceKm: 3.2,
      altitude: 'Alt: 41 m',
      altitudeMeters: 41,
      wind: 'Viento: 8 km/h',
      windSpeedKmH: 8,
    },
    // Alertas e incidentes detectados: 1 Incidencia (Intruso)
    incidents: [
      {
        id: 'inc-03-01',
        type: 'intruso',
        typeLabel: 'Intruso',
        severity: 'medium',
        location: 'Perímetro Coliseo Poniente',
        timestamp: '14:38',
        aiConfidence: '94.0%',
        description: 'Persona no autorizada detectada transitando en zona de acceso restringido.',
      },
    ],
    incidentBadge: {
      hasIncidents: true,
      count: 1,
      textLine1: '1 Incidencia',
      textLine2: '(Intruso)',
      type: 'danger',
    },
    integrity: {
      hash: '#8F4C9B... Inmutable',
      shortHash: '#8F4C9B...',
      fullHash: '8F4C9B7E31D820F45A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F',
      blockNumber: 'Bloque #44,192',
      isImmutable: true,
      timestamp: '2026-11-17T14:55:02',
      isSimulated: true,
    },
    buttonVariant: 'solid', // Botón azul oscuro en Figma
  },

  // =========================================================================
  // Vuelo #2: Perimetral Vespertino (Tarjeta inferior en Figma)
  // =========================================================================
  {
    id: 'flight-02',
    flightNumber: 2,
    flightNumberLabel: 'Vuelo',
    flightCode: '#2',
    missionId: 'm-vespertino',
    missionName: 'Perimetral Vespertino',
    zone: 'Perímetro Total',
    circuitLabel: '· Perimetral Vespertino',
    operator: {
      name: 'Agente IA Autónomo',
      role: 'Autónomo IA',
      isAutonomous: true,
      authorizedBy: 'NombreAdministrador (Admin. académico)',
      displayText: 'Operación: Autónomo IA',
    },
    // Fecha y horario de Figma: "Ayer, 22:00 - 22:42 · 42 min de vuelo"
    flightDate: '2026-11-16',
    timeStart: '22:00',
    timeEnd: '22:42',
    durationMinutes: 42,
    dateDisplay: 'Ayer, 22:00 - 22:42 · 42 min de vuelo',
    // Almacenado ayer -> 29 días restantes
    storedAt: '2026-11-16T22:42:00',
    video: {
      title: 'Video HD Grabado · 42 min',
      resolution: '1080p 60fps',
      durationSeconds: 2520,
      videoUrl: '',
      poster: campusVespertino,
      quality: 'HD',
    },
    telemetry: {
      battery: '41% Batería',
      batteryNumeric: 41,
      distance: '4.8 km',
      distanceKm: 4.8,
      altitude: 'Alt: 50 m',
      altitudeMeters: 50,
      wind: 'Viento: 12 km/h',
      windSpeedKmH: 12,
    },
    // Sin incidentes: "0 Incidentes · Despejado"
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#7E1A33... Inmutable',
      shortHash: '#7E1A33...',
      fullHash: '7E1A33C9D8E7F6A5B4C3D2E1F0A9B8C7D6E5F4A3B2C1D0E9F8A7B6C5D4E3F2A1',
      blockNumber: 'Bloque #44,191',
      isImmutable: true,
      timestamp: '2026-11-16T22:42:05',
      isSimulated: true,
    },
    buttonVariant: 'soft', // Botón azul lavanda suave en Figma
  },

  // =========================================================================
  // Vuelos históricos adicionales para completar el total de 12 vuelos
  // y demostrar casos de uso como retención expirada y búsqueda por fecha
  // =========================================================================
  {
    id: 'flight-01',
    flightNumber: 1,
    flightNumberLabel: 'Vuelo',
    flightCode: '#1',
    missionId: 'm-matutino',
    missionName: 'Circuito Matutino',
    zone: 'Zona Norte',
    circuitLabel: '· Circuito Matutino',
    operator: {
      name: 'NombreGuardia',
      role: 'Guardia Supervisor',
      isAutonomous: false,
      displayText: 'Operador: NombreGuardia (Guardia Supervisor)',
    },
    flightDate: '2026-10-15', // Fecha antigua (> 30 días) para probar retención expirada (Regla 14)
    timeStart: '07:00',
    timeEnd: '07:35',
    durationMinutes: 35,
    dateDisplay: '15/10/2026, 07:00 - 07:35 · 35 min de vuelo',
    storedAt: '2026-10-15T07:35:00', // Expirado (> 30 días)
    video: {
      title: 'Video HD Grabado · 35 min',
      resolution: '1080p 60fps',
      durationSeconds: 2100,
      videoUrl: '',
      poster: campusReference,
      quality: 'HD',
    },
    telemetry: {
      battery: '68% Batería',
      batteryNumeric: 68,
      distance: '3.0 km',
      distanceKm: 3.0,
      altitude: 'Alt: 40 m',
      altitudeMeters: 40,
      wind: 'Viento: 7 km/h',
      windSpeedKmH: 7,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#6B3C18... Inmutable',
      shortHash: '#6B3C18...',
      fullHash: '6B3C18F0E9D8C7B6A5F4E3D2C1B0A9F8E7D6C5B4A3F2E1D0C9B8A7F6E5D4C3B2',
      blockNumber: 'Bloque #44,190',
      isImmutable: true,
      timestamp: '2026-10-15T07:35:03',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },

  {
    id: 'flight-04',
    flightNumber: 4,
    flightNumberLabel: 'Vuelo',
    flightCode: '#4',
    missionId: 'm-arcotecho',
    missionName: 'Ronda Deportiva Arcotecho',
    zone: 'Arcotecho',
    circuitLabel: '· Arcotecho',
    operator: {
      name: 'Agente IA Autónomo',
      role: 'Autónomo IA',
      isAutonomous: true,
      authorizedBy: 'NombreAdministrador (Admin. académico)',
      displayText: 'Operación: Autónomo IA',
    },
    flightDate: '2026-11-15',
    timeStart: '18:10',
    timeEnd: '18:40',
    durationMinutes: 30,
    dateDisplay: '15/11/2026, 18:10 - 18:40 · 30 min de vuelo',
    storedAt: '2026-11-15T18:40:00',
    video: {
      title: 'Video HD Grabado · 30 min',
      resolution: '1080p 60fps',
      durationSeconds: 1800,
      videoUrl: '',
      poster: campusReference,
      quality: 'HD',
    },
    telemetry: {
      battery: '58% Batería',
      batteryNumeric: 58,
      distance: '2.8 km',
      distanceKm: 2.8,
      altitude: 'Alt: 38 m',
      altitudeMeters: 38,
      wind: 'Viento: 9 km/h',
      windSpeedKmH: 9,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#9D2E44... Inmutable',
      shortHash: '#9D2E44...',
      fullHash: '9D2E44A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9',
      blockNumber: 'Bloque #44,189',
      isImmutable: true,
      timestamp: '2026-11-15T18:40:02',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },

  {
    id: 'flight-05',
    flightNumber: 5,
    flightNumberLabel: 'Vuelo',
    flightCode: '#5',
    missionId: 'm-estacionamiento',
    missionName: 'Inspección Estacionamiento Poniente',
    zone: 'Estacionamiento Poniente',
    circuitLabel: '· Estacionamiento Poniente',
    operator: {
      name: 'NombreGuardia',
      role: 'Guardia Supervisor',
      isAutonomous: false,
      displayText: 'Operador: NombreGuardia (Guardia Supervisor)',
    },
    flightDate: '2026-11-14',
    timeStart: '21:00',
    timeEnd: '21:35',
    durationMinutes: 35,
    dateDisplay: '14/11/2026, 21:00 - 21:35 · 35 min de vuelo',
    storedAt: '2026-11-14T21:35:00',
    video: {
      title: 'Video HD Grabado · 35 min',
      resolution: '1080p 60fps',
      durationSeconds: 2100,
      videoUrl: '',
      poster: campusReference,
      quality: 'HD',
    },
    telemetry: {
      battery: '49% Batería',
      batteryNumeric: 49,
      distance: '3.5 km',
      distanceKm: 3.5,
      altitude: 'Alt: 44 m',
      altitudeMeters: 44,
      wind: 'Viento: 11 km/h',
      windSpeedKmH: 11,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#3F7A19... Inmutable',
      shortHash: '#3F7A19...',
      fullHash: '3F7A19B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0',
      blockNumber: 'Bloque #44,188',
      isImmutable: true,
      timestamp: '2026-11-14T21:35:04',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },

  {
    id: 'flight-06',
    flightNumber: 6,
    flightNumberLabel: 'Vuelo',
    flightCode: '#6',
    missionId: 'm-laboratorios',
    missionName: 'Monitoreo Perímetro Laboratorios',
    zone: 'Laboratorios',
    circuitLabel: '· Laboratorios',
    operator: {
      name: 'Agente IA Autónomo',
      role: 'Autónomo IA',
      isAutonomous: true,
      authorizedBy: 'NombreAdministrador (Admin. académico)',
      displayText: 'Operación: Autónomo IA',
    },
    flightDate: '2026-11-13',
    timeStart: '12:00',
    timeEnd: '12:30',
    durationMinutes: 30,
    dateDisplay: '13/11/2026, 12:00 - 12:30 · 30 min de vuelo',
    storedAt: '2026-11-13T12:30:00',
    video: {
      title: 'Video HD Grabado · 30 min',
      resolution: '1080p 60fps',
      durationSeconds: 1800,
      videoUrl: '',
      poster: campusReference,
      quality: 'HD',
    },
    telemetry: {
      battery: '64% Batería',
      batteryNumeric: 64,
      distance: '2.5 km',
      distanceKm: 2.5,
      altitude: 'Alt: 36 m',
      altitudeMeters: 36,
      wind: 'Viento: 5 km/h',
      windSpeedKmH: 5,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#1E8C92... Inmutable',
      shortHash: '#1E8C92...',
      fullHash: '1E8C92D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1',
      blockNumber: 'Bloque #44,187',
      isImmutable: true,
      timestamp: '2026-11-13T12:30:01',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },

  {
    id: 'flight-07',
    flightNumber: 7,
    flightNumberLabel: 'Vuelo',
    flightCode: '#7',
    missionId: 'm-acceso-norte',
    missionName: 'Patrullaje Puerta Principal E2',
    zone: 'Acceso Norte',
    circuitLabel: '· Acceso Norte E2',
    operator: {
      name: 'NombreGuardia',
      role: 'Guardia Supervisor',
      isAutonomous: false,
      displayText: 'Operador: NombreGuardia (Guardia Supervisor)',
    },
    flightDate: '2026-11-12',
    timeStart: '08:30',
    timeEnd: '09:05',
    durationMinutes: 35,
    dateDisplay: '12/11/2026, 08:30 - 09:05 · 35 min de vuelo',
    storedAt: '2026-11-12T09:05:00',
    video: {
      title: 'Video HD Grabado · 35 min',
      resolution: '1080p 60fps',
      durationSeconds: 2100,
      videoUrl: '',
      poster: campusReference,
      quality: 'HD',
    },
    telemetry: {
      battery: '57% Batería',
      batteryNumeric: 57,
      distance: '3.1 km',
      distanceKm: 3.1,
      altitude: 'Alt: 42 m',
      altitudeMeters: 42,
      wind: 'Viento: 6 km/h',
      windSpeedKmH: 6,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#4A1D90... Inmutable',
      shortHash: '#4A1D90...',
      fullHash: '4A1D90F1E2D3C4B5A6F7E8D9C0B1A2F3E4D5C6B7A8F9E0D1C2B3A4F5E6D7C8B9',
      blockNumber: 'Bloque #44,186',
      isImmutable: true,
      timestamp: '2026-11-12T09:05:03',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },

  {
    id: 'flight-08',
    flightNumber: 8,
    flightNumberLabel: 'Vuelo',
    flightCode: '#8',
    missionId: 'm-alta-tension',
    missionName: 'Verificación Perimetral Líneas EM',
    zone: 'Alta Tensión',
    circuitLabel: '· Alta Tensión',
    operator: {
      name: 'Agente IA Autónomo',
      role: 'Autónomo IA',
      isAutonomous: true,
      authorizedBy: 'NombreAdministrador (Admin. académico)',
      displayText: 'Operación: Autónomo IA',
    },
    flightDate: '2026-11-11',
    timeStart: '16:00',
    timeEnd: '16:32',
    durationMinutes: 32,
    dateDisplay: '11/11/2026, 16:00 - 16:32 · 32 min de vuelo',
    storedAt: '2026-11-11T16:32:00',
    video: {
      title: 'Video HD Grabado · 32 min',
      resolution: '1080p 60fps',
      durationSeconds: 1920,
      videoUrl: '',
      poster: campusReference,
      quality: 'HD',
    },
    telemetry: {
      battery: '51% Batería',
      batteryNumeric: 51,
      distance: '2.9 km',
      distanceKm: 2.9,
      altitude: 'Alt: 45 m',
      altitudeMeters: 45,
      wind: 'Viento: 10 km/h',
      windSpeedKmH: 10,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#8E3F21... Inmutable',
      shortHash: '#8E3F21...',
      fullHash: '8E3F21C2B3A4F5E6D7C8B9A0F1E2D3C4B5A6F7E8D9C0B1A2F3E4D5C6B7A8F9E0',
      blockNumber: 'Bloque #44,185',
      isImmutable: true,
      timestamp: '2026-11-11T16:32:02',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },

  {
    id: 'flight-09',
    flightNumber: 9,
    flightNumberLabel: 'Vuelo',
    flightCode: '#9',
    missionId: 'm-aulas-central',
    missionName: 'Vigilancia Complejo Aulas A1',
    zone: 'Aulas',
    circuitLabel: '· Aulas A1',
    operator: {
      name: 'NombreGuardia',
      role: 'Guardia Supervisor',
      isAutonomous: false,
      displayText: 'Operador: NombreGuardia (Guardia Supervisor)',
    },
    flightDate: '2026-11-10',
    timeStart: '13:15',
    timeEnd: '13:50',
    durationMinutes: 35,
    dateDisplay: '10/11/2026, 13:15 - 13:50 · 35 min de vuelo',
    storedAt: '2026-11-10T13:50:00',
    video: {
      title: 'Video HD Grabado · 35 min',
      resolution: '1080p 60fps',
      durationSeconds: 2100,
      videoUrl: '',
      poster: campusReference,
      quality: 'HD',
    },
    telemetry: {
      battery: '55% Batería',
      batteryNumeric: 55,
      distance: '3.3 km',
      distanceKm: 3.3,
      altitude: 'Alt: 39 m',
      altitudeMeters: 39,
      wind: 'Viento: 7 km/h',
      windSpeedKmH: 7,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#2B9E14... Inmutable',
      shortHash: '#2B9E14...',
      fullHash: '2B9E14A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8',
      blockNumber: 'Bloque #44,184',
      isImmutable: true,
      timestamp: '2026-11-10T13:50:01',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },

  {
    id: 'flight-10',
    flightNumber: 10,
    flightNumberLabel: 'Vuelo',
    flightCode: '#10',
    missionId: 'm-nocturno',
    missionName: 'Ronda Perimetral Nocturna',
    zone: 'Perímetro Total',
    circuitLabel: '· Perímetro Nocturno',
    operator: {
      name: 'Agente IA Autónomo',
      role: 'Autónomo IA',
      isAutonomous: true,
      authorizedBy: 'NombreAdministrador (Admin. académico)',
      displayText: 'Operación: Autónomo IA',
    },
    flightDate: '2026-11-09',
    timeStart: '23:30',
    timeEnd: '00:10',
    durationMinutes: 40,
    dateDisplay: '09/11/2026, 23:30 - 00:10 · 40 min de vuelo',
    storedAt: '2026-11-10T00:10:00',
    video: {
      title: 'Video HD Grabado · 40 min',
      resolution: '1080p 60fps',
      durationSeconds: 2400,
      videoUrl: '',
      poster: campusVespertino,
      quality: 'HD',
    },
    telemetry: {
      battery: '43% Batería',
      batteryNumeric: 43,
      distance: '4.6 km',
      distanceKm: 4.6,
      altitude: 'Alt: 48 m',
      altitudeMeters: 48,
      wind: 'Viento: 13 km/h',
      windSpeedKmH: 13,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#5D7C23... Inmutable',
      shortHash: '#5D7C23...',
      fullHash: '5D7C23E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2',
      blockNumber: 'Bloque #44,183',
      isImmutable: true,
      timestamp: '2026-11-10T00:10:02',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },

  {
    id: 'flight-11',
    flightNumber: 11,
    flightNumberLabel: 'Vuelo',
    flightCode: '#11',
    missionId: 'm-andadores',
    missionName: 'Inspección Andadores Centrales',
    zone: 'Andadores',
    circuitLabel: '· Andadores',
    operator: {
      name: 'NombreGuardia',
      role: 'Guardia Supervisor',
      isAutonomous: false,
      displayText: 'Operador: NombreGuardia (Guardia Supervisor)',
    },
    flightDate: '2026-11-08',
    timeStart: '10:00',
    timeEnd: '10:35',
    durationMinutes: 35,
    dateDisplay: '08/11/2026, 10:00 - 10:35 · 35 min de vuelo',
    storedAt: '2026-11-08T10:35:00',
    video: {
      title: 'Video HD Grabado · 35 min',
      resolution: '1080p 60fps',
      durationSeconds: 2100,
      videoUrl: '',
      poster: campusReference,
      quality: 'HD',
    },
    telemetry: {
      battery: '60% Batería',
      batteryNumeric: 60,
      distance: '3.1 km',
      distanceKm: 3.1,
      altitude: 'Alt: 40 m',
      altitudeMeters: 40,
      wind: 'Viento: 6 km/h',
      windSpeedKmH: 6,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#7A4B19... Inmutable',
      shortHash: '#7A4B19...',
      fullHash: '7A4B19C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8',
      blockNumber: 'Bloque #44,182',
      isImmutable: true,
      timestamp: '2026-11-08T10:35:01',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },

  {
    id: 'flight-12',
    flightNumber: 12,
    flightNumberLabel: 'Vuelo',
    flightCode: '#12',
    missionId: 'm-calibracion',
    missionName: 'Vuelo de Calibración de Sensores',
    zone: 'Helipuerto Base Norte',
    circuitLabel: '· Base Norte',
    operator: {
      name: 'NombreAdministrador',
      role: 'Admin. académico',
      isAutonomous: false,
      displayText: 'Operador: NombreAdministrador (Admin. académico)',
    },
    flightDate: '2026-11-07',
    timeStart: '15:00',
    timeEnd: '15:20',
    durationMinutes: 20,
    dateDisplay: '07/11/2026, 15:00 - 15:20 · 20 min de vuelo',
    storedAt: '2026-11-07T15:20:00',
    video: {
      title: 'Video HD Grabado · 20 min',
      resolution: '1080p 60fps',
      durationSeconds: 1200,
      videoUrl: '',
      poster: campusReference,
      quality: 'HD',
    },
    telemetry: {
      battery: '74% Batería',
      batteryNumeric: 74,
      distance: '1.8 km',
      distanceKm: 1.8,
      altitude: 'Alt: 30 m',
      altitudeMeters: 30,
      wind: 'Viento: 4 km/h',
      windSpeedKmH: 4,
    },
    incidents: [],
    incidentBadge: {
      hasIncidents: false,
      count: 0,
      textLine1: '0 Incidentes ·',
      textLine2: 'Despejado',
      type: 'success',
    },
    integrity: {
      hash: '#1F2E3D... Inmutable',
      shortHash: '#1F2E3D...',
      fullHash: '1F2E3D4C5B6A7F8E9D0C1B2A3F4E5D6C7B8A9F0E1D2C3B4A5F6E7D8C9B0A1F2',
      blockNumber: 'Bloque #44,181',
      isImmutable: true,
      timestamp: '2026-11-07T15:20:02',
      isSimulated: true,
    },
    buttonVariant: 'soft',
  },
]

/**
 * Obtiene la lista completa de vuelos registrados en la bitácora
 */
export function getStoredFlights() {
  try {
    const raw = localStorage.getItem(BITACORA_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (error) {
    console.error('Error al leer historial de bitácora:', error)
  }
  return initialFlightRecords
}

/**
 * Guarda un vuelo nuevo o actualizado en la bitácora
 */
export function saveFlightRecord(newFlight) {
  const current = getStoredFlights()
  const exists = current.some((f) => f.id === newFlight.id)
  const updated = exists
    ? current.map((f) => (f.id === newFlight.id ? newFlight : f))
    : [newFlight, ...current]

  try {
    localStorage.setItem(BITACORA_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('aeroluferan_bitacora_updated', { detail: updated }))
  } catch (error) {
    console.error('Error al guardar vuelo en bitácora:', error)
  }
  return updated
}
