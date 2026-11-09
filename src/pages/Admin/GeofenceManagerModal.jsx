import { useState } from 'react'
import {
  CloseIcon,
  TrashIcon,
  EditIcon,
  PlusIcon,
  AdjustSliderIcon,
  NoEntryIcon,
  WarningBoltIcon,
} from '../../components/RutasIcons.jsx'

export function GeofenceManagerModal({
  isOpen,
  onClose,
  geofences,
  onToggleStatus,
  onDeleteZone,
  onEditZone,
  onStartDrawing,
}) {
  const [editingZoneId, setEditingZoneId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('informativa')
  const [editReason, setEditReason] = useState('')

  if (!isOpen) return null

  function handleStartEdit(zone) {
    setEditingZoneId(zone.id)
    setEditName(zone.name)
    setEditType(zone.type)
    setEditReason(zone.restrictionReason || '')
  }

  function handleSaveEdit(zoneId) {
    onEditZone(zoneId, {
      name: editName.trim(),
      type: editType,
      restrictionReason: editReason.trim(),
    })
    setEditingZoneId(null)
  }

  return (
    <div className="geofence-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="geo-modal-title">
      <div className="geofence-modal-card">
        <header className="geofence-modal-header">
          <div className="geofence-modal-title-wrap">
            <AdjustSliderIcon size={20} color="#0284c7" />
            <div>
              <h2 id="geo-modal-title">Gestión de Geocercas y Perímetro</h2>
              <p>Zonas activas en el campus de la Facultad de Informática</p>
            </div>
          </div>
          <button type="button" className="geofence-modal-close" onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="geofence-modal-body">
          <div className="geofence-modal-top-actions">
            <button
              type="button"
              className="geofence-btn-draw-trigger"
              onClick={() => {
                onClose()
                onStartDrawing()
              }}
            >
              <PlusIcon size={16} color="#ffffff" />
              <span>Dibujar Nueva Zona Rectangular</span>
            </button>
            <p className="geofence-modal-helper">
              Haz clic para seleccionar el área directamente sobre el mapa satelital.
            </p>
          </div>

          <h3 className="geofence-list-heading">Zonas Registradas ({geofences.length})</h3>

          <ul className="geofence-list">
            {geofences.map((zone) => {
              const isEditing = editingZoneId === zone.id

              return (
                <li key={zone.id} className={`geofence-item geofence-item--${zone.type}`}>
                  {isEditing ? (
                    <div className="geofence-item-edit-form">
                      <label>
                        <span>Nombre:</span>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Clasificación:</span>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                        >
                          <option value="informativa">Informativa</option>
                          <option value="advertencia">Advertencia (Riesgo)</option>
                          <option value="restringida">Restringida (Prohibido sobrevolar)</option>
                        </select>
                      </label>
                      <label>
                        <span>Motivo / Restricción:</span>
                        <input
                          type="text"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="Ej. Tope de altura o interferencia"
                        />
                      </label>
                      <div className="geofence-edit-actions">
                        <button
                          type="button"
                          className="btn-save-sm"
                          onClick={() => handleSaveEdit(zone.id)}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          className="btn-cancel-sm"
                          onClick={() => setEditingZoneId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="geofence-item-main">
                        <div className="geofence-item-header">
                          <span
                            className="geofence-type-indicator"
                            style={{
                              backgroundColor:
                                zone.type === 'restringida'
                                  ? '#ef4444'
                                  : zone.type === 'advertencia'
                                    ? '#f59e0b'
                                    : '#0284c7',
                            }}
                          />
                          <strong>{zone.name}</strong>
                          <span className={`geofence-type-tag geofence-type-tag--${zone.type}`}>
                            {zone.type === 'restringida' && <NoEntryIcon size={12} color="#dc2626" />}
                            {zone.type === 'advertencia' && <WarningBoltIcon size={12} color="#d97706" />}
                            {zone.type.toUpperCase()}
                          </span>
                        </div>

                        {zone.restrictionReason ? (
                          <p className="geofence-item-reason">⚠️ {zone.restrictionReason}</p>
                        ) : (
                          <p className="geofence-item-desc">{zone.description || 'Zona operativa sin restricciones.'}</p>
                        )}

                        <div className="geofence-item-coords">
                          Límites: [{zone.bounds[0][0].toFixed(4)}, {zone.bounds[0][1].toFixed(4)}] a [
                          {zone.bounds[1][0].toFixed(4)}, {zone.bounds[1][1].toFixed(4)}]
                        </div>
                      </div>

                      <div className="geofence-item-controls">
                        <button
                          type="button"
                          className={`btn-toggle-zone${zone.status === 'Activa' ? ' is-active' : ''}`}
                          onClick={() => onToggleStatus(zone.id)}
                          title={zone.status === 'Activa' ? 'Desactivar zona' : 'Activar zona'}
                        >
                          {zone.status === 'Activa' ? 'Activa' : 'Pausada'}
                        </button>

                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={() => handleStartEdit(zone)}
                          title="Editar zona"
                        >
                          <EditIcon size={15} color="#0284c7" />
                        </button>

                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={() => onDeleteZone(zone.id)}
                          title="Eliminar zona"
                        >
                          <TrashIcon size={15} color="#ef4444" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <footer className="geofence-modal-footer">
          <button type="button" className="btn-close-modal" onClick={onClose}>
            Entendido / Cerrar
          </button>
        </footer>
      </div>
    </div>
  )
}

export function NewZoneDialog({
  isOpen,
  bounds,
  onSave,
  onCancel,
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState('restringida')
  const [reason, setReason] = useState('')

  if (!isOpen || !bounds) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      type,
      restrictionReason: reason.trim(),
      bounds,
      badgeCode: name.trim().slice(0, 3).toUpperCase(),
      status: 'Activa',
      description: reason.trim() || 'Zona configurada por el operador.',
    })
  }

  return (
    <div className="geofence-modal-overlay" role="dialog" aria-modal="true">
      <div className="geofence-modal-card geofence-modal-card--sm">
        <header className="geofence-modal-header">
          <div className="geofence-modal-title-wrap">
            <PlusIcon size={20} color="#0284c7" />
            <div>
              <h2>Registrar Zona Rectangular</h2>
              <p>Área delimitada exitosamente en el mapa</p>
            </div>
          </div>
          <button type="button" className="geofence-modal-close" onClick={onCancel} aria-label="Cancelar">
            <CloseIcon size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="geofence-modal-body">
          <label className="form-label-block">
            <span>Nombre de la Geocerca:</span>
            <input
              type="text"
              placeholder="Ej. Edificio C · Zona Restringida"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="form-label-block">
            <span>Clasificación de Seguridad:</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="restringida">Restringida (Prohibido sobrevolar)</option>
              <option value="advertencia">Advertencia (Riesgo EM / Precaución)</option>
              <option value="informativa">Informativa (Referencia perimetral)</option>
            </select>
          </label>

          <label className="form-label-block">
            <span>Motivo de la restricción:</span>
            <input
              type="text"
              placeholder="Ej. Tope de altura 15m, presencia de personas"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          <div className="geofence-bounds-preview">
            <span>Esquina 1: [{bounds[0][0].toFixed(5)}, {bounds[0][1].toFixed(5)}]</span>
            <span>Esquina 2: [{bounds[1][0].toFixed(5)}, {bounds[1][1].toFixed(5)}]</span>
          </div>

          <div className="geofence-form-actions">
            <button type="button" className="btn-cancel-modal" onClick={onCancel}>
              Descartar
            </button>
            <button type="submit" className="btn-submit-modal">
              Guardar Geocerca
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
