import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import {
  BellIcon,
  CheckIcon,
  CompassIcon,
  ShieldIcon,
} from '../../components/EnVivoIcons.jsx'
import useAlerts from '../../hooks/useAlerts.js'
import aeroluferanLogo from '../../assets/aeroluferan-logo.png'
import {
  CRITICAL_PUSH_EVENT,
  getBrowserNotificationPermission,
  isCriticalPushEnabledForCurrentUser,
  requestBrowserNotificationPermission,
  resolveAlertIncident,
} from '../../services/alertService.js'
import './Alertas.css'

const filters = [
  { id: 'all', label: 'Todas' },
  { id: 'humo', label: 'Humo / Fuego' },
  { id: 'intruso', label: 'Intrusos' },
]

function Alertas() {
  const navigate = useNavigate()
  const {
    alerts,
    pendingAlertsCount,
    markAsViewed,
    markAllAsViewed,
    dismissAlert,
    dispatchGuard,
  } = useAlerts('admin')
  const [activeFilter, setActiveFilter] = useState('all')
  const [lastAction, setLastAction] = useState('')
  const [resolvingAlert, setResolvingAlert] = useState(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [isSavingResolution, setIsSavingResolution] = useState(false)

  useEffect(() => {
    const onCriticalPush = (event) => {
      const detail = event?.detail
      if (!detail) return
      setLastAction(`ALERTA EN TIEMPO REAL: ${detail.titulo || 'Nuevo incidente crítico detectado'}`)
    }
    window.addEventListener(CRITICAL_PUSH_EVENT, onCriticalPush)
    return () => window.removeEventListener(CRITICAL_PUSH_EVENT, onCriticalPush)
  }, [])

  const handleBellClick = async () => {
    const pushActive = isCriticalPushEnabledForCurrentUser()
    if (!pushActive) {
      setLastAction('Las Alertas Push Críticas están silenciadas en Ajustes.')
      return
    }
    const perm = getBrowserNotificationPermission()
    if (perm === 'default') {
      const granted = await requestBrowserNotificationPermission()
      if (granted === 'granted') {
        setLastAction('Notificaciones push del navegador activadas para alertas críticas.')
        return
      }
    }
    setLastAction(
      pendingAlertsCount > 0
        ? `Notificaciones Push activas · ${pendingAlertsCount} alerta(s) nueva(s) sin visualizar.`
        : 'Notificaciones Push activas · Bandeja al día.',
    )
  }

  const filterCounts = useMemo(
    () => ({
      all: alerts.length,
      humo: alerts.filter((alert) => alert.type === 'humo').length,
      intruso: alerts.filter((alert) => alert.type === 'intruso').length,
    }),
    [alerts],
  )

  const visibleAlerts = useMemo(
    () =>
      alerts.filter((alert) => activeFilter === 'all' || alert.type === activeFilter),
    [activeFilter, alerts],
  )

  const handleViewLive = (alert) => {
    markAsViewed(alert.id)
    navigate('/admin/en-vivo', { state: { droneId: alert.droneName, alertId: alert.id } })
  }

  const handleDispatchGuard = (alert) => {
    dispatchGuard(alert.id)
    setLastAction(
      `Guardia despachado en servidor para ${alert.droneName} (Incidente #${alert.eventoId || alert.id} → En atención).`,
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
      await resolveAlertIncident(resolvingAlert.id, 'admin', resolutionNote)
      setLastAction(`Incidente #${resolvingAlert.eventoId || resolvingAlert.id} marcado como RESUELTO y auditado.`)
      setResolvingAlert(null)
      setResolutionNote('')
    } catch (error) {
      setLastAction(error?.message || 'No se pudo marcar el incidente como resuelto.')
    } finally {
      setIsSavingResolution(false)
    }
  }

  const handleDismiss = (alertId) => {
    dismissAlert(alertId)
    setLastAction('Notificación descartada en tu bandeja y registrada en servidor.')
  }

  return (
    <div className="alertas-page">
      <div className="alertas-shell">
        <header className="alertas-header">
          <div className="alertas-brand">
            <img
              className="alertas-brand-logo"
              src={aeroluferanLogo}
              alt="Emblema AeroLuferan"
            />
            <div className="alertas-brand-copy">
              <strong>AeroLuferan</strong>
              <span>Bandeja de Incidentes</span>
            </div>
          </div>

          <div className="alertas-header-actions">
            <span className="alertas-status-pill">
              <span className="alertas-status-dot" aria-hidden="true" />
              En patrullaje
            </span>
            <button
              type="button"
              className="alertas-notification-button"
              aria-label="Notificaciones"
              onClick={handleBellClick}
            >
              <BellIcon />
            </button>
          </div>
        </header>

        <section className="monitor-card" aria-label="Estado de monitoreo perimetral">
          <div className="monitor-card__label">
            <span className="monitor-card__dot" aria-hidden="true" />
            <div>
              <div className="monitor-card__title">Monitoreo Perimetral Activo</div>
              <div className="monitor-card__details">Latencia en tiempo real &lt; 850ms</div>
            </div>
          </div>
          <span className="monitor-card__sla">99.9% SLA</span>
        </section>

        <div className="alert-filters" role="tablist" aria-label="Filtros de alertas">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`filter-button${activeFilter === filter.id ? ' is-active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
              aria-pressed={activeFilter === filter.id}
            >
              <span>{filter.label}</span>
              <span className="filter-button__count">{filterCounts[filter.id]}</span>
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 2px 8px',
            fontSize: '12px',
            color: '#475569',
          }}
        >
          <span>
            {pendingAlertsCount > 0
              ? `${pendingAlertsCount} sin visualizar`
              : 'Todas las alertas visualizadas'}
          </span>
          {pendingAlertsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                markAllAsViewed()
                setLastAction('Todas las alertas marcadas como vistas en el servidor.')
              }}
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                border: 'none',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Marcar todas vistas
            </button>
          )}
        </div>

        <main className="alerts-list" aria-live="polite">
          {visibleAlerts.length > 0 ? (
            visibleAlerts.map((alert) => (
              <article key={alert.id} className="alert-card" aria-label={`Alerta de ${alert.droneName}`}>
                <header className="alert-card__header">
                  <div className="alert-card__identity">
                    <span className="alert-card__plane" aria-hidden="true">
                      <CompassIcon />
                    </span>

                    <div className="alert-card__meta">
                      <div className="alert-card__title-row">
                        <strong className="alert-card__title">{alert.droneName}</strong>
                        <span className="alert-card__time">
                          {alert.age} · {alert.status}
                        </span>
                      </div>
                      <span className="alert-card__location">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 21s6-5.73 6-11a6 6 0 1 0-12 0c0 5.27 6 11 6 11Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        {alert.location}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`alert-card__severity alert-card__severity--${alert.severity}`}
                  >
                    {alert.severity === 'critical' ? 'Alerta crítica' : 'Alerta media'}
                  </span>
                </header>

                <div className="alert-card__image">
                  <img src={alert.image} alt={`Evento detectado por ${alert.droneName}`} />
                  <div className="alert-card__image-overlay">
                    <div className="alert-card__image-row">
                      <span className="alert-card__tag alert-card__tag--warning">{alert.detection}</span>
                      <span className="alert-card__tag alert-card__tag--ia">{alert.confidence}</span>
                    </div>

                    <div className="alert-card__telemetry">
                      <span className="alert-card__telemetry-left">{alert.coordinates}</span>
                      <span className="alert-card__telemetry-right">
                        {alert.altitude !== 'N/A' ? `${alert.altitude} · ` : ''}
                        {alert.timestamp}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="alert-card__description">
                  <strong>
                    <span className="alert-card__description-icon" aria-hidden="true">
                      <ShieldIcon />
                    </span>
                    {alert.incidentTitle ||
                      (alert.severity === 'critical'
                        ? 'Posible inicio de conato de incendio'
                        : 'Persona no autorizada fuera de horario')}
                  </strong>
                  <div>{alert.description}</div>
                  {alert.notasResolucion && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                      ✓ Nota de atención: {alert.notasResolucion}
                    </div>
                  )}
                </div>

                {alert.audit && (
                  <div className="alert-card__audit">
                    <span className="alert-card__audit-badge">
                      <CheckIcon />
                      {typeof alert.audit === 'object' ? alert.audit.text || alert.audit.code : alert.audit}
                    </span>
                    {typeof alert.audit === 'object' && alert.audit.text && alert.audit.code && (
                      <span className="alert-card__audit-code">
                        {alert.audit.code}
                      </span>
                    )}
                  </div>
                )}

                <div className="alert-card__actions">
                  <button
                    type="button"
                    className="alert-card__action alert-card__action--neutral"
                    onClick={() => handleViewLive(alert)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M1.75 7.5A2.25 2.25 0 0 1 4 5.25h11.5A2.25 2.25 0 0 1 17.75 7.5v9A2.25 2.25 0 0 1 15.5 18.75H4A2.25 2.25 0 0 1 1.75 16.5v-9Z" />
                      <path d="M17.75 10.5 22 8v8l-4.25-2.5" />
                    </svg>
                    Ver en Vivo
                  </button>

                  {alert.resolved ? (
                    <button
                      type="button"
                      className="alert-card__action alert-card__action--neutral"
                      disabled
                      style={{ opacity: 0.75 }}
                    >
                      ✓ Incidente Resuelto
                    </button>
                  ) : alert.dispatched ? (
                    <button
                      type="button"
                      className="alert-card__action alert-card__action--primary"
                      onClick={() => handleOpenResolveModal(alert)}
                    >
                      <CheckIcon />
                      Marcar como Resuelto
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="alert-card__action alert-card__action--primary"
                      onClick={() => handleDispatchGuard(alert)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2.5v7.5m0 0L8 10.5m4 0 4-1.5M4.5 12.5a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0Z" />
                      </svg>
                      Despachar Guardia
                    </button>
                  )}
                </div>

                {!alert.resolved && !alert.dispatched && (
                  <button
                    type="button"
                    className="alert-card__dismiss"
                    style={{ marginBottom: '4px', color: '#0369a1' }}
                    onClick={() => handleOpenResolveModal(alert)}
                  >
                    ✓ Cerrar / Marcar como Resuelto
                  </button>
                )}

                <button
                  type="button"
                  className="alert-card__dismiss"
                  onClick={() => handleDismiss(alert.id)}
                >
                  × Descartar notificación
                </button>
              </article>
            ))
          ) : (
            <div className="alert-empty">No hay alertas para este filtro.</div>
          )}
        </main>

        {lastAction && (
          <div className="alert-card__status-message" aria-live="polite">
            {lastAction}
          </div>
        )}

        {resolvingAlert && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolve-modal-title"
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
              <strong id="resolve-modal-title" style={{ fontSize: '16px', color: '#0f172a' }}>
                Resolver Incidente #{resolvingAlert.eventoId || resolvingAlert.id}
              </strong>
              <label style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>Nota de resolución y cierre (auditable):</span>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Ej. Zona verificada por personal de guardia, falsa alarma / perímetro asegurado."
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
                  {isSavingResolution ? 'Guardando…' : 'Confirmar Resolución'}
                </button>
              </div>
            </form>
          </div>
        )}

        <AdminBottomNav activePath="/admin/alertas" />
      </div>
    </div>
  )
}

export default Alertas
