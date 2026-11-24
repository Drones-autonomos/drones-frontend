import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  validateRouteAgainstGeofences,
} from './rutasData.js'
import { createMission, updateMission } from '../../services/missionService.js'
import { validatePointAgainstGeofences } from '../../services/geofenceService.js'
import { fetchPresetRoutes, getPresetRoutes } from './presetRoutes.js'
import useDroneTelemetry from '../../hooks/useDroneTelemetry.js'
import './ProgramarRuta.css'

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
  const location = useLocation()

  // Modo edición: Rutas.jsx navega con state.editMission (solo PROGRAMADA).
  // PUT /missions/{id} solo acepta nombre/descripcion/horario — los waypoints
  // se muestran en el mapa como referencia pero no son editables.
  const editMission = location.state?.editMission || null
  const isEditMode = Boolean(editMission?.id)

  const editSchedule = useMemo(() => {
    const raw = editMission?.horario_inicio_programado
    if (!raw) return null
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)
    const date = new Date(hasZone ? raw : `${raw}Z`)
    if (Number.isNaN(date.getTime())) return null
    const pad = (n) => String(n).padStart(2, '0')
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    }
  }, [editMission])

  // 1. Checklist de Vuelo Aprobado (telemetría real: batería y enlace)
  const telemetry = useDroneTelemetry()
  const batteryCard = telemetry?.cards?.find((c) => c.id === 'battery')
  const droneConnected = Boolean(telemetry?.link?.droneConnected)
  const checklist = {
    isApproved: droneConnected,
    batteryText: batteryCard?.value ?? '—',
    linkText: droneConnected ? `${telemetry?.drone?.signalPercentage ?? 0}%` : 'Sin enlace',
    transportText:
      telemetry?.link?.transport === 'ws'
        ? 'WS en vivo'
        : telemetry?.link?.transport === 'polling'
          ? 'REST'
          : 'Sin enlace',
  }

  // 2. Nombre de la misión
  const [missionName, setMissionName] = useState(editMission?.name || '')

  // 3. Waypoints y mapa interactivo
  const [waypoints, setWaypoints] = useState(
    editMission?.waypoints?.length >= 2 ? editMission.waypoints : [],
  )
  const [geofences] = useState(getStoredGeofences)

  // 4. Altura operativa (30m a 200m AGL)
  const [operatingHeight, setOperatingHeight] = useState(60)

  // 5. Geocercas de exclusión (evitación perimetral)
  const [exclusionEnabled, setExclusionEnabled] = useState(true)

  // 6. Planificación de vuelo (Fechas, horarios y helipuertos)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [departureDate, setDepartureDate] = useState(editSchedule?.date || todayStr)
  const [departureTime, setDepartureTime] = useState(editSchedule?.time || '18:30')
  const [departureHelipad, setDepartureHelipad] = useState(HELIPUERTOS[0])

  const [arrivalDate, setArrivalDate] = useState(todayStr)
  const [arrivalTime, setArrivalTime] = useState('19:02')
  const [arrivalHelipad, setArrivalHelipad] = useState(HELIPUERTOS[0])

  // Frecuencia y días seleccionados
  const [isRecurring, setIsRecurring] = useState(true)
  const [selectedDays, setSelectedDays] = useState(['lun', 'mar', 'mie', 'jue', 'vie'])

  // Ruta preprogramada cargada en el mapa (null = ruta manual)
  const [activePresetId, setActivePresetId] = useState(null)

  // Rutas preprogramadas: arranca con el cache/fallback local y se repuebla
  // desde GET /missions/presets cuando el backend está disponible.
  const [presetRoutes, setPresetRoutes] = useState(getPresetRoutes)

  useEffect(() => {
    if (isEditMode) return undefined
    let cancelled = false
    fetchPresetRoutes().then((routes) => {
      if (!cancelled && Array.isArray(routes) && routes.length > 0) {
        setPresetRoutes(routes)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isEditMode])

  // Modales interactivos para configuración de vuelo
  const [activeConfigModal, setActiveConfigModal] = useState(null) // 'despegue' | 'aterrizaje' | 'frecuencia' | null
  const [formError, setFormError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Cálculo de distancia y duración de cobertura
  const pathDistance = useMemo(() => {
    return calculatePathDistance(waypoints)
  }, [waypoints])

  // Distancia formateada con separador de miles: "1,420 m lineales de cobertura"
  const formattedDistance = useMemo(() => {
    if (pathDistance <= 0) return 'Sin trayectoria definida'
    return `${pathDistance.toLocaleString('es-MX')} m lineales de cobertura`
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

  // Cargar una ruta de patrullaje preprogramada al mapa y al formulario
  function applyPresetRoute(route) {
    setWaypoints(route.waypoints)
    setMissionName(route.nombre)
    setOperatingHeight(route.altitudSugerida)
    setActivePresetId(route.id)
    setFormError(null)
  }

  // Manejo de selección de días de la semana
  function toggleDay(dayId) {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId],
    )
  }

  // Guardar y programar vuelo en el backend
  async function handleProgramarVuelo() {
    setFormError(null)

    // 1. Validar nombre de la misión (backend exige 3–100 caracteres)
    if (!missionName.trim() || missionName.trim().length < 3) {
      setFormError('Por favor ingresa un nombre para la misión (mínimo 3 caracteres).')
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

    // 5. Pre-validación en backend: cada waypoint debe caer dentro de alguna
    // geocerca activa (POST /geofences/validate-point). Si el backend no
    // responde (null) se continúa y el servidor valida en el POST final.
    if (!isEditMode) {
      for (let i = 0; i < waypoints.length; i += 1) {
        const [lat, lon] = waypoints[i]
        const verdict = await validatePointAgainstGeofences(lat, lon, operatingHeight)
        if (verdict && verdict.permitido === false) {
          setFormError(
            `El waypoint ${i + 1} (${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}) fue rechazado por el servidor: ${verdict.motivo || 'fuera de las zonas operativas autorizadas'}.`,
          )
          return
        }
      }
    }

    // Descripción con metadatos de la planificación (el backend solo guarda
    // nombre/descripcion/horario; la zona, frecuencia y duración viajan aquí)
    const zone = departureHelipad.includes('Norte') ? 'Zona Norte' : 'Zona Central'
    const descripcion = [
      zone,
      patrolClassification,
      frequencyDisplayText,
      `${departureHelipad} → ${arrivalHelipad}`,
      `${calculatedDurationMinutes} min`,
    ].join(' · ')

    try {
      setIsSaving(true)
      if (isEditMode) {
        // PUT /missions/{id}: el backend no admite editar waypoints
        await updateMission(editMission.id, {
          nombre: missionName,
          descripcion,
          horarioInicio: `${departureDate}T${departureTime}:00`,
        })
      } else {
        await createMission({
          nombre: missionName,
          descripcion,
          horarioInicio: `${departureDate}T${departureTime}:00`,
          waypoints,
          altitudMetros: operatingHeight,
        })
      }
      setSaveSuccess(true)

      // Regresar a la interfaz Rutas tras breve confirmación visual
      setTimeout(() => {
        navigate('/admin/rutas')
      }, 900)
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No se pudo registrar la misión en el backend.',
      )
    } finally {
      setIsSaving(false)
    }
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
          <h2 className="programar-subhead-title">
            {isEditMode ? `Editar misión · ${editMission.name}` : 'Programar Nueva Ruta'}
          </h2>
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
                <strong>{checklist.isApproved ? 'Checklist de Vuelo Aprobado' : 'Checklist de Vuelo'}</strong>
                <p>
                  Batería {checklist.batteryText} • Enlace {checklist.linkText}
                </p>
              </div>
            </div>

            <span className="checklist-latency-pill" title="Canal de telemetría">
              <LightningBoltIcon size={12} color={checklist.isApproved ? '#10b981' : '#94a3b8'} />
              <span>{checklist.transportText}</span>
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
          {/* RUTAS DE PATRULLAJE PREPROGRAMADAS (solo modo creación)        */}
          {/* ============================================================== */}
          {!isEditMode && (
            <section className="preset-routes-card" aria-label="Rutas de patrullaje preprogramadas">
              <div className="preset-routes-header">
                <ForkRouteIcon size={18} color="#0284c7" />
                <strong>Rutas preprogramadas</strong>
              </div>
              <div className="preset-routes-grid">
                {presetRoutes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    className={`preset-route-btn${activePresetId === route.id ? ' is-selected' : ''}`}
                    onClick={() => applyPresetRoute(route)}
                    title={route.descripcion}
                  >
                    <strong>{route.nombre}</strong>
                    <span>{route.waypoints.length} waypoints · {route.altitudSugerida} m AGL</span>
                  </button>
                ))}
              </div>
              <p className="preset-routes-hint">
                Carga el trayecto completo (traslado + barrido + regreso a base) en el
                mapa; puedes ajustar waypoints, altura y horario antes de programar.
              </p>
            </section>
          )}

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
                allowWaypointEditing={!isEditMode}
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

            {isEditMode && (
              <div className="waypoint-warning-box" role="note">
                <strong>ℹ️ Edición de misión:</strong> Los waypoints no se pueden modificar
                (el backend solo permite actualizar nombre, descripción y horario en una
                misión PROGRAMADA).
              </div>
            )}

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
              ✓ {isEditMode
                ? '¡Misión actualizada exitosamente! Volviendo a Rutas...'
                : '¡Misión programada exitosamente! Guardando en Rutas...'}
            </div>
          )}

          {/* ============================================================== */}
          {/* BOTÓN «PROGRAMAR VUELO»                                        */}
          {/* ============================================================== */}
          <button
            type="button"
            className="btn-programar-vuelo-primary"
            onClick={handleProgramarVuelo}
            disabled={isSaving}
          >
            {isSaving
              ? 'Guardando misión…'
              : isEditMode
                ? 'Guardar cambios'
                : 'Programar vuelo'}
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
        <AdminBottomNav activePath="/admin/bitacora" />
      </div>
    </div>
  )
}
