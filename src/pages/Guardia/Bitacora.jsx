import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GuardiaBottomNav from '../../components/GuardiaBottomNav.jsx'
import {
  AeroHelmetLogo,
  AlertWarningIcon,
  ArrowsSwitchIcon,
  BatteryGaugeIcon,
  CalendarRetentionIcon,
  CameraRecordIcon,
  CheckShieldHashIcon,
  ClearXIcon,
  ClockHistoryIcon,
  CloseModalIcon,
  DistancePathIcon,
  MountainAltitudeIcon,
  PlayCircleIcon,
  PlayFilledMiniIcon,
  SearchGlassIcon,
  ShieldRbacIcon,
  WindSpeedIcon,
} from '../../components/BitacoraIcons.jsx'
import {
  calculateRetention,
  getStoredFlights,
} from '../Admin/bitacoraData.js'
import { getCurrentUser, logoutUser } from '../Admin/authSession.js'
import { getOrCreateFlightVideoUrl } from '../Admin/videoDemoHelper.js'
import { refreshFlightLog } from '../../services/flightLogService.js'
import './Bitacora.css'

/**
 * Componente individual de tarjeta de vuelo histórico para perfil Guardia.
 * Exclusivo: NO incluye botón ni opciones de descarga de video.
 */
function FlightHistoryCard({
  flight,
  onOpenVideo,
  onOpenAudit,
}) {
  const retention = useMemo(() => calculateRetention(flight.storedAt), [flight.storedAt])
  const [isPlayingInCard, setIsPlayingInCard] = useState(false)
  const [videoSrc, setVideoSrc] = useState(flight.video.videoUrl || null)
  const videoRef = useRef(null)

  // Cargar stream de video si el usuario reproduce directamente en la tarjeta
  async function handleToggleInCardPlay() {
    if (retention.isExpired) return

    if (!videoSrc) {
      const generatedUrl = await getOrCreateFlightVideoUrl(flight)
      if (generatedUrl) {
        setVideoSrc(generatedUrl)
      }
    }

    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
        setIsPlayingInCard(true)
      } else {
        videoRef.current.pause()
        setIsPlayingInCard(false)
      }
    } else {
      setIsPlayingInCard(true)
    }
  }

  return (
    <article className="flight-card-bitacora" aria-label={`Registro de Vuelo ${flight.flightNumber}`}>
      {/* 1. Encabezado de la tarjeta: Título e indicador de incidentes */}
      <div className="flight-card__header">
        <div className="flight-card__title-group">
          <div className="flight-card__main-title">
            <span className="flight-card__word">{flight.flightNumberLabel}</span>
            <span className="flight-card__number">{flight.flightCode}</span>
          </div>
          <span className="flight-card__circuit">{flight.circuitLabel}</span>
        </div>

        {/* Indicador de incidentes */}
        <div
          className={`incident-badge incident-badge--${flight.incidentBadge.type}`}
          role="status"
          aria-label={flight.incidentBadge.hasIncidents ? `${flight.incidentBadge.count} incidencia reportada` : 'Sin incidencias'}
        >

          <div className="incident-badge__lines">
            <span>{flight.incidentBadge.textLine1}</span>
            <span>{flight.incidentBadge.textLine2}</span>
          </div>
        </div>
      </div>

      {/* 2. Información del operador responsable o modo autónomo */}
      <div className="flight-card__operator">
        {flight.operator.displayText}
      </div>

      {/* 3. Fecha, horario, duración y retención de 30 días */}
      <div className="flight-card__meta-row">
        <div className="flight-card__time">
          <ClockHistoryIcon size={16} />
          <span>{flight.dateDisplay}</span>
        </div>

        <div
          className={`retention-indicator retention-indicator--${retention.statusType}`}
          title={retention.description}
        >
          <CalendarRetentionIcon size={12} />
          <span>{retention.label}</span>
        </div>
      </div>

      {/* 4. Reproductor de video nativo HTML5 */}
      <div className="video-player-container">
        <span className="video-player__tag">
          <CameraRecordIcon size={14} />
          {flight.video.title}
        </span>

        {retention.isExpired ? (
          <div className="video-player__expired-overlay">
            <AlertWarningIcon size={28} color="#fca5a5" />
            <strong>Grabación no disponible</strong>
            <p>El archivo de video ha superado el límite de 30 días de retención legal y fue purgado del servidor.</p>
          </div>
        ) : isPlayingInCard ? (
          <video
            ref={videoRef}
            className="video-player__media"
            src={videoSrc || undefined}
            poster={flight.video.poster}
            controls
            autoPlay
            playsInline
            onEnded={() => setIsPlayingInCard(false)}
          >
            Tu navegador no soporta reproducción de video HTML5.
          </video>
        ) : (
          <>
            <img
              className="video-player__media"
              src={flight.video.poster}
              alt={`Fotograma de patrullaje de ${flight.missionName}`}
            />
            <button
              type="button"
              className="video-player__play-overlay"
              aria-label={`Reproducir grabación del Vuelo ${flight.flightNumber}`}
              onClick={handleToggleInCardPlay}
            >
              <PlayCircleIcon size={52} />
            </button>
          </>
        )}
      </div>

      {/* 5. Tarjeta de datos de telemetría histórica */}
      <div className="telemetry-bar" aria-label="Telemetría registrada durante el vuelo">
        <span className="telemetry-metric">
          <BatteryGaugeIcon size={16} />
          {flight.telemetry.battery}
        </span>
        <span className="telemetry-metric">
          <DistancePathIcon size={16} />
          {flight.telemetry.distance}
        </span>
        <span className="telemetry-metric">
          <MountainAltitudeIcon size={16} />
          {flight.telemetry.altitude}
        </span>
        <span className="telemetry-metric">
          <WindSpeedIcon size={16} />
          {flight.telemetry.wind}
        </span>
      </div>

      {/* 6. Integridad y registro criptográfico SHA-256 */}
      <div className="integrity-row">
        <button
          type="button"
          className="integrity-left"
          onClick={() => onOpenAudit(flight)}
          title="Verificar registro criptográfico inmutable en la cadena de auditoría"
        >
          <CheckShieldHashIcon size={16} />
          <span>Hash SHA-256: {flight.integrity.hash}</span>
        </button>
        <span className="integrity-right">{flight.integrity.blockNumber}</span>
      </div>

      {/* 7. Botón de acción: Ver Grabación (Sin botón de descarga para perfil Guardia) */}
      <div className="flight-actions-row">
        <button
          type="button"
          className={`btn-view-recording btn-view-recording--${flight.buttonVariant || 'solid'}`}
          disabled={retention.isExpired}
          onClick={() => onOpenVideo(flight)}
          title={
            retention.isExpired
              ? 'La grabación ha expirado y ya no se encuentra alojada en el servidor.'
              : `Abrir visor completo de grabación del Vuelo ${flight.flightNumber}`
          }
        >
          <PlayFilledMiniIcon size={16} />
          <span>Ver Grabación</span>
        </button>
      </div>
    </article>
  )
}

/**
 * Modal de confirmación para Cambiar Vista (Cierre de Sesión RBAC)
 */
function SwitchUserModal({ isOpen, onClose, onConfirm, currentUser }) {
  if (!isOpen) return null

  return (
    <div className="bitacora-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="switch-modal-title">
      <div className="bitacora-modal-card">
        <div className="bitacora-modal-header">
          <h2 id="switch-modal-title">Cambiar Vista</h2>
          <button
            type="button"
            className="bitacora-modal-close"
            onClick={onClose}
            aria-label="Cerrar ventana modal"
          >
            <CloseModalIcon size={18} />
          </button>
        </div>

        <div className="bitacora-modal-body">
          <p>¿Deseas cerrar tu sesión actual y cambiar de usuario?</p>
          <div className="modal-session-detail">
            <span>Sesión activa:</span>
            <strong>{currentUser.rbacLabel || currentUser.roleDisplayName}</strong>
            <small style={{ color: '#64748b' }}>{currentUser.email}</small>
          </div>
          <p style={{ fontSize: '12.5px', color: '#64748b' }}>
            Al confirmar, volverás a la pantalla de inicio de sesión para autenticarte con otro rol (Seguridad: Guardia o Académico: Admin).
          </p>
        </div>

        <div className="bitacora-modal-actions">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-modal-confirm" onClick={onConfirm}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal de Reproductor de Video en Gran Formato (Sin botón ni opción de descarga)
 */
function VideoModal({ flight, onClose }) {
  const [videoUrl, setVideoUrl] = useState(flight?.video?.videoUrl || '')
  const videoPlayerRef = useRef(null)

  useEffect(() => {
    if (!flight) return
    let isCancelled = false

    async function loadVideo() {
      const url = await getOrCreateFlightVideoUrl(flight)
      if (!isCancelled) {
        setVideoUrl(url)
      }
    }

    loadVideo()
    return () => {
      isCancelled = true
    }
  }, [flight])

  if (!flight) return null

  return (
    <div
      className="bitacora-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bitacora-modal-card modal-video-card">
        <div className="bitacora-modal-header">
          <div>
            <h2 id="video-modal-title" style={{ fontSize: '16px' }}>
              Vuelo #{flight.flightNumber} · {flight.missionName}
            </h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {flight.dateDisplay}
            </span>
          </div>
          <button
            type="button"
            className="bitacora-modal-close"
            onClick={onClose}
            aria-label="Cerrar reproductor"
          >
            <CloseModalIcon size={18} />
          </button>
        </div>

        <div className="modal-video-player-wrapper">
          <video
            ref={videoPlayerRef}
            src={videoUrl || undefined}
            poster={flight.video.poster}
            controls
            autoPlay
            playsInline
          >
            Tu navegador no soporta reproducción de video.
          </video>
        </div>

        {/* Resumen de telemetría del vuelo */}
        <div className="telemetry-bar">
          <span className="telemetry-metric">
            <BatteryGaugeIcon size={16} />
            {flight.telemetry.battery}
          </span>
          <span className="telemetry-metric">
            <DistancePathIcon size={16} />
            {flight.telemetry.distance}
          </span>
          <span className="telemetry-metric">
            <MountainAltitudeIcon size={16} />
            {flight.telemetry.altitude}
          </span>
          <span className="telemetry-metric">
            <WindSpeedIcon size={16} />
            {flight.telemetry.wind}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '700' }}>
            <CheckShieldHashIcon size={13} color="#15803d" /> {flight.integrity.hash} · {flight.integrity.blockNumber}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal de verificación de Integridad Criptográfica SHA-256
 */
function AuditDetailModal({ flight, onClose }) {
  if (!flight) return null

  return (
    <div
      className="bitacora-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bitacora-modal-card">
        <div className="bitacora-modal-header">
          <h2 id="audit-modal-title">Registro Criptográfico Inmutable</h2>
          <button
            type="button"
            className="bitacora-modal-close"
            onClick={onClose}
            aria-label="Cerrar ventana de auditoría"
          >
            <CloseModalIcon size={18} />
          </button>
        </div>

        <div className="bitacora-modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: '750' }}>
            <CheckShieldHashIcon size={20} />
            <span>Integridad Verificada en Nodo de Auditoría</span>
          </div>

          <div className="modal-session-detail">
            <span>Vuelo auditado:</span>
            <strong>Vuelo #{flight.flightNumber} · {flight.missionName}</strong>
            <span>Bloque blockchain:</span>
            <strong>{flight.integrity.blockNumber}</strong>
            <span>Hash SHA-256 completo:</span>
            <code style={{ fontSize: '11px', wordBreak: 'break-all', background: '#e2e8f0', padding: '4px', borderRadius: '4px' }}>
              {flight.integrity.fullHash}
            </code>
            <span>Estampa de tiempo del sellado:</span>
            <small>{flight.integrity.timestamp} UTC</small>
          </div>

          <p style={{ fontSize: '12px', color: '#64748b' }}>
            {flight.integrity.isSimulated
              ? 'Nota: En este entorno de demostración se utiliza un registro simulado preparado para la sincronización con el servicio de auditoría inmutable de la base de datos.'
              : 'El hash criptográfico garantiza que la telemetría, alertas y metadatos no han sido alterados tras el aterrizaje.'}
          </p>
        </div>

        <div className="bitacora-modal-actions">
          <button type="button" className="btn-modal-cancel" onClick={onClose} style={{ flex: 'none', width: '100%' }}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Pantalla principal del Módulo Bitácora para el perfil Guardia
 */
export default function GuardiaBitacora() {
  const navigate = useNavigate()

  // 1. Estado de autenticación RBAC
  const [currentUser, setCurrentUser] = useState(getCurrentUser)
  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false)

  // Sincronizar sesión si cambia externamente
  useEffect(() => {
    function syncSession() {
      setCurrentUser(getCurrentUser())
    }
    window.addEventListener('aeroluferan_session_changed', syncSession)
    return () => window.removeEventListener('aeroluferan_session_changed', syncSession)
  }, [])

  // 2. Historial de vuelos
  const [flights, setFlights] = useState(getStoredFlights)

  useEffect(() => {
    function syncFlights() {
      setFlights(getStoredFlights())
    }
    window.addEventListener('aeroluferan_bitacora_updated', syncFlights)
    return () => window.removeEventListener('aeroluferan_bitacora_updated', syncFlights)
  }, [])

  // Sincronizar con el backend (misiones + grabaciones + telemetría + eventos)
  useEffect(() => {
    let isMounted = true
    refreshFlightLog().then((result) => {
      if (isMounted && Array.isArray(result)) {
        setFlights(getStoredFlights())
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // 3. Estados de búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('todos') // 'todos' | 'incidentes'

  // 4. Modales
  const [selectedVideoFlight, setSelectedVideoFlight] = useState(null)
  const [selectedAuditFlight, setSelectedAuditFlight] = useState(null)

  // Conteo de vuelos con incidentes
  const incidentFlightCount = useMemo(() => {
    return flights.filter((f) => f.incidents && f.incidents.length > 0).length
  }, [flights])

  // Filtrado y búsqueda reactiva
  const filteredFlights = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return flights.filter((flight) => {
      // 1. Filtro principal
      if (activeFilter === 'incidentes') {
        const hasAlerts = flight.incidents && flight.incidents.length > 0
        if (!hasAlerts) return false
      }

      // 2. Búsqueda por texto (nombre de vuelo/misión o fecha)
      if (query !== '') {
        const matchName = flight.missionName.toLowerCase().includes(query)
        const matchCode = flight.flightCode.toLowerCase().includes(query)
        const matchNumber = `vuelo #${flight.flightNumber}`.toLowerCase().includes(query)
        const matchDateDisplay = flight.dateDisplay.toLowerCase().includes(query)
        const matchFlightDate = flight.flightDate.toLowerCase().includes(query)
        const matchZone = flight.zone.toLowerCase().includes(query)

        if (!matchName && !matchCode && !matchNumber && !matchDateDisplay && !matchFlightDate && !matchZone) {
          return false
        }
      }

      return true
    })
  }, [flights, activeFilter, searchQuery])

  // Manejo de Cambiar Vista (Cierre de Sesión RBAC)
  function handleConfirmSwitchUser() {
    logoutUser()
    setIsSwitchUserModalOpen(false)
    navigate('/')
  }

  return (
    <div className="bitacora-page">
      <div className="bitacora-shell">
        {/* ============================================================== */}
        {/* 1. ENCABEZADO SUPERIOR AEROLUFERAN                             */}
        {/* ============================================================== */}
        <header className="bitacora-header">
          <div className="bitacora-brand">
            <AeroHelmetLogo size={38} />
            <h1 className="bitacora-brand-title">AeroLuferan</h1>
          </div>
        </header>

        {/* ============================================================== */}
        {/* 2. CONTENIDO PRINCIPAL                                         */}
        {/* ============================================================== */}
        <main className="bitacora-content">
          {/* Tarjeta CONTROL DE ACCESO (RBAC) */}
          <section className="rbac-card" aria-label="Control de acceso y rol de usuario">
            <div className="rbac-card__left">
              <div className="rbac-card__icon-wrapper" aria-hidden="true">
                <ShieldRbacIcon size={24} />
              </div>
              <div className="rbac-card__info">
                <span className="rbac-card__eyebrow">CONTROL DE ACCESO (RBAC)</span>
                <strong className="rbac-card__role">
                  {currentUser.rbacLabel || currentUser.roleDisplayName || 'Rol: Seguridad Central'}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="rbac-switch-btn"
              onClick={() => setIsSwitchUserModalOpen(true)}
              aria-label="Cambiar vista y cerrar sesión"
            >
              <span>
                <b>Cambiar</b>
                <b>Vista</b>
              </span>
              <ArrowsSwitchIcon size={15} />
            </button>
          </section>

          {/* Barra de búsqueda de vuelos */}
          <div className="bitacora-search-wrapper">
            <div className="bitacora-search-bar">
              <input
                type="text"
                className="bitacora-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchQuery === '' ? `Vuelos  (${filteredFlights.length})` : 'Buscar por misión o fecha...'}
                aria-label="Buscar vuelos por nombre o fecha"
              />
              <div className="bitacora-search-actions">
                {searchQuery !== '' && (
                  <button
                    type="button"
                    className="bitacora-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <ClearXIcon size={16} />
                  </button>
                )}
                <span className="bitacora-search-icon" aria-hidden="true">
                  <SearchGlassIcon size={18} />
                </span>
              </div>
            </div>
          </div>

          {/* Filtros de vuelos: Todos los Vuelos / Con Incidentes */}
          <div className="bitacora-filters" role="tablist" aria-label="Filtros de registros de vuelos">
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'todos'}
              className={`filter-pill ${activeFilter === 'todos' ? 'filter-pill--active' : 'filter-pill--inactive'}`}
              onClick={() => setActiveFilter('todos')}
            >
              Todos los Vuelos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'incidentes'}
              className={`filter-pill ${activeFilter === 'incidentes' ? 'filter-pill--active' : 'filter-pill--inactive'}`}
              onClick={() => setActiveFilter('incidentes')}
            >
              Con Incidentes ({incidentFlightCount})
            </button>
          </div>

          {/* Lista de tarjetas del historial de vuelos */}
          <section className="flight-cards-list" aria-label="Historial de vuelos ejecutados">
            {filteredFlights.length > 0 ? (
              filteredFlights.map((flight) => (
                <FlightHistoryCard
                  key={flight.id}
                  flight={flight}
                  onOpenVideo={(selected) => setSelectedVideoFlight(selected)}
                  onOpenAudit={(selected) => setSelectedAuditFlight(selected)}
                />
              ))
            ) : (
              <div className="empty-bitacora">
                <SearchGlassIcon size={36} color="#94a3b8" />
                <h3>No se encontraron vuelos</h3>
                <p>
                  No existen registros en la bitácora que coincidan con «{searchQuery}»
                  {activeFilter === 'incidentes' ? ' y el filtro de incidentes' : ''}.
                </p>
                <button
                  type="button"
                  className="btn-reset-search"
                  onClick={() => {
                    setSearchQuery('')
                    setActiveFilter('todos')
                  }}
                >
                  Restablecer filtros
                </button>
              </div>
            )}
          </section>
        </main>

        {/* ============================================================== */}
        {/* 3. BARRA DE NAVEGACIÓN INFERIOR                                */}
        {/* ============================================================== */}
        <GuardiaBottomNav activePath="/guardia/bitacora" />
      </div>

      {/* ============================================================== */}
      {/* 4. VENTANAS MODALES                                            */}
      {/* ============================================================== */}
      {/* Modal Cambiar Vista / Cierre de sesión */}
      <SwitchUserModal
        isOpen={isSwitchUserModalOpen}
        currentUser={currentUser}
        onClose={() => setIsSwitchUserModalOpen(false)}
        onConfirm={handleConfirmSwitchUser}
      />

      {/* Modal Reproductor de Video (Sin botón de descarga) */}
      <VideoModal
        flight={selectedVideoFlight}
        onClose={() => setSelectedVideoFlight(null)}
      />

      {/* Modal Detalle de Auditoría Criptográfica */}
      <AuditDetailModal
        flight={selectedAuditFlight}
        onClose={() => setSelectedAuditFlight(null)}
      />
    </div>
  )
}
