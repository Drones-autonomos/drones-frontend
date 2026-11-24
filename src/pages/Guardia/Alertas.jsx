import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GuardiaBottomNav from '../../components/GuardiaBottomNav.jsx'
import helmetLogo from '../../assets/aeroluferan-logo.png'
import useAlerts from '../../hooks/useAlerts.js'
import {
  CRITICAL_PUSH_EVENT,
  getBrowserNotificationPermission,
  isCriticalPushEnabledForCurrentUser,
  requestBrowserNotificationPermission,
  resolveAlertIncident,
} from '../../services/alertService.js'
import './Alertas.css'

function HeaderBellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function AntennaWaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <path d="M7.5 7.5a6.5 6.5 0 0 0 0 9" />
      <path d="M16.5 7.5a6.5 6.5 0 0 1 0 9" />
      <path d="M4.5 4.5a11 11 0 0 0 0 15" />
      <path d="M19.5 4.5a11 11 0 0 1 0 15" />
    </svg>
  )
}

function DroneAirplaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s6-5.73 6-11a6 6 0 1 0-12 0c0 5.27 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3Z" />
    </svg>
  )
}

function UserAlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="12" />
      <line x1="19" y1="16" x2="19.01" y2="16" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function VideoCameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.75 7.5A2.25 2.25 0 0 1 4 5.25h11.5A2.25 2.25 0 0 1 17.75 7.5v9A2.25 2.25 0 0 1 15.5 18.75H4A2.25 2.25 0 0 1 1.75 16.5v-9Z" />
      <path d="M17.75 10.5 22 8v8l-4.25-2.5" />
    </svg>
  )
}

function BeaconIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v3m0 14v3M4.93 4.93l2.12 2.12m9.9 9.9 2.12 2.12M2 12h3m14 0h3M4.93 19.07l2.12-2.12m9.9-9.9 2.12-2.12" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  )
}

function DispatchNavIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

const filterDefinitions = [
  { id: 'all', label: 'Todas', hasDot: false },
  { id: 'humo', label: 'Humo / Fuego', hasDot: true, dotClass: 'alertas-guardia-filter-dot--humo', countClass: 'alertas-guardia-filter-count--humo' },
  { id: 'intruso', label: 'Intrusos', hasDot: true, dotClass: 'alertas-guardia-filter-dot--intruso', countClass: 'alertas-guardia-filter-count--intruso' },
]

export default function GuardiaAlertas() {
  const navigate = useNavigate()
  const {
    alerts,
    pendingAlertsCount,
    markAsViewed,
    markAllAsViewed,
    dismissAlert,
    dispatchGuard,
    resetDemo,
  } = useAlerts('guard')

  const [activeFilter, setActiveFilter] = useState('all')
  const [statusMessage, setStatusMessage] = useState('')
  const [resolvingAlert, setResolvingAlert] = useState(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [isSavingResolution, setIsSavingResolution] = useState(false)

  useEffect(() => {
    const onCriticalPush = (event) => {
      const detail = event?.detail
      if (!detail) return
      setStatusMessage(`ALERTA EN TIEMPO REAL: ${detail.titulo || 'Nuevo incidente crítico detectado'}`)
    }
    window.addEventListener(CRITICAL_PUSH_EVENT, onCriticalPush)
    return () => window.removeEventListener(CRITICAL_PUSH_EVENT, onCriticalPush)
  }, [])

  const handleBellClick = async () => {
    const pushActive = isCriticalPushEnabledForCurrentUser()
    if (!pushActive) {
      setStatusMessage('Las Alertas Push Críticas están silenciadas en Ajustes.')
      return
    }
    const perm = getBrowserNotificationPermission()
    if (perm === 'default') {
      const granted = await requestBrowserNotificationPermission()
      if (granted === 'granted') {
        setStatusMessage('Notificaciones push del navegador activadas para alertas críticas.')
        return
      }
    }
    setStatusMessage(`Notificaciones Push activas. ${pendingAlertsCount} nuevas sin visualizar.`)
  }

  const filterCounts = useMemo(() => {
    return {
      all: alerts.length,
      humo: alerts.filter((alert) => alert.type === 'humo').length,
      intruso: alerts.filter((alert) => alert.type === 'intruso').length,
    }
  }, [alerts])

  const visibleAlerts = useMemo(() => {
    if (activeFilter === 'all') return alerts
    return alerts.filter((alert) => alert.type === activeFilter)
  }, [activeFilter, alerts])

  const handleViewLive = (alert) => {
    markAsViewed(alert.id)
    navigate('/guardia/en-vivo', {
      state: {
        droneId: alert.droneName,
        alertId: alert.id,
        telemetry: alert.telemetry,
      },
    })
  }

  const handleDispatch = (alert) => {
    dispatchGuard(alert.id)
    setStatusMessage(
      `Despacho registrado en el servidor para Incidente #${alert.eventoId || alert.id}. Estado actualizado a "En atención".`,
    )
  }

  const handleOpenResolveModal = (alert) => {
    setResolvingAlert(alert)
    setResolutionNote(alert.notasResolucion || '')
  }

  const handleConfirmResolve = async (e) => {
    e.preventDefault()
    if (!resolvingAlert) return
    setIsSavingResolution(true)
    try {
      await resolveAlertIncident(resolvingAlert.id, 'guard', resolutionNote)
      setStatusMessage(
        `Incidente #${resolvingAlert.eventoId || resolvingAlert.id} marcado como RESUELTO y auditado.`,
      )
      setResolvingAlert(null)
      setResolutionNote('')
    } catch (error) {
      setStatusMessage(error?.message || 'No se pudo cerrar el incidente en el servidor.')
    } finally {
      setIsSavingResolution(false)
    }
  }

  const handleDismissAlert = (alert) => {
    dismissAlert(alert.id)
    setStatusMessage(`Notificación #${alert.id} descartada de tu bandeja y sincronizada.`)
  }

  const handleToggleViewed = (alert) => {
    if (!alert.viewedBy?.guard) {
      markAsViewed(alert.id)
      setStatusMessage(`Alerta #${alert.id} marcada como vista en el servidor.`)
    }
  }

  return (
    <div className="alertas-guardia-page">
      <div className="alertas-guardia-shell">
        <header className="alertas-guardia-header">
          <div className="alertas-guardia-brand">
            <img
              src={helmetLogo}
              alt="Emblema AeroLuferan"
              className="alertas-guardia-brand-logo"
            />
            <div className="alertas-guardia-brand-copy">
              <strong>AeroLuferan</strong>
              <span>Bandeja de Incidentes</span>
            </div>
          </div>

          <div className="alertas-guardia-header-actions">
            <span className="alertas-guardia-status-pill" title="Patrullaje perimetral activo">
              <span className="alertas-guardia-status-dot" aria-hidden="true" />
              En patrullaje
            </span>
            <button
              type="button"
              className="alertas-guardia-notification-button"
              aria-label="Notificaciones del sistema"
              onClick={handleBellClick}
            >
              <HeaderBellIcon />
            </button>
          </div>
        </header>

        <section className="alertas-guardia-monitor" aria-label="Monitoreo perimetral activo">
          <div className="alertas-guardia-monitor__left">
            <div className="alertas-guardia-monitor__icon" aria-hidden="true">
              <AntennaWaveIcon />
            </div>
            <div className="alertas-guardia-monitor__text">
              <strong className="alertas-guardia-monitor__title">Monitoreo Perimetral Activo</strong>
              <span className="alertas-guardia-monitor__details">Latencia en tiempo real &lt; 850ms</span>
            </div>
          </div>
          <span className="alertas-guardia-monitor__sla">99.9% SLA</span>
        </section>

        <div className="alertas-guardia-filters" role="tablist" aria-label="Filtros de incidentes">
          {filterDefinitions.map((filter) => {
            const isActive = activeFilter === filter.id
            const count = filterCounts[filter.id] || 0
            return (
              <button
                key={filter.id}
                type="button"
                className={`alertas-guardia-filter-btn${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
                aria-pressed={isActive}
              >
                {filter.hasDot && !isActive && (
                  <span className={`alertas-guardia-filter-dot ${filter.dotClass || ''}`} aria-hidden="true" />
                )}
                <span>{filter.label}</span>
                <span className={`alertas-guardia-filter-count ${filter.countClass || ''}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="alertas-guardia-quick-toolbar">
          <span className="alertas-guardia-quick-toolbar__status">
            {pendingAlertsCount > 0
              ? `${pendingAlertsCount} sin visualizar`
              : 'Todas las alertas visualizadas'}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {pendingAlertsCount > 0 && (
              <button
                type="button"
                className="alertas-guardia-quick-toolbar__btn"
                onClick={() => {
                  markAllAsViewed()
                  setStatusMessage('Todas las alertas marcadas como vistas en el servidor.')
                }}
              >
                Marcar todas vistas
              </button>
            )}
            <button
              type="button"
              className="alertas-guardia-quick-toolbar__btn"
              onClick={() => {
                resetDemo()
                setStatusMessage('Bandeja sincronizada con el servidor.')
              }}
            >
              Sincronizar
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="alertas-guardia-status-banner" role="status">
            <span>{statusMessage}</span>
            <button
              type="button"
              className="alertas-guardia-status-banner__close"
              onClick={() => setStatusMessage('')}
              aria-label="Cerrar mensaje"
            >
              ×
            </button>
          </div>
        )}

        <main className="alertas-guardia-list" aria-live="polite">
          {visibleAlerts.length > 0 ? (
            visibleAlerts.map((alert) => {
              const isCritical = alert.severity === 'critical'
              const isViewed = alert.viewedBy?.guard

              return (
                <article
                  key={alert.id}
                  className="alertas-guardia-card"
                  aria-label={`Alerta ${alert.severityLabel} detectada por ${alert.droneName}`}
                >
                  <header className="alertas-guardia-card__header">
                    <div className="alertas-guardia-card__identity">
                      <div className="alertas-guardia-card__avatar-wrap">
                        <div
                          className={`alertas-guardia-card__avatar ${
                            isCritical
                              ? 'alertas-guardia-card__avatar--critical'
                              : 'alertas-guardia-card__avatar--medium'
                          }`}
                        >
                          <DroneAirplaneIcon />
                        </div>
                        <span
                          className={`alertas-guardia-card__avatar-badge ${
                            isCritical
                              ? 'alertas-guardia-card__avatar-badge--critical'
                              : 'alertas-guardia-card__avatar-badge--medium'
                          }`}
                          aria-label={`Indicador ${alert.badgeNumber}`}
                        >
                          {alert.badgeNumber}
                        </span>
                      </div>

                      <div className="alertas-guardia-card__meta">
                        <div className="alertas-guardia-card__title-row">
                          <strong className="alertas-guardia-card__title">{alert.droneName}</strong>
                          <span className="alertas-guardia-card__time">
                            · {alert.age} · {alert.status}
                          </span>
                        </div>
                        <span className="alertas-guardia-card__location">
                          <MapPinIcon />
                          {alert.location}
                        </span>
                      </div>
                    </div>

                    <div className="alertas-guardia-card__header-right">
                      <button
                        type="button"
                        className={`alertas-guardia-card__seen-indicator ${
                          isViewed
                            ? 'alertas-guardia-card__seen-indicator--seen'
                            : 'alertas-guardia-card__seen-indicator--new'
                        }`}
                        onClick={() => handleToggleViewed(alert)}
                        title={isViewed ? 'Alerta ya visualizada' : 'Haga clic para marcar como vista'}
                      >
                        {isViewed ? 'Vista' : 'Nueva'}
                      </button>

                      <span
                        className={`alertas-guardia-card__severity ${
                          isCritical
                            ? 'alertas-guardia-card__severity--critical'
                            : 'alertas-guardia-card__severity--medium'
                        }`}
                      >
                        {alert.severityLabel}
                      </span>
                    </div>
                  </header>

                  <div className="alertas-guardia-card__image-container">
                    <img
                      src={alert.image}
                      alt={`Captura del incidente por ${alert.droneName}`}
                      className="alertas-guardia-card__image"
                    />

                    <div className="alertas-guardia-card__image-overlay">
                      <div className="alertas-guardia-card__overlay-row">
                        <span className="alertas-guardia-card__tag alertas-guardia-card__tag--dark">
                          <span
                            className={`alertas-guardia-card__tag-dot ${
                              alert.detectionType === 'thermal'
                                ? 'alertas-guardia-card__tag-dot--thermal'
                                : 'alertas-guardia-card__tag-dot--motion'
                            }`}
                            aria-hidden="true"
                          />
                          {alert.detection}
                        </span>

                        <span
                          className={`alertas-guardia-card__tag ${
                            isCritical
                              ? 'alertas-guardia-card__tag--ia-critical'
                              : 'alertas-guardia-card__tag--ia-medium'
                          }`}
                        >
                          {alert.confidence}
                        </span>
                      </div>

                      <div className="alertas-guardia-card__telemetry-row">
                        <span className="alertas-guardia-card__telemetry-pill">
                          {alert.coordinates}
                        </span>
                        <span className="alertas-guardia-card__telemetry-pill alertas-guardia-card__telemetry-pill--time">
                          {alert.altitude !== 'N/A' && `${alert.altitude} · `}
                          {alert.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="alertas-guardia-card__description-box">
                    <div
                      className={`alertas-guardia-card__description-heading ${
                        isCritical
                          ? 'alertas-guardia-card__description-heading--critical'
                          : 'alertas-guardia-card__description-heading--medium'
                      }`}
                    >
                      <span className="alertas-guardia-card__description-icon" aria-hidden="true">
                        {isCritical ? <FlameIcon /> : <UserAlertIcon />}
                      </span>
                      <strong>{alert.incidentTitle}</strong>
                    </div>

                    <div className="alertas-guardia-card__description-text">
                      {alert.description}
                    </div>

                    {alert.notasResolucion && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                        ✓ Nota de cierre: {alert.notasResolucion}
                      </div>
                    )}

                    {alert.audit && (
                      <div className="alertas-guardia-card__audit">
                        <span className="alertas-guardia-card__audit-badge">
                          <ShieldCheckIcon />
                          {alert.audit.text}
                        </span>
                        <span className="alertas-guardia-card__audit-code">
                          {alert.audit.code} &gt;
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="alertas-guardia-card__actions">
                    <button
                      type="button"
                      className="alertas-guardia-card__btn alertas-guardia-card__btn--live"
                      onClick={() => handleViewLive(alert)}
                      title="Navegar a la interfaz En Vivo para este dron"
                    >
                      <VideoCameraIcon />
                      Ver en Vivo
                    </button>

                    {alert.resolved ? (
                      <button
                        type="button"
                        className="alertas-guardia-card__btn alertas-guardia-card__btn--dispatch-dark"
                        disabled
                        style={{ opacity: 0.75 }}
                      >
                        <ShieldCheckIcon />
                        Incidente Resuelto
                      </button>
                    ) : alert.dispatched ? (
                      <button
                        type="button"
                        className="alertas-guardia-card__btn alertas-guardia-card__btn--dispatch-dark"
                        onClick={() => handleOpenResolveModal(alert)}
                      >
                        <ShieldCheckIcon />
                        Marcar como Resuelto
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`alertas-guardia-card__btn ${
                          isCritical
                            ? 'alertas-guardia-card__btn--dispatch-critical'
                            : 'alertas-guardia-card__btn--dispatch-dark'
                        }`}
                        onClick={() => handleDispatch(alert)}
                      >
                        {isCritical ? <BeaconIcon /> : <DispatchNavIcon />}
                        Despachar Guardia
                      </button>
                    )}
                  </div>

                  {!alert.resolved && !alert.dispatched && (
                    <button
                      type="button"
                      className="alertas-guardia-card__dismiss-btn"
                      style={{ color: '#0369a1', marginBottom: '2px' }}
                      onClick={() => handleOpenResolveModal(alert)}
                    >
                      ✓ Marcar como Resuelto
                    </button>
                  )}

                  <button
                    type="button"
                    className="alertas-guardia-card__dismiss-btn"
                    onClick={() => handleDismissAlert(alert)}
                  >
                    × Descartar notificación
                  </button>
                </article>
              )
            })
          ) : (
            <div className="alertas-guardia-empty" role="status">
              <div className="alertas-guardia-empty__icon" aria-hidden="true">
                <ShieldCheckIcon />
              </div>
              <strong className="alertas-guardia-empty__title">Sin alertas en este filtro</strong>
              <p className="alertas-guardia-empty__text">
                No se encontraron incidentes que coincidan con la categoría seleccionada. El patrullaje perimetral continúa activo.
              </p>
            </div>
          )}
        </main>

        {resolvingAlert && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guardia-resolve-title"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '16px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setResolvingAlert(null)
            }}
          >
            <form
              onSubmit={handleConfirmResolve}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '20px',
                maxWidth: '400px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <strong id="guardia-resolve-title" style={{ fontSize: '16px', color: '#0f172a' }}>
                Resolver Incidente #{resolvingAlert.eventoId || resolvingAlert.id}
              </strong>
              <label style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>Reporte operativo de resolución:</span>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Describe la acción realizada en campo..."
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '8px 10px',
                    fontSize: '13px',
                  }}
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingResolution}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#15803d',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSavingResolution ? 'Guardando…' : 'Confirmar Cierre'}
                </button>
              </div>
            </form>
          </div>
        )}

        <GuardiaBottomNav activePath="/guardia/alertas" />
      </div>
    </div>
  )
}
