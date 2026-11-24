import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import DroneVideoPlayer from '../../components/DroneVideoPlayer.jsx'
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
import { refreshTelemetry } from '../../services/telemetryService.js'
import {
  requestArmFailsafe,
  requestEmergencyStop,
  requestPauseFlight,
  requestResumeFlight,
  requestReturnToBase,
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

function QuickActions({ mode, isPaused, missionEstado, missionBusy, onStartMission, onConfirmLanded, onStartPreset, onScheduleRoute, onTogglePause, onReturnToBase, onArmFailsafe, onRequestEmergencyStop, actionMessage }) {
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
        >
          <span className="drone-action__icon">
            <HomeIcon />
          </span>
          <span>Volver a Base</span>
        </button>

        <button
          className="drone-action"
          type="button"
          onClick={onArmFailsafe}
        >
          <span className="drone-action__icon">
            <ShieldIcon />
          </span>
          <span>Armar Failsafe GCS</span>
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

function HeliportCard({ heliport }) {
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
      </div>
    </section>
  )
}

function EnVivo() {
  const navigate = useNavigate()
  const { drone, flight, preview, cards, quickActions, heliport } = useDroneTelemetry()
  const { streamUrl, isLive, connectionState, info: streamInfo } = useLiveVideoStream()

  const [isPaused, setIsPaused] = useState(Boolean(flight.isPaused))
  const [actionMessage, setActionMessage] = useState('')
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false)
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false)
  const [missionBusy, setMissionBusy] = useState(false)

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
      if (isPaused) {
        await requestResumeFlight()
        setIsPaused(false)
      } else {
        await requestPauseFlight()
        setIsPaused(true)
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo pausar o reanudar el vuelo.',
      )
    }
  }

  async function handleReturnToBase() {
    try {
      setActionMessage('')
      await requestReturnToBase(heliport?.stationNumber || '01')
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo ordenar el regreso a base.',
      )
    }
  }

  async function handleArmFailsafe() {
    try {
      setActionMessage('')
      const result = await requestArmFailsafe()
      setActionMessage(
        result?.message || 'Failsafe GCS armado: el dron volverá a base si pierde el enlace.',
      )
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo armar el failsafe GCS.',
      )
    }
  }

  async function handleConfirmEmergencyStop() {
    try {
      setIsEmergencyStopping(true)
      setActionMessage('')
      await requestEmergencyStop()
      setIsEmergencyModalOpen(false)
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : 'No se pudo ejecutar la parada inmediata.',
      )
    } finally {
      setIsEmergencyStopping(false)
      setIsEmergencyModalOpen(false)
    }
  }

  return (
    <div className="admin-live-page">
      {/* Encabezado Superior */}
      <header className="live-header">
        <div className="live-header__brand">
          <span className="live-header__drone-icon">
            <PlaneIcon />
          </span>
          <div className="live-header__brand-copy">
            <h1>{drone.name}</h1>
            <span>
              {drone.model} <i /> <b>{isPaused ? 'Vuelo Pausado' : (drone.patrolStatus || 'En Patrullaje')}</b>
            </span>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="live-content">
        <FlightCard flight={flight} />

        {/* Reproductor de video en vivo (MJPEG del backend) */}
        <DroneVideoPlayer
          streamUrl={streamUrl}
          isLive={isLive}
          connectionState={connectionState}
          preview={{
            ...preview,
            resolution: streamInfo
              ? `${streamInfo.resolucion} ${streamInfo.fps}fps`
              : preview.resolution,
          }}
        />

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
          onStartMission={handleStartMission}
          onConfirmLanded={handleConfirmLanded}
          onStartPreset={handleStartPreset}
          onScheduleRoute={handleScheduleRoute}
          onTogglePause={handleTogglePause}
          onReturnToBase={handleReturnToBase}
          onArmFailsafe={handleArmFailsafe}
          onRequestEmergencyStop={() => setIsEmergencyModalOpen(true)}
          actionMessage={actionMessage}
        />

        {/* Tarjeta de Helipuerto */}
        <HeliportCard heliport={heliport} />
      </main>

      {/* Navegación Inferior de Admin */}
      <AdminBottomNav activePath="/admin/en-vivo" />

      {/* Modal de confirmación para parada inmediata */}
      <EmergencyStopModal
        isOpen={isEmergencyModalOpen}
        isLoading={isEmergencyStopping}
        onClose={() => setIsEmergencyModalOpen(false)}
        onConfirm={handleConfirmEmergencyStop}
      />
    </div>
  )
}

export default EnVivo
