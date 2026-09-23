import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useCrud } from '../../hooks/useCrud'
import { cursosApi, pensumApi } from '../../api/catalogs'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'

const BASE_COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'carrera_subfijo', label: 'Carrera' },
  { key: 'semestre', label: 'Semestre' },
  { key: 'pensum_desc', label: 'Pensum' },
]

const ANIOS = Array.from({ length: 5 }, (_, i) => ({
  label: `Año ${i + 1}`,
  semestres: [i * 2 + 1, i * 2 + 2],
}))

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
)

const PencilIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 20h9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M18 6 6 18"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="m6 6 12 12"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
)

const normalizarTexto = (texto) => {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const normalizarRespuesta = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

const mostrarValor = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '-'
  return String(valor)
}

const mostrarVigencia = (valor) => {
  if (Number(valor) === 1) return 'Activo'
  if (Number(valor) === 0) return 'No activo'
  return '-'
}

export default function CursosPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const {
    items,
    loading,
    saving,
    create,
    update,
    remove,
  } = useCrud(cursosApi, { pkField: 'id' })

  const [pensums, setPensums] = useState([])

  const [filtBusqueda, setFiltBusqueda] = useState('')
  const [filtPensum, setFiltPensum] = useState('')
  const [filtVigencia, setFiltVigencia] = useState('')
  const [filtSemestre, setFiltSemestre] = useState('')
  const [filtAnio, setFiltAnio] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    pensumApi.getAll()
      .then(data => setPensums(normalizarRespuesta(data)))
      .catch(() => {})
  }, [])

  const pensumsById = useMemo(() => {
    const map = new Map()

    for (const pensum of pensums) {
      map.set(String(pensum.id), pensum)
    }

    return map
  }, [pensums])

  const obtenerVigenciaPensum = (item) => {
    return item.pensum_vigencia ??
      item.vigencia ??
      item.pensum_vigente ??
      pensumsById.get(String(item.id_pensum))?.vigencia ??
      ''
  }

  const pensumsFiltro = useMemo(() => {
    const map = new Map()

    for (const item of items) {
      const idPensum = item.id_pensum

      if (!idPensum) continue

      const vigenciaPensum = obtenerVigenciaPensum(item)

      if (
        filtVigencia !== '' &&
        String(vigenciaPensum) !== String(filtVigencia)
      ) {
        continue
      }

      if (!map.has(idPensum)) {
        const pensumBase = pensumsById.get(String(idPensum))

        map.set(idPensum, {
          id: idPensum,
          codigo: item.pensum_codigo || pensumBase?.codigo || '',
          descripcion: item.pensum_desc || item.pensum_descripcion || pensumBase?.descripcion || '',
          anio: item.pensum_anio || pensumBase?.anio || '',
          vigencia: vigenciaPensum,
          subfijo: item.carrera_subfijo || '',
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => Number(b.anio) - Number(a.anio))
  }, [items, pensumsById, filtVigencia])

  useEffect(() => {
    if (!filtPensum) return

    const existePensumEnFiltro = pensumsFiltro.some(
      pensum => String(pensum.id) === String(filtPensum)
    )

    if (!existePensumEnFiltro) {
      setFiltPensum('')
    }
  }, [filtPensum, pensumsFiltro])

  const handleAnioChange = (value) => {
    setFiltAnio(value)
    setFiltSemestre('')
  }

  const handleSemestreChange = (value) => {
    setFiltSemestre(value)
    setFiltAnio('')
  }

  const semestresDisponibles = useMemo(() => {
    if (filtAnio) {
      const anio = ANIOS.find(item => item.label === filtAnio)
      return anio ? anio.semestres : []
    }

    return Array.from({ length: 12 }, (_, i) => i + 1)
  }, [filtAnio])

  const filtered = useMemo(() => {
    return items.filter(item => {
      const busqueda = normalizarTexto(filtBusqueda)

      if (busqueda) {
        const textoItem = normalizarTexto([
          item.codigo,
          item.nombre,
          item.carrera_subfijo,
          item.carrera_desc,
          item.carrera_descripcion,
          item.pensum_codigo,
          item.pensum_desc,
          item.pensum_descripcion,
          item.pensum_anio,
          item.semestre,
          `semestre ${item.semestre || ''}`,
        ].join(' '))

        if (!textoItem.includes(busqueda)) {
          return false
        }
      }

      if (
        filtVigencia !== '' &&
        String(obtenerVigenciaPensum(item)) !== String(filtVigencia)
      ) {
        return false
      }

      if (
        filtPensum &&
        String(item.id_pensum) !== String(filtPensum)
      ) {
        return false
      }

      if (
        filtSemestre &&
        Number(item.semestre) !== Number(filtSemestre)
      ) {
        return false
      }

      if (filtAnio) {
        const anio = ANIOS.find(itemAnio => itemAnio.label === filtAnio)

        if (anio && !anio.semestres.includes(Number(item.semestre))) {
          return false
        }
      }

      return true
    })
  }, [
    items,
    filtBusqueda,
    filtPensum,
    filtVigencia,
    filtSemestre,
    filtAnio,
    pensumsById,
  ])

  const clearFilters = () => {
    setFiltBusqueda('')
    setFiltPensum('')
    setFiltVigencia('')
    setFiltSemestre('')
    setFiltAnio('')
  }

  const hasFilters =
    filtBusqueda ||
    filtPensum ||
    filtVigencia ||
    filtSemestre ||
    filtAnio

  const openCreate = () => {
    setEditing(null)

    reset({
      codigo: '',
      nombre: '',
      id_pensum: '',
      semestre: '',
    })

    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)

    reset({
      codigo: row.codigo || '',
      nombre: row.nombre || '',
      id_pensum: row.id_pensum || '',
      semestre: row.semestre || '',
    })

    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)

    reset({
      codigo: '',
      nombre: '',
      id_pensum: '',
      semestre: '',
    })
  }

  const closeViewModal = () => {
    setViewing(null)
  }

  const onSubmit = async (data) => {
    const body = {
      codigo: data.codigo.trim(),
      nombre: data.nombre.trim(),
      id_pensum: Number(data.id_pensum),
      semestre: Number(data.semestre),
    }

    const ok = editing
      ? await update(editing.id, body)
      : await create(body)

    if (ok) {
      closeModal()
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return

    const ok = await remove(toDelete.id)

    if (ok) {
      setToDelete(null)
    }
  }

  const columns = [
    ...BASE_COLUMNS,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_value, row) => (
        <div className="table-actions">
          <button
            type="button"
            className="btn-table btn-table-secondary"
            onClick={() => setViewing(row)}
            title="Ver"
            aria-label="Ver detalles del curso"
          >
            <EyeIcon />
          </button>

          {canWrite && (
            <button
              type="button"
              className="btn-table btn-table-secondary"
              onClick={() => openEdit(row)}
              title="Editar"
              aria-label="Editar curso"
              style={{
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid #e5e7eb',
              }}
            >
              <PencilIcon />
            </button>
          )}

          {canWrite && (
            <button
              type="button"
              className="btn-table btn-table-danger"
              onClick={() => setToDelete(row)}
              title="Eliminar"
              aria-label="Eliminar curso"
              style={{
                background: 'transparent',
                color: '#dc2626',
                border: '1px solid #fecaca',
              }}
            >
              <XIcon />
            </button>
          )}
        </div>
      ),
    },
  ]

  const detalleCurso = viewing
    ? {
        ID: viewing.id,
        'ID curso': viewing.id_curso,
        Código: viewing.codigo,
        Nombre: viewing.nombre,
        Semestre: viewing.semestre,
        'ID pensum': viewing.id_pensum,
        'Código pensum': viewing.pensum_codigo,
        Pensum: viewing.pensum_desc || viewing.pensum_descripcion,
        'Año pensum': viewing.pensum_anio,
        'Estado pensum': mostrarVigencia(obtenerVigenciaPensum(viewing)),
        'ID carrera': viewing.id_carrera,
        'Código carrera': viewing.carrera_codigo,
        Carrera: viewing.carrera_desc,
        'Subfijo carrera': viewing.carrera_subfijo,
      }
    : {}

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cursos</h1>
          <p className="page-sub">
            {hasFilters
              ? `${filtered.length} de ${items.length} cursos`
              : `${items.length} cursos`}
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nuevo curso
          </button>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="filter-input"
          placeholder="Buscar por código, nombre, carrera, pensum o semestre..."
          value={filtBusqueda}
          onChange={e => setFiltBusqueda(e.target.value)}
        />

        <select
          className="filter-input"
          value={filtVigencia}
          onChange={e => setFiltVigencia(e.target.value)}
        >
          <option value="">Pensum activos y no activos</option>
          <option value="1">Solo pensum activos</option>
          <option value="0">Solo pensum no activos</option>
        </select>

        <select
          className="filter-input"
          value={filtPensum}
          onChange={e => setFiltPensum(e.target.value)}
        >
          <option value="">Todos los pensum</option>
          {pensumsFiltro.map(p => (
            <option key={p.id} value={p.id}>
              {p.subfijo} — {p.codigo} ({p.anio})
            </option>
          ))}
        </select>

        <select
          className="filter-input"
          value={filtAnio}
          onChange={e => handleAnioChange(e.target.value)}
        >
          <option value="">Todos los años</option>
          {ANIOS.map(anio => (
            <option key={anio.label} value={anio.label}>
              {anio.label} (sem. {anio.semestres[0]}-{anio.semestres[1]})
            </option>
          ))}
        </select>

        <select
          className="filter-input"
          value={filtSemestre}
          onChange={e => handleSemestreChange(e.target.value)}
        >
          <option value="">Todos los semestres</option>
          {semestresDisponibles.map(semestre => (
            <option key={semestre} value={semestre}>
              Semestre {semestre}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button className="btn-clear-filters" onClick={clearFilters}>
            ✕ Limpiar
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        canWrite={false}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar curso' : 'Nuevo curso'}
        width={520}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Código</label>
            <input
              className={`form-input ${errors.codigo ? 'error' : ''}`}
              placeholder="Ej: 3001"
              {...register('codigo', {
                required: 'Requerido',
              })}
            />
            {errors.codigo && (
              <p className="form-error">
                {errors.codigo.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              className={`form-input ${errors.nombre ? 'error' : ''}`}
              placeholder="Introducción a la programación"
              {...register('nombre', {
                required: 'Requerido',
              })}
            />
            {errors.nombre && (
              <p className="form-error">
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Pensum</label>
            <select
              className={`form-input ${errors.id_pensum ? 'error' : ''}`}
              {...register('id_pensum', {
                required: 'Requerido',
              })}
            >
              <option value="">Seleccionar...</option>
              {pensums.map(pensum => (
                <option key={pensum.id} value={pensum.id}>
                  {pensum.codigo} - {pensum.descripcion} ({pensum.anio})
                </option>
              ))}
            </select>
            {errors.id_pensum && (
              <p className="form-error">
                {errors.id_pensum.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Semestre</label>
            <input
              type="number"
              className={`form-input ${errors.semestre ? 'error' : ''}`}
              placeholder="1"
              {...register('semestre', {
                required: 'Requerido',
                min: {
                  value: 1,
                  message: 'Mínimo 1',
                },
                max: {
                  value: 12,
                  message: 'Máximo 12',
                },
              })}
            />
            {errors.semestre && (
              <p className="form-error">
                {errors.semestre.message}
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-table btn-table-secondary"
              onClick={closeModal}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-table btn-table-primary"
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={closeViewModal}
        title="Detalle del curso"
        width={640}
      >
        {viewing && (
          <>
            <table className="data-table">
              <tbody>
                {Object.entries(detalleCurso).map(([campo, valor]) => (
                  <tr key={campo}>
                    <th>{campo}</th>
                    <td>{mostrarValor(valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-table btn-table-secondary"
                onClick={closeViewModal}
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        message={`¿Eliminar el curso "${toDelete?.nombre}" del pensum "${toDelete?.pensum_codigo}"?`}
      />
    </div>
  )
}