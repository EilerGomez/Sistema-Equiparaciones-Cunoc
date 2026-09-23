export const AuthLayout = ({ children }) => (
  <div className="auth-layout">
    {/* Panel izquierdo decorativo */}
    <aside className="auth-aside">
      <div className="aside-grid" />
      <div className="aside-content">
        <div className="aside-badge">
          <span className="aside-dot" />
          Sistema académico
        </div>
        <h1 className="aside-title">
          Gestión de<br /><em>equiparaciones</em><br />de cursos
        </h1>
        <p className="aside-sub">
          Plataforma para la evaluación y aprobación de equiparaciones
          de cursos para nuevos pensums Ingenieria CUNOC.
        </p>
      </div>
    </aside>

    {/* Panel derecho con el formulario */}
    <main className="auth-main">
      <div className="auth-card">
        <div className="auth-logo">
          <span />
          Equiparacion
        </div>
        {children}
      </div>
    </main>
  </div>
)
