import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const Icon = ({ children }) => (
  <span className="link-icon" aria-hidden="true">
    {children}
  </span>
)

const Svg = ({ children }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

const icons = {
  catalogos: (
    <Svg>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </Svg>
  ),
  profesiones: (
    <Svg>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
    </Svg>
  ),
   instituciones: (
    <Svg>
      <path d="M3 21h18" />
      <path d="M5 21V10" />
      <path d="M19 21V10" />
      <path d="M12 3 3 10h18L12 3Z" />
      <path d="M9 21v-6h6v6" />
    </Svg>
  ),
  carreras: (
    <Svg>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
    </Svg>
  ),
  pensum: (
    <Svg>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </Svg>
  ),
  ciclos: (
    <Svg>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </Svg>
  ),
  cursos: (
    <Svg>
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
      <path d="M7 5v14" />
    </Svg>
  ),
  docentes: (
    <Svg>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  ),
  docenteCurso: (
    <Svg>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Svg>
  ),
 
  sedes: (
    <Svg>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  ),
  autoridades: (
    <Svg>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M6 10v5c0 2 3 4 6 4s6-2 6-4v-5" />
      <path d="M12 13v8" />
    </Svg>
  ),
equivalencias: (
  <Svg>
    <path d="M7 7h10" />
    <path d="M7 17h10" />
    <path d="M8 12h8" />
    <path d="M5 7 3 9l2 2" />
    <path d="m19 13 2 2-2 2" />
  </Svg>
),
  scraper: (
    <Svg>
      <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />
    </Svg>
  ),
  chevron: (
    <Svg>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
  collapse: (
    <Svg>
      <path d="M4 4h16v16H4z" />
      <path d="M10 4v16" />
      <path d="m16 9-3 3 3 3" />
    </Svg>
  ),
  expand: (
    <Svg>
      <path d="M4 4h16v16H4z" />
      <path d="M10 4v16" />
      <path d="m13 9 3 3-3 3" />
    </Svg>
  ),
  procesos: (
  <Svg>
    <path d="M4 4h16v16H4z" />
    <path d="M8 8h8" />
    <path d="M8 12h8" />
    <path d="M8 16h5" />
  </Svg>
),

dictamenes: (
  <Svg>
    <path d="M6 2h9l5 5v15H6z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </Svg>
),

estudiantes: (
  <Svg>
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="7" r="4" />
    <path d="M17 11l2 2 4-4" />
  </Svg>
),

configuracion: (
  <Svg>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V22a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z" />
  </Svg>
),

cartas: (
  <Svg>
    <path d="M4 4h16v16H4z" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
),
sistema: (
  <Svg>
    <path d="M12 2H2v10h10V2Z" />
    <path d="M22 12h-10v10h10V12Z" />
    <path d="M12 12H2v10h10V12Z" />
    <path d="M22 2h-10v10h10V2Z" />
  </Svg>
),
}

const menuItems = [
  {
    group: 'Catálogos',
    icon: icons.catalogos,
    items: [
      { to: '/dashboard/instituciones', label: 'Instituciones', icon: icons.instituciones },
      { to: '/dashboard/profesiones', label: 'Profesiones', icon: icons.profesiones },
      { to: '/dashboard/autoridades', label: 'Autoridades', icon: icons.autoridades },
      { to: '/dashboard/carreras', label: 'Carreras', icon: icons.carreras },
      { to: '/dashboard/pensum', label: 'Pensum', icon: icons.pensum },
      { to: '/dashboard/ciclos', label: 'Ciclos', icon: icons.ciclos },
      { to: '/dashboard/cursos', label: 'Cursos', icon: icons.cursos },
      { to: '/dashboard/docentes', label: 'Docentes', icon: icons.docentes },
      { to: '/dashboard/docente-curso', label: 'Docente/Curso', icon: icons.docenteCurso },
      { to: '/dashboard/sedes', label: 'Sedes', icon: icons.sedes },
      //{ to: '/dashboard/docentes-scraper', label: 'Carga docentes', icon: icons.scraper },
      { to: '/dashboard/equivalencias', label: 'Equivalencias', icon: icons.equivalencias },
    ],
  },
  {
  group: 'Procesos',
  icon: icons.procesos,
  items: [
    { to: '/dashboard/dictamenes', label: 'Dictámenes', icon: icons.dictamenes },
    { to: '/dashboard/estudiantes', label: 'Estudiantes', icon: icons.estudiantes },
  ],
},
{
  group: 'Configuración',
  icon: icons.configuracion,
  items: [
    { to: '/dashboard/configuracion-cartas', label: 'Cartas dictamen', icon: icons.cartas },
    { to: '/dashboard/configuracion-id-dictamen', label: 'Sistema', icon: icons.sistema }, 

  ],
},
]

export const Sidebar = ({ collapsed, onToggle }) => {
  const [openGroups, setOpenGroups] = useState({
    Catálogos: false,
  })

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({
      ...prev,
      [group]: !prev[group],
    }))
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
        aria-label={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
      >
        <span className="toggle-icon">
          {collapsed ? icons.expand : icons.collapse}
        </span>
      </button>

      <nav className="sidebar-nav">
        {menuItems.map(({ group, icon, items }) => (
          <div key={group} className="sidebar-group">
            <button
              type="button"
              className={`sidebar-group-btn ${openGroups[group] ? 'open' : ''}`}
              onClick={() => toggleGroup(group)}
              title={collapsed ? group : undefined}
            >
              <Icon>{icon}</Icon>

              {!collapsed && (
                <>
                  <span className="group-label">
                    {group}
                  </span>

                  <span className="group-arrow">
                    {icons.chevron}
                  </span>
                </>
              )}
            </button>

            {openGroups[group] && (
              <ul className="sidebar-list">
                {items.map(({ to, label, icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `sidebar-link ${isActive ? 'active' : ''}`
                      }
                    >
                      <Icon>{icon}</Icon>

                      {!collapsed && (
                        <span className="link-label">
                          {label}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}