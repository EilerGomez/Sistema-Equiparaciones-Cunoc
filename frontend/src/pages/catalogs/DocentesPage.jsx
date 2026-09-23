import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useCrud } from '../../hooks/useCrud'
import {
  docentesApi,
  profesionesApi,
  getPublicFileUrl,
} from '../../api/catalogs'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'

const normalizarRespuesta = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

export default function DocentesPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const {
    items,
    loading,
    saving,
    create,
    update,
    remove,
  } = useCrud(docentesApi)

  const [profesiones, setProfesiones] = useState([])
  const [busqueda, setBusqueda] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)

  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    profesionesApi.getAll()
      .then(data => setProfesiones(normalizarRespuesta(data)))
      .catch(() => setProfesiones([]))
  }, [])

  const itemsFiltrados = useMemo(() => {
    if (!busqueda.trim()) return items

    const q = busqueda.toLowerCase()

    return items.filter(d =>
      d.nombre?.toLowerCase().includes(q) ||
      d.codigo?.toLowerCase().includes(q) ||
      d.correo?.toLowerCase().includes(q) ||
      d.profesion?.toLowerCase().includes(q)
    )
  }, [items, busqueda])

  const openCreate = () => {
    setEditing(null)

    reset({
      codigo: '',
      nombre: '',
      telefono: '',
      correo: '',
      id_profesion: '',
      firma: null,
    })

    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)

    reset({
      codigo: row.codigo || '',
      nombre: row.nombre || '',
      telefono: row.telefono || '',
      correo: row.correo || '',
      id_profesion: row.id_profesion || '',
      firma: null,
    })

    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)

    reset({
      codigo: '',
      nombre: '',
      telefono: '',
      correo: '',
      id_profesion: '',
      firma: null,
    })
  }

  const openView = async (row) => {
    try {
      const data = await docentesApi.getOne(row.id)
      setSelected(data?.data || data)
      setViewOpen(true)
    } catch (_error) {
      setSelected(row)
      setViewOpen(true)
    }
  }

  const closeView = () => {
    setViewOpen(false)
    setSelected(null)
  }

  const onSubmit = async (data) => {
    const formData = new FormData()

    formData.append('codigo', data.codigo || '')
    formData.append('nombre', data.nombre || '')
    formData.append('telefono', data.telefono || '')
    formData.append('correo', data.correo || '')
    formData.append('id_profesion', Number(data.id_profesion))

    if (data.firma && data.firma[0]) {
      formData.append('firma', data.firma[0])
    }

    const ok = editing
      ? await update(editing.id, formData)
      : await create(formData)

    if (ok) {
      closeModal()
    }
  }

  const confirmarEliminacion = async () => {
    if (!toDelete) return

    await remove(toDelete.id)
    setToDelete(null)
  }

  const renderFirma = (url, alt = 'Firma del docente') => {
    if (!url) {
      return (
        <div
          style={{
            border: '1px dashed #cbd5e1',
            borderRadius: 12,
            padding: 18,
            textAlign: 'center',
            color: '#64748b',
            background: '#f8fafc',
          }}
        >
          Sin firma registrada
        </div>
      )
    }

    return (
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 12,
          background: '#fff',
          textAlign: 'center',
        }}
      >
        <img
          src={getPublicFileUrl(url)}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: 190,
            objectFit: 'contain',
          }}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Docentes</h1>

          <p className="page-sub">
            {busqueda
              ? `${itemsFiltrados.length} de ${items.length} docentes`
              : `${items.length} docentes`}
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nuevo docente
          </button>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="filter-input"
          placeholder="Buscar por nombre, código, correo o profesión..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ maxWidth: 420 }}
        />

        {busqueda && (
          <button
            type="button"
            className="btn-clear-filters"
            onClick={() => setBusqueda('')}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Profesión</th>
              <th>Código</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>
                  Cargando...
                </td>
              </tr>
            ) : itemsFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>
                  No hay docentes registrados.
                </td>
              </tr>
            ) : (
              itemsFiltrados.map(row => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.nombre}</td>
                  <td>{row.profesion || '—'}</td>
                  <td>{row.codigo || '—'}</td>
                  <td>{row.telefono || '—'}</td>
                  <td>{row.correo || '—'}</td>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        type="button"
                        className="btn-table btn-table-secondary"
                        onClick={() => openView(row)}
                      >
                        Ver
                      </button>

                      {canWrite && (
                        <>
                          <button
                            type="button"
                            className="btn-table btn-table-primary"
                            onClick={() => openEdit(row)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn-table btn-table-danger"
                            onClick={() => setToDelete(row)}
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
        title={editing ? 'Editar docente' : 'Nuevo docente'}
        width={620}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Nombre completo</label>

            <input
              className={`form-input ${errors.nombre ? 'error' : ''}`}
              placeholder="Juan Carlos García López"
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
            <label className="form-label">Profesión</label>

            <select
              className={`form-input ${errors.id_profesion ? 'error' : ''}`}
              {...register('id_profesion', {
                required: 'Requerido',
              })}
            >
              <option value="">Seleccionar...</option>

              {profesiones.map(p => (
                <option key={p.id} value={p.id}>
                  {p.subfijo} {p.nombre}
                </option>
              ))}
            </select>

            {errors.id_profesion && (
              <p className="form-error">
                {errors.id_profesion.message}
              </p>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">
                Código <span style={{ color: 'var(--ink-3)' }}>(opcional)</span>
              </label>

              <input
                className="form-input"
                placeholder="DOC001"
                {...register('codigo')}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Teléfono <span style={{ color: 'var(--ink-3)' }}>(opcional)</span>
              </label>

              <input
                className="form-input"
                placeholder="50212345678"
                {...register('telefono')}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Correo <span style={{ color: 'var(--ink-3)' }}>(opcional)</span>
            </label>

            <input
              type="email"
              className={`form-input ${errors.correo ? 'error' : ''}`}
              placeholder="docente@usac.edu.gt"
              {...register('correo', {
                validate: v => !v || /^\S+@\S+\.\S+$/.test(v) || 'Correo inválido',
              })}
            />

            {errors.correo && (
              <p className="form-error">
                {errors.correo.message}
              </p>
            )}
          </div>

          {editing && (
            <div className="form-group">
              <label className="form-label">Firma actual</label>
              {renderFirma(editing.url_firma, 'Firma actual del docente')}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Firma del docente</label>

            <input
              type="file"
              className="form-input"
              accept="image/*"
              {...register('firma')}
            />

            <p className="form-hint">
              Puedes subir PNG, JPG, JPEG, WEBP, GIF o cualquier imagen válida.
              Al editar, si no seleccionas una nueva imagen, se conserva la firma actual.
            </p>
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
        open={viewOpen}
        onClose={closeView}
        title="Detalle del docente"
        width={720}
      >
        {selected && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div>
                <strong>ID</strong>
                <p>{selected.id}</p>
              </div>

              <div>
                <strong>Código</strong>
                <p>{selected.codigo || '—'}</p>
              </div>

              <div>
                <strong>Nombre</strong>
                <p>{selected.nombre}</p>
              </div>

              <div>
                <strong>Profesión</strong>
                <p>{selected.profesion || '—'}</p>
              </div>

              <div>
                <strong>Subfijo</strong>
                <p>{selected.subfijo || selected.profesion_subfijo || '—'}</p>
              </div>

              <div>
                <strong>Teléfono</strong>
                <p>{selected.telefono || '—'}</p>
              </div>

              <div>
                <strong>Correo</strong>
                <p>{selected.correo || '—'}</p>
              </div>
            </div>

            <div>
              <strong>Firma</strong>

              <div style={{ marginTop: 10 }}>
                {renderFirma(selected.url_firma, 'Firma del docente')}
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
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmarEliminacion}
        message={`¿Eliminar al docente "${toDelete?.nombre}"?`}
      />
    </div>
  )
}