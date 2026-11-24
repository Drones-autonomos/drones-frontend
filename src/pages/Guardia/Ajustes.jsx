import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GuardiaBottomNav from '../../components/GuardiaBottomNav.jsx'
import { CloseModalIcon } from '../../components/BitacoraIcons.jsx'
import aeroluferanLogo from '../../assets/aeroluferan-logo.png'
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
import {
  changePassword,
  DEFAULT_GUARD_USER,
  getCurrentUser,
  logoutUser,
  updateUserProfile,
} from '../Admin/authSession.js'
import {
  AI_SENSITIVITY_OPTIONS,
  getStoredSettings,
  saveSettings,
  syncSettingsFromBackend,
  TRANSMISSION_QUALITY_OPTIONS,
} from '../Admin/ajustesData.js'
import { fetchOperatingWindow } from '../../services/settingsService.js'
import { describeApiError } from '../../services/apiClient.js'
import useChargingStations from '../../hooks/useChargingStations.js'
import StatusPlaceholder from '../../components/StatusPlaceholder.jsx'
import './Ajustes.css'

// Etiquetas UI para el estado de la base de carga (backend: IDLE|DOCKED|CHARGING|CHARGED)
const CHARGING_BASE_ESTADO_LABEL = {
  IDLE: 'Base lista en HOME',
  DOCKED: 'Dron acoplado',
  CHARGING: 'Carga por inducción activa',
  CHARGED: 'Carga completa',
}

// Tamaño máximo de fotografía de perfil (2 MB, igual que el límite del backend)
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024

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
    // Carga inicial: los ajustes persistidos en el backend sobrescriben el caché local.
    syncSettingsFromBackend()
    return () => window.removeEventListener('aeroluferan_settings_updated', syncSettings)
  }, [])

  // 3. Modales interactivos
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isEncryptionModalOpen, setIsEncryptionModalOpen] = useState(false)
  const [isHeliportModalOpen, setIsHeliportModalOpen] = useState(false)
  const [isNormativeModalOpen, setIsNormativeModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // 3b. Formulario controlado de edición de perfil (inicializado una vez por vista;
  // patrón "ajustar estado durante el render" al entrar a la vista de perfil)
  const [profileDraft, setProfileDraft] = useState({ name: '', position: '' })
  const [prevView, setPrevView] = useState(view)
  if (prevView !== view) {
    setPrevView(view)
    if (view === 'editProfile') {
      setProfileDraft({
        name: currentUser.name || '',
        position: currentUser.position || currentUser.customPosition || '',
      })
    }
  }

  // 3c. Cambio de contraseña propio (POST /auth/change-password)
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState(null)

  // 4. Ventana operativa normativa del backend (solo consulta para Guardia)
  const [operatingWindow, setOperatingWindow] = useState(null)
  const [isOperatingWindowModalOpen, setIsOperatingWindowModalOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    fetchOperatingWindow().then((cfg) => {
      if (isMounted && cfg) setOperatingWindow(cfg)
    })
    return () => {
      isMounted = false
    }
  }, [])

  // 5. Estaciones de carga reales (GET /drone/charging-bases; GUARDIA solo consulta)
  const {
    stations: chargingBases,
    error: chargingBasesError,
    reload: refreshChargingBases,
  } = useChargingStations()

  const primaryChargingBase = chargingBases[0] || null

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

  // Manejo del interruptor de Alertas Push Críticas (preferencia personal;
  // saveSettings devuelve promesa real y reporta errores 4xx/5xx)
  function handleTogglePush() {
    const nextState = !settings.criticalPushEnabled
    const updated = { ...settings, criticalPushEnabled: nextState }
    setSettings(updated)
    saveSettings(updated)
      .then(() =>
        showToast(
          nextState
            ? 'Alertas push críticas activadas para detección de incidentes.'
            : 'Alertas push críticas desactivadas en este dispositivo.',
        ),
      )
      .catch(() => showToast('El servidor rechazó el cambio de alertas push.'))
  }

  // Cambio de contraseña propio (POST /auth/change-password, revoca sesión)
  function openPasswordModal() {
    setPwdForm({ current: '', next: '', confirm: '' })
    setPwdError(null)
    setIsPasswordModalOpen(true)
  }

  async function handleSubmitPasswordChange(event) {
    event.preventDefault()
    if (pwdSaving) return
    if (pwdForm.next.length < 8) {
      setPwdError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError('La confirmación no coincide con la nueva contraseña.')
      return
    }
    try {
      setPwdSaving(true)
      setPwdError(null)
      await changePassword(pwdForm.current, pwdForm.next)
      setIsPasswordModalOpen(false)
      // El backend revocó el token: se cierra sesión para reingresar.
      showToast('Contraseña actualizada. Inicia sesión de nuevo.')
      logoutUser()
      navigate('/', { replace: true })
    } catch (error) {
      setPwdError(
        error?.status === 400 || error?.status === 422
          ? 'La nueva contraseña no cumple los requisitos del servidor.'
          : error?.status === 401
            ? 'La contraseña actual es incorrecta.'
            : 'No se pudo cambiar la contraseña. Intenta de nuevo.',
      )
    } finally {
      setPwdSaving(false)
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
    navigate('/guardia/ajustes/perfil')
  }

  // Volver a vista principal de ajustes
  function handleBackToAjustes() {
    navigate('/guardia/ajustes')
  }

  // Manejo de edición de Nombre (input controlado por profileDraft; sin
  // autoinyectar un nombre por defecto al borrar el texto)
  function handleNameChange(e) {
    const newName = e.target.value
    setProfileDraft((prev) => ({ ...prev, name: newName }))
    updateUserProfile({ name: newName })
      .then(setCurrentUser)
      .catch(() => showToast('No se pudo guardar el nombre en el servidor.'))
  }

  // Manejo de edición de Puesto
  function handlePositionChange(e) {
    const newPosition = e.target.value
    setProfileDraft((prev) => ({ ...prev, position: newPosition }))
    updateUserProfile({ position: newPosition })
      .then(setCurrentUser)
      .catch(() => showToast('No se pudo guardar el puesto en el servidor.'))
  }

  // Manejo de carga de fotografía de perfil (máx. 2 MB antes de codificar)
  function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      showToast('La fotografía excede el límite de 2 MB.')
      e.target.value = ''
      return
    }
    if (file.type && !file.type.startsWith('image/')) {
      showToast('El archivo seleccionado no es una imagen válida.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const photoUrl = reader.result
      updateUserProfile({ photoUrl })
        .then((updated) => {
          setCurrentUser(updated)
          showToast('Fotografía de perfil actualizada.')
        })
        .catch(() => showToast('El servidor rechazó la fotografía de perfil.'))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
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
            <img
              src={aeroluferanLogo}
              alt="Emblema AeroLuferan"
              style={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0 }}
            />
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
                    value={profileDraft.name}
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
                    value={profileDraft.position}
                    onChange={handlePositionChange}
                    placeholder="Ingresa tu cargo o puesto"
                  />
                </div>

                {/* Campo 3: Correo (NO Editable) */}
                <div className="edit-profile-field">
                  <span className="edit-profile-label">Correo</span>
                  <div className="edit-profile-readonly">
                    {currentUser.email || '—'}
                  </div>
                </div>

                {/* Franja de estado de credencial y RBAC */}
                <div className="edit-profile-badge-row">
                  {currentUser.credentialStatus && (
                    <span className="profile-credential-status">
                      <span>{currentUser.credentialStatus}</span>
                    </span>
                  )}

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
                  <h2 className="profile-card__name">{currentUser.name || '—'}</h2>
                  <span className="profile-card__role">
                    {currentUser.position || '—'}
                  </span>
                  <span className="profile-card__email">
                    {currentUser.email || '—'}
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
                {currentUser.credentialStatus && (
                  <span className="profile-credential-status">
                    <span>{currentUser.credentialStatus}</span>
                  </span>
                )}

                <span className="profile-rbac-badge">
                  {currentUser.rbacBadge || 'RBAC: Seguridad'}
                </span>
              </div>
            </section>

            {/* Columna izquierda: seguridad + estación de carga */}
            <div className="ajustes-col">
            {/* B. SEGURIDAD & CONTROL OPERATIVO */}
            <div className="ajustes-group">
              <h2 className="ajustes-section-title">SEGURIDAD & CONTROL OPERATIVO</h2>
            <section className="ajustes-group-card" aria-label="Seguridad y control operativo">
              {/* Cambio de contraseña propio (POST /auth/change-password) */}
              <div
                className="ajustes-item-row"
                style={{ cursor: 'pointer' }}
                onClick={openPasswordModal}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') openPasswordModal()
                }}
              >
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--green" aria-hidden="true">
                    <VideoLockIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">Cambiar Contraseña</strong>
                    <p className="ajustes-item__subtitle">
                      Actualizar credencial de acceso (cierra la sesión actual)
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
                      <p className="ajustes-item__subtitle">
                        Visión computacional en tiempo real · Ajuste global definido por el Administrador
                      </p>
                    </div>
                  </div>

                  <span className="ai-sensitivity-badge">
                    {activeAiOption.badgeText}
                  </span>
                </div>

                {/* Selector de 3 segmentos (solo lectura para Guardia: es un ajuste global de ADMIN) */}
                <div
                  className="ai-segments-container"
                  role="radiogroup"
                  aria-label="Nivel de sensibilidad de detección IA (solo lectura)"
                  aria-readonly="true"
                >
                  {AI_SENSITIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={settings.aiSensitivityId === opt.id}
                      className={`ai-segment-btn${settings.aiSensitivityId === opt.id ? ' is-active' : ''}`}
                      disabled
                      title="La sensibilidad de detección IA es un ajuste global; su modificación requiere perfil Administrador."
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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
                      {primaryChargingBase?.nombre || 'Estaciones de carga'}
                    </strong>
                    <p className="ajustes-item__subtitle">
                      {primaryChargingBase
                        ? `• ${chargingBases.length} estación${chargingBases.length !== 1 ? 'es' : ''} · ${CHARGING_BASE_ESTADO_LABEL[primaryChargingBase.estado] || primaryChargingBase.estado}`
                        : '• Sin conexión con el backend'}
                    </p>
                  </div>
                </div>

                <span className="heliport-percentage">
                  {primaryChargingBase ? `${Math.round(primaryChargingBase.bateria_porcentaje)}%` : '—'}
                </span>
              </div>
            </section>
            </div>

            </div>

            {/* Columna derecha: privacidad + auditoría (evita el hueco
                que deja la tarjeta corta de privacidad en escritorio) */}
            <div className="ajustes-col">
            {/* C. ALMACENAMIENTO & PRIVACIDAD (Sin "Ciclo de vida de los datos" para Guardia) */}
            <div className="ajustes-group">
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
                  <span>BLOQUEADO ON</span>
                </button>
              </div>

              {/* Calidad de Transmisión de Vuelo (solo lectura: ajuste global de ADMIN) */}
              <div className="ajustes-item-row">
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--blue" aria-hidden="true">
                    <TransmissionQualityIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">Calidad de Transmisión de Vuelo</strong>
                    <p className="ajustes-item__subtitle">
                      {activeQualityOption.label} · Ajuste global definido por el Administrador
                    </p>
                  </div>
                </div>

                <span
                  className="ai-sensitivity-badge"
                  title="La calidad de transmisión es un ajuste global; su modificación requiere perfil Administrador."
                >
                  SOLO LECTURA
                </span>
              </div>
            </section>
            </div>

            {/* E. AUDITORÍA & NORMATIVA (Sin "Registro de Auditoría Local" para Guardia) */}
            <div className="ajustes-group">
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

              {/* Ventana Operativa Autorizada (solo consulta; edición requiere ADMIN) */}
              <div className="ajustes-item-row">
                <div className="ajustes-item__left">
                  <div className="ajustes-item__icon-wrap ajustes-item__icon-wrap--blue" aria-hidden="true">
                    <SlidersAdjustIcon size={22} />
                  </div>
                  <div className="ajustes-item__texts">
                    <strong className="ajustes-item__title-line">Ventana Operativa Autorizada</strong>
                    <p className="ajustes-item__subtitle">
                      {operatingWindow
                        ? `${operatingWindow.hora_apertura} – ${operatingWindow.hora_cierre} hrs · Techo ${Math.round(operatingWindow.altitud_maxima_m)} m`
                        : 'Sin conexión con el servidor'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-action-circle"
                  onClick={() => setIsOperatingWindowModalOpen(true)}
                  title="Consultar la ventana operativa normativa vigente"
                  aria-label="Consultar ventana operativa"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </section>
            </div>

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
              {chargingBases.length > 0 ? (
                chargingBases.map((station) => (
                  <div
                    key={station.station_id || station.codigo || station.nombre}
                    className="modal-session-detail"
                    style={{ marginBottom: '8px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                        {station.nombre || station.station_id}
                      </strong>
                      <span style={{ color: '#0284c7', fontWeight: '800' }}>
                        {Math.round(station.bateria_porcentaje ?? 0)}%
                      </span>
                    </div>
                    <span>
                      Estado: {CHARGING_BASE_ESTADO_LABEL[station.estado] || station.estado}
                    </span>
                    <span>Domo: {station.domo_estado || '—'}</span>
                    <span>
                      Voltaje del pad:{' '}
                      {station.voltaje_v != null ? `${Number(station.voltaje_v).toFixed(1)} V` : '—'}
                      {' · '}
                      Temperatura:{' '}
                      {station.temperatura_c != null ? `${Number(station.temperatura_c).toFixed(1)} °C` : '—'}
                    </span>
                    <span>Ciclos de recarga completados: {station.ciclos_completados ?? 0}</span>
                    <span>
                      Último acoplamiento:{' '}
                      {station.ultimo_acoplamiento_at
                        ? new Date(station.ultimo_acoplamiento_at).toLocaleString('es-MX')
                        : 'Sin registros'}
                    </span>
                  </div>
                ))
              ) : (
                <StatusPlaceholder
                  compact
                  variant={
                    chargingBasesError
                      ? chargingBasesError.isOffline
                        ? 'offline'
                        : 'error'
                      : 'empty'
                  }
                  title={
                    chargingBasesError
                      ? chargingBasesError.isOffline
                        ? 'Sin conexión'
                        : 'Error al consultar estaciones'
                      : 'Sin estaciones registradas'
                  }
                  message={describeApiError(
                    chargingBasesError,
                    'El servidor no reporta estaciones de carga registradas.',
                  )}
                  actionLabel="Reintentar"
                  onAction={refreshChargingBases}
                />
              )}
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
                  Los vuelos autónomos de AeroLuferan operan con geocercas activas limitadas a una
                  altitud máxima de {Math.round(operatingWindow?.altitud_maxima_m ?? 200)} metros AGL,
                  dentro del rango seguro no tripulado.
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

      {/* Modal 6: Ventana Operativa Autorizada (solo consulta para Guardia) */}
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
            <div className="ajustes-modal-body">
              {operatingWindow ? (
                <div className="modal-session-detail">
                  <span>Horario autorizado de operación:</span>
                  <strong>
                    {operatingWindow.hora_apertura} – {operatingWindow.hora_cierre} hrs
                  </strong>
                  <span>Altitud operativa:</span>
                  <strong>
                    {Math.round(operatingWindow.altitud_minima_m)} –{' '}
                    {Math.round(operatingWindow.altitud_maxima_m)} m AGL
                  </strong>
                  <span>Peso máximo de aeronave:</span>
                  <strong>{operatingWindow.peso_maximo_kg} kg</strong>
                  <small style={{ color: '#475569', marginTop: '4px' }}>
                    Configuración vigente en el servidor. Su modificación requiere perfil
                    Administrador.
                  </small>
                </div>
              ) : (
                <p>
                  Sin conexión con el servidor backend. No es posible consultar la
                  ventana operativa normativa en este momento.
                </p>
              )}
            </div>
            <div className="ajustes-modal-actions">
              <button
                type="button"
                className="btn-ajustes-modal-cancel"
                onClick={() => setIsOperatingWindowModalOpen(false)}
                style={{ flex: 'none', width: '100%' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Cambiar Contraseña (POST /auth/change-password) */}
      {isPasswordModalOpen && (
        <div className="ajustes-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pwd-title">
          <div className="ajustes-modal-card">
            <div className="ajustes-modal-header">
              <h2 id="pwd-title">Cambiar Contraseña</h2>
              <button
                type="button"
                className="ajustes-modal-close"
                onClick={() => setIsPasswordModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <CloseModalIcon size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitPasswordChange}>
              <div className="ajustes-modal-body">
                <p>
                  Al actualizar tu contraseña se revocará la sesión actual y deberás
                  iniciar sesión de nuevo.
                </p>
                <div className="modal-options-list">
                  <label className="form-label-block" style={{ display: 'block' }}>
                    <span>Contraseña actual</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={pwdForm.current}
                      onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                      required
                    />
                  </label>
                  <label className="form-label-block" style={{ display: 'block' }}>
                    <span>Nueva contraseña (mín. 8 caracteres)</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={pwdForm.next}
                      onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
                      required
                    />
                  </label>
                  <label className="form-label-block" style={{ display: 'block' }}>
                    <span>Confirmar nueva contraseña</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={pwdForm.confirm}
                      onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                      required
                    />
                  </label>
                </div>
                {pwdError && (
                  <p style={{ fontSize: '12px', color: '#dc2626' }} role="alert">
                    {pwdError}
                  </p>
                )}
              </div>
              <div className="ajustes-modal-actions">
                <button
                  type="button"
                  className="btn-ajustes-modal-cancel"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-ajustes-modal-confirm"
                  disabled={pwdSaving}
                >
                  {pwdSaving ? 'Actualizando…' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
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
