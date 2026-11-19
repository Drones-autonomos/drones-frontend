/**
 * Servicio de Telemetría para AeroLuferan.
 * Preparado para conectarse en tiempo real con el backend,
 * el sistema de comunicación del dron (MavLink/ROS2) y las bases de carga.
 * 
 * Permite recibir telemetría dinámica sin utilizar valores estáticos rígidos.
 */

// Estado inicial de telemetría y comunicación del dron
let currentTelemetry = {
  drone: {
    name: 'AeroLuferan',
    model: 'ModeloDron',
    patrolStatus: 'En Patrullaje',
    signalPercentage: 98, // Porcentaje numérico dinámico
    signalLabel: 'Señal',
  },
  flight: {
    route: 'Circuito Coliseo',
    milestone: 4,
    totalMilestones: 12,
    mode: 'Piloto Automático',
    isPaused: false,
    isReturningToBase: false,
  },
  preview: {
    status: 'EN VIVO',
    resolution: '1080p 60fps',
    encryption: 'AES-256',
    observedArea: 'Coliseo',
    areaStatus: 'Despejado',
    heading: 'HDG 142° SE',
    tilt: 'Tilt -35°',
  },
  cards: [
    {
      id: 'battery',
      value: '78%',
      percentage: 78,
      detail: '24 min',
      status: '',
      label: 'Batería',
      unit: '%',
    },
    {
      id: 'altitude',
      value: '42 m',
      meters: 42,
      detail: 'Zona OK',
      status: 'ok',
      label: 'Altitud',
      unit: 'm',
    },
    {
      id: 'wind',
      value: '18 km/h',
      speedKmh: 18,
      detail: 'Viento 4kt',
      status: '',
      label: 'Viento',
      unit: 'km/h',
    },
    {
      id: 'gps',
      value: '18 Sat',
      satellites: 18,
      detail: 'GPS Fix 3D',
      status: '',
      label: 'GPS',
      unit: 'Sat',
    },
  ],
  heliport: {
    name: 'Helipuerto Norte #01',
    stationNumber: '01',
    landingSystem: 'Pad de inducción magnética',
    availability: '100% LISTA',
    protectionDome: 'Domo protector abierto',
    landingStatus: 'Listo para aterrizaje',
  },
}

const telemetryListeners = new Set()

function notifyTelemetry() {
  telemetryListeners.forEach((listener) => {
    try {
      listener(currentTelemetry)
    } catch (err) {
      console.error('Error en listener de telemetría:', err)
    }
  })
}

/**
 * Obtiene el estado actual de la telemetría del dron.
 */
export function getTelemetryData() {
  return { ...currentTelemetry }
}

/**
 * Suscribe un observador a las actualizaciones de telemetría.
 * Retorna la función para cancelar la suscripción.
 */
export function subscribeTelemetry(listener) {
  telemetryListeners.add(listener)
  try {
    listener(currentTelemetry)
  } catch (err) {
    console.error('Error al emitir telemetría inicial:', err)
  }

  return () => {
    telemetryListeners.delete(listener)
  }
}

/**
 * Actualiza la información de telemetría recibida desde el backend o dron.
 */
export function updateTelemetryData(partial) {
  currentTelemetry = {
    ...currentTelemetry,
    ...partial,
    drone: {
      ...currentTelemetry.drone,
      ...(partial.drone || {}),
    },
    flight: {
      ...currentTelemetry.flight,
      ...(partial.flight || {}),
    },
    preview: {
      ...currentTelemetry.preview,
      ...(partial.preview || {}),
    },
    heliport: {
      ...currentTelemetry.heliport,
      ...(partial.heliport || {}),
    },
    cards: partial.cards || currentTelemetry.cards,
  }
  notifyTelemetry()
}

/**
 * Actualiza el porcentaje de señal de comunicación del dron dinámicamente.
 */
export function updateSignalPercentage(percentage) {
  updateTelemetryData({
    drone: {
      ...currentTelemetry.drone,
      signalPercentage: Math.max(0, Math.min(100, Math.round(percentage))),
    },
  })
}

/**
 * Conector preparado para stream WebSocket / SSE de telemetría del backend.
 */
export function connectTelemetrySocket(socketUrl) {
  // Conexión preparada para backend:
  console.info(`[TelemetryService] Preparado para conectar a: ${socketUrl}`)
  return {
    disconnect: () => {
      console.info('[TelemetryService] Desconectando socket de telemetría.')
    },
  }
}
