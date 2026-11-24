import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Ajustes from './pages/Admin/Ajustes.jsx'
import Alertas from './pages/Admin/Alertas.jsx'
import Bitacora from './pages/Admin/Bitacora.jsx'
import EnVivo from './pages/Admin/EnVivo.jsx'
import ProgramarRuta from './pages/Admin/ProgramarRuta.jsx'
import Rutas from './pages/Admin/Rutas.jsx'
import Usuarios from './pages/Admin/Usuarios.jsx'
import GuardiaAjustes from './pages/Guardia/Ajustes.jsx'
import GuardiaAlertas from './pages/Guardia/Alertas.jsx'
import GuardiaBitacora from './pages/Guardia/Bitacora.jsx'
import GuardiaEnVivo from './pages/Guardia/EnVivo/EnVivo.jsx'
import GuardiaRutas from './pages/Guardia/Rutas/Rutas.jsx'
import Login from './pages/Login/Login.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Acceso público (el registro público fue retirado; solo Admin registra cuentas) */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/registro" element={<Navigate to="/" replace />} />

        {/* Módulo Administrador Académico (RBAC: admin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Navigate to="/admin/en-vivo" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/en-vivo"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EnVivo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/live"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EnVivo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/alertas"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Alertas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rutas"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Rutas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/programar-ruta"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProgramarRuta />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bitacora"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Bitacora />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ajustes"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Ajustes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ajustes/perfil"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Ajustes initialView="editProfile" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Usuarios />
            </ProtectedRoute>
          }
        />

        {/* Módulo Guardia de Seguridad (RBAC: guard) */}
        <Route
          path="/guardia"
          element={
            <ProtectedRoute allowedRoles={['guard']}>
              <Navigate to="/guardia/en-vivo" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guardia/en-vivo"
          element={
            <ProtectedRoute allowedRoles={['guard']}>
              <GuardiaEnVivo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guardia/live"
          element={
            <ProtectedRoute allowedRoles={['guard']}>
              <GuardiaEnVivo />
            </ProtectedRoute>
          }
        />
        <Route path="/guardia/envivo" element={<Navigate to="/guardia/en-vivo" replace />} />
        <Route
          path="/guardia/alertas"
          element={
            <ProtectedRoute allowedRoles={['guard']}>
              <GuardiaAlertas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guardia/rutas"
          element={
            <ProtectedRoute allowedRoles={['guard']}>
              <GuardiaRutas />
            </ProtectedRoute>
          }
        />
        <Route path="/guardia/programar-ruta" element={<Navigate to="/guardia/rutas" replace />} />
        <Route
          path="/guardia/bitacora"
          element={
            <ProtectedRoute allowedRoles={['guard']}>
              <GuardiaBitacora />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guardia/ajustes"
          element={
            <ProtectedRoute allowedRoles={['guard']}>
              <GuardiaAjustes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guardia/ajustes/perfil"
          element={
            <ProtectedRoute allowedRoles={['guard']}>
              <GuardiaAjustes initialView="editProfile" />
            </ProtectedRoute>
          }
        />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
