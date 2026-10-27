import AdminBottomNav from './AdminBottomNav.jsx'
import './AdminPlaceholder.css'

function AdminPlaceholder({ title }) {
  return (
    <div className="admin-placeholder-page">
      <main className="admin-placeholder-content">
        <p className="admin-placeholder-brand">AeroLuferan · Administración</p>
        <h1>{title}</h1>
        <p>Esta pantalla se completará cuando se proporcione su diseño.</p>
      </main>
      <AdminBottomNav pendingAlerts={3} />
    </div>
  )
}

export default AdminPlaceholder
