import { useRef, useState } from 'react'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import {
  AltitudeIcon,
  BatteryIcon,
  CheckIcon,
  CompassIcon,
  ExpandIcon,
  HeliportIcon,
  HomeIcon,
  PauseIcon,
  PlaneIcon,
  SatelliteIcon,
  ShieldIcon,
  SignalIcon,
  StopIcon,
  WindIcon,
} from '../../components/EnVivoIcons.jsx'
import campusReference from '../../assets/campus-reference.svg'
import {
  requestEmergencyStop,
  requestPauseFlight,
  requestReturnToBase,
} from './droneCommands.js'
import { enVivoDemoData } from './enVivoDemoData.js'
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

function LiveIndicator({ status }) {
  return (
    <span className="preview-live-indicator">
      <span className="preview-live-dot" />
      {status}
    </span>
  )
}

function TelemetryOverlay({ preview }) {
  return (
    <>
      <div className="preview-crosshair" aria-hidden="true">
        <span />
      </div>
      <div className="preview-area-status">
        <span className="preview-area-dot" />
        <span>
          <strong>✓ {preview.observedArea}</strong>
          <span>{preview.areaStatus}</span>
        </span>
      </div>
      <div className="preview-readings">
        <span className="preview-reading">
          <CompassIcon />
          {preview.heading}
        </span>
        <span className="preview-reading">{preview.tilt}</span>
      </div>
    </>
  )
}

function LivePreview({ preview }) {
  const previewRef = useRef(null)
  const [fullscreenMessage, setFullscreenMessage] = useState('')

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (previewRef.current?.requestFullscreen) {
        await previewRef.current.requestFullscreen()
      } else {
        setFullscreenMessage('La pantalla completa no está disponible en este navegador.')
      }
    } catch (error) {
      setFullscreenMessage(
        error instanceof Error ? error.message : 'No se pudo abrir la pantalla completa.',
      )
    }
  }

  return (
    <section className="live-preview-section" aria-label="Vista de referencia del dron">
      <div className="live-preview" ref={previewRef}>
        <img
          className="live-preview__image"
          src={campusReference}
          alt="Ilustración estática de referencia de un edificio del campus y sus jardines"
        />
        <div className="preview-topline">
          <LiveIndicator status={preview.status} />
          <span className="preview-quality">{preview.resolution}</span>
          <span className="preview-encryption">
            <ShieldIcon />
            {preview.encryption}
          </span>
        </div>
        <span className="preview-demo-note">
          VISTA DE REFERENCIA · SIN TRANSMISIÓN REAL
        </span>
        <TelemetryOverlay preview={preview} />
        <button
          className="preview-fullscreen"
          type="button"
          aria-label="Abrir vista previa en pantalla completa"
          onClick={toggleFullscreen}
        >
          <ExpandIcon />
        </button>
      </div>
      {fullscreenMessage && (
        <p className="preview-message" role="status">{fullscreenMessage}</p>
      )}
    </section>
  )
}

function TelemetryCard({ item }) {
  const Icon = telemetryIcons[item.id]

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
        <span className="drone-action__icon"><Icon /></span>
        <span>{children}</span>
      </button>
      {message && <p className="drone-action-message" role="status">{message}</p>}
    </>
  )
}

function QuickActions({ mode }) {
  return (
    <section className="quick-actions" aria-labelledby="quick-actions-title">
      <div className="quick-actions__heading">
        <h2 id="quick-actions-title">Acciones Rápidas</h2>
        <span>{mode}</span>
      </div>
      <div className="quick-actions__buttons">
        <DroneActionButton action={requestPauseFlight} Icon={PauseIcon}>
          Pausar Vuelo
        </DroneActionButton>
        <DroneActionButton action={requestReturnToBase} Icon={HomeIcon}>
          Volver a Base
        </DroneActionButton>
        <DroneActionButton
          action={requestEmergencyStop}
          Icon={StopIcon}
          variant="emergency"
        >
          Detener Vuelo / Parada Inmediata
        </DroneActionButton>
      </div>
    </section>
  )
}

function HeliportCard({ heliport }) {
  return (
    <section className="heliport-card" aria-label="Estado del helipuerto">
      <div className="heliport-card__main">
        <span className="heliport-card__icon"><HeliportIcon /></span>
        <div className="heliport-card__details">
          <strong>{heliport.name}</strong>
          <span>{heliport.landingSystem}</span>
        </div>
        <span className="heliport-card__availability">{heliport.availability}</span>
      </div>
      <div className="heliport-card__status">
        <span><CheckIcon />{heliport.protectionDome}</span>
        <strong>{heliport.landingStatus}</strong>
      </div>
    </section>
  )
}

function EnVivo() {
  const { drone, flight, preview, telemetry, quickActions, heliport, pendingAlerts } =
    enVivoDemoData

  return (
    <div className="admin-live-page">
      <header className="live-header">
        <div className="live-header__brand">
          <span className="live-header__drone-icon">
            <PlaneIcon />
            <span />
          </span>
          <div className="live-header__brand-copy">
            <h1>{drone.name}</h1>
            <span>
              {drone.model} <i /> <b>{drone.patrolStatus}</b>
            </span>
          </div>
        </div>
        <span className="live-header__signal">
          <SignalIcon />
          {drone.signal}
          <small>DEMO</small>
        </span>
      </header>

      <main className="live-content">
        <FlightCard flight={flight} />
        <LivePreview preview={preview} />

        <section className="telemetry-grid" aria-label="Telemetría del dron (datos de demostración)">
          {telemetry.map((item) => <TelemetryCard key={item.id} item={item} />)}
        </section>

        <QuickActions mode={quickActions.mode} />
        <HeliportCard heliport={heliport} />
      </main>

      <AdminBottomNav pendingAlerts={pendingAlerts} />
    </div>
  )
}

export default EnVivo
