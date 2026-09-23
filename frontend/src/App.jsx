import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PrivateRoute, PublicRoute } from './router/Guards'
import EquiparacionLayout from './components/layout/EquiparacionLayout'
import EquiparacionPage from './pages/equiparacion/EquiparacionPage'
import EquiparacionDetallePage from './pages/equiparacion/EquiparacionDetallePage'
import EquivalenciasEquiparacion from './pages/equiparacion/EquivalenciasEquiparacion'
import LoginEquiparacion from './pages/equiparacion/LoginEquiparacion'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfesionesPage from './pages/catalogs/ProfesionesPage'
import CarrerasPage from './pages/catalogs/CarrerasPage'
import PensumPage from './pages/catalogs/PensumPage'
import CursosPage from './pages/catalogs/CursosPage'
import InstitucionesPage from './pages/catalogs/InstitucionesPage'
import SedesPage from './pages/catalogs/SedesPage'
import AutoridadesPage from './pages/catalogs/AutoridadesPage'
import EstudiantesPage from './pages/estudiantes/EstudiantesPage'
function AccesoEstudiante(){const {logout}=useAuth();return <main className="eq-main"><h1>Equiparacion</h1><p>La creacion manual de documentos la realiza la coordinacion academica.</p><button className="eq-btn" onClick={logout}>Cerrar sesion</button></main>}
export default function App(){return <AuthProvider><Routes>
  <Route path="/" element={<Navigate to="/dashboard/equiparacion" replace/>}/>
  <Route element={<PublicRoute/>}><Route path="/login" element={<LoginEquiparacion/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/reset-password" element={<ResetPasswordPage/>}/></Route>
  <Route element={<PrivateRoute roles={['admin','coordinador']}/>}><Route element={<EquiparacionLayout/>}>
    <Route path="/dashboard" element={<Navigate to="/dashboard/equiparacion" replace/>}/>
    <Route path="/dashboard/equiparacion" element={<EquiparacionPage/>}/>
    <Route path="/dashboard/equiparacion/:id" element={<EquiparacionDetallePage/>}/>
    <Route path="/dashboard/equivalencias" element={<EquivalenciasEquiparacion/>}/>
    <Route path="/dashboard/estudiantes" element={<EstudiantesPage/>}/>
    <Route path="/dashboard/cursos" element={<CursosPage/>}/>
    <Route path="/dashboard/pensum" element={<PensumPage/>}/>
    <Route element={<PrivateRoute roles={['admin']}/>}>
      <Route path="/dashboard/autoridades" element={<AutoridadesPage/>}/>
      <Route path="/dashboard/profesiones" element={<ProfesionesPage/>}/>
      <Route path="/dashboard/carreras" element={<CarrerasPage/>}/>
      <Route path="/dashboard/instituciones" element={<InstitucionesPage/>}/>
      <Route path="/dashboard/sedes" element={<SedesPage/>}/>
    </Route>
  </Route></Route>
  <Route element={<PrivateRoute roles={['estudiante']}/>}><Route path="/estudiante" element={<AccesoEstudiante/>}/><Route path="/completar-estudiante" element={<AccesoEstudiante/>}/></Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></AuthProvider>}
