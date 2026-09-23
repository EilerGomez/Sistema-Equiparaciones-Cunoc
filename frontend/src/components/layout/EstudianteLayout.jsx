import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import logoUsacFull  from '../../../assets/logoazul.png'
import logoCunoc     from '../../../assets/maxresdefault.png'
import './EstudianteLayout.css'
const Svg = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const icons = {
  home: <Svg><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Svg>,
  equivalencias: <Svg><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></Svg>,
  chevron: <Svg><path d="m6 9 6 6 6-6"/></Svg>,
  collapse: <Svg><path d="M4 4h16v16H4z"/><path d="M10 4v16"/><path d="m16 9-3 3 3 3"/></Svg>,
  expand:   <Svg><path d="M4 4h16v16H4z"/><path d="M10 4v16"/><path d="m13 9 3 3-3 3"/></Svg>,
}

const menuItems = [
  { to: '/estudiante',               label: 'Inicio',         icon: icons.home,          end: true },
  { to: '/estudiante/equivalencias', label: 'Mis Equivalencias', icon: icons.equivalencias },
]

export const EstudianteLayout = () => {
  const { user, logout }          = useAuth()
  const navigate                  = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Sesión cerrada')
    navigate('/login', { replace: true })
  }

  const initials = user?.nombre
    ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <div className={`est-shell ${collapsed ? 'est-collapsed' : ''}`}>

      {/* Topbar */}
      <header className="est-topbar">
        <a href="/estudiante" className="est-brand">
          {collapsed
            ? <img src={logoCunoc} alt="CUNOC" className="est-logo-mini" />
            : <img src={logoUsacFull} alt="USAC" className="est-logo-full" />
          }
          <div className="est-brand-divider" />
          <div className="est-brand-text">
            <span className="est-brand-title">Portal Estudiante</span>
            <span className="est-brand-sub">División Ciencias de la Ingeniería · CUNOC</span>
          </div>
        </a>

        <div className="est-topbar-right">
          <div className="est-user-chip">
            <div className="est-avatar">{initials}</div>
            <div className="est-user-info">
              <span className="est-user-name">{user?.nombre}</span>
              {user?.carnet && (
                <span className="est-user-sub">Carnet: {user.carnet}</span>
              )}
            </div>
          </div>
          <button className="est-btn-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`est-sidebar ${collapsed ? 'est-sidebar-collapsed' : ''}`}>
        <button
          className="est-sidebar-toggle"
          onClick={() => setCollapsed(p => !p)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? icons.expand : icons.collapse}
        </button>

        <nav className="est-nav">
          {menuItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `est-link ${isActive ? 'est-link-active' : ''}`}
            >
              <span className="est-link-icon">{icon}</span>
              {!collapsed && <span className="est-link-label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <div className="est-sidebar-footer">
            <span>Portal Estudiante</span>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="est-main">
        <Outlet />
        <footer className="est-footer">
          <span>© {new Date().getFullYear()} Sistema de Equivalencias · CUNOC</span>
          <span className="est-footer-sep">·</span>
          <span>Desarrollado por <a href="https://github.com/EilerGomez" target="_blank" rel="noopener noreferrer" className="est-footer-brand">ERG Solutions</a></span>
        </footer>
      </main>
    </div>
  )
}
