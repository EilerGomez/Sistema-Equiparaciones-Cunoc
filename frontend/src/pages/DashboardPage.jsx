import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Sesión cerrada')
    navigate('/login', { replace: true })
  }

  const initials = user?.nombre
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  return (
    <div className="dashboard">
      {/* Topbar */}
      <nav className="topbar">
        <a href="/dashboard" className="topbar-brand">
          <span />
          Equivalencias Ingenieria
        </a>
        <div className="topbar-right">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            {user?.nombre}
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Contenido */}
      <div className="dashboard-content">
        <div className="role-badge">
          ● {user?.rol}
        </div>
        <h1 className="dashboard-welcome fade-up">
          Hola, <em>{user?.nombre?.split(' ')[0]}</em>
        </h1>
        <p className="dashboard-sub fade-up fade-up-1">
          Bienvenido al sistema de equivalencias de cursos.
        </p>

        {/* Placeholder para el contenido del proyecto */}
        <div
          className="fade-up fade-up-2"
          style={{
            marginTop: 32,
            padding: '32px',
            background: 'var(--paper)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--paper-3)',
            color: 'var(--ink-3)',
            fontSize: '.9rem',
            textAlign: 'center',
          }}
        >
          Aquí irá el módulo de equivalencias de cursos.
        </div>
      </div>
    </div>
  )
}
