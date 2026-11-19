import { useState } from 'react'
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
  SignalIcon,
  StopIcon,
  WindIcon,
} from '../../components/EnVivoIcons.jsx'
import useDroneTelemetry from '../../hooks/useDroneTelemetry.js'
import useWebRTCStream from '../../hooks/useWebRTCStream.js'
import {
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

function FlightCard({ flight }) {
  return (
    <section className="flight-card" aria-label="Vuelo activo">
      <span className="flight-card__icon">
        <CompassIcon />
      </span>
      <div className="flight-card__details">
        <span className="flight-card__eyebrow">VUELO ACTIVO</span>
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

function DroneActionButton({ action, Icon, children, variant = '' }) {
  const [message, setMessage] = useState('')

  async function handleAction() {
    try {
      setMessage('')
      await action()
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No se pudo enviar el comando al dron.',
      )
    }
  }

  return (
    <>
      <button
        className={`drone-action${variant ? ` drone-action--${variant}` : ''}`}
        type="button"
        onClick={handleAction}
      >
        <span className="drone-action__icon">
          <Icon />
        </span>
        <span>{children}</span>
      </button>
      {message && (
        <p className="drone-action-message" role="status">
          {message}
        </p>
      )}
    </>
  )
}

function QuickActions({ mode, isPaused, onTogglePause, onReturnToBase, onRequestEmergencyStop, actionMessage }) {
  return (
    <section className="quick-actions" aria-labelledby="quick-actions-title">
      <div className="quick-actions__heading">
        <h2 id="quick-actions-title">Acciones Rápidas</h2>
        <span>{mode}</span>
      </div>
      <div className="quick-actions__buttons">
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
          className="drone-action drone-action--emergency"
          type="button"
          onClick={onRequestEmergencyStop}
        >
          <span className="drone-action__icon">
            <StopIcon />
          </span>
          <span>Detener Vuelo / Parada Inmediata</span>
        </button>

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
  const { drone, flight, preview, cards, quickActions, heliport } = useDroneTelemetry()
  const { stream, isLive, connectionState } = useWebRTCStream()

  const [isPaused, setIsPaused] = useState(Boolean(flight.isPaused))
  const [actionMessage, setActionMessage] = useState('')
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false)
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false)

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
            <span />
          </span>
          <div className="live-header__brand-copy">
            <h1>{drone.name}</h1>
            <span>
              {drone.model} <i /> <b>{isPaused ? 'Vuelo Pausado' : (drone.patrolStatus || 'En Patrullaje')}</b>
            </span>
          </div>
        </div>
        <span className="live-header__signal">
          <SignalIcon />
          {drone.signalPercentage}% Señal
        </span>
      </header>

      {/* Contenido Principal */}
      <main className="live-content">
        <FlightCard flight={flight} />

        {/* Reproductor WebRTC Reutilizable */}
        <DroneVideoPlayer
          stream={stream}
          isLive={isLive}
          connectionState={connectionState}
          preview={preview}
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
          onTogglePause={handleTogglePause}
          onReturnToBase={handleReturnToBase}
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
