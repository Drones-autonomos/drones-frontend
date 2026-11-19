import { useEffect } from 'react'
import { StopIcon } from './EnVivoIcons.jsx'

export function EmergencyStopModal({ isOpen, onClose, onConfirm, isLoading = false }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="emergency-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="emergency-modal">
        <div className="emergency-modal__icon">
          <StopIcon />
        </div>
        <h3 id="emergency-modal-title">¿Confirmar Parada Inmediata?</h3>
        <p>
          Esta acción activará el mecanismo de seguridad de emergencia del controlador de vuelo y detendrá de inmediato la operación del dron.
        </p>
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
