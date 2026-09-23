import { useEffect, useMemo, useRef, useState } from 'react'
import {
  cursosApi,
  pensumApi,
  equivalenciasApi,
} from '../../api/catalogs'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'

function SearchSelect({
  placeholder,
  items,
  value,
  onSelect,
  onClear,
  renderItem,
  renderSelected,
  filterFn,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const filtered = useMemo(() => {
    const texto = query.trim()

    if (!texto) return items.slice(0, 50)

    return items.filter(item => filterFn(item, texto)).slice(0, 50)
  }, [items, query, filterFn])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (item) => {
    onSelect(item)
    setQuery('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <input
        className="form-input"
        placeholder={placeholder}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />

      {open && (
        <div className="search-select-menu">
          {filtered.length === 0 ? (
            <div className="search-select-empty">
              Sin resultados
            </div>
          ) : (
            filtered.map(item => (
              <button
                type="button"
                key={item._key}
                onMouseDown={() => handleSelect(item)}
                className="search-select-item"
              >
                {renderItem(item)}
              </button>
            ))
          )}
        </div>
      )}

      {value && (
        <div className="selected-course-box">
          <div style={{ flex: 1 }}>
            {renderSelected ? renderSelected(value) : value.label}
          </div>

          <button
            type="button"
            className="btn-table btn-table-secondary"
            onClick={onClear}
          >
            Quitar
          </button>
        </div>
      )}
    </div>
  )
}

const normalizarRespuesta = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

const normalizarTexto = (texto) => {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const getCursoId = (curso) => {
  return curso.id_curso ?? curso.curso_id ?? curso.id
}

const getPensumId = (curso) => {
  return curso.id_pensum ?? curso.pensum_id
}

const getPensumVigenciaDirecta = (curso) => {
  return curso.pensum_vigencia ?? curso.vigencia ?? curso.pensum_vigente
}

const getCursoCodigo = (curso) => {
  return curso.codigo ?? curso.curso_codigo
}

const getCursoNombre = (curso) => {
  return curso.nombre ?? curso.curso_nombre
}

const getPensumCodigo = (curso) => {
  return curso.pensum_codigo ?? curso.codigo_pensum
}

const getPensumDescripcion = (curso) => {
  return curso.pensum_desc ?? curso.pensum_descripcion ?? curso.descripcion_pensum
}

const getCarreraTexto = (curso) => {
  return curso.carrera_subfijo || curso.carrera_descripcion || curso.carrera_nombre || curso.carrera || ''
}

const limpiarRepetidos = (valores) => {
  return Array.from(new Set(
    valores
      .map(v => String(v || '').trim())
      .filter(Boolean)
  ))
}

const buildCursoFallback = (row, tipo) => {
  const prefijo = tipo === 'de' ? 'de' : 'a'
  const id = row[`id_curso_${prefijo}`]
  const codigo = row[`curso_${prefijo}_codigo`]
  const nombre = row[`curso_${prefijo}_nombre`]
  const pensums = tipo === 'de'
    ? row.pensums_de_no_vigentes
    : row.pensums_a_vigentes

  return {
    _key: `${tipo}-${id}`,
    id: Number(id),
    codigo,
    nombre,
    pensums_label: pensums || '—',
    carrera_label: '',
    label: `${codigo} - ${nombre}`,
  }
}

const crearItemsCursos = ({ cursos, pensums, vigencia, filtroPensum }) => {
  const pensumById = new Map(pensums.map(p => [String(p.id), p]))
  const map = new Map()

  for (const curso of cursos) {
    const idCurso = getCursoId(curso)
    if (!idCurso) continue

    const idPensum = getPensumId(curso)
    const pensum = idPensum ? pensumById.get(String(idPensum)) : null
    const vigenciaCurso = getPensumVigenciaDirecta(curso) ?? pensum?.vigencia

    if (Number(vigenciaCurso) !== Number(vigencia)) continue

    if (filtroPensum && String(idPensum) !== String(filtroPensum)) continue

    const key = String(idCurso)
    const codigo = getCursoCodigo(curso)
    const nombre = getCursoNombre(curso)
    const pensumCodigo = getPensumCodigo(curso) || pensum?.codigo || ''
    const pensumDesc = getPensumDescripcion(curso) || pensum?.descripcion || ''
    const carreraTexto = getCarreraTexto(curso)

    if (!map.has(key)) {
      map.set(key, {
        _key: `${vigencia === 0 ? 'de' : 'a'}-${idCurso}`,
        id: Number(idCurso),
        codigo,
        nombre,
        pensums: [],
        carreras: [],
        label: `${codigo} - ${nombre}`,
      })
    }

    const item = map.get(key)

    if (pensumCodigo) {
      item.pensums.push(pensumCodigo)
    }

    if (carreraTexto) {
      item.carreras.push(carreraTexto)
    }
  }

  return Array.from(map.values()).map(item => {
    const pensumsUnicos = limpiarRepetidos(item.pensums)
    const carrerasUnicas = limpiarRepetidos(item.carreras)

    return {
      ...item,
      pensums: pensumsUnicos,
      carreras: carrerasUnicas,
      pensums_label: pensumsUnicos.length ? pensumsUnicos.join(', ') : '—',
      carrera_label: carrerasUnicas.length ? carrerasUnicas.join(', ') : '',
    }
  }).sort((a, b) => {
    const ca = String(a.codigo || '')
    const cb = String(b.codigo || '')
    return ca.localeCompare(cb, 'es', { numeric: true })
  })
}


const obtenerCodigosPensum = (value) => {
  if (!value) return []

  const partes = Array.isArray(value)
    ? value
    : String(value).split(',')

  const codigos = []

  for (const parte of partes) {
    const limpio = String(parte || '').trim()

    if (!limpio) continue

    const codigo = limpio
      .split(/\s+-\s+/)[0]
      .trim()

    if (codigo && !codigos.includes(codigo)) {
      codigos.push(codigo)
    }
  }

  return codigos
}

const mismosCodigosPensum = (a, b) => {
  const setA = new Set(a.map(v => String(v).trim()).filter(Boolean))
  const setB = new Set(b.map(v => String(v).trim()).filter(Boolean))

  if (setA.size === 0 || setB.size === 0) return false
  if (setA.size !== setB.size) return false

  for (const item of setA) {
    if (!setB.has(item)) return false
  }

  return true
}

const formatearPensumsListado = (value, codigosAreaComun, textoAreaComun) => {
  const codigos = obtenerCodigosPensum(value)

  if (codigos.length === 0) return '—'

  if (mismosCodigosPensum(codigos, codigosAreaComun)) {
    return textoAreaComun
  }

  return codigos.join(', ')
}

function CursoInfoCard({ item, compact = false }) {
  return (
    <div className={compact ? 'curso-info compact' : 'curso-info'}>
      <div className="curso-info-main">
        <strong>{item.codigo}</strong>
        <span> - {item.nombre}</span>
      </div>

      <div className="curso-info-meta">
        <span>
          <strong>Pensum:</strong> {item.pensums_label || '—'}
        </span>

        {item.carrera_label && (
          <span>
            <strong>Carrera:</strong> {item.carrera_label}
          </span>
        )}
      </div>
    </div>
  )
}

export default function EquivalenciasPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const [equivalencias, setEquivalencias] = useState([])
  const [cursos, setCursos] = useState([])
  const [pensums, setPensums] = useState([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)

  const [cursoDeSel, setCursoDeSel] = useState(null)
  const [cursoASel, setCursoASel] = useState(null)

  const [filtroPensumDe, setFiltroPensumDe] = useState('')
  const [filtroPensumA, setFiltroPensumA] = useState('')

  const [toDelete, setToDelete] = useState(null)
  const [deleteText, setDeleteText] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError('')

      const [
        equivalenciasData,
        cursosData,
        pensumsData,
      ] = await Promise.all([
        equivalenciasApi.getAll(),
        cursosApi.getAll(),
        pensumApi.getAll(),
      ])

      setEquivalencias(normalizarRespuesta(equivalenciasData))
      setCursos(normalizarRespuesta(cursosData))
      setPensums(normalizarRespuesta(pensumsData))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const pensumsNoVigentes = useMemo(() => {
    return pensums
      .filter(p => Number(p.vigencia) === 0)
      .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true }))
  }, [pensums])

  const pensumsVigentes = useMemo(() => {
    return pensums
      .filter(p => Number(p.vigencia) === 1)
      .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true }))
  }, [pensums])

  const codigosPensumsNoVigentes = useMemo(() => {
    return pensumsNoVigentes
      .map(p => String(p.codigo || '').trim())
      .filter(Boolean)
  }, [pensumsNoVigentes])

  const codigosPensumsVigentes = useMemo(() => {
    return pensumsVigentes
      .map(p => String(p.codigo || '').trim())
      .filter(Boolean)
  }, [pensumsVigentes])

  const cursosDe = useMemo(() => {
    return crearItemsCursos({
      cursos,
      pensums,
      vigencia: 0,
      filtroPensum: filtroPensumDe,
    })
  }, [cursos, pensums, filtroPensumDe])

  const cursosA = useMemo(() => {
    return crearItemsCursos({
      cursos,
      pensums,
      vigencia: 1,
      filtroPensum: filtroPensumA,
    })
  }, [cursos, pensums, filtroPensumA])

  const equivalenciasFiltradas = useMemo(() => {
    const q = normalizarTexto(busqueda)

    if (!q) return equivalencias

    return equivalencias.filter(row => {
      const texto = normalizarTexto([
        row.curso_de_codigo,
        row.curso_de_nombre,
        row.curso_a_codigo,
        row.curso_a_nombre,
        row.pensums_de_no_vigentes,
        row.pensums_a_vigentes,
      ].join(' '))

      return texto.includes(q)
    })
  }, [equivalencias, busqueda])

  const limpiarModal = () => {
    setEditing(null)
    setCursoDeSel(null)
    setCursoASel(null)
    setFiltroPensumDe('')
    setFiltroPensumA('')
  }

  const openCreate = () => {
    setError('')
    setMensaje('')
    limpiarModal()
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setError('')
    setMensaje('')
    setEditing(row)

    const cursoDeExistente = cursosDe.find(c => String(c.id) === String(row.id_curso_de))
    const cursoAExistente = cursosA.find(c => String(c.id) === String(row.id_curso_a))

    setCursoDeSel(cursoDeExistente || buildCursoFallback(row, 'de'))
    setCursoASel(cursoAExistente || buildCursoFallback(row, 'a'))
    setFiltroPensumDe('')
    setFiltroPensumA('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return

    setModalOpen(false)
    limpiarModal()
  }

  const openView = (row) => {
    setViewing(row)
  }

  const closeView = () => {
    setViewing(null)
  }

  const guardar = async (e) => {
    e.preventDefault()

    if (!cursoDeSel || !cursoASel) {
      setError('Debe seleccionar el curso de origen y el curso equivalente.')
      return
    }

    if (Number(cursoDeSel.id) === Number(cursoASel.id)) {
      setError('El curso de origen y el curso equivalente no pueden ser el mismo.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMensaje('')

      if (editing) {
        await equivalenciasApi.update({
          old_id_curso_de: Number(editing.id_curso_de),
          old_id_curso_a: Number(editing.id_curso_a),
          id_curso_de: Number(cursoDeSel.id),
          id_curso_a: Number(cursoASel.id),
        })

        setMensaje('Equivalencia actualizada correctamente.')
      } else {
        await equivalenciasApi.create({
          id_curso_de: Number(cursoDeSel.id),
          id_curso_a: Number(cursoASel.id),
        })

        setMensaje('Equivalencia creada correctamente.')
      }

      closeModal()
      await cargarDatos()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const openDelete = (row) => {
    setError('')
    setMensaje('')
    setDeleteText('')
    setToDelete(row)
  }

  const closeDelete = () => {
    setToDelete(null)
    setDeleteText('')
  }

  const eliminar = async () => {
    if (!toDelete) return

    if (deleteText.trim() !== 'Eliminar') {
      setError('Debe escribir exactamente la palabra Eliminar para confirmar.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMensaje('')

      await equivalenciasApi.remove({
        id_curso_de: Number(toDelete.id_curso_de),
        id_curso_a: Number(toDelete.id_curso_a),
      })

      setMensaje('Equivalencia eliminada correctamente.')
      closeDelete()
      await cargarDatos()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  const filterCurso = (item, query) => {
    const q = normalizarTexto(query)

    return normalizarTexto([
      item.codigo,
      item.nombre,
      item.pensums_label,
      item.carrera_label,
    ].join(' ')).includes(q)
  }

  const renderCurso = (item) => (
    <CursoInfoCard item={item} compact />
  )

  const renderCursoSeleccionado = (item) => (
    <CursoInfoCard item={item} />
  )

  return (
    <div className="page">
      <style>
        {`
          .equiv-toolbar {
            display: grid;
            grid-template-columns: minmax(260px, 1fr) auto;
            gap: 12px;
            align-items: end;
            margin-bottom: 16px;
          }

          .equiv-table-wrap {
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            background: var(--surface);
            box-shadow: var(--shadow-sm);
          }

          .equiv-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 980px;
          }

          .equiv-table th {
            text-align: left;
            font-size: .74rem;
            letter-spacing: .04em;
            text-transform: uppercase;
            color: var(--text-muted);
            background: var(--surface-soft);
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
          }

          .equiv-table td {
            padding: 14px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
            color: var(--text);
          }

          .equiv-table tr:last-child td {
            border-bottom: 0;
          }

          .course-cell strong {
            color: var(--text);
          }

          .course-cell span {
            color: var(--text-soft);
          }

          .pensum-text {
            color: var(--text-soft);
            line-height: 1.45;
            max-width: 260px;
          }

          .actions-cell {
            display: flex;
            gap: 7px;
            flex-wrap: wrap;
          }

          .btn-action-view {
            background: #e0f2fe;
            border-color: #bae6fd;
            color: #075985;
          }

          .btn-action-edit {
            background: #fef3c7;
            border-color: #fde68a;
            color: #92400e;
          }

          .btn-action-delete {
            background: #fee2e2;
            border-color: #fecaca;
            color: #991b1b;
          }

          .search-select-menu {
            position: absolute;
            z-index: 40;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            max-height: 300px;
            overflow-y: auto;
          }

          .search-select-empty {
            padding: 12px;
            color: var(--text-muted);
          }

          .search-select-item {
            width: 100%;
            text-align: left;
            padding: 10px 12px;
            background: transparent;
            border: 0;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            color: var(--text);
          }

          .search-select-item:hover {
            background: rgba(37, 99, 235, .06);
          }

          .selected-course-box {
            margin-top: 8px;
            padding: 10px 12px;
            border: 1px solid rgba(22, 163, 74, .28);
            border-radius: var(--radius-md);
            background: rgba(22, 163, 74, .08);
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: flex-start;
          }

          .curso-info-main {
            font-size: .95rem;
            color: var(--text);
          }

          .curso-info-meta {
            display: grid;
            gap: 3px;
            margin-top: 4px;
            font-size: .78rem;
            color: var(--text-muted);
            line-height: 1.35;
          }

          .curso-info.compact .curso-info-meta {
            font-size: .75rem;
          }

          .modal-grid-equivalencia {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }

          @media (max-width: 900px) {
            .equiv-toolbar,
            .modal-grid-equivalencia {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Equivalencias de cursos</h1>
          <p className="page-sub">
            Relación entre cursos de pensums no vigentes y cursos de pensums vigentes.
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nueva equivalencia
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {mensaje && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {mensaje}
        </div>
      )}

      <div className="table-wrapper" style={{ padding: 16, marginBottom: 18 }}>
        <div className="equiv-toolbar">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Buscar</label>
            <input
              className="form-input"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por código, nombre de curso o pensum..."
            />
          </div>

          <button
            type="button"
            className="btn-table btn-table-secondary"
            onClick={() => setBusqueda('')}
          >
            Limpiar
          </button>
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '.86rem' }}>
          Mostrando {equivalenciasFiltradas.length} de {equivalencias.length} equivalencias
        </div>
      </div>

      <div className="equiv-table-wrap">
        <table className="equiv-table">
          <thead>
            <tr>
              <th>Curso de (origen)</th>
              <th>Curso a (destino)</th>
              <th>Pensum origen</th>
              <th>Pensum destino</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Cargando equivalencias...
                </td>
              </tr>
            ) : equivalenciasFiltradas.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron equivalencias.
                </td>
              </tr>
            ) : (
              equivalenciasFiltradas.map(row => (
                <tr key={`${row.id_curso_de}-${row.id_curso_a}`}>
                  <td className="course-cell">
                    <strong>{row.curso_de_codigo}</strong>
                    <br />
                    <span>{row.curso_de_nombre}</span>
                  </td>

                  <td className="course-cell">
                    <strong>{row.curso_a_codigo}</strong>
                    <br />
                    <span>{row.curso_a_nombre}</span>
                  </td>

                  <td>
                    <div className="pensum-text">
                      {formatearPensumsListado(
                        row.pensums_de_no_vigentes,
                        codigosPensumsNoVigentes,
                        'AREA COMUN PENSUMS ANTIGUOS'
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="pensum-text">
                      {formatearPensumsListado(
                        row.pensums_a_vigentes,
                        codigosPensumsVigentes,
                        'AREA COMUN PENSUMS NUEVOS'
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="actions-cell">
                      <button
                        type="button"
                        className="btn-table btn-action-view"
                        onClick={() => openView(row)}
                      >
                        Ver
                      </button>

                      {canWrite && (
                        <>
                          <button
                            type="button"
                            className="btn-table btn-action-edit"
                            onClick={() => openEdit(row)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn-table btn-action-delete"
                            onClick={() => openDelete(row)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar equivalencia' : 'Nueva equivalencia'}
        width={860}
      >
        <form onSubmit={guardar}>
          <div className="modal-grid-equivalencia">
            <div>
              <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>
                Curso de origen
              </h3>

              <div className="form-group">
                <label className="form-label">Pensum no vigente</label>

                <select
                  className="form-input"
                  value={filtroPensumDe}
                  onChange={e => {
                    setFiltroPensumDe(e.target.value)
                    setCursoDeSel(null)
                  }}
                >
                  <option value="">Todos los pensums no vigentes</option>

                  {pensumsNoVigentes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} - {p.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Buscar curso de origen</label>

                <SearchSelect
                  placeholder="Buscar por código, nombre, pensum o carrera..."
                  items={cursosDe}
                  value={cursoDeSel}
                  onSelect={setCursoDeSel}
                  onClear={() => setCursoDeSel(null)}
                  filterFn={filterCurso}
                  renderItem={renderCurso}
                  renderSelected={renderCursoSeleccionado}
                />
              </div>
            </div>

            <div>
              <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>
                Curso equivalente
              </h3>

              <div className="form-group">
                <label className="form-label">Pensum vigente</label>

                <select
                  className="form-input"
                  value={filtroPensumA}
                  onChange={e => {
                    setFiltroPensumA(e.target.value)
                    setCursoASel(null)
                  }}
                >
                  <option value="">Todos los pensums vigentes</option>

                  {pensumsVigentes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} - {p.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Buscar curso equivalente</label>

                <SearchSelect
                  placeholder="Buscar por código, nombre, pensum o carrera..."
                  items={cursosA}
                  value={cursoASel}
                  onSelect={setCursoASel}
                  onClear={() => setCursoASel(null)}
                  filterFn={filterCurso}
                  renderItem={renderCurso}
                  renderSelected={renderCursoSeleccionado}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-table btn-table-secondary"
              onClick={closeModal}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-table btn-table-primary"
              disabled={saving}
            >
              {saving ? 'Guardando...' : editing ? 'Actualizar equivalencia' : 'Guardar equivalencia'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={closeView}
        title="Detalle de equivalencia"
        width={720}
      >
        {viewing && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="selected-course-box" style={{ background: 'var(--surface-soft)', borderColor: 'var(--border)' }}>
              <div>
                <h3 style={{ margin: '0 0 8px', color: 'var(--text)' }}>Curso de origen</h3>
                <div className="curso-info-main">
                  <strong>{viewing.curso_de_codigo}</strong> - {viewing.curso_de_nombre}
                </div>
                <div className="curso-info-meta">
                  <span><strong>Pensum:</strong> {viewing.pensums_de_no_vigentes || '—'}</span>
                </div>
              </div>
            </div>

            <div className="selected-course-box" style={{ background: 'var(--surface-soft)', borderColor: 'var(--border)' }}>
              <div>
                <h3 style={{ margin: '0 0 8px', color: 'var(--text)' }}>Curso equivalente</h3>
                <div className="curso-info-main">
                  <strong>{viewing.curso_a_codigo}</strong> - {viewing.curso_a_nombre}
                </div>
                <div className="curso-info-meta">
                  <span><strong>Pensum:</strong> {viewing.pensums_a_vigentes || '—'}</span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-table btn-table-secondary"
                onClick={closeView}
              >
                Cerrar
              </button>

              {canWrite && (
                <button
                  type="button"
                  className="btn-table btn-action-edit"
                  onClick={() => {
                    closeView()
                    openEdit(viewing)
                  }}
                >
                  Editar
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={closeDelete}
        title="Eliminar equivalencia"
        width={540}
      >
        {toDelete && (
          <>
            <p style={{ color: 'var(--text-soft)', lineHeight: 1.6 }}>
              Para eliminar la equivalencia entre:
            </p>

            <div
              style={{
                margin: '12px 0',
                padding: 12,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-soft)',
              }}
            >
              <strong>{toDelete.curso_de_codigo}</strong> - {toDelete.curso_de_nombre}
              <br />
              <span style={{ color: 'var(--text-muted)' }}>equivale a</span>
              <br />
              <strong>{toDelete.curso_a_codigo}</strong> - {toDelete.curso_a_nombre}
            </div>

            <div className="form-group">
              <label className="form-label">
                Escriba Eliminar para confirmar
              </label>

              <input
                className="form-input"
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                placeholder="Eliminar"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-table btn-table-secondary"
                onClick={closeDelete}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-table btn-table-danger"
                onClick={eliminar}
                disabled={saving || deleteText.trim() !== 'Eliminar'}
              >
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
