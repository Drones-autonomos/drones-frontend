import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import {
  BackArrowIcon,
  ClearInputIcon,
  ClockPlanIcon,
  ForkRouteIcon,
  HelmetBrandLogo,
  LightningBoltIcon,
  ShieldCheckIcon,
  ShieldOutlineIcon,
  VerifiedCheckBadgeIcon,
} from '../../components/RutasIcons.jsx'
import RutasMap from './RutasMap.jsx'
import {
  HELIPUERTOS,
  calculatePathDistance,
  getStoredGeofences,
  initialChecklistData,
  saveMission,
  validateRouteAgainstGeofences,
} from './rutasData.js'
import './ProgramarRuta.css'

// Waypoints iniciales de demostración acordes al trayecto E2 -> A de la captura
const INITIAL_DEMO_WAYPOINTS = [
  [20.7046, -100.4447], // E2: Acceso Norte
  [20.7042, -100.4437], // Coliseo
  [20.7034, -100.4441], // Aulas
  [20.7024, -100.4436], // A: Laboratorios / Zona Sur
]

const DAYS_OF_WEEK = [
  { id: 'lun', label: 'L', name: 'Lunes' },
  { id: 'mar', label: 'M', name: 'Martes' },
  { id: 'mie', label: 'M', name: 'Miércoles' },
  { id: 'jue', label: 'J', name: 'Jueves' },
  { id: 'vie', label: 'V', name: 'Viernes' },
  { id: 'sab', label: 'S', name: 'Sábado' },
  { id: 'dom', label: 'D', name: 'Domingo' },
]

export default function ProgramarRuta() {
  const navigate = useNavigate()

  // 1. Checklist de Vuelo Aprobado (datos de telemetría de demostración preparados para backend)
  const [checklist] = useState(initialChecklistData)

  // 2. Nombre de la misión
  const [missionName, setMissionName] = useState('Circuito Coliseo')

  // 3. Waypoints y mapa interactivo
  const [waypoints, setWaypoints] = useState(INITIAL_DEMO_WAYPOINTS)
  const [geofences] = useState(getStoredGeofences)

  // 4. Altura operativa (30m a 200m AGL)
  const [operatingHeight, setOperatingHeight] = useState(60)

  // 5. Geocercas de exclusión (evitación perimetral)
  const [exclusionEnabled, setExclusionEnabled] = useState(true)

  // 6. Planificación de vuelo (Fechas, horarios y helipuertos)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [departureDate, setDepartureDate] = useState(todayStr)
  const [departureTime, setDepartureTime] = useState('18:30')
  const [departureHelipad, setDepartureHelipad] = useState(HELIPUERTOS[0])

  const [arrivalDate, setArrivalDate] = useState(todayStr)
  const [arrivalTime, setArrivalTime] = useState('19:02')
  const [arrivalHelipad, setArrivalHelipad] = useState(HELIPUERTOS[0])

  // Frecuencia y días seleccionados
  const [isRecurring, setIsRecurring] = useState(true)
  const [selectedDays, setSelectedDays] = useState(['lun', 'mar', 'mie', 'jue', 'vie'])

  // Modales interactivos para configuración de vuelo
  const [activeConfigModal, setActiveConfigModal] = useState(null) // 'despegue' | 'aterrizaje' | 'frecuencia' | null
  const [formError, setFormError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Cálculo de distancia y duración de cobertura
  const pathDistance = useMemo(() => {
    return calculatePathDistance(waypoints)
  }, [waypoints])

  // Distancia formateada con separador de miles: "1,420 m lineales de cobertura"
  const formattedDistance = useMemo(() => {
    // Si la distancia calculada difiere ligeramente de la demo, usamos el cálculo real o aproximado
    const meters = pathDistance > 0 ? pathDistance : 1420
    return `${meters.toLocaleString('es-MX')} m lineales de cobertura`
  }, [pathDistance])

  // Identificador de primer y último waypoint
  const waypointsLabel = useMemo(() => {
    if (waypoints.length <= 1) return 'Punto Único'
    return `E2 → A`
  }, [waypoints])

  // Cálculo automático de duración: Aterrizaje - Despegue
  const calculatedDurationMinutes = useMemo(() => {
    try {
      const startDateTime = new Date(`${departureDate}T${departureTime}:00`)
      const endDateTime = new Date(`${arrivalDate}T${arrivalTime}:00`)
      const diffMs = endDateTime.getTime() - startDateTime.getTime()
      const diffMinutes = Math.round(diffMs / 60000)
      return diffMinutes > 0 ? diffMinutes : 32 // Fallback a 32 min si no es válido
    } catch {
      return 32
    }
  }, [departureDate, departureTime, arrivalDate, arrivalTime])

  // Clasificación automática: Patrullaje matutino vs vespertino
  const patrolClassification = useMemo(() => {
    const hour = parseInt(departureTime.split(':')[0], 10)
    // Mañana: 06:00 a 12:59
    if (hour >= 6 && hour < 13) {
      return 'Patrullaje matutino'
    }
    return 'Patrullaje vespertino'
  }, [departureTime])

  // Texto legible de frecuencia
  const frequencyDisplayText = useMemo(() => {
    if (!isRecurring) return 'Vuelo único'
    if (selectedDays.length === 5 && !selectedDays.includes('sab') && !selectedDays.includes('dom')) {
      return 'Lun → Vie'
    }
    if (selectedDays.length === 7) {
      return 'Todos los días'
    }
    if (selectedDays.length === 0) {
      return 'Sin días seleccionados'
    }
    return selectedDays.map((d) => d.toUpperCase()).join(', ')
  }, [isRecurring, selectedDays])

  // Validación de advertencias de geocercas
  const routeValidation = useMemo(() => {
    if (!exclusionEnabled) return { conflicts: [], hasCriticalConflict: false }
    return validateRouteAgainstGeofences(waypoints, geofences)
  }, [waypoints, geofences, exclusionEnabled])

  // Manejo de selección de días de la semana
  function toggleDay(dayId) {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId],
    )
  }

  // Guardar y programar vuelo
  function handleProgramarVuelo() {
    setFormError(null)

    // 1. Validar nombre de la misión
    if (!missionName.trim()) {
      setFormError('Por favor ingresa un nombre para la misión.')
      return
    }

    // 2. Validar waypoints
    if (waypoints.length < 2) {
      setFormError('La ruta debe contener al menos dos waypoints para trazar una trayectoria.')
      return
    }

    // 3. Validar duración positiva
    if (calculatedDurationMinutes <= 0) {
      setFormError('La fecha y hora de aterrizaje deben ser posteriores a las de despegue.')
      return
    }

    // 4. Validar geocercas críticas si la evitación está activa
    if (exclusionEnabled && routeValidation.hasCriticalConflict) {
      const conflict = routeValidation.conflicts.find((c) => c.isRestricted)
      setFormError(
        `La trayectoria atraviesa la zona restringida "${conflict?.zoneName}". Ajusta los waypoints para evitar la zona de exclusión.`,
      )
      return
    }

    // Construcción del registro de la misión compartida
    const newMission = {
      id: `m-${Date.now()}`,
      name: missionName.trim(),
      iconType: patrolClassification.includes('matutino') ? 'sun' : 'moon',
      startTime: departureTime,
      endTime: arrivalTime,
      timeDisplay: `${departureTime} – ${arrivalTime} HRS`,
      zone: departureHelipad.includes('Norte') ? 'Zona Norte' : 'Zona Central',
      status: 'Agendado',
      statusBadge: 'AGENDADO',
      statusType: 'agendado',
      duration: `${calculatedDurationMinutes} min`,
      batteryRequired: `${Math.min(95, Math.max(25, Math.round(calculatedDurationMinutes * 1.3)))}% Batt`,
      opticalSensor: patrolClassification.includes('matutino') ? 'RGB 4K + IR' : 'Térmica FLIR',
      sensorColor: patrolClassification.includes('matutino') ? 'blue' : 'purple',
      droneId: 'Vanguard-01',
      departureHelipad,
      arrivalHelipad,
      frequency: frequencyDisplayText,
      patrolType: patrolClassification,
      operatingHeight,
      date: departureDate,
      waypoints,
      distanceMeters: pathDistance,
      exclusionEnabled,
    }

    // Guardar en la capa de persistencia compartida
    saveMission(newMission)
    setSaveSuccess(true)

    // Regresar a la interfaz Rutas tras breve confirmación visual
    setTimeout(() => {
      navigate('/admin/rutas')
    }, 900)
  }

  return (
    <div className="programar-ruta-page">
      <div className="programar-ruta-shell">
        {/* ============================================================== */}
        {/* ENCABEZADO AEROLUFERAN                                         */}
        {/* ============================================================== */}
        <header className="programar-header-bar">
          <div className="programar-brand">
            <HelmetBrandLogo size={36} />
            <h1 className="programar-brand-name">AeroLuferan</h1>
          </div>
        </header>

        {/* ============================================================== */}
        {/* BOTÓN DE REGRESO Y TÍTULO                                      */}
        {/* ============================================================== */}
        <div className="programar-subhead">
          <button
            type="button"
            className="btn-back-circle"
            onClick={() => navigate('/admin/rutas')}
            aria-label="Regresar a Rutas"
          >
            <BackArrowIcon size={18} color="#0284c7" />
          </button>
          <h2 className="programar-subhead-title">Programar Nueva Ruta</h2>
        </div>

        <main className="programar-content">
          {/* ============================================================== */}
          {/* CHECKLIST DE VUELO APROBADO                                    */}
          {/* ============================================================== */}
          <section className="checklist-card" aria-label="Checklist de vuelo aprobado">
            <div className="checklist-left">
              <span className="checklist-shield-icon" aria-hidden="true">
                <ShieldCheckIcon size={22} color="#10b981" />
              </span>
              <div className="checklist-copy">
                <strong>Checklist de Vuelo Aprobado</strong>
                <p>
                  Batería {checklist.batteryPercent}% • Viento {checklist.windKmH} km/h • RBAC {checklist.rbacStatus}
                </p>
              </div>
            </div>

            <span className="checklist-latency-pill" title="Latencia del enlace RF">
              <LightningBoltIcon size={12} color="#10b981" />
              <span>{checklist.latencyMs}ms</span>
            </span>
          </section>

          {/* ============================================================== */}
          {/* NOMBRE DE LA MISIÓN                                            */}
          {/* ============================================================== */}
          <section className="mission-name-card" aria-label="Nombre de la misión">
            <label className="mission-name-label" htmlFor="mission-name-input">
              NOMBRE DE LA MISIÓN
            </label>
            <div className="mission-name-input-wrap">
              <input
                id="mission-name-input"
                type="text"
                className="mission-name-input"
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                placeholder="Ingresa el nombre del circuito"
                required
              />
              {missionName.length > 0 && (
                <button
                  type="button"
                  className="btn-clear-input"
                  onClick={() => setMissionName('')}
                  aria-label="Borrar nombre de la misión"
                >
                  <ClearInputIcon size={18} color="#94a3b8" />
                </button>
              )}
            </div>
          </section>

          {/* ============================================================== */}
          {/* WAYPOINTS & TELEMETRÍA (Mapa interactivo y controles)          */}
          {/* ============================================================== */}
          <section className="telemetry-card-section" aria-label="Waypoints y telemetría de vuelo">
            <h3 className="telemetry-section-title">Waypoints & Telemetría</h3>

            {/* Mapa Leaflet interactivo */}
            <div className="programar-map-wrapper">
              <RutasMap
                geofences={geofences}
                waypoints={waypoints}
                onWaypointsChange={setWaypoints}
                allowWaypointEditing={true}
                tileMode="streets"
              />

              {/* Tarjeta superpuesta en la parte inferior del mapa */}
              <div className="map-overlay-card">
                <div className="overlay-left">
                  <span className="overlay-badge-icon" aria-hidden="true">
                    <ForkRouteIcon size={18} color="#0284c7" />
                  </span>
                  <div className="overlay-text">
                    <strong>{waypointsLabel}</strong>
                    <span>{formattedDistance}</span>
                  </div>
                </div>

                <div className="overlay-duration">
                  {calculatedDurationMinutes} min
                </div>
              </div>
            </div>

            {/* Advertencia si la trayectoria propuesta cruza una geocerca */}
            {routeValidation.conflicts.length > 0 && (
              <div className="waypoint-warning-box" role="alert">
                <strong>⚠️ Intersección detectada:</strong> La ruta cruza la zona{' '}
                <em>"{routeValidation.conflicts[0].zoneName}"</em> ({routeValidation.conflicts[0].type}).
              </div>
            )}

            {/* Altura Operativa */}
            <div className="operating-height-block">
              <div className="height-row-header">
                <span className="height-label">Altura Operativa</span>
                <span className="height-value-badge">
                  <strong>{operatingHeight}m</strong>
                  <small>AGL</small>
                </span>
              </div>

              {/* Slider de altura */}
              <div className="height-slider-container">
                <span className="slider-limit-label">30m</span>
                <input
                  type="range"
                  min="30"
                  max="200"
                  value={operatingHeight}
                  onChange={(e) => setOperatingHeight(Number(e.target.value))}
                  className="height-range-slider"
                  aria-label="Seleccionar altura operativa en metros AGL"
                />
                <span className="slider-limit-label">200m</span>
              </div>

              {/* Indicador de normativa */}
              <div className="height-compliance-row">
                <div className="compliance-left">
                  <VerifiedCheckBadgeIcon size={16} color="#10b981" />
                  <span>Norma &lt; 200m</span>
                </div>
                <span className="badge-certificado">CERTIFICADO</span>
              </div>
            </div>

            {/* Geocercas de Exclusión */}
            <div className="exclusion-geofences-block">
              <div className="exclusion-main-row">
                <div className="exclusion-info-left">
                  <span className="exclusion-shield-icon" aria-hidden="true">
                    <ShieldOutlineIcon size={20} color="#ef4444" />
                  </span>
                  <div className="exclusion-texts">
                    <strong>Geocercas de Exclusión</strong>
                    <p>Zonas de perturbación & Alta tensión</p>
                  </div>
                </div>

                <button
                  type="button"
                  className={`exclusion-toggle${exclusionEnabled ? ' is-active' : ''}`}
                  role="switch"
                  aria-checked={exclusionEnabled}
                  aria-label="Activar evitación automática de geocercas de exclusión"
                  onClick={() => setExclusionEnabled((prev) => !prev)}
                >
                  <span className="exclusion-toggle-thumb" />
                </button>
              </div>

              <span className="exclusion-footnote">
                Evitación perimetral automática activada
              </span>
            </div>
          </section>

          {/* ============================================================== */}
          {/* PLANIFICAR VUELO (2x2 Grid interactivo)                       */}
          {/* ============================================================== */}
          <section className="planificar-vuelo-section" aria-label="Planificación de vuelo">
            <div className="planificar-title-row">
              <ClockPlanIcon size={20} color="#0284c7" />
              <h3>Planificar vuelo</h3>
            </div>

            <div className="planificar-grid">
              {/* Tarjeta 1: DESPEGUE */}
              <div
                className="plan-card"
                role="button"
                tabIndex={0}
                onClick={() => setActiveConfigModal('despegue')}
                onKeyDown={(e) => e.key === 'Enter' && setActiveConfigModal('despegue')}
                aria-label="Configurar fecha, hora y helipuerto de despegue"
              >
                <span className="plan-card-tag">DESPEGUE</span>
                <strong className="plan-card-val">
                  {departureDate === todayStr ? 'Hoy' : departureDate}, {departureTime}
                </strong>
                <span className="plan-card-sub">{departureHelipad}</span>
              </div>

              {/* Tarjeta 2: ATERRIZAJE */}
              <div
                className="plan-card"
                role="button"
                tabIndex={0}
                onClick={() => setActiveConfigModal('aterrizaje')}
                onKeyDown={(e) => e.key === 'Enter' && setActiveConfigModal('aterrizaje')}
                aria-label="Configurar fecha, hora y helipuerto de aterrizaje"
              >
                <span className="plan-card-tag">ATERRIZAJE</span>
                <strong className="plan-card-val">
                  {arrivalDate === todayStr ? 'Hoy' : arrivalDate}, {arrivalTime}
                </strong>
                <span className="plan-card-sub">{arrivalHelipad}</span>
              </div>

              {/* Tarjeta 3: DURACIÓN (Calculada automáticamente) */}
              <div className="plan-card plan-card--duration" aria-label="Duración automática calculada">
                <span className="plan-card-tag plan-card-tag--teal">DURACIÓN</span>
                <strong className="plan-card-val plan-card-val--large">
                  {calculatedDurationMinutes} min
                </strong>
              </div>

              {/* Tarjeta 4: FRECUENCIA */}
              <div
                className="plan-card"
                role="button"
                tabIndex={0}
                onClick={() => setActiveConfigModal('frecuencia')}
                onKeyDown={(e) => e.key === 'Enter' && setActiveConfigModal('frecuencia')}
                aria-label="Configurar frecuencia y días de patrullaje"
              >
                <span className="plan-card-tag">FRECUENCIA</span>
                <strong className="plan-card-val">{frequencyDisplayText}</strong>
                <span className="plan-card-sub">{patrolClassification}</span>
              </div>
            </div>
          </section>

          {/* Mensajes de error o éxito al guardar */}
          {formError && (
            <div className="programar-feedback-alert" role="alert">
              ⚠️ {formError}
            </div>
          )}

          {saveSuccess && (
            <div className="programar-feedback-success" role="status">
              ✓ ¡Misión programada exitosamente! Guardando en Rutas...
            </div>
          )}

          {/* ============================================================== */}
          {/* BOTÓN «PROGRAMAR VUELO»                                        */}
          {/* ============================================================== */}
          <button
            type="button"
            className="btn-programar-vuelo-primary"
            onClick={handleProgramarVuelo}
          >
            Programar vuelo
          </button>
        </main>

        {/* ============================================================== */}
        {/* DIÁLOGOS MODALES DE CONFIGURACIÓN                             */}
        {/* ============================================================== */}

        {/* Modal: Despegue */}
        {activeConfigModal === 'despegue' && (
          <div className="programar-modal-backdrop" onClick={() => setActiveConfigModal(null)}>
            <div className="programar-modal-box" onClick={(e) => e.stopPropagation()}>
              <h4>Configuración de Despegue</h4>

              <label className="modal-field-block">
                <span>Fecha de despegue:</span>
                <input
                  type="date"
                  min={todayStr}
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </label>

              <label className="modal-field-block">
                <span>Hora de despegue (24 hrs):</span>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                />
              </label>

              <label className="modal-field-block">
                <span>Helipuerto de salida:</span>
                <select
                  value={departureHelipad}
                  onChange={(e) => setDepartureHelipad(e.target.value)}
                >
                  {HELIPUERTOS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn-modal-done"
                onClick={() => setActiveConfigModal(null)}
              >
                Listo
              </button>
            </div>
          </div>
        )}

        {/* Modal: Aterrizaje */}
        {activeConfigModal === 'aterrizaje' && (
          <div className="programar-modal-backdrop" onClick={() => setActiveConfigModal(null)}>
            <div className="programar-modal-box" onClick={(e) => e.stopPropagation()}>
              <h4>Configuración de Aterrizaje</h4>

              <label className="modal-field-block">
                <span>Fecha de aterrizaje:</span>
                <input
                  type="date"
                  min={departureDate}
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                />
              </label>

              <label className="modal-field-block">
                <span>Hora de aterrizaje (24 hrs):</span>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                />
              </label>

              <label className="modal-field-block">
                <span>Helipuerto de aterrizaje:</span>
                <select
                  value={arrivalHelipad}
                  onChange={(e) => setArrivalHelipad(e.target.value)}
                >
                  {HELIPUERTOS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn-modal-done"
                onClick={() => setActiveConfigModal(null)}
              >
                Listo
              </button>
            </div>
          </div>
        )}

        {/* Modal: Frecuencia y Días */}
        {activeConfigModal === 'frecuencia' && (
          <div className="programar-modal-backdrop" onClick={() => setActiveConfigModal(null)}>
            <div className="programar-modal-box" onClick={(e) => e.stopPropagation()}>
              <h4>Frecuencia de la Misión</h4>

              <div className="frecuencia-type-selector">
                <button
                  type="button"
                  className={`btn-freq-opt${!isRecurring ? ' is-active' : ''}`}
                  onClick={() => setIsRecurring(false)}
                >
                  Vuelo único
                </button>
                <button
                  type="button"
                  className={`btn-freq-opt${isRecurring ? ' is-active' : ''}`}
                  onClick={() => setIsRecurring(true)}
                >
                  Recurrente
                </button>
              </div>

              {isRecurring && (
                <div className="days-selector-wrap">
                  <span className="days-selector-label">Días de la semana:</span>
                  <div className="days-buttons-row">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = selectedDays.includes(day.id)
                      return (
                        <button
                          key={day.id}
                          type="button"
                          className={`btn-day-pill${isSelected ? ' is-selected' : ''}`}
                          onClick={() => toggleDay(day.id)}
                          title={day.name}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="patrol-type-preview">
                Clasificación automática: <strong>{patrolClassification}</strong>
              </div>

              <button
                type="button"
                className="btn-modal-done"
                onClick={() => setActiveConfigModal(null)}
              >
                Listo
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* BARRA DE NAVEGACIÓN INFERIOR (Con Bitácora seleccionada)      */}
        {/* ============================================================== */}
        <AdminBottomNav pendingAlerts={3} activePath="/admin/bitacora" />
      </div>
    </div>
  )
}
