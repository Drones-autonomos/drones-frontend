import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Ajustes from './pages/Admin/Ajustes.jsx'
import Alertas from './pages/Admin/Alertas.jsx'
import Bitacora from './pages/Admin/Bitacora.jsx'
import EnVivo from './pages/Admin/EnVivo.jsx'
import ProgramarRuta from './pages/Admin/ProgramarRuta.jsx'
import Rutas from './pages/Admin/Rutas.jsx'
import GuardiaAjustes from './pages/Guardia/Ajustes.jsx'
import GuardiaAlertas from './pages/Guardia/Alertas.jsx'
import GuardiaBitacora from './pages/Guardia/Bitacora.jsx'
import GuardiaEnVivo from './pages/Guardia/EnVivo/EnVivo.jsx'
import GuardiaRutas from './pages/Guardia/Rutas/Rutas.jsx'
import Login from './pages/Login/Login.jsx'
import Registro from './pages/Registro/Registro.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Acceso y Registro */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/registro" element={<Registro />} />

        {/* Módulo Administrador Académico */}
        <Route path="/admin" element={<Navigate to="/admin/live" replace />} />
        <Route path="/admin/live" element={<EnVivo />} />
        <Route path="/admin/alertas" element={<Alertas />} />
        <Route path="/admin/rutas" element={<Rutas />} />
        <Route path="/admin/programar-ruta" element={<ProgramarRuta />} />
        <Route path="/admin/bitacora" element={<Bitacora />} />
        <Route path="/admin/ajustes" element={<Ajustes />} />
        <Route path="/admin/ajustes/perfil" element={<Ajustes initialView="editProfile" />} />

        {/* Módulo Guardia de Seguridad */}
        <Route path="/guardia" element={<Navigate to="/guardia/live" replace />} />
        <Route path="/guardia/live" element={<GuardiaEnVivo />} />
        <Route path="/guardia/envivo" element={<Navigate to="/guardia/live" replace />} />
        <Route path="/guardia/alertas" element={<GuardiaAlertas />} />
        <Route path="/guardia/rutas" element={<GuardiaRutas />} />
        <Route path="/guardia/programar-ruta" element={<Navigate to="/guardia/rutas" replace />} />
        <Route path="/guardia/bitacora" element={<GuardiaBitacora />} />
        <Route path="/guardia/ajustes" element={<GuardiaAjustes />} />
        <Route path="/guardia/ajustes/perfil" element={<GuardiaAjustes initialView="editProfile" />} />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
