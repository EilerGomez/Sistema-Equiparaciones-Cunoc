import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'
import '../../components/layout/EstudianteLayout.css'

export default function EstudianteHome() {
  const { user } = useAuth()

  return (
    <div className="est-page">
      <div className="est-page-header">
        <div>
          <h1 className="est-page-title">Bienvenido, {user?.nombre?.split(' ')[0]}</h1>
          <p className="est-page-sub">Portal de Equivalencias de Cursos · CUNOC</p>
        </div>
      </div>

      {user?.carnet && (
        <div className="est-alert-info" style={{ marginBottom: 24 }}>
          <strong>Carnet:</strong> {user.carnet} &nbsp;·&nbsp;
          <strong>Registro académico:</strong> {user.registro_academico}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Link to="/estudiante/equivalencias" style={{ textDecoration: 'none' }}>
          <div className="est-card" style={{
            cursor: 'pointer', transition: 'box-shadow .2s, transform .15s',
            borderLeft: '4px solid #1d4ed8',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,23,42,.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>📋</div>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', marginBottom: 6 }}>
              Solicitar equivalencias
            </div>
            <p style={{ color: '#64748b', fontSize: '.875rem', margin: 0, lineHeight: 1.6 }}>
              Selecciona tu carrera de origen y genera la tabla de cursos equivalentes
              para tu solicitud formal.
            </p>
          </div>
        </Link>

        <div className="est-card" style={{ borderLeft: '4px solid #94a3b8', opacity: .7 }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>📁</div>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', marginBottom: 6 }}>
            Mis dictámenes
          </div>
          <p style={{ color: '#64748b', fontSize: '.875rem', margin: 0, lineHeight: 1.6 }}>
            Consulta el estado de tus solicitudes de equivalencia enviadas.
            <br /><span style={{ fontSize: '.78rem', color: '#94a3b8' }}>Próximamente disponible</span>
          </p>
        </div>
      </div>

      <div className="est-card" style={{ marginTop: 8 }}>
        <p className="est-card-title">¿Cómo funciona?</p>
        <ol style={{ color: '#64748b', lineHeight: 2, margin: 0, paddingLeft: 20 }}>
          <li>Selecciona la institución y carrera de donde provienen tus cursos aprobados.</li>
          <li>Elige el pensum (plan de estudios) correspondiente.</li>
          <li>Busca cada curso por código y agrégalo a tu lista de equivalencias.</li>
          <li>Descarga la tabla en PDF para presentarla junto a tu expediente.</li>
        </ol>
      </div>
    </div>
  )
}
