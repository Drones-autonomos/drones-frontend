import GuardiaBottomNav from './GuardiaBottomNav.jsx'
import './GuardiaPlaceholder.css'

function GuardiaPlaceholder({ title, description, activePath }) {
  return (
    <div className="guardia-placeholder-page">
      <main className="guardia-placeholder-content">
        <span className="guardia-placeholder-badge">Perfil Seguridad · Guardia</span>
        <h1 className="guardia-placeholder-title">{title}</h1>
        <p className="guardia-placeholder-desc">
          {description || 'Esta sección se encuentra en desarrollo provisional. Su diseño e interactividad se implementarán próximamente a partir de su referencia de Figma.'}
        </p>
        <div className="guardia-placeholder-card">
          <div className="guardia-placeholder-card__dot" />
          <div>
            <strong>Módulo Provisional</strong>
            <span>Estructura de navegación activa y conectada al perfil de Guardia.</span>
          </div>
        </div>
      </main>
      <GuardiaBottomNav activePath={activePath} />
    </div>
  )
}

export default GuardiaPlaceholder
