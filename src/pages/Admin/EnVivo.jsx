import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import DroneVideoPlayer from '../../components/DroneVideoPlayer.jsx'
import MissionProgressPanel from '../../components/MissionProgressPanel.jsx'
import EmergencyStopModal from '../../components/EmergencyStopModal.jsx'
import {
  AltitudeIcon,
  BatteryIcon,
  CheckIcon,
  CompassIcon,
  HeliportIcon,
  HomeIcon,
  PauseIcon,
  PlaneIcon,
  PlayIcon,
  SatelliteIcon,
  ShieldIcon,
  StopIcon,
  WindIcon,
} from '../../components/EnVivoIcons.jsx'
import useDroneTelemetry from '../../hooks/useDroneTelemetry.js'
import useLiveVideoStream from '../../hooks/useLiveVideoStream.js'
import {
  confirmMissionLanded,
  startMission,
} from '../../services/missionService.js'
import droneControlService from '../../services/droneControlService.js'
import aeroluferanLogo from '../../assets/aeroluferan-logo.png'
import { refreshTelemetry, selectChargingBase } from '../../services/telemetryService.js'
import {
  requestEmergencyStop,
  requestPauseFlight,
  requestResumeFlight,
  requestReturnToBase,
  requestSetFailsafe,
} from './droneCommands.js'
import './EnVivo.css'

const telemetryIcons = {
  battery: BatteryIcon,
  altitude: AltitudeIcon,
  wind: WindIcon,
  gps: SatelliteIcon,
}

const MISSION_EYEBROW = {
  PROGRAMADA: 'MISIÓN PROGRAMADA',
  EN_CURSO: 'VUELO ACTIVO',
  RECUPERACION: 'EN RECUPERACIÓN',
  CANCELANDO: 'CANCELANDO',
}

function FlightCard({ flight }) {
  const eyebrow = flight.missionEstado
    ? MISSION_EYEBROW[flight.missionEstado] || flight.missionEstado
    : 'MISIÓN'
  return (
    <section className="flight-card" aria-label="Vuelo activo">
      <span className="flight-card__icon">
        <CompassIcon />
      </span>
      <div className="flight-card__details">
        <span className="flight-card__eyebrow">{eyebrow}</span>
        <strong>{flight.route}</strong>
      </div>
      <span className="flight-card__milestone">
        Hito <strong>{flight.milestone} / {flight.totalMilestones}</strong>
      </span>
    </section>
  )
}

function TelemetryCard({ item }) {
  const Icon = telemetryIcons[item.id] || CompassIcon

  return (
    <article className={`telemetry-card telemetry-card--${item.id}`} aria-label={item.label}>
      <span className="telemetry-card__icon">
        <Icon />
      </span>
      <strong className="telemetry-card__value">{item.value}</strong>
      <span className={`telemetry-card__detail${item.status ? ` is-${item.status}` : ''}`}>
        {item.detail}
      </span>
    </article>
  )
}

function QuickActions({ mode, isPaused, missionEstado, missionBusy, droneConnected, canReturnToBase, connectionBusy, failsafeEnabled, failsafeBusy, onStartMission, onConfirmLanded, onStartPreset, onScheduleRoute, onTogglePause, onReturnToBase, onToggleFailsafe, onToggleConnection, onRequestEmergencyStop, actionMessage }) {
  return (
    <section className="quick-actions" aria-labelledby="quick-actions-title">
      <div className="quick-actions__heading">
        <h2 id="quick-actions-title">Acciones Rápidas</h2>
        <span>{mode}</span>
      </div>
      <div className="quick-actions__buttons">
        {missionEstado === 'PROGRAMADA' && (
          <button
            className="drone-action drone-action--mission"
            type="button"
            onClick={onStartMission}
            disabled={missionBusy}
          >
            <span className="drone-action__icon">
              <PlayIcon />
            </span>
            <span>{missionBusy ? 'Iniciando…' : 'Iniciar Misión'}</span>
          </button>
        )}

        {missionEstado === 'RECUPERACION' && (
          <button
            className="drone-action drone-action--mission"
            type="button"
            onClick={onConfirmLanded}
            disabled={missionBusy}
          >
            <span className="drone-action__icon">
              <CheckIcon />
            </span>
            <span>{missionBusy ? 'Confirmando…' : 'Confirmar Aterrizaje'}</span>
          </button>
        )}

        {!missionEstado && (
          <>
            <button
              className="drone-action drone-action--mission"
              type="button"
              onClick={onStartPreset}
              disabled={missionBusy}
            >
              <span className="drone-action__icon">
                <PlayIcon />
              </span>
              <span>{missionBusy ? 'Iniciando…' : 'Iniciar Ruta'}</span>
            </button>
            <button
              className="drone-action"
              type="button"
              onClick={onScheduleRoute}
            >
              <span className="drone-action__icon">
                <CompassIcon />
              </span>
              <span>Programar Ruta</span>
            </button>
          </>
        )}

        {(missionEstado === 'EN_CURSO' || isPaused) && (
          <button
            className={`drone-action${isPaused ? ' drone-action--resume' : ''}`}
            type="button"
            onClick={onTogglePause}
          >
            <span className="drone-action__icon">
              {isPaused ? <PlayIcon /> : <PauseIcon />}
            </span>
            <span>{isPaused ? 'Reanudar Vuelo' : 'Pausar Vuelo'}</span>
          </button>
        )}

        <button
          className="drone-action"
          type="button"
          onClick={onReturnToBase}
          disabled={!canReturnToBase}
        >
          <span className="drone-action__icon">
            <HomeIcon />
          </span>
          <span>Volver a Base</span>
        </button>

        <button
          className="drone-action"
          type="button"
          onClick={onToggleFailsafe}
          disabled={failsafeBusy || !droneConnected}
        >
          <span className="drone-action__icon">
            <ShieldIcon />
          </span>
          <span>
            {failsafeBusy
              ? 'Actualizando Failsafe…'
              : failsafeEnabled
                ? 'Failsafe GCS Activo'
                : 'Armar Failsafe GCS'}
          </span>
        </button>

        <button
          className="drone-action"
          type="button"
          onClick={onToggleConnection}
          disabled={connectionBusy}
        >
          <span className="drone-action__icon">
            <PlaneIcon />
          </span>
          <span>
            {connectionBusy
              ? 'Procesando MAVLink…'
              : droneConnected
                ? 'Desconectar MAVLink'
                : 'Conectar MAVLink'}
          </span>
        </button>

        {(missionEstado === 'EN_CURSO' || isPaused) && (
          <button
            className="drone-action drone-action--emergency"
            type="button"
            onClick={onRequestEmergencyStop}
          >
            <span className="drone-action__icon">
              <StopIcon />
            </span>
            <span>Detener Vuelo / Parada Inmediata</span>
          </button>
        )}

        {actionMessage && (
          <p className="drone-action-message" role="status">
            {actionMessage}
          </p>
        )}
      </div>
    </section>
  )
}

function stationLabel(station) {
  if (station.station_id === 'helipuerto_norte') return 'Base Norte'
  if (station.station_id === 'helipuerto_sur') return 'Base Sur'
  return station.nombre || station.codigo || station.station_id
}

function HeliportCard({ heliport, onSelectStation, stationBusy }) {
  const stations = heliport.stations || []
  return (
    <section className="heliport-card" aria-label="Estado del helipuerto">
      <div className="heliport-card__main">
        <span className="heliport-card__icon">
          <HeliportIcon />
        </span>
        <div className="heliport-card__details">
          <strong>{heliport.name}</strong>
          <span>{heliport.landingSystem}</span>
        </div>
        <span className="heliport-card__availability">{heliport.availability}</span>
      </div>
      <div className="heliport-card__status">
        <span>
          <CheckIcon />
          {heliport.protectionDome}
        </span>
        <strong>{heliport.landingStatus}</strong>
        {stations.length > 0 && (
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {stations.map((station) => {
              const active = station.station_id === heliport.stationId
              return (
                <button
                  key={station.station_id}
                  type="button"
                  disabled={stationBusy || active}
                  onClick={() => onSelectStation(station.station_id)}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 999,
                    padding: '5px 10px',
                    font: 'inherit',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: active ? '#fff' : '#334155',
                    background: active ? '#0f766e' : '#fff',
                  }}
                >
                  {stationLabel(station)}
                </button>
              )
            })}
          </span>
        )}
      </div>
    </section>
  )
}

function EnVivo() {
  const navigate = useNavigate()
  const { drone, flight, preview, cards, quickActions, heliport, link, raw } = useDroneTelemetry()
  const { streamUrl, isLive, connectionState, info: streamInfo } = useLiveVideoStream()
  const droneConnected = Boolean(link?.droneConnected)
  const canReturnToBase = droneConnected && Boolean(flight.armed)
  const isPaused = Boolean(flight.isPaused)

  const [actionMessage, setActionMessage] = useState('')
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false)
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false)
  const [emergencyError, setEmergencyError] = useState('')
  const [missionBusy, setMissionBusy] = useState(false)
  const [connectionBusy, setConnectionBusy] = useState(false)
  const [failsafeBusy, setFailsafeBusy] = useState(false)
  const [stationBusy, setStationBusy] = useState(false)

  async function handleStartMission() {
    if (!flight.missionId) return
    try {
      setMissionBusy(true)
      setActionMessage('')
      await startMission(flight.missionId)
      setActionMessage(`Misión "${flight.route}" iniciada.`)
      await refreshTelemetry()
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo iniciar la misión.',
      )
    } finally {
      setMissionBusy(false)
    }
  }

  async function handleConfirmLanded() {
    if (!flight.missionId) return
    try {
      setMissionBusy(true)
      setActionMessage('')
      await confirmMissionLanded(flight.missionId)
      setActionMessage(`Aterrizaje confirmado: "${flight.route}" finalizada.`)
      await refreshTelemetry()
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo confirmar el aterrizaje.',
      )
    } finally {
      setMissionBusy(false)
    }
  }

  function handleScheduleRoute() {
    navigate('/admin/programar-ruta')
  }

  async function handleStartPreset() {
    try {
      setMissionBusy(true)
      setActionMessage('')
      const result = await droneControlService.startPresetPatrol('clasica')
      setActionMessage(result?.status || 'Patrullaje iniciado.')
      await refreshTelemetry()
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo iniciar la ruta.',
      )
    } finally {
      setMissionBusy(false)
    }
  }

  async function handleTogglePause() {
    try {
      setActionMessage('')
      const result = isPaused ? await requestResumeFlight() : await requestPauseFlight()
      setActionMessage(result?.status || (isPaused ? 'Vuelo reanudado.' : 'Vuelo pausado.'))
      await refreshTelemetry()
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo pausar o reanudar el vuelo.',
      )
    }
  }

  async function handleReturnToBase() {
    if (!canReturnToBase) {
      setActionMessage('El dron debe estar conectado y en vuelo para regresar a base.')
      return
    }
    try {
      setActionMessage('')
      const result = await requestReturnToBase(heliport?.stationId)
      setActionMessage(result?.status || `Regreso ordenado hacia ${heliport?.name || 'la base'}.`)
      await refreshTelemetry()
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo ordenar el regreso a base.',
      )
    }
  }

  async function handleToggleFailsafe() {
    const nextEnabled = !flight.failsafeGcs
    try {
      setFailsafeBusy(true)
      setActionMessage('')
      await requestSetFailsafe(nextEnabled)
      setActionMessage(
        nextEnabled
          ? 'Failsafe GCS activado: el dron volverá a base si pierde el enlace.'
          : 'Failsafe GCS desactivado.',
      )
      await refreshTelemetry()
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo actualizar el failsafe GCS.',
      )
    } finally {
      setFailsafeBusy(false)
    }
  }

  async function handleToggleConnection() {
    try {
      setConnectionBusy(true)
      setActionMessage('')
      const result = droneConnected
        ? await droneControlService.disconnect()
        : await droneControlService.connect()
      setActionMessage(result?.status || (droneConnected ? 'MAVLink desconectado.' : 'MAVLink conectado.'))
      await refreshTelemetry()
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo actualizar la conexión MAVLink.',
      )
    } finally {
      setConnectionBusy(false)
    }
  }

  async function handleSelectStation(stationId) {
    try {
      setStationBusy(true)
      setActionMessage('')
      const station = await selectChargingBase(stationId)
      setActionMessage(`Estación activa: ${station?.nombre || stationId}.`)
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo seleccionar la estación.',
      )
    } finally {
      setStationBusy(false)
    }
  }

  function closeEmergencyModal() {
    if (isEmergencyStopping) return
    setEmergencyError('')
    setIsEmergencyModalOpen(false)
  }

  async function handleConfirmEmergencyStop() {
    try {
      setIsEmergencyStopping(true)
      setActionMessage('')
      setEmergencyError('')
      const result = await requestEmergencyStop()
      setActionMessage(result?.status || 'Parada de emergencia ejecutada.')
      await refreshTelemetry()
      setIsEmergencyModalOpen(false)
    } catch (error) {
      setEmergencyError(
        error instanceof Error ? error.message : 'No se pudo ejecutar la parada inmediata.',
      )
    } finally {
      setIsEmergencyStopping(false)
    }
  }

  return (
    <div className="admin-live-page">
      {/* Encabezado Superior */}
      <header className="live-header">
        <div className="live-header__brand">
          <img
            className="live-header__logo"
            src={aeroluferanLogo}
            alt="Emblema AeroLuferan"
          />
          <div className="live-header__brand-copy">
            <h1>{drone.name}</h1>
            <span>
              {drone.model} <i /> <b>{isPaused ? 'Vuelo Pausado' : (drone.patrolStatus || '—')}</b>
            </span>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="live-content">
        <FlightCard flight={flight} />

        {/* Columna izquierda: video que crece + progreso de misión */}
        <div className="live-media-col">
          {/* Reproductor de video en vivo (MJPEG del backend) */}
          <DroneVideoPlayer
            streamUrl={streamUrl}
            isLive={isLive}
            connectionState={connectionState}
            vueloId={flight.missionId}
            preview={{
              ...preview,
              resolution: streamInfo
                ? `${streamInfo.resolucion} ${streamInfo.fps}fps`
                : preview.resolution,
            }}
          />

          {/* Progreso de la misión: ocupa la columna bajo el video */}
          <MissionProgressPanel mission={raw?.mission} />
        </div>

        {/* Columna derecha: rail de telemetría y acciones */}
        <div className="live-rail-col">
          {/* Cuatro tarjetas de telemetría */}
          <section
            className="telemetry-grid"
            aria-label="Telemetría en tiempo real del dron"
          >
            {cards.map((item) => (
              <TelemetryCard key={item.id} item={item} />
            ))}
          </section>

          {/* Acciones Rápidas */}
          <QuickActions
            mode={quickActions?.mode || flight.mode}
            isPaused={isPaused}
            missionEstado={flight.missionEstado}
            missionBusy={missionBusy}
            droneConnected={droneConnected}
            canReturnToBase={canReturnToBase}
            connectionBusy={connectionBusy}
            failsafeEnabled={Boolean(flight.failsafeGcs)}
            failsafeBusy={failsafeBusy}
            onStartMission={handleStartMission}
            onConfirmLanded={handleConfirmLanded}
            onStartPreset={handleStartPreset}
            onScheduleRoute={handleScheduleRoute}
            onTogglePause={handleTogglePause}
            onReturnToBase={handleReturnToBase}
            onToggleFailsafe={handleToggleFailsafe}
            onToggleConnection={handleToggleConnection}
            onRequestEmergencyStop={() => setIsEmergencyModalOpen(true)}
            actionMessage={actionMessage}
          />

          {/* Tarjeta de Helipuerto */}
          <HeliportCard
            heliport={heliport}
            onSelectStation={handleSelectStation}
            stationBusy={stationBusy}
          />
        </div>
      </main>

      {/* Navegación Inferior de Admin */}
      <AdminBottomNav activePath="/admin/en-vivo" />

      {/* Modal de confirmación para parada inmediata */}
      <EmergencyStopModal
        isOpen={isEmergencyModalOpen}
        isLoading={isEmergencyStopping}
        error={emergencyError}
        onClose={closeEmergencyModal}
        onConfirm={handleConfirmEmergencyStop}
      />
    </div>
  )
}

export default EnVivo
