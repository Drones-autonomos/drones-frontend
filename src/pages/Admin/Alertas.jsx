import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import {
  BellIcon,
  CheckIcon,
  CompassIcon,
  PlaneIcon,
  ShieldIcon,
} from '../../components/EnVivoIcons.jsx'
import campusReference from '../../assets/campus-reference.svg'
import './Alertas.css'

const demoAlerts = [
  {
    id: 'vanguard-01',
    droneName: 'Vanguard-01',
    type: 'humo',
    severity: 'critical',
    age: 'Hace 5 min',
    location: 'Edificio B · Laboratorio',
    description:
      'Posible inicio de conato de incendio. El dron identificó una columna de humo denso con anomalía de calor sobre la ventilación secundaria. Zona sensible por almacenamiento contiguo de solventes orgánicos.',
    detection: 'Detección Térmica: 88°C',
    confidence: 'IA 96.4%',
    coordinates: '19.3324° N, 99.1872° W',
    altitude: 'Alt: 38m',
    timestamp: '22:45 hrs',
    image: campusReference,
    audit: '#8F4C-A03E',
    status: 'Pendiente',
  },
  {
    id: 'vanguard-02',
    droneName: 'Vanguard-02',
    type: 'intruso',
    severity: 'medium',
    age: 'Hace 18 min',
    location: 'Estacionamiento Docente Poniente',
    description:
      'Persona no autorizada fuera de horario. Se detectó a una persona sin credencial activa transitando entre vehículos luego del horario permitido (cierre 21:30 hrs).',
    detection: 'Sujeto en movimiento',
    confidence: 'IA 94.0%',
    coordinates: 'Acceso Puerta 3',
    altitude: 'N/A',
    timestamp: '22:12 hrs',
    image: campusReference,
    audit: 'Registro Criptográfico Inmutable',
    status: 'Revisado',
  },
]

const filters = [
  { id: 'all', label: 'Todas' },
  { id: 'humo', label: 'Humo / Fuego' },
  { id: 'intruso', label: 'Intrusos' },
]

function Alertas() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all')
  const [alerts, setAlerts] = useState(demoAlerts)
  const [lastAction, setLastAction] = useState('')

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
    navigate('/admin/live', { state: { droneId: alert.droneName } })
  }

  const handleDispatchGuard = (alert) => {
    setLastAction(`Solicitud de guardia registrada localmente para ${alert.droneName}.`)
  }

  const handleDismiss = (alertId) => {
    setAlerts((currentAlerts) =>
      currentAlerts.filter((alert) => alert.id !== alertId),
    )
    setLastAction('Notificación descartada y retirada de la vista actual.')
  }

  return (
    <div className="alertas-page">
      <div className="alertas-shell">
        <header className="alertas-header">
          <div className="alertas-brand">
            <span className="alertas-brand-mark" aria-hidden="true">
              <PlaneIcon />
            </span>
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
            <button type="button" className="alertas-notification-button" aria-label="Notificaciones">
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
                        <span className="alert-card__time">{alert.age}</span>
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
                      <span className="alert-card__telemetry-right">{alert.altitude} · {alert.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="alert-card__description">
                  <strong>
                    <span className="alert-card__description-icon" aria-hidden="true">
                      <ShieldIcon />
                    </span>
                    {alert.severity === 'critical' ? 'Posible inicio de conato de incendio' : 'Persona no autorizada fuera de horario'}
                  </strong>
                  <div>{alert.description}</div>
                </div>

                {alert.type === 'intruso' && (
                  <div className="alert-card__audit">
                    <span className="alert-card__audit-badge">
                      <CheckIcon />
                      {alert.audit}
                    </span>
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
                </div>

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

        <AdminBottomNav pendingAlerts={alerts.length} />
      </div>
    </div>
  )
}

export default Alertas
