import { useAuth } from '../../context/AuthContext'

export default function DashboardHome() {
  const { user } = useAuth()

  return (
    <div className="dashboard-home">
      <div className="role-badge" style={{ marginBottom: 12 }}>● {user?.rol}</div>
      <h1 className="dashboard-welcome fade-up">
        Hola, <em>{user?.nombre?.split(' ')[0]}</em>
      </h1>
      <p className="dashboard-sub fade-up fade-up-1">
        Selecciona una opción del menú para comenzar.
      </p>
    </div>
  )
}
