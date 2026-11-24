import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav.jsx'
import { AeroHelmetLogo, CloseModalIcon, DownloadTrayIcon } from '../../components/BitacoraIcons.jsx'
import {
  AuditDownloadIcon,
  BackArrowIcon,
  BellPushIcon,
  ChevronRightIcon,
  DataLifecycleIcon,
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
import { getCurrentUser, logoutUser, updateUserProfile } from './authSession.js'
import {
  AI_SENSITIVITY_OPTIONS,
  getStoredSettings,
  RETENTION_PERIOD_OPTIONS,
  saveSettings,
  syncSettingsFromBackend,
  TRANSMISSION_QUALITY_OPTIONS,
} from './ajustesData.js'
import { generateAuditExportFile } from '../../services/flightLogService.js'
import { droneControlService } from '../../services/droneControlService.js'
import {
  fetchOperatingWindow,
  updateOperatingWindow,
} from '../../services/settingsService.js'
import './Ajustes.css'

// Etiquetas UI para el estado de la base de carga (backend: IDLE|DOCKED|CHARGING|CHARGED)
const CHARGING_BASE_ESTADO_LABEL = {
  IDLE: 'Base lista en HOME',
  DOCKED: 'Dron acoplado',
  CHARGING: 'Carga por inducción activa',
  CHARGED: 'Carga completa',
}

/**
 * Pantalla principal del Módulo Ajustes y Edición de Perfil de AeroLuferan
 */
export default function Ajustes({ initialView = 'main' }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Determinar si la vista activa es "Editar perfil" según prop o ruta
  const view =
    initialView === 'editProfile' || location.pathname.includes('/perfil')
      ? 'editProfile'
      : 'main'

  // 1. Estado de usuario autenticado
  const [currentUser, setCurrentUser] = useState(getCurrentUser)

  useEffect(() => {
    function syncUser() {
      setCurrentUser(getCurrentUser())
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
    // Carga inicial: los ajustes persistidos en el backend sobrescriben el caché local.
    syncSettingsFromBackend()
    return () => window.removeEventListener('aeroluferan_settings_updated', syncSettings)
  }, [])

  // 3. Modales interactivos
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false)
  const [isEncryptionModalOpen, setIsEncryptionModalOpen] = useState(false)
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false)
  const [isHeliportModalOpen, setIsHeliportModalOpen] = useState(false)
  const [isNormativeModalOpen, setIsNormativeModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // 4. Ventana operativa normativa del backend (GET /settings/operating-window)
  const [operatingWindow, setOperatingWindow] = useState(null)
  const [isOperatingWindowModalOpen, setIsOperatingWindowModalOpen] = useState(false)
  const [owForm, setOwForm] = useState(null)
  const [owSaving, setOwSaving] = useState(false)
  const [owError, setOwError] = useState(null)

  useEffect(() => {
    let isMounted = true
    fetchOperatingWindow().then((cfg) => {
      if (isMounted && cfg) setOperatingWindow(cfg)
    })
    return () => {
      isMounted = false
    }
  }, [])

  // 5. Estación de carga real (GET /drone/charging-base, best-effort)
  const [chargingBase, setChargingBase] = useState(null)
  const [isDocking, setIsDocking] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadChargingBase() {
      try {
        const status = await droneControlService.getChargingBaseStatus()
        if (isMounted) setChargingBase(status)
      } catch {
        if (isMounted) setChargingBase(null)
      }
    }
    loadChargingBase()
    return () => {
      isMounted = false
    }
  }, [])

  async function refreshChargingBase() {
    try {
      setChargingBase(await droneControlService.getChargingBaseStatus())
    } catch {
      setChargingBase(null)
    }
  }

  // Ciclo de acoplamiento + recarga (solo ADMIN: POST /drone/charging-base/dock-recharge)
  async function handleDockAndRecharge() {
    try {
      setIsDocking(true)
      const result = await droneControlService.dockAndRecharge(100)
      showToast(result?.message || `Recarga completada al ${Math.round(result?.bateria_porcentaje ?? 100)}%`)
      await refreshChargingBase()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo ejecutar el ciclo de recarga.')
    } finally {
      setIsDocking(false)
    }
  }

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

  // Manejo de cambio de ciclo de vida de grabaciones
  function handleSelectRetention(days) {
    const updated = { ...settings, retentionDays: days }
    setSettings(updated)
    saveSettings(updated)
    setIsRetentionModalOpen(false)
    showToast(`Periodo de retención configurado a ${days} días reglamentarios.`)
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

  // Descarga del registro criptográfico de auditoría (datos reales del backend)
  async function handleDownloadAudit() {
    try {
      const { filename } = await generateAuditExportFile()
      showToast(`Descargando ${filename}`)
    } catch {
      showToast('No se pudo generar el registro de auditoría desde el servidor.')
    }
  }

  // Ventana operativa: abrir modal de edición y guardar cambios (solo ADMIN)
  function handleOpenOperatingWindow() {
    setOwForm(operatingWindow ? { ...operatingWindow } : null)
    setOwError(null)
    setIsOperatingWindowModalOpen(true)
  }

  async function handleSaveOperatingWindow(e) {
    e.preventDefault()
    if (!owForm) return
    setOwSaving(true)
    setOwError(null)
    try {
      const updated = await updateOperatingWindow(owForm)
      setOperatingWindow(updated)
      setIsOperatingWindowModalOpen(false)
      showToast(
        `Ventana operativa actualizada: ${updated.hora_apertura} – ${updated.hora_cierre} hrs.`,
      )
    } catch (error) {
      setOwError(
        error?.status === 403
          ? 'La modificación de la ventana operativa requiere perfil Administrador.'
          : error?.message || 'No se pudo actualizar la configuración en el servidor.',
      )
    } finally {
      setOwSaving(false)
    }
  }

  // Confirmación de cierre de sesión
  function handleConfirmLogout() {
    logoutUser()
    setIsLogoutModalOpen(false)
    navigate('/')
  }

  // Navegar a edición de perfil
  function handleOpenEditProfile() {
    navigate('/admin/ajustes/perfil')
  }

  // Volver a vista principal de ajustes
  function handleBackToAjustes() {
    navigate('/admin/ajustes')
  }

  // Manejo de edición de Nombre
  function handleNameChange(e) {
    const newName = e.target.value
    const updated = updateUserProfile({ name: newName })
    setCurrentUser(updated)
  }

  // Manejo de edición de Puesto / Administrador
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
    if (!currentUser?.name) return 'U'
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
                    value={currentUser.name || ''}
                    onChange={handleNameChange}
                    placeholder="Ingresa tu nombre"
                  />
                </div>

                {/* Campo 2: Administrador / Puesto (Editable) */}
                <div className="edit-profile-field">
                  <label className="edit-profile-label" htmlFor="input-puesto-perfil">
                    {currentUser.role === 'admin' ? 'Administrador' : 'Puesto'}
                  </label>
                  <input
                    id="input-puesto-perfil"
                    type="text"
                    className="edit-profile-input"
                    value={currentUser.position || ''}
                    onChange={handlePositionChange}
                    placeholder="Ingresa tu cargo o puesto"
                  />
                </div>

                {/* Campo 3: Correo (NO Editable) */}
                <div className="edit-profile-field">
                  <span className="edit-profile-label">Correo</span>
                  <div className="edit-profile-readonly">
                    {currentUser.email || 'lubazadmin@admin.uaq.mx'}
                  </div>
                </div>

                {/* Franja de estado de credencial y RBAC */}
                <div className="edit-profile-badge-row">
                  <span className="profile-credential-status">
                    <span>{currentUser.credentialStatus || 'Credencial Activa'}</span>
                  </span>

                  <span className="profile-rbac-badge">
                    {currentUser.rbacBadge ||
                      (currentUser.role === 'admin' ? 'RBAC: Académico' : 'RBAC: Seguridad')}
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
            {/* A. TARJETA DE INFORMACIÓN DEL USUARIO */}
            <section className="profile-card" aria-label="Información del usuario autenticado">
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
                  <span className="profile-verified-badge" title="Credencial institucional verificada">
                    <UserVerifiedBadgeIcon size={20} />
                  </span>
                </div>

                <div className="profile-card__info">
                  <h2 className="profile-card__name">{currentUser.name || 'Lu Bazaldúa'}</h2>
                  <span className="profile-card__role">
                    {currentUser.position || 'Coordinador de Software'}
                  </span>
                  <span className="profile-card__email">
                    {currentUser.email || 'lubazadmin@admin.uaq.mx'}
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
                  <span>{currentUser.credentialStatus || 'Credencial Activa'}</span>
                </span>

                <span className="profile-rbac-badge">
                  {currentUser.rbacBadge ||
                    (currentUser.role === 'admin' ? 'RBAC: Académico' : 'RBAC: Seguridad')}
                </span>
              </div>
            </section>

            {/* B. SEGURIDAD & CONTROL OPERATIVO */}
            <div className="ajustes-group">
              <h2 className="ajustes-section-title">SEGURIDAD & CONTROL OPERATIVO</h2>
            <section className="ajustes-group-card" aria-label="Seguridad y control operativo">
              {/* Gestión de Usuarios Institucionales (Solo Admin -> POST /auth/register) */}
              <div
                className="ajustes-item-row"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/admin/usuarios')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate('/admin/usuarios')
                }}
              >
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--blue" aria-hidden="true">
                    <UserVerifiedBadgeIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">Gestión de Usuarios</strong>
                    <p className="ajustes-item__subtitle">
                      Registrar nuevas cuentas de Administrador o Guardia
                    </p>
                  </div>
                </div>

                <span className="btn-action-circle" aria-hidden="true">
                  <ChevronRightIcon size={16} />
                </span>
              </div>

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
            </div>

            {/* C. ALMACENAMIENTO & PRIVACIDAD */}
            <div className="ajustes-group">
              <h2 className="ajustes-section-title">ALMACENAMIENTO & PRIVACIDAD</h2>
            <section className="ajustes-group-card" aria-label="Almacenamiento y privacidad">
              {/* Ciclo de vida de los datos */}
              <div className="ajustes-item-row">
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--purple" aria-hidden="true">
                    <DataLifecycleIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">Ciclo de vida de los datos</strong>
                    <p className="ajustes-item__subtitle">
                      {settings.retentionDays} días reglamentarios
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-action-circle"
                  onClick={() => setIsRetentionModalOpen(true)}
                  title="Consultar y modificar ciclo de retención"
                  aria-label="Consultar periodo de retención de datos"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>

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
            </div>

            {/* D. DISPOSITIVO & ESTACIÓN DE CARGA */}
            <div className="ajustes-group">
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
                      {chargingBase
                        ? `• Conectada • ${CHARGING_BASE_ESTADO_LABEL[chargingBase.estado] || chargingBase.estado}`
                        : '• Sin conexión con el backend'}
                    </p>
                  </div>
                </div>

                <span className="heliport-percentage">
                  {chargingBase ? `${Math.round(chargingBase.bateria_porcentaje)}%` : '—'}
                </span>
              </div>
            </section>
            </div>

            {/* E. AUDITORÍA & NORMATIVA */}
            <div className="ajustes-group">
              <h2 className="ajustes-section-title">AUDITORÍA & NORMATIVA</h2>
            <section className="ajustes-group-card" aria-label="Auditoría y normativa">
              {/* Registro de Auditoría Local */}
              <div className="ajustes-item-row">
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--blue" aria-hidden="true">
                    <AuditDownloadIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">Registro de Auditoría Local</strong>
                    <p className="ajustes-item__subtitle">
                      Descargar historial criptográfico de telemetría
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-audit-download"
                  onClick={handleDownloadAudit}
                  title="Descargar archivo de auditoría criptográfica"
                  aria-label="Descargar historial criptográfico de telemetría"
                >
                  <DownloadTrayIcon size={18} color="#00649c" />
                </button>
              </div>

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

              {/* Ventana Operativa Autorizada (configuración real del backend) */}
              <div className="ajustes-item-row">
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--blue" aria-hidden="true">
                    <SlidersAdjustIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">Ventana Operativa Autorizada</strong>
                    <p className="ajustes-item__subtitle">
                      {operatingWindow
                        ? `${operatingWindow.hora_apertura} – ${operatingWindow.hora_cierre} hrs · Techo ${Math.round(operatingWindow.altitud_maxima_m)} m · Máx ${operatingWindow.peso_maximo_kg} kg`
                        : 'Sin conexión con el servidor'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-action-circle"
                  onClick={handleOpenOperatingWindow}
                  title="Consultar y modificar la ventana operativa normativa"
                  aria-label="Configurar ventana operativa"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </section>
            </div>

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
        <AdminBottomNav activePath="/admin/ajustes" />
      </div>

      {/* ============================================================== */}
      {/* MODALES INTERACTIVOS Y CONFIGURACIÓN                           */}
      {/* ============================================================== */}

      {/* Modal 1: Cierre de sesión (Confirmación exacta solicitada) */}
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

      {/* Modal 2: Ciclo de Vida y Retención de Datos */}
      {isRetentionModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="retention-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="retention-title">Ciclo de Vida de los Datos</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={() => setIsRetentionModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <div className="ajustes-modal-body">
              <p>
                Las grabaciones del dron se almacenan temporalmente y están sujetas a la política de retención reglamentaria de la Bitácora.
              </p>
              <div className="modal-options-list">
                {RETENTION_PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    className={`modal-option-btn${settings.retentionDays === opt.days ? ' is-selected' : ''}`}
                    onClick={() => handleSelectRetention(opt.days)}
                  >
                    <strong>{opt.days} Días Reglamentarios</strong>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b' }}>
                Tras cumplir el periodo seleccionado, los archivos de video son purgados automáticamente del almacenamiento, conservando el registro criptográfico inmutable en la Bitácora.
              </p>
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsRetentionModalOpen(false)}
                style={{ width: '100%', flex: 'none' }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Políticas de Cifrado de Video */}
      {isEncryptionModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="encryption-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="encryption-title">Cifrado de Video Obligatorio</h2>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '750' }}>
                <ShieldSmallCheckIcon size={20} />
                <span>Estado: BLOQUEADO ON (Activo Permanente)</span>
              </div>
              <p>
                Conforme a la normativa de privacidad y protección de datos universitarios, el cifrado de flujo de video no puede desactivarse desde la interfaz de usuario.
              </p>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Algoritmo:</strong> AES-256 GCM con autenticación de trama</div>
                <div><strong>En tránsito:</strong> Enlace RF cifrado bidireccional (Dron ↔ Estación)</div>
                <div><strong>En reposo:</strong> Cifrado de volumen por clave institucional UAQ</div>
              </div>
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsEncryptionModalOpen(false)}
                style={{ width: '100%', flex: 'none' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Calidad de Transmisión de Vuelo */}
      {isQualityModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="quality-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="quality-title">Calidad de Transmisión de Video</h2>
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
              <p>
                Selecciona el perfil de compresión y tasa de bits para la transmisión de la cámara del dron:
              </p>
              <div className="modal-options-list">
                {TRANSMISSION_QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`modal-option-btn${settings.transmissionQualityId === opt.id ? ' is-selected' : ''}`}
                    onClick={() => handleSelectQuality(opt.id)}
                  >
                    <strong>{opt.label}</strong>
                    <span>Resolución {opt.resolution} · {opt.framerate} · {opt.bitrate}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsQualityModalOpen(false)}
                style={{ width: '100%', flex: 'none' }}
              >
                Guardar Selección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Detalle del Helipuerto y Carga Inductiva */}
      {isHeliportModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="heli-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="heli-title">Estado de la Estación de Carga</h2>
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
              {chargingBase ? (
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Estación principal:</span>
                    <strong>{settings.helipads[0]?.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Estado de la base:</span>
                    <strong style={{ color: '#10b981' }}>
                      {CHARGING_BASE_ESTADO_LABEL[chargingBase.estado] || chargingBase.estado}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Batería reportada:</span>
                    <strong style={{ color: '#00649c' }}>
                      {Math.round(chargingBase.bateria_porcentaje)}%
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Radio de acoplamiento:</span>
                    <span>{chargingBase.dock_radius_m} m alrededor de HOME</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Distancia a HOME:</span>
                    <span>
                      {chargingBase.distancia_home_m != null
                        ? `${Number(chargingBase.distancia_home_m).toFixed(1)} m`
                        : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ciclos de recarga completados:</span>
                    <span>{chargingBase.ciclos_completados ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Último acoplamiento:</span>
                    <span>
                      {chargingBase.ultimo_acoplamiento_at
                        ? new Date(chargingBase.ultimo_acoplamiento_at).toLocaleString('es-MX')
                        : 'Sin registros'}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b' }}>
                  Sin conexión con el backend — no se pudo consultar el estado de la
                  estación de carga (GET /drone/charging-base).
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                La recarga por inducción requiere que el dron esté aterrizado dentro
                del radio de acoplamiento del punto HOME.
              </p>
            </div>
            <div className="ajustes-modal-actions" style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={handleDockAndRecharge}
                disabled={isDocking || !chargingBase}
                style={{ flex: 1 }}
                title={chargingBase ? 'Acoplar y cargar la batería al 100%' : 'Requiere conexión con el backend'}
              >
                {isDocking ? 'Acoplando…' : 'Acoplar y recargar'}
              </button>
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsHeliportModalOpen(false)}
                style={{ flex: 1 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Normativa Aeronáutica y Privacidad Estudiantil */}
      {isNormativeModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="norm-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="norm-title">Normativa Aeronáutica y Privacidad</h2>
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
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Regulación:</strong> Código Aeronáutico Civil para RPAS / Drones</div>
                <div><strong>Límite de Techo Operativo:</strong> Estrictamente menor a 200m AGL</div>
                <div><strong>Privacidad:</strong> Difuminado automático de rostros en grabaciones generales</div>
                <div><strong>Geocercas de Exclusión:</strong> Restricción sobre interiores de aulas y áreas residenciales</div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                La operación de AeroLuferan cumple con las disposiciones de la Agencia Federal de Aviación Civil (AFAC) y los lineamientos de privacidad de la Universidad Autónoma de Querétaro.
              </p>
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsNormativeModalOpen(false)}
                style={{ width: '100%', flex: 'none' }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Ventana Operativa Autorizada (configuración normativa del backend) */}
      {isOperatingWindowModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ow-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="ow-title">Ventana Operativa Autorizada</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={() => setIsOperatingWindowModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            {owForm ? (
              <form onSubmit={handleSaveOperatingWindow}>
                <div className="ajustes-modal-body">
                  <p>
                    Configuración normativa vigente en el servidor. Aplica a misiones,
                    despegues y validaciones de geocerca.
                  </p>
                  <div className="modal-options-list">
                    <label className="form-label-block" style={{ display: 'block' }}>
                      <span>Hora de apertura (HH:MM)</span>
                      <input
                        type="time"
                        value={owForm.hora_apertura}
                        onChange={(e) => setOwForm({ ...owForm, hora_apertura: e.target.value })}
                        required
                      />
                    </label>
                    <label className="form-label-block" style={{ display: 'block' }}>
                      <span>Hora de cierre (HH:MM)</span>
                      <input
                        type="time"
                        value={owForm.hora_cierre}
                        onChange={(e) => setOwForm({ ...owForm, hora_cierre: e.target.value })}
                        required
                      />
                    </label>
                    <label className="form-label-block" style={{ display: 'block' }}>
                      <span>Altitud mínima (1–50 m)</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        step="0.5"
                        value={owForm.altitud_minima_m}
                        onChange={(e) =>
                          setOwForm({ ...owForm, altitud_minima_m: e.target.value })
                        }
                        required
                      />
                    </label>
                    <label className="form-label-block" style={{ display: 'block' }}>
                      <span>Altitud máxima / techo (2–200 m)</span>
                      <input
                        type="number"
                        min="2"
                        max="200"
                        step="1"
                        value={owForm.altitud_maxima_m}
                        onChange={(e) =>
                          setOwForm({ ...owForm, altitud_maxima_m: e.target.value })
                        }
                        required
                      />
                    </label>
                    <label className="form-label-block" style={{ display: 'block' }}>
                      <span>Peso máximo de aeronave (kg)</span>
                      <input
                        type="number"
                        min="0.1"
                        max="25"
                        step="0.1"
                        value={owForm.peso_maximo_kg}
                        onChange={(e) =>
                          setOwForm({ ...owForm, peso_maximo_kg: e.target.value })
                        }
                        required
                      />
                    </label>
                  </div>
                  {owError && (
                    <p style={{ fontSize: '12px', color: '#dc2626' }} role="alert">
                      {owError}
                    </p>
                  )}
                </div>
                <div className="ajustes-modal-actions">
                  <button
                    type="button"
                    className="btn-ajustes-modal-cancel"
                    onClick={() => setIsOperatingWindowModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-ajustes-modal-confirm"
                    disabled={owSaving}
                  >
                    {owSaving ? 'Guardando…' : 'Guardar en servidor'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="ajustes-modal-body">
                <p>
                  Sin conexión con el servidor backend. No es posible consultar la
                  ventana operativa normativa en este momento.
                </p>
                <div className="ajustes-modal-actions">
                  <button
                    type="button"
                    className="btn-ajustes-modal-cancel"
                    onClick={() => setIsOperatingWindowModalOpen(false)}
                    style={{ width: '100%', flex: 'none' }}
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast de retroalimentación de operaciones */}
      {toastMessage && (
        <div className="ajustes-toast" role="status">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
