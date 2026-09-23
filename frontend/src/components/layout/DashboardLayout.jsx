

import logoUsacFull  from '../../../assets/logoazul.png'
import logoCunoc     from '../../../assets/maxresdefault.png'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Sidebar } from './Sidebar'


export const DashboardLayout = () => {
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
    <div className={`app-shell ${collapsed ? 'shell-collapsed' : ''}`}>
      <header className="topbar">
        <a href="/dashboard" className="topbar-brand">
          {/* Logo: mini cuando colapsado, completo cuando expandido */}
          {collapsed ? (
            <img src={logoCunoc} alt="CUNOC Ingeniería" className="topbar-logo-mini" />
          ) : (
            <img src={logoUsacFull} alt="USAC Tricentenaria" className="topbar-logo-full" />
          )}

          {/* Separador y texto — SIEMPRE visible */}
          <div className="topbar-brand-divider" />
          <div className="topbar-brand-text">
            <span className="topbar-brand-title">Equivalencias</span>
            <span className="topbar-brand-sub">División Ciencias de la Ingeniería · CUNOC</span>
          </div>
        </a>

        <div className="topbar-right">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <span className="user-name">{user?.nombre}</span>
            <span className="role-pill">{user?.rol}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>© {new Date().getFullYear()} Sistema de Equivalencias · CUNOC</span>
        <span className="app-footer-sep">·</span>
        <span>Desarrollado por</span>
        <a href="https://github.com/EilerGomez" target="_blank" rel="noopener noreferrer" className="app-footer-brand">
            ERG Solutions
        </a>
      </footer>
    </div>
  )
}