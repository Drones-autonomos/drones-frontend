import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GuardiaBottomNav from '../../components/GuardiaBottomNav.jsx'
import { AeroHelmetLogo, CloseModalIcon } from '../../components/BitacoraIcons.jsx'
import {
  BackArrowIcon,
  BellPushIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  HeliportStationIcon,
  NormativeDocIcon,
  ShieldSmallCheckIcon,
  SlidersAdjustIcon,
  SparklesAiIcon,
  TransmissionQualityIcon,
  UserVerifiedBadgeIcon,
  VideoLockIcon,
} from '../../components/AjustesIcons.jsx'
import { DEFAULT_GUARD_USER, getCurrentUser, logoutUser, updateUserProfile } from '../Admin/authSession.js'
import {
  AI_SENSITIVITY_OPTIONS,
  getStoredSettings,
  saveSettings,
  TRANSMISSION_QUALITY_OPTIONS,
} from '../Admin/ajustesData.js'
import './Ajustes.css'

/**
 * Pantalla principal del Módulo Ajustes del Perfil Guardia de AeroLuferan.
 * Fiel a Figma con las restricciones de permisos de Guardia:
 * - Se elimina "Ciclo de vida de los datos" (Almacenamiento)
 * - Se elimina "Registro de Auditoría Local" (Auditoría)
 */
export default function GuardiaAjustes({ initialView = 'main' }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Determinar vista activa directamente según la ruta o prop (evita efectos redundantes)
  const isEditProfile = initialView === 'editProfile' || location.pathname.includes('/perfil')
  const view = isEditProfile ? 'editProfile' : 'main'

  // 1. Estado de usuario autenticado (con fallback asegurado a Guardia)
  const [currentUser, setCurrentUser] = useState(() => {
    const user = getCurrentUser()
    if (user && user.role === 'guard') return user
    return {
      ...DEFAULT_GUARD_USER,
      ...(user?.role === 'guard' ? user : {}),
    }
  })

  useEffect(() => {
    function syncUser() {
      const user = getCurrentUser()
      if (user && user.role === 'guard') {
        setCurrentUser(user)
      } else {
        setCurrentUser((prev) => ({
          ...DEFAULT_GUARD_USER,
          ...prev,
        }))
      }
    }
    window.addEventListener('aeroluferan_session_changed', syncUser)
    return () => window.removeEventListener('aeroluferan_session_changed', syncUser)
  }, [])

  // 2. Estado de ajustes del sistema
  const [settings, setSettings] = useState(getStoredSettings)

  useEffect(() => {
    function syncSettings() {
      setSettings(getStoredSettings())
    }
    window.addEventListener('aeroluferan_settings_updated', syncSettings)
    return () => window.removeEventListener('aeroluferan_settings_updated', syncSettings)
  }, [])

  // 3. Modales interactivos
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isEncryptionModalOpen, setIsEncryptionModalOpen] = useState(false)
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false)
  const [isHeliportModalOpen, setIsHeliportModalOpen] = useState(false)
  const [isNormativeModalOpen, setIsNormativeModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Referencia al input de archivo para cambiar foto
  const fileInputRef = useRef(null)

  function showToast(message) {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  // Opción activa de sensibilidad IA
  const activeAiOption = useMemo(() => {
    return (
      AI_SENSITIVITY_OPTIONS.find((opt) => opt.id === settings.aiSensitivityId) ||
      AI_SENSITIVITY_OPTIONS[1]
    )
  }, [settings.aiSensitivityId])

  // Opción activa de calidad de transmisión
  const activeQualityOption = useMemo(() => {
    return (
      TRANSMISSION_QUALITY_OPTIONS.find((opt) => opt.id === settings.transmissionQualityId) ||
      TRANSMISSION_QUALITY_OPTIONS[0]
    )
  }, [settings.transmissionQualityId])

  // Manejo del interruptor de Alertas Push Críticas
  function handleTogglePush() {
    const nextState = !settings.criticalPushEnabled
    const updated = { ...settings, criticalPushEnabled: nextState }
    setSettings(updated)
    saveSettings(updated)
    showToast(
      nextState
        ? 'Alertas push críticas activadas para detección de incidentes.'
        : 'Alertas push críticas desactivadas en este dispositivo.',
    )
  }

  // Manejo de selección de sensibilidad de detección IA
  function handleSelectAiSensitivity(optionId) {
    const updated = { ...settings, aiSensitivityId: optionId }
    setSettings(updated)
    saveSettings(updated)
    const opt = AI_SENSITIVITY_OPTIONS.find((o) => o.id === optionId)
    showToast(`Sensibilidad IA establecida en ${opt?.badgeText || optionId}.`)
  }

  // Manejo de cambio de calidad de video
  function handleSelectQuality(qualityId) {
    const updated = { ...settings, transmissionQualityId: qualityId }
    setSettings(updated)
    saveSettings(updated)
    setIsQualityModalOpen(false)
    const opt = TRANSMISSION_QUALITY_OPTIONS.find((q) => q.id === qualityId)
    showToast(`Calidad de transmisión actualizada a ${opt?.label.split(' (')[0] || qualityId}.`)
  }

  // Confirmación de cierre de sesión
  function handleConfirmLogout() {
    logoutUser()
    setIsLogoutModalOpen(false)
    navigate('/')
  }

  // Navegar a edición de perfil
  function handleOpenEditProfile() {
    navigate('/guardia/ajustes/perfil')
  }

  // Volver a vista principal de ajustes
  function handleBackToAjustes() {
    navigate('/guardia/ajustes')
  }

  // Manejo de edición de Nombre
  function handleNameChange(e) {
    const newName = e.target.value
    const updated = updateUserProfile({ name: newName })
    setCurrentUser(updated)
  }

  // Manejo de edición de Puesto
  function handlePositionChange(e) {
    const newPosition = e.target.value
    const updated = updateUserProfile({ position: newPosition })
    setCurrentUser(updated)
  }

  // Manejo de carga de fotografía de perfil
  function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const photoUrl = reader.result
      const updated = updateUserProfile({ photoUrl })
      setCurrentUser(updated)
      showToast('Fotografía de perfil actualizada.')
    }
    reader.readAsDataURL(file)
  }

  // Iniciales del usuario para el avatar
  const userInitials = useMemo(() => {
    if (!currentUser?.name) return 'GS'
    const parts = currentUser.name.trim().split(' ')
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2).toUpperCase()
  }, [currentUser])

  return (
    <div className="ajustes-page">
      <div className="ajustes-shell">
        {/* ============================================================== */}
        {/* ENCABEZADO SUPERIOR AEROLUFERAN                                */}
        {/* ============================================================== */}
        <header className="ajustes-header">
          <div className="ajustes-brand">
            <AeroHelmetLogo size={38} />
            <h1 className="ajustes-brand-title">AeroLuferan</h1>
          </div>
        </header>

        {/* ============================================================== */}
        {/* CONTENIDO PRINCIPAL: CONDICIONADO SEGÚN VISTA                  */}
        {/* ============================================================== */}
        {view === 'editProfile' ? (
          /* ============================================================ */
          /* VISTA: EDITAR PERFIL (Fiel a la captura de Figma)            */
          /* ============================================================ */
          <main className="ajustes-content" style={{ paddingBottom: '24px' }}>
            <section className="edit-profile-card" aria-label="Editar datos personales">
              {/* Encabezado con flecha de retorno y título centrado */}
              <div className="edit-profile-header">
                <button
                  type="button"
                  className="edit-profile-back-btn"
                  onClick={handleBackToAjustes}
                  aria-label="Volver a Ajustes"
                >
                  <BackArrowIcon size={18} />
                </button>
                <h2 className="edit-profile-title">Editar perfil</h2>
              </div>

              {/* Sección de fotografía de perfil */}
              <div className="edit-profile-photo-section">
                <div className="edit-profile-avatar-circle" aria-label="Fotografía de perfil">
                  {currentUser.photoUrl ? (
                    <img src={currentUser.photoUrl} alt={`Foto de ${currentUser.name}`} />
                  ) : null}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />

                <button
                  type="button"
                  className="edit-profile-change-photo-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Cambiar foto
                </button>
              </div>

              {/* Formulario de campos */}
              <div className="edit-profile-form">
                {/* Campo 1: Nombre (Editable) */}
                <div className="edit-profile-field">
                  <label className="edit-profile-label" htmlFor="input-nombre-perfil">
                    Nombre
                  </label>
                  <input
                    id="input-nombre-perfil"
                    type="text"
                    className="edit-profile-input"
                    value={currentUser.name || 'NombreGuardia'}
                    onChange={handleNameChange}
                    placeholder="Ingresa tu nombre"
                  />
                </div>

                {/* Campo 2: Puesto (Editable) */}
                <div className="edit-profile-field">
                  <label className="edit-profile-label" htmlFor="input-puesto-perfil">
                    Puesto
                  </label>
                  <input
                    id="input-puesto-perfil"
                    type="text"
                    className="edit-profile-input"
                    value={currentUser.position || 'Guardia Supervisor'}
                    onChange={handlePositionChange}
                    placeholder="Ingresa tu cargo o puesto"
                  />
                </div>

                {/* Campo 3: Correo (NO Editable) */}
                <div className="edit-profile-field">
                  <span className="edit-profile-label">Correo</span>
                  <div className="edit-profile-readonly">
                    {currentUser.email || 'guard.seguridad@admin.uaq.mx'}
                  </div>
                </div>

                {/* Franja de estado de credencial y RBAC */}
                <div className="edit-profile-badge-row">
                  <span className="profile-credential-status">
                    <span className="status-dot" aria-hidden="true" />
                    <span>{currentUser.credentialStatus || 'Credencial Activa'}</span>
                  </span>

                  <span className="profile-rbac-badge">
                    {currentUser.rbacBadge || 'RBAC: Seguridad'}
                  </span>
                </div>
              </div>
            </section>
          </main>
        ) : (
          /* ============================================================ */
          /* VISTA: AJUSTES PRINCIPAL                                      */
          /* ============================================================ */
          <main className="ajustes-content">
            {/* A. TARJETA DE INFORMACIÓN DEL USUARIO GUARDIA */}
            <section className="profile-card" aria-label="Información del guardia autenticado">
              <div className="profile-card__top">
                <div className="profile-card__avatar-wrap">
                  {currentUser.photoUrl ? (
                    <img
                      src={currentUser.photoUrl}
                      alt={currentUser.name}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="profile-avatar-circle" aria-label="Avatar del usuario">
                      {userInitials}
                    </div>
                  )}
                  <span className="profile-verified-badge" title="Credencial institucional de seguridad verificada">
                    <UserVerifiedBadgeIcon size={20} />
                  </span>
                </div>

                <div className="profile-card__info">
                  <h2 className="profile-card__name">{currentUser.name || 'NombreGuardia'}</h2>
                  <span className="profile-card__role">
                    {currentUser.position || 'Guardia Supervisor'}
                  </span>
                  <span className="profile-card__email">
                    {currentUser.email || 'guard.seguridad@admin.uaq.mx'}
                  </span>
                </div>

                <button
                  type="button"
                  className="profile-chevron-btn"
                  onClick={handleOpenEditProfile}
                  aria-label="Abrir formulario para editar datos de perfil"
                  title="Editar perfil"
                >
                  <ChevronRightIcon size={18} />
                </button>
              </div>

              <div className="profile-card__bottom">
                <span className="profile-credential-status">
                  <span className="status-dot" aria-hidden="true" />
                  <span>{currentUser.credentialStatus || 'Credencial Activa'}</span>
                </span>

                <span className="profile-rbac-badge">
                  {currentUser.rbacBadge || 'RBAC: Seguridad'}
                </span>
              </div>
            </section>

            {/* B. SEGURIDAD & CONTROL OPERATIVO */}
            <h2 className="ajustes-section-title">SEGURIDAD & CONTROL OPERATIVO</h2>
            <section className="ajustes-group-card" aria-label="Seguridad y control operativo">
              {/* Alertas Push Críticas */}
              <div className="ajustes-item-row">
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--blue" aria-hidden="true">
                    <BellPushIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">Alertas Push Críticas</strong>
                    <p className="ajustes-item__subtitle">
                      Detección inmediata de humo, calor e intrusiones nocturnas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.criticalPushEnabled}
                  aria-label="Activar o desactivar alertas push críticas"
                  className={`ajustes-toggle-btn${settings.criticalPushEnabled ? ' is-active' : ''}`}
                  onClick={handleTogglePush}
                >
                  <span className="ajustes-toggle-thumb" />
                </button>
              </div>

              {/* Sensibilidad Detección IA */}
              <div className="ajustes-item-row ajustes-item-row--stacked">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                  <div className="ajustes-item__left">
                    <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--blue" aria-hidden="true">
                      <SparklesAiIcon size={22} />
                    </div>
                    <div className="ajustes-item__texts">
                      <strong className="ajustes-item__title-line">Sensibilidad Detección IA</strong>
                      <p className="ajustes-item__subtitle">Visión computacional en tiempo real</p>
                    </div>
                  </div>

                  <span className="ai-sensitivity-badge">
                    {activeAiOption.badgeText}
                  </span>
                </div>

                {/* Selector de 3 segmentos */}
                <div
                  className="ai-segments-container"
                  role="radiogroup"
                  aria-label="Nivel de sensibilidad de detección IA"
                >
                  {AI_SENSITIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={settings.aiSensitivityId === opt.id}
                      className={`ai-segment-btn${settings.aiSensitivityId === opt.id ? ' is-active' : ''}`}
                      onClick={() => handleSelectAiSensitivity(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* C. ALMACENAMIENTO & PRIVACIDAD (Sin "Ciclo de vida de los datos" para Guardia) */}
            <h2 className="ajustes-section-title">ALMACENAMIENTO & PRIVACIDAD</h2>
            <section className="ajustes-group-card" aria-label="Almacenamiento y privacidad">
              {/* Cifrado de Video */}
              <div className="ajustes-item-row">
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--green" aria-hidden="true">
                    <VideoLockIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <div className="ajustes-item__title-line">
                      <strong>Cifrado de Video</strong>
                      <ShieldSmallCheckIcon size={16} />
                    </div>
                    <p className="ajustes-item__subtitle">
                      Cifrado de flujo activo en reposo y tránsito
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="encryption-status-pill"
                  onClick={() => setIsEncryptionModalOpen(true)}
                  title="Políticas de seguridad: Cifrado activo y bloqueado por normativa institucional"
                >
                  <span className="dot" aria-hidden="true" />
                  <span>BLOQUEADO ON</span>
                </button>
              </div>

              {/* Calidad de Transmisión de Vuelo */}
              <div className="ajustes-item-row">
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--blue" aria-hidden="true">
                    <TransmissionQualityIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">Calidad de Transmisión de Vuelo</strong>
                    <p className="ajustes-item__subtitle">
                      {activeQualityOption.label}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-action-circle"
                  onClick={() => setIsQualityModalOpen(true)}
                  title="Configurar calidad de transmisión de video"
                  aria-label="Configurar calidad de transmisión de video"
                >
                  <SlidersAdjustIcon size={18} color="#00649c" />
                </button>
              </div>
            </section>

            {/* D. DISPOSITIVO & ESTACIÓN DE CARGA */}
            <h2 className="ajustes-section-title">DISPOSITIVO & ESTACIÓN DE CARGA</h2>
            <section className="ajustes-group-card" aria-label="Dispositivos y estaciones de carga">
              <div
                className="ajustes-item-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setIsHeliportModalOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setIsHeliportModalOpen(true)
                }}
              >
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--green" aria-hidden="true">
                    <HeliportStationIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">
                      {settings.helipads[0]?.name || 'Helipuerto Base Norte #01'}
                    </strong>
                    <p className="ajustes-item__subtitle">
                      • {settings.helipads[0]?.connectionStatus || 'Conectada'} •{' '}
                      {settings.helipads[0]?.chargingStatus || 'Carga Inductiva lista'}
                    </p>
                  </div>
                </div>

                <span className="heliport-percentage">
                  {settings.helipads[0]?.batteryLevel || 100}%
                </span>
              </div>
            </section>

            {/* E. AUDITORÍA & NORMATIVA (Sin "Registro de Auditoría Local" para Guardia) */}
            <h2 className="ajustes-section-title">AUDITORÍA & NORMATIVA</h2>
            <section className="ajustes-group-card" aria-label="Auditoría y normativa">
              {/* Privacidad Estudiantil & Espacio Aéreo */}
              <div className="ajustes-item-row">
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--purple" aria-hidden="true">
                    <NormativeDocIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">
                      Privacidad Estudiantil & Espacio Aéreo
                    </strong>
                    <p className="ajustes-item__subtitle">Código Aeronáutico Civil &lt;200m AGL</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-normative-link"
                  onClick={() => setIsNormativeModalOpen(true)}
                  title="Consultar normativa aeronáutica y de privacidad"
                  aria-label="Consultar código aeronáutico civil y privacidad"
                >
                  <ExternalLinkIcon size={18} />
                </button>
              </div>
            </section>

            {/* F. BOTÓN CERRAR SESIÓN Y VERSIÓN */}
            <button
              type="button"
              className="btn-logout-ajustes"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              Cerrar Sesión
            </button>

            <p className="ajustes-version-footer">AeroLuferan OS v2.4.0</p>
          </main>
        )}

        {/* ============================================================== */}
        {/* BARRA DE NAVEGACIÓN INFERIOR                                   */}
        {/* ============================================================== */}
        <GuardiaBottomNav activePath="/guardia/ajustes" />
      </div>

      {/* ============================================================== */}
      {/* MODALES INTERACTIVOS Y CONFIGURACIÓN                           */}
      {/* ============================================================== */}

      {/* Modal 1: Cierre de sesión */}
      {isLogoutModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="logout-title">Cierre de sesión</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={() => setIsLogoutModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <div className="ajustes-modal-body">
              <p>¿Deseas cerrar tu sesión actual en AeroLuferan?</p>
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsLogoutModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-ajustes-modal-confirm"
                onClick={handleConfirmLogout}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Cifrado de Video (Informativo bloqueado) */}
      {isEncryptionModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="encryption-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="encryption-title">Cifrado de Flujo de Video</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={() => setIsEncryptionModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <div className="ajustes-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: '750' }}>
                <ShieldSmallCheckIcon size={20} />
                <span>Estado: {settings.videoEncryption.statusText}</span>
              </div>
              <p>{settings.videoEncryption.description}</p>
              <div className="modal-session-detail">
                <span>Estándar criptográfico:</span>
                <strong>{settings.videoEncryption.type}</strong>
                <span>Políticas de seguridad:</span>
                <small style={{ color: '#64748b' }}>
                  El cifrado de flujo no puede ser deshabilitado por el operador para salvaguardar la privacidad de las grabaciones aéreas institucionales.
                </small>
              </div>
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsEncryptionModalOpen(false)}
                style={{ flex: 'none', width: '100%' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Calidad de Transmisión */}
      {isQualityModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="quality-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="quality-title">Calidad de Transmisión de Vuelo</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={() => setIsQualityModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <div className="ajustes-modal-body">
              <p>Selecciona el perfil de compresión para la transmisión en vivo del dron:</p>
              <div className="ajustes-option-list">
                {TRANSMISSION_QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className={`ajustes-option-item${settings.transmissionQualityId === q.id ? ' is-selected' : ''}`}
                    onClick={() => handleSelectQuality(q.id)}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a' }}>
                        {q.label}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {q.resolution} · {q.framerate} · {q.bitrate}
                      </span>
                    </div>
                    {settings.transmissionQualityId === q.id && (
                      <span style={{ color: '#00649c', fontWeight: '800' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsQualityModalOpen(false)}
                style={{ flex: 'none', width: '100%' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Estado de Estación Helipuerto */}
      {isHeliportModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="heliport-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="heliport-title">Estaciones y Helipuertos</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={() => setIsHeliportModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <div className="ajustes-modal-body">
              {settings.helipads.map((pad) => (
                <div key={pad.id} className="modal-session-detail" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{pad.name}</strong>
                    <span style={{ color: '#0284c7', fontWeight: '800' }}>{pad.batteryLevel}%</span>
                  </div>
                  <span>Enlace: {pad.connectionStatus}</span>
                  <span>Carga: {pad.chargingStatus}</span>
                  <span>Cúpula protectora: {pad.domeStatus}</span>
                  <span>Voltaje de salida: {pad.voltage} · Temp: {pad.temperature}</span>
                </div>
              ))}
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsHeliportModalOpen(false)}
                style={{ flex: 'none', width: '100%' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Privacidad Estudiantil y Espacio Aéreo */}
      {isNormativeModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="normative-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="normative-title">Normativa & Privacidad Estudiantil</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={() => setIsNormativeModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <div className="ajustes-modal-body">
              <div className="modal-session-detail">
                <span>Marco Regulatorio Aeronáutico:</span>
                <strong>Código Aeronáutico Civil &lt;200m AGL (SCT / AFAC)</strong>
                <small style={{ color: '#475569', marginTop: '4px' }}>
                  Los vuelos autónomos de AeroLuferan operan con geocercas activas limitadas a una altitud máxima de 50 metros AGL, dentro del rango seguro no tripulado.
                </small>
              </div>

              <div className="modal-session-detail">
                <span>Protocolo de Protección de Datos Personales (UAQ):</span>
                <strong>Privacidad de la Comunidad Universitaria</strong>
                <small style={{ color: '#475569', marginTop: '4px' }}>
                  El agente de IA aplica algoritmos de ofuscación y desenfoque facial en tiempo real sobre áreas peatonales abiertas, activando únicamente el seguimiento térmico en zonas con anomalías o conatos de riesgo.
                </small>
              </div>
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsNormativeModalOpen(false)}
                style={{ flex: 'none', width: '100%' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de retroalimentación flotante */}
      {toastMessage && (
        <div className="ajustes-toast" role="status">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
