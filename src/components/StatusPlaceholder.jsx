import './StatusPlaceholder.css'

function OfflineIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
      <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
      <path d="M5 13a10 10 0 0 1 5.24-2.76" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  )
}

function EmptyBoxIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8V21H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

const VARIANT_DEFAULTS = {
  empty: { icon: EmptyBoxIcon, title: 'Sin datos disponibles' },
  offline: { icon: OfflineIcon, title: 'Sin conexión' },
  error: { icon: ErrorIcon, title: 'No se pudo completar la operación' },
}

/**
 * Placeholder normalizado para estados sin datos, sin conexión o con error.
 * variant: 'empty' | 'offline' | 'error'
 */
export function StatusPlaceholder({
  variant = 'empty',
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}) {
  const defaults = VARIANT_DEFAULTS[variant] || VARIANT_DEFAULTS.empty
  const Icon = defaults.icon

  return (
    <div
      className={`status-placeholder status-placeholder--${variant}${compact ? ' status-placeholder--compact' : ''}`}
      role="status"
    >
      <span className="status-placeholder__icon" aria-hidden="true">
        <Icon />
      </span>
      <strong className="status-placeholder__title">{title || defaults.title}</strong>
      {message ? <p className="status-placeholder__message">{message}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="status-placeholder__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

export default StatusPlaceholder
