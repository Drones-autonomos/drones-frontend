import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Ajustes from './pages/Admin/Ajustes.jsx'
import Alertas from './pages/Admin/Alertas.jsx'
import Bitacora from './pages/Admin/Bitacora.jsx'
import EnVivo from './pages/Admin/EnVivo.jsx'
import Rutas from './pages/Admin/Rutas.jsx'
import Login from './pages/Login/Login.jsx'
import Registro from './pages/Registro/Registro.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Navigate to="/admin/live" replace />} />
        <Route path="/admin/live" element={<EnVivo />} />
        <Route path="/admin/alertas" element={<Alertas />} />
        <Route path="/admin/rutas" element={<Rutas />} />
        <Route path="/admin/bitacora" element={<Bitacora />} />
        <Route path="/admin/ajustes" element={<Ajustes />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
