/**
 * Componentes de iconos SVG independientes y editables para el módulo Bitácora de AeroLuferan.
 * Cumple con la regla de diseño: iconos independientes, editables y vectoriales (sin emojis ni imágenes planas).
 */

export function AeroHelmetLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Emblema AeroLuferan"
      className={className}
    >
      <circle cx="20" cy="20" r="19" fill="#E6EEF8" stroke="#D0DFF0" strokeWidth="1.5" />
      <g fill="#172F52">
        <path d="M14 26C14 21 17 17 22 17C26 17 29 20 29 24C29 26 27 28 24 28H15C14.4 28 14 27.6 14 26Z" />
        <path d="M22 14C17 14 13 18 12 23L10 22C11 16 16 12 22 12C26 12 29 13.5 31 16L29 17.5C27.5 15.5 25 14 22 14Z" />
        <circle cx="21" cy="20" r="2.5" fill="#38BDF8" />
        <path d="M25 21L29 17L31 19L27 23Z" fill="#0284C7" />
      </g>
    </svg>
  )
}

export function ShieldRbacIcon({ size = 28, color = '#0284C7', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function ArrowsSwitchIcon({ size = 16, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  )
}

export function SearchGlassIcon({ size = 20, color = '#64748B', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

export function ClearXIcon({ size = 16, color = '#64748B', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" fill="#E2E8F0" stroke="none" />
      <path d="m15 9-6 6" stroke="#475569" />
      <path d="m9 9 6 6" stroke="#475569" />
    </svg>
  )
}

export function ClockHistoryIcon({ size = 18, color = '#0284C7', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function CameraRecordIcon({ size = 15, color = '#ffffff', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="5" width="14" height="14" rx="3" />
      <polygon points="22 7 16 12 22 17 22 7" fill={color} />
    </svg>
  )
}

export function PlayCircleIcon({ size = 52, color = '#00649C', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <circle cx="28" cy="28" r="28" fill={color} />
      <polygon points="23 18 39 28 23 38 23 18" fill="white" />
    </svg>
  )
}

export function PlayTriangleIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <polygon points="6 4 20 12 6 20 6 4" fill="none" stroke={color} strokeWidth="2.4" />
    </svg>
  )
}

export function PlayFilledMiniIcon({ size = 16, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <polygon points="10 8 16 12 10 16 10 8" fill={color} />
    </svg>
  )
}

export function PauseMiniIcon({ size = 16, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <line x1="10" y1="6" x2="10" y2="18" />
      <line x1="14" y1="6" x2="14" y2="18" />
    </svg>
  )
}

export function BatteryGaugeIcon({ size = 17, color = '#0284C7', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="7" width="16" height="11" rx="2" ry="2" />
      <line x1="21" y1="11" x2="21" y2="14" />
      <line x1="6" y1="11" x2="6" y2="14" />
      <line x1="10" y1="11" x2="10" y2="14" />
    </svg>
  )
}

export function DistancePathIcon({ size = 17, color = '#0284C7', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="8" width="18" height="8" rx="2" />
      <line x1="7" y1="8" x2="7" y2="11" />
      <line x1="11" y1="8" x2="11" y2="13" />
      <line x1="15" y1="8" x2="15" y2="11" />
    </svg>
  )
}

export function MountainAltitudeIcon({ size = 17, color = '#0284C7', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m8 3 4 8 5-5 5 11H2L8 3z" />
    </svg>
  )
}

export function WindSpeedIcon({ size = 17, color = '#0284C7', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  )
}

export function CheckShieldHashIcon({ size = 16, color = '#16A34A', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function DownloadTrayIcon({ size = 18, color = '#00649C', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function CalendarRetentionIcon({ size = 14, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function CloseModalIcon({ size = 20, color = '#1E293B', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function FullscreenIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

export function AlertWarningIcon({ size = 18, color = '#DC2626', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
