import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GuardiaBottomNav from '../../../components/GuardiaBottomNav.jsx'
import helmetLogo from '../../../assets/helmet-logo.png'
import {
  AdjustSliderIcon,
  AutonomousFlightIcon,
  BatteryChargeIcon,
  CompassTargetIcon,
  HeightArrowIcon,
  MoonRouteIcon,
  NoEntryIcon,
  ShieldCheckIcon,
  SignalBarsIcon,
  SunRouteIcon,
  ToggleCheckIcon,
  WarningBoltIcon,
  WindBlowIcon,
} from '../../../components/RutasIcons.jsx'
import RutasMap from '../../Admin/RutasMap.jsx'
import { GeofenceManagerModal } from '../../Admin/GeofenceManagerModal.jsx'
import {
  PREFLIGHT_BASE,
  deriveOperatingCeiling,
  getStoredAutonomous,
  saveAutonomous,
  getStoredGeofences,
  saveGeofences,
  validateRouteAgainstGeofences,
} from '../../Admin/rutasData.js'
import useDroneTelemetry from '../../../hooks/useDroneTelemetry.js'
import {
  listMissions,
  startMission,
  cancelMission,
  confirmMissionLanded,
  getSchedulerStatus,
  MISSIONS_UPDATED_EVENT,
} from '../../../services/missionService.js'
import {
  syncGeofences,
  deleteBackendGeofence,
  deleteBackendExclusionZone,
} from '../../../services/geofenceService.js'
import './Rutas.css'

export default function GuardiaRutas() {
  const navigate = useNavigate()
  const telemetry = useDroneTelemetry()

  // 1. Estado de comunicación del dron derivado de la telemetría real
  const droneLink = telemetry?.link || {}
  const droneComm = {
    droneName: telemetry?.drone?.name || 'AeroLuferan',
    model: telemetry?.drone?.model || '—',
    isConnected: Boolean(droneLink.droneConnected),
    signalQuality: telemetry?.drone?.signalPercentage ?? 0,
    status: droneLink.droneConnected ? 'online' : 'disconnected',
  }

  // 2. Estado del interruptor de Vuelo Autónomo Activo (sincronizado con Admin)
  const [autonomousEnabled, setAutonomousEnabled] = useState(getStoredAutonomous)

  // 3. Geocercas registradas compartidas con Admin
  const [geofences, setGeofences] = useState(getStoredGeofences)

  // 4. Misiones / Rutas programadas desde el backend
  const [missions, setMissions] = useState([])
  const [missionsError, setMissionsError] = useState(null)
  const [isLoadingMissions, setIsLoadingMissions] = useState(true)
  const [pendingActionId, setPendingActionId] = useState(null)

  async function loadMissions({ silent = false } = {}) {
    if (!silent) setIsLoadingMissions(true)
    try {
      const list = await listMissions({ limit: 100 })
      setMissions(list)
      setMissionsError(null)
    } catch (error) {
      setMissionsError(
        error instanceof Error ? error.message : 'No se pudieron cargar las misiones del backend.',
      )
    } finally {
      if (!silent) setIsLoadingMissions(false)
    }
  }

  // Cargar misiones del backend al montar y sincronizar ante cambios
  useEffect(() => {
    // Deferido a la siguiente tarea para no setear estado de forma síncrona en el efecto
    const initialTimer = window.setTimeout(() => {
      loadMissions()
      syncGeofences()
      getSchedulerStatus()
        .then((status) => {
          if (typeof status?.enabled === 'boolean') {
            setAutonomousEnabled(status.enabled)
            saveAutonomous(status.enabled)
          }
        })
        .catch(() => {})
    }, 0)

    function syncSharedData() {
      loadMissions({ silent: true })

      const storedGeo = getStoredGeofences()
      setGeofences((prev) => (JSON.stringify(prev) === JSON.stringify(storedGeo) ? prev : storedGeo))

      const storedAuto = getStoredAutonomous()
      setAutonomousEnabled((prev) => (prev === storedAuto ? prev : storedAuto))
    }

    window.addEventListener('storage', syncSharedData)
    window.addEventListener(MISSIONS_UPDATED_EVENT, syncSharedData)
    window.addEventListener('aeroluferan_geofences_updated', syncSharedData)
    window.addEventListener('aeroluferan_autonomous_updated', syncSharedData)
    const intervalId = window.setInterval(() => {
      loadMissions({ silent: true })
      syncGeofences()
    }, 20000)

    return () => {
      window.clearTimeout(initialTimer)
      window.removeEventListener('storage', syncSharedData)
      window.removeEventListener(MISSIONS_UPDATED_EVENT, syncSharedData)
      window.removeEventListener('aeroluferan_geofences_updated', syncSharedData)
      window.removeEventListener('aeroluferan_autonomous_updated', syncSharedData)
      window.clearInterval(intervalId)
    }
  }, [])

  // Ruta seleccionada actualmente para visualización
  const [selectedMissionId, setSelectedMissionId] = useState(null)

  // 5. Verificación de prevuelo (batería, viento y enlace reales desde telemetría)
  const telemetryCards = telemetry?.cards || []
  const batteryCard = telemetryCards.find((c) => c.id === 'battery')
  const windCard = telemetryCards.find((c) => c.id === 'wind')
  const droneConnected = Boolean(droneLink.droneConnected)
  const programadasCount = missions.filter((m) => m.estado === 'PROGRAMADA').length
  const operatingCeiling = deriveOperatingCeiling(geofences)
  const preflight = {
    ...PREFLIGHT_BASE,
    overallStatus: droneConnected ? 'Todo Listo' : 'Sin enlace',
    isReady: droneConnected,
    operatingCeiling: {
      ...PREFLIGHT_BASE.operatingCeiling,
      height: operatingCeiling != null ? `${operatingCeiling}m AGL` : '—',
      complianceText:
        operatingCeiling == null
          ? 'SIN ZONA ACTIVA'
          : operatingCeiling <= 200
            ? 'CUMPLE NORMATIVA'
            : 'EXCEDE NORMATIVA',
      isCompliant: operatingCeiling != null ? operatingCeiling <= 200 : null,
    },
    metrics: {
      wind: {
        ...PREFLIGHT_BASE.metrics.wind,
        value: windCard?.value ?? '—',
        statusLabel: windCard?.detail ?? (droneConnected ? 'Telemetría real' : 'Sin estación'),
      },
      battery: {
        ...PREFLIGHT_BASE.metrics.battery,
        value: batteryCard?.value ?? '—',
        statusLabel: droneConnected ? 'Telemetría real' : 'Sin datos',
      },
      rfSignal: {
        ...PREFLIGHT_BASE.metrics.rfSignal,
        value: droneConnected ? `${droneComm.signalQuality}%` : 'Sin enlace',
        statusLabel: droneConnected ? 'En línea' : 'Desconectado',
      },
    },
  }

  // 6. Estados de modales y herramientas del mapa
  const [isGeofenceManagerOpen, setIsGeofenceManagerOpen] = useState(false)
  const [flightStatusMessage, setFlightStatusMessage] = useState(null)
  const mapRef = useRef(null)

  const selectedMission = useMemo(
    () => missions.find((m) => m.id === selectedMissionId) || missions[0],
    [missions, selectedMissionId],
  )

  // Validación geométrica de la ruta frente a geocercas
  const routeValidation = useMemo(() => {
    if (!selectedMission) return { conflicts: [], hasCriticalConflict: false }
    return validateRouteAgainstGeofences(selectedMission.waypoints, geofences)
  }, [selectedMission, geofences])

  // El switch refleja el estado real del scheduler del servidor. La
  // escritura requiere ADMIN (PUT /missions/scheduler → 403 para GUARDIA):
  // el botón se renderiza deshabilitado mostrando el valor real.

  // Manejo del botón "Iniciar Vuelo" / "Monitorear En Vivo" para el perfil Guardia.
  // Iniciar misión PROGRAMADA está habilitado para GUARDIA en el backend.
  async function handleIniciarVuelo() {
    setFlightStatusMessage(null)
    if (!selectedMission) return

    // Misión ya en ejecución: ir directo a monitoreo
    if (selectedMission.estado === 'EN_CURSO') {
      navigate('/guardia/en-vivo', {
        state: { missionId: selectedMission.id, missionName: selectedMission.name },
      })
      return
    }

    if (selectedMission.estado !== 'PROGRAMADA') {
      setFlightStatusMessage({
        type: 'error',
        text: `La misión "${selectedMission.name}" está en estado ${selectedMission.estado} y no puede iniciarse.`,
      })
      return
    }

    // Comprobación 1: Señal y conexión del dron (telemetría real)
    if (!droneComm.isConnected) {
      setFlightStatusMessage({
        type: 'error',
        text: 'No se puede iniciar el vuelo: el dron se encuentra desconectado del enlace de radio.',
      })
      return
    }

    // Comprobación 2: Restricciones de seguridad y geocercas
    if (routeValidation.hasCriticalConflict) {
      const criticalZone = routeValidation.conflicts.find((c) => c.isRestricted)
      setFlightStatusMessage({
        type: 'critical',
        text: `Bloqueo de seguridad: La ruta "${selectedMission.name}" atraviesa la zona restringida "${criticalZone?.zoneName}". Motivo: ${criticalZone?.reason}. Requiere validación del centro de mando antes del despegue.`,
      })
      return
    }

    try {
      setPendingActionId(selectedMission.id)
      const started = await startMission(selectedMission.id)
      setFlightStatusMessage({
        type: 'success',
        text: `Misión "${started.name}" en ejecución. Redirigiendo a monitoreo En Vivo...`,
      })
      setTimeout(() => {
        navigate('/guardia/en-vivo', {
          state: {
            missionId: started.id,
            missionName: started.name,
            droneId: droneComm.model,
            isAutonomous: autonomousEnabled,
          },
        })
      }, 1200)
    } catch (error) {
      setFlightStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo iniciar la misión en el backend.',
      })
    } finally {
      setPendingActionId(null)
    }
  }

  // Cancelación de misión (permitido para GUARDIA: PROGRAMADA → CANCELADA; EN_CURSO → RTL)
  async function handleCancelMission(mission, event) {
    event?.stopPropagation?.()
    setFlightStatusMessage(null)
    try {
      setPendingActionId(mission.id)
      const cancelled = await cancelMission(mission.id)
      setFlightStatusMessage({
        type: 'success',
        text: `Misión "${cancelled.name}" ${cancelled.estado === 'CANCELANDO' ? 'en cancelación (RTL)' : 'cancelada'} correctamente.`,
      })
      await loadMissions({ silent: true })
    } catch (error) {
      setFlightStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo cancelar la misión.',
      })
    } finally {
      setPendingActionId(null)
    }
  }

  // Confirmación de aterrizaje tras interrupción (RECUPERACION → FALLIDA
  // con bitácora sellada). Habilitado para GUARDIA en el backend.
  async function handleConfirmLanded(mission, event) {
    event?.stopPropagation?.()
    setFlightStatusMessage(null)
    try {
      setPendingActionId(mission.id)
      const landed = await confirmMissionLanded(mission.id)
      setFlightStatusMessage({
        type: 'success',
        text: `Aterrizaje de "${landed.name}" confirmado — misión ${landed.estado}.`,
      })
      await loadMissions({ silent: true })
    } catch (error) {
      setFlightStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo confirmar el aterrizaje.',
      })
    } finally {
      setPendingActionId(null)
    }
  }

  // Manejadores de geocercas sincronizados.
  // Guardia no crea/edita/activa geocercas: solo consulta el listado, centra
  // zonas en el mapa y puede eliminar zonas (el backend responde 403 si la
  // zona proviene del servidor — el aviso se muestra al operador).
  function handleZoneFlyTo(bounds) {
    mapRef.current?.flyToBounds?.(bounds)
  }

  async function handleDeleteZone(zoneId) {
    const zone = geofences.find((z) => z.id === zoneId)
    if (zone?.backendId) {
      try {
        if (zone.backendKind === 'exclusion') {
          await deleteBackendExclusionZone(zone.backendId)
        } else {
          await deleteBackendGeofence(zone.backendId)
        }
      } catch (error) {
        setFlightStatusMessage({
          type: 'error',
          text:
            error?.status === 403
              ? 'Eliminar geocercas del servidor requiere perfil Administrador.'
              : 'No se pudo eliminar la geocerca en el servidor.',
        })
        return
      }
    }
    setGeofences((prev) => {
      const updated = prev.filter((z) => z.id !== zoneId)
      saveGeofences(updated)
      return updated
    })
  }

  return (
    <div className="rutas-page">
      <div className="rutas-shell">
        {/* ============================================================== */}
        {/* 1. ENCABEZADO Y ESTADO DEL DRON                                */}
        {/* ============================================================== */}
        <header className="rutas-header">
          <div className="rutas-brand">
            <img
              src={helmetLogo}
              alt="Emblema AeroLuferan"
              width={38}
              height={38}
              style={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0 }}
            />
            <div className="rutas-brand-text">
              <h1 className="rutas-brand-title">AeroLuferan</h1>
              <div className="rutas-brand-subtitle">
                <span>Geocerca & Rutas Activas</span>
              </div>
            </div>
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
                <span>{programadasCount} Rutas Programadas</span>
              </div>
            </div>

            <button
              type="button"
              className={`autonomous-toggle-btn${autonomousEnabled ? ' is-on' : ''}`}
              role="switch"
              aria-checked={autonomousEnabled}
              aria-label="Estado del vuelo autónomo (solo lectura para Guardia)"
              disabled
              title="Solo el perfil Administrador puede activar o pausar el vuelo autónomo"
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
                <span>En Vivo</span>
              </div>
            </header>

            {/* Mapa interactivo con Leaflet */}
            <div className="campus-map-box">
              <RutasMap
                ref={mapRef}
                geofences={geofences}
                selectedRoute={selectedMission}
                missionRoutes={missions}
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
                  <WarningBoltIcon size={16} color="#B45309" />
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
            disabled={
              !selectedMission ||
              pendingActionId !== null ||
              !['PROGRAMADA', 'EN_CURSO'].includes(selectedMission.estado)
            }
          >
            {!selectedMission
              ? 'Sin misión seleccionada'
              : selectedMission.estado === 'EN_CURSO'
                ? 'Monitorear En Vivo'
                : selectedMission.estado === 'PROGRAMADA'
                  ? pendingActionId === selectedMission.id ? 'Iniciando…' : 'Iniciar Vuelo'
                  : `Misión ${selectedMission.statusBadge || selectedMission.estado}`}
          </button>

          {/* ============================================================== */}
          {/* 5. SECCIÓN «VUELOS PROGRAMADOS»                                */}
          {/* Nota: En el perfil de Guardia NO se incluye el botón           */}
          {/* «Programar Nueva Ruta», función reservada para Admin.           */}
          {/* ============================================================== */}
          <section className="vuelos-programados-section" aria-labelledby="guard-vuelos-heading">
            <div className="vuelos-programados-header">
              <h2 id="guard-vuelos-heading">Vuelos Programados</h2>
              <span className="vuelos-count">
                {programadasCount} {programadasCount === 1 ? 'Ruta' : 'Rutas'}
              </span>
            </div>

            {missionsError && (
              <div className="missions-offline-banner" role="alert">
                <WarningBoltIcon size={14} color="#B45309" /> Sin conexión con el backend: {missionsError}
              </div>
            )}

            {!missionsError && isLoadingMissions && (
              <p className="missions-empty-note">Cargando misiones…</p>
            )}

            {!missionsError && !isLoadingMissions && missions.length === 0 && (
              <p className="missions-empty-note">
                No hay misiones registradas en el sistema.
              </p>
            )}

            <div className="vuelos-cards-list">
              {missions.map((mission) => {
                const isSelected = selectedMission && mission.id === selectedMission.id

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

                      <div className="vuelo-card-side">
                        <span
                          className={`vuelo-status-tag vuelo-status-tag--${mission.statusType || 'proximo'}`}
                        >
                          {mission.statusBadge || mission.status.toUpperCase()}
                        </span>
                        {['PROGRAMADA', 'EN_CURSO'].includes(mission.estado) && (
                          <button
                            type="button"
                            className="vuelo-cancel-btn"
                            disabled={pendingActionId === mission.id}
                            onClick={(e) => handleCancelMission(mission, e)}
                            title={mission.estado === 'EN_CURSO' ? 'Cancelar ejecución (RTL)' : 'Cancelar misión'}
                          >
                            {pendingActionId === mission.id ? '…' : 'Cancelar'}
                          </button>
                        )}
                        {mission.estado === 'RECUPERACION' && (
                          <button
                            type="button"
                            className="vuelo-cancel-btn"
                            disabled={pendingActionId === mission.id}
                            onClick={(e) => handleConfirmLanded(mission, e)}
                            title="Confirmar que el dron aterrizó y liberar la reserva (requiere rol Admin)"
                          >
                            {pendingActionId === mission.id ? '…' : 'Confirmar aterrizaje'}
                          </button>
                        )}
                      </div>
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
          </section>

          {/* ============================================================== */}
          {/* 6. VERIFICACIÓN DE PREVUELO                                    */}
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
          {/* 7. BOTÓN «AJUSTAR PERÍMETRO»                                   */}
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

        {/* Modal de gestión de geocercas (GUARDIA: solo consulta + eliminar) */}
        <GeofenceManagerModal
          isOpen={isGeofenceManagerOpen}
          onClose={() => setIsGeofenceManagerOpen(false)}
          geofences={geofences}
          onDeleteZone={handleDeleteZone}
          onFlyToZone={handleZoneFlyTo}
          readOnly
        />

        {/* ============================================================== */}
        {/* 8. BARRA DE NAVEGACIÓN INFERIOR (PERFIL GUARDIA)               */}
        {/* ============================================================== */}
        <GuardiaBottomNav activePath="/guardia/rutas" />
      </div>
    </div>
  )
}
