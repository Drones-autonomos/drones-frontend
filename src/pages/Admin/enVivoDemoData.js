export const enVivoDemoData = {
  drone: {
    name: 'AeroLuferan',
    model: 'ModeloDron',
    patrolStatus: 'En Patrulla',
    signal: '98% Señal',
  },
  flight: {
    route: 'Circuito Coliseo',
    milestone: 4,
    totalMilestones: 12,
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
  telemetry: [
    { id: 'battery', value: '78%', detail: '24 min', status: '', label: 'Batería' },
    { id: 'altitude', value: '42 m', detail: 'Zona OK', status: 'ok', label: 'Altitud' },
    { id: 'wind', value: '18 km/h', detail: 'Viento 4kt', status: '', label: 'Viento' },
    { id: 'gps', value: '18 Sat', detail: 'GPS Fix 3D', status: '', label: 'GPS' },
  ],
  quickActions: {
    mode: 'Piloto Automático',
  },
  heliport: {
    name: 'Helipuerto Norte #01',
    landingSystem: 'Pad de inducción magnética',
    availability: '100% LISTA',
    protectionDome: 'Domo protector abierto',
    landingStatus: 'Listo para aterrizaje',
  },
  pendingAlerts: 3,
}
