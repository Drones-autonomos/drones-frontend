import { useEffect } from 'react'
import { StopIcon } from './EnVivoIcons.jsx'

export function EmergencyStopModal({ isOpen, onClose, onConfirm, isLoading = false, error = null }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  return (
    <div
      className="emergency-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose()
      }}
    >
      <div className="emergency-modal">
        <div className="emergency-modal__icon">
          <StopIcon />
        </div>
        <h3 id="emergency-modal-title">¿Confirmar Parada Inmediata?</h3>
        <p>
          Esta acción ordenará la parada de emergencia real: el dron aterrizará de inmediato en su posición actual (modo LAND) y quedará registrada en la bitácora de vuelos.
        </p>
        {error && (
          <p
            style={{ color: '#be123c', fontWeight: 700, marginBottom: 18 }}
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="emergency-modal__actions">
          <button
            className="emergency-modal__btn emergency-modal__btn--cancel"
            type="button"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            className="emergency-modal__btn emergency-modal__btn--confirm"
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deteniendo...' : 'Sí, Detener Vuelo'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmergencyStopModal
