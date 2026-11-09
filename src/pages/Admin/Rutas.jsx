import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import {
  AeroBrandLogo,
  AdjustSliderIcon,
  AutonomousFlightIcon,
  BatteryChargeIcon,
  CompassTargetIcon,
  HeightArrowIcon,
  MoonRouteIcon,
  NoEntryIcon,
  RoutePlusIcon,
  ShieldCheckIcon,
  SignalBarsIcon,
  SignalWifiIcon,
  SunRouteIcon,
  ToggleCheckIcon,
  WindBlowIcon,
} from '../../components/RutasIcons.jsx'
import RutasMap from './RutasMap.jsx'
import { GeofenceManagerModal, NewZoneDialog } from './GeofenceManagerModal.jsx'
import {
  initialDroneCommState,
  initialPreflightData,
  getStoredMissions,
  getStoredGeofences,
  saveGeofences,
  validateRouteAgainstGeofences,
} from './rutasData.js'
import './Rutas.css'

export default function Rutas() {
  const navigate = useNavigate()

  // 1. Estado de comunicación y señal del dron (preparado para backend / telemetría)
  const [droneComm, setDroneComm] = useState(initialDroneCommState)

  // 2. Estado del interruptor de Vuelo Autónomo Activo
  const [autonomousEnabled, setAutonomousEnabled] = useState(true)

  // 3. Geocercas registradas (con persistencia local en modo demo)
  const [geofences, setGeofences] = useState(getStoredGeofences)

  // 4. Misiones / Rutas programadas
  const [missions, setMissions] = useState(getStoredMissions)

  // Sincronizar misiones y geocercas en tiempo real
  useEffect(() => {
    function syncData() {
      setMissions(getStoredMissions())
      setGeofences(getStoredGeofences())
    }

    window.addEventListener('storage', syncData)
    window.addEventListener('aeroluferan_missions_updated', syncData)
    window.addEventListener('aeroluferan_geofences_updated', syncData)
    return () => {
      window.removeEventListener('storage', syncData)
      window.removeEventListener('aeroluferan_missions_updated', syncData)
      window.removeEventListener('aeroluferan_geofences_updated', syncData)
    }
  }, [])

  // Guardar geocercas en localStorage en modo demo
  useEffect(() => {
    saveGeofences(geofences)
  }, [geofences])

  // Alternar estado de conexión del dron para pruebas de desconexión / sin señal
  function handleToggleCommStatus() {
    setDroneComm((prev) => ({
      ...prev,
      isConnected: !prev.isConnected,
      signalQuality: !prev.isConnected ? 98 : 0,
      status: !prev.isConnected ? 'online' : 'disconnected',
    }))
  }

  // Ruta seleccionada actualmente para visualización e inicio
  const [selectedMissionId, setSelectedMissionId] = useState(() => getStoredMissions()[0]?.id || '')

  // 5. Verificación de prevuelo
  const [preflight] = useState(initialPreflightData)

  // 6. Estados de modales y herramientas del mapa
  const [isGeofenceManagerOpen, setIsGeofenceManagerOpen] = useState(false)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [pendingZoneBounds, setPendingZoneBounds] = useState(null)
  const [flightStatusMessage, setFlightStatusMessage] = useState(null)

  // Guardar geocercas en localStorage en modo demo
  useEffect(() => {
    try {
      localStorage.setItem('aeroluferan_geofences', JSON.stringify(geofences))
    } catch {
      // ignore
    }
  }, [geofences])

  const selectedMission = useMemo(
    () => missions.find((m) => m.id === selectedMissionId) || missions[0],
    [missions, selectedMissionId],
  )

  // Validación geométrica de la ruta frente a geocercas
  const routeValidation = useMemo(() => {
    if (!selectedMission) return { conflicts: [], hasCriticalConflict: false }
    return validateRouteAgainstGeofences(selectedMission.waypoints, geofences)
  }, [selectedMission, geofences])

  // Manejo del interruptor de Vuelo Autónomo
  function handleToggleAutonomous() {
    setAutonomousEnabled((prev) => {
      const next = !prev
      // Puntos preparados para conectar con el servicio backend:
      // api.setAutonomousFlightMode({ enabled: next })
      return next
    })
  }

  // Manejo del botón "Iniciar Vuelo"
  function handleIniciarVuelo() {
    setFlightStatusMessage(null)

    // Comprobación 1: Señal y conexión del dron
    if (!droneComm.isConnected) {
      setFlightStatusMessage({
        type: 'error',
        text: 'No se puede iniciar el vuelo: el dron se encuentra desconectado del enlace de radio.',
      })
      return
    }

    // Comprobación 2: Verificación de prevuelo
    if (!preflight.isReady) {
      setFlightStatusMessage({
        type: 'error',
        text: 'No se puede iniciar el vuelo: la verificación de prevuelo reporta parámetros fuera de rango.',
      })
      return
    }

    // Comprobación 3: Restricciones de seguridad y geocercas
    if (routeValidation.hasCriticalConflict) {
      const criticalZone = routeValidation.conflicts.find((c) => c.isRestricted)
      setFlightStatusMessage({
        type: 'critical',
        text: `Bloqueo de seguridad: La ruta "${selectedMission.name}" atraviesa la zona restringida "${criticalZone?.zoneName}". Motivo: ${criticalZone?.reason}. Requiere validación del backend antes del despegue.`,
      })
      return
    }

    // Si todo es válido en modo de demostración guiada:
    setFlightStatusMessage({
      type: 'success',
      text: `Autorización de despegue concedida (Modo Demo). Redirigiendo a monitoreo En Vivo...`,
    })

    setTimeout(() => {
      navigate('/admin/live', {
        state: {
          missionId: selectedMission.id,
          missionName: selectedMission.name,
          droneId: droneComm.model,
          isAutonomous: autonomousEnabled,
        },
      })
    }, 1200)
  }

  // Manejadores de geocercas
  function handleToggleZoneStatus(zoneId) {
    setGeofences((prev) =>
      prev.map((z) =>
        z.id === zoneId ? { ...z, status: z.status === 'Activa' ? 'Inactiva' : 'Activa' } : z,
      ),
    )
  }

  function handleDeleteZone(zoneId) {
    setGeofences((prev) => prev.filter((z) => z.id !== zoneId))
  }

  function handleEditZone(zoneId, updatedFields) {
    setGeofences((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, ...updatedFields } : z)),
    )
  }

  function handleZoneCreatedOnMap(bounds) {
    setIsDrawingMode(false)
    setPendingZoneBounds(bounds)
  }

  function handleSaveNewZone(zoneData) {
    const newZone = {
      id: `geo-${Date.now()}`,
      ...zoneData,
    }
    setGeofences((prev) => [...prev, newZone])
    setPendingZoneBounds(null)
  }

  return (
    <div className="rutas-page">
      <div className="rutas-shell">
        {/* ============================================================== */}
        {/* 1. ENCABEZADO Y SEÑAL DEL DRON (Calidad RF, NO batería)       */}
        {/* ============================================================== */}
        <header className="rutas-header">
          <div className="rutas-brand">
            <AeroBrandLogo size={38} />
            <div className="rutas-brand-text">
              <h1 className="rutas-brand-title">AeroLuferan</h1>
              <div className="rutas-brand-subtitle">
                <span className="status-dot-green" aria-hidden="true" />
                <span>Geocerca & Rutas Activas</span>
              </div>
            </div>
          </div>

          <div
            className={`drone-signal-badge${!droneComm.isConnected ? ' is-disconnected' : ''}`}
            onClick={handleToggleCommStatus}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleToggleCommStatus()
            }}
            title={`Calidad del enlace de radiofrecuencia (RF): ${droneComm.signalQuality}% · Estado: ${droneComm.isConnected ? 'Conectado (Clic para simular desconexión)' : 'Desconectado (Clic para reconectar)'}`}
          >
            <SignalWifiIcon size={16} color={droneComm.isConnected ? '#10B981' : '#EF4444'} />
            <span>{droneComm.isConnected ? `${droneComm.signalQuality}%` : 'Sin Señal'}</span>
          </div>
        </header>

        <main className="rutas-content">
          {/* ============================================================== */}
          {/* 2. TARJETA: VUELO AUTÓNOMO ACTIVO Y TOGGLE                     */}
          {/* ============================================================== */}
          <section className="autonomous-card" aria-label="Control de vuelo autónomo">
            <div className="autonomous-left">
              <span className="autonomous-icon-wrap" aria-hidden="true">
                <AutonomousFlightIcon size={36} />
              </span>
              <div className="autonomous-info">
                <strong>Vuelo Autónomo Activo</strong>
                <span>{missions.length} Rutas Programadas</span>
              </div>
            </div>

            <button
              type="button"
              className={`autonomous-toggle-btn${autonomousEnabled ? ' is-on' : ''}`}
              role="switch"
              aria-checked={autonomousEnabled}
              aria-label="Activar o desactivar ejecución de vuelos autónomos"
              onClick={handleToggleAutonomous}
            >
              <span className="toggle-thumb">
                {autonomousEnabled && <ToggleCheckIcon size={12} color="#10B981" />}
              </span>
            </button>
          </section>

          {/* ============================================================== */}
          {/* 3. TARJETA: GEOCERCA DEL CAMPUS Y MAPA INTERACTIVO             */}
          {/* ============================================================== */}
          <section className="campus-card" aria-label="Geocerca y mapa interactivo del campus">
            <header className="campus-card-header">
              <div className="campus-title-wrap">
                <span className="campus-target-icon">
                  <CompassTargetIcon size={20} color="#0284c7" />
                </span>
                <div className="campus-title-copy">
                  <h2>Geocerca del Campus</h2>
                  <p>Monitoreo Perimetral Tecnológico</p>
                </div>
              </div>

              <div className="campus-live-pill">
                <span className="live-pill-dot" aria-hidden="true" />
                <span>En Vivo</span>
              </div>
            </header>

            {/* Mapa interactivo con Leaflet */}
            <div className="campus-map-box">
              <RutasMap
                geofences={geofences}
                selectedRoute={selectedMission}
                isDrawingMode={isDrawingMode}
                onZoneCreated={handleZoneCreatedOnMap}
                onCancelDrawing={() => setIsDrawingMode(false)}
              />
            </div>

            {/* Techo operativo y cumplimiento normativo */}
            <footer className="campus-ceiling-bar">
              <div className="ceiling-left">
                <span className="ceiling-icon-box">
                  <HeightArrowIcon size={18} color="#0284c7" />
                </span>
                <div className="ceiling-copy">
                  <span>
                    Techo Operativo: <strong>{preflight.operatingCeiling.height}</strong>
                  </span>
                  <small>Límite regulatorio {preflight.operatingCeiling.regulatoryLimit}</small>
                </div>
              </div>

              <div className="ceiling-compliance-badge">
                {preflight.operatingCeiling.complianceText}
              </div>
            </footer>
          </section>

          {/* Banner de advertencia si la ruta atraviesa zonas restringidas */}
          {routeValidation.conflicts.length > 0 && (
            <div
              className={`route-warning-banner ${routeValidation.hasCriticalConflict ? 'route-warning-banner--critical' : 'route-warning-banner--caution'}`}
              role="alert"
            >
              <div className="warning-banner-title">
                {routeValidation.hasCriticalConflict ? (
                  <NoEntryIcon size={16} color="#dc2626" />
                ) : (
                  <span>⚠️</span>
                )}
                <strong>
                  {routeValidation.hasCriticalConflict
                    ? 'ADVERTENCIA DE SEGURIDAD: Cruce de Zona Restringida'
                    : 'Precaución de Vuelo en Perímetro'}
                </strong>
              </div>
              <ul className="warning-banner-list">
                {routeValidation.conflicts.map((conf, idx) => (
                  <li key={idx}>
                    La ruta <em>"{selectedMission.name}"</em> atraviesa la zona{' '}
                    <strong>"{conf.zoneName}"</strong> ({conf.type}): {conf.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mensajes de estado al presionar Iniciar Vuelo */}
          {flightStatusMessage && (
            <div
              className={`flight-feedback-box flight-feedback-box--${flightStatusMessage.type}`}
              role="status"
            >
              {flightStatusMessage.text}
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. BOTÓN «INICIAR VUELO»                                       */}
          {/* ============================================================== */}
          <button
            type="button"
            className="btn-iniciar-vuelo"
            onClick={handleIniciarVuelo}
          >
            Iniciar Vuelo
          </button>

          {/* ============================================================== */}
          {/* 5. SECCIÓN «VUELOS PROGRAMADOS»                                */}
          {/* ============================================================== */}
          <section className="vuelos-programados-section" aria-labelledby="vuelos-prog-heading">
            <div className="vuelos-programados-header">
              <h2 id="vuelos-prog-heading">Vuelos Programados</h2>
              <span className="vuelos-count">
                {missions.length} de {missions.length} Rutas
              </span>
            </div>

            <div className="vuelos-cards-list">
              {missions.map((mission) => {
                const isSelected = mission.id === selectedMission.id

                return (
                  <article
                    key={mission.id}
                    className={`vuelo-card${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedMissionId(mission.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Misión ${mission.name}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedMissionId(mission.id)
                      }
                    }}
                  >
                    <header className="vuelo-card-header">
                      <div className="vuelo-card-identity">
                        <span
                          className={`vuelo-icon-circle vuelo-icon-circle--${mission.iconType || 'sun'}`}
                          aria-hidden="true"
                        >
                          {mission.iconType === 'moon' ? (
                            <MoonRouteIcon size={22} color="#6366f1" />
                          ) : (
                            <SunRouteIcon size={22} color="#f59e0b" />
                          )}
                        </span>
                        <div className="vuelo-title-block">
                          <strong>{mission.name}</strong>
                          <span className="vuelo-time-range">
                            {mission.timeDisplay} • {mission.zone}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`vuelo-status-tag vuelo-status-tag--${mission.statusType || 'proximo'}`}
                      >
                        {mission.statusBadge || mission.status.toUpperCase()}
                      </span>
                    </header>

                    <div className="vuelo-metrics-grid">
                      <div className="vuelo-metric-cell">
                        <span className="metric-cell-label">Duración</span>
                        <strong className="metric-cell-val">{mission.duration}</strong>
                      </div>
                      <div className="vuelo-metric-cell">
                        <span className="metric-cell-label">Batería Requerida</span>
                        <strong className="metric-cell-val metric-cell-val--green">
                          {mission.batteryRequired}
                        </strong>
                      </div>
                      <div className="vuelo-metric-cell">
                        <span className="metric-cell-label">Sensor Óptico</span>
                        <strong
                          className={`metric-cell-val ${mission.sensorColor === 'purple' ? 'metric-cell-val--purple' : 'metric-cell-val--blue'}`}
                        >
                          {mission.opticalSensor}
                        </strong>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* ============================================================== */}
            {/* 6. BOTÓN «PROGRAMAR NUEVA RUTA»                                */}
            {/* ============================================================== */}
            <button
              type="button"
              className="btn-programar-ruta"
              onClick={() => navigate('/admin/programar-ruta')}
            >
              <RoutePlusIcon size={18} color="#0284c7" />
              <span>Programar Nueva Ruta</span>
            </button>
          </section>

          {/* ============================================================== */}
          {/* 7. VERIFICACIÓN DE PREVUELO                                    */}
          {/* ============================================================== */}
          <section className="prevuelo-card" aria-label="Verificación de prevuelo">
            <header className="prevuelo-header">
              <div className="prevuelo-title-wrap">
                <ShieldCheckIcon size={22} color="#10b981" />
                <h2>Verificación Prevuelo</h2>
              </div>
              <span className="prevuelo-status-pill">{preflight.overallStatus}</span>
            </header>

            <div className="prevuelo-metrics-row">
              <div className="prevuelo-mini-card">
                <WindBlowIcon size={20} color="#0d9488" />
                <span className="prevuelo-mini-label">{preflight.metrics.wind.label}</span>
                <strong className="prevuelo-mini-value">{preflight.metrics.wind.value}</strong>
                <span className="prevuelo-mini-tag">{preflight.metrics.wind.statusLabel}</span>
              </div>

              <div className="prevuelo-mini-card">
                <BatteryChargeIcon size={20} color="#0d9488" />
                <span className="prevuelo-mini-label">{preflight.metrics.battery.label}</span>
                <strong className="prevuelo-mini-value">{preflight.metrics.battery.value}</strong>
                <span className="prevuelo-mini-tag">{preflight.metrics.battery.statusLabel}</span>
              </div>

              <div className="prevuelo-mini-card">
                <SignalBarsIcon size={20} color="#0d9488" />
                <span className="prevuelo-mini-label">{preflight.metrics.rfSignal.label}</span>
                <strong className="prevuelo-mini-value">{preflight.metrics.rfSignal.value}</strong>
                <span className="prevuelo-mini-tag">{preflight.metrics.rfSignal.statusLabel}</span>
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* 8. BOTÓN «AJUSTAR PERÍMETRO»                                   */}
          {/* ============================================================== */}
          <div className="ajustar-perimetro-row">
            <button
              type="button"
              className="btn-ajustar-perimetro"
              onClick={() => setIsGeofenceManagerOpen(true)}
            >
              <AdjustSliderIcon size={18} color="#172f52" />
              <span>Ajustar Perímetro</span>
            </button>
          </div>
        </main>

        {/* Modal de gestión de geocercas */}
        <GeofenceManagerModal
          isOpen={isGeofenceManagerOpen}
          onClose={() => setIsGeofenceManagerOpen(false)}
          geofences={geofences}
          onToggleStatus={handleToggleZoneStatus}
          onDeleteZone={handleDeleteZone}
          onEditZone={handleEditZone}
          onStartDrawing={() => setIsDrawingMode(true)}
        />

        {/* Diálogo para nombrar y guardar una zona rectangular dibujada en el mapa */}
        <NewZoneDialog
          isOpen={Boolean(pendingZoneBounds)}
          bounds={pendingZoneBounds}
          onSave={handleSaveNewZone}
          onCancel={() => setPendingZoneBounds(null)}
        />

        {/* ============================================================== */}
        {/* 9. BARRA DE NAVEGACIÓN INFERIOR                                */}
        {/* ============================================================== */}
        <AdminBottomNav pendingAlerts={3} />
      </div>
    </div>
  )
}
