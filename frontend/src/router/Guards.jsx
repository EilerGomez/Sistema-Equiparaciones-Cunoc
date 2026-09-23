import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── Pantalla de carga ─────────────────────────────────────
const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--paper)',
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    color: 'var(--ink-3)',
    gap: '12px',
  }}>
    <div className="spinner" style={{ borderTopColor: 'var(--ink-3)', borderColor: 'var(--paper-3)' }} />
  </div>
)

// ── Mapa de rutas home por rol ────────────────────────────
const HOME_BY_ROL = {
  admin:        '/dashboard',
  coordinador:  '/dashboard',
  estudiante:   '/estudiante',
}

const getHomeByRol = (rol) => HOME_BY_ROL[rol] || '/dashboard'

// ── Ruta privada con control de roles ────────────────────
// roles: array de roles permitidos, ej: ['admin', 'coordinador']
// Si el usuario no tiene el rol requerido lo manda a su home
export const PrivateRoute = ({ roles }) => {
  const { isAuth, user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!isAuth)  return <Navigate to="/login" state={{ from: location }} replace />

  if (roles && !roles.includes(user?.rol)) {
    return <Navigate to={getHomeByRol(user?.rol)} replace />
  }

  return <Outlet />
}

// ── Ruta pública — solo si NO está autenticado ────────────
// Redirige al home del rol correspondiente si ya está logueado
export const PublicRoute = () => {
  const { isAuth, user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (isAuth)  return <Navigate to={getHomeByRol(user?.rol)} replace />

  return <Outlet />
}