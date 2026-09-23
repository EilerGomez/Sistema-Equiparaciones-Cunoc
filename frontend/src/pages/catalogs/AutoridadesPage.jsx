import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  autoridadesApi,
  profesionesApi,
  getPublicFileUrl,
} from '../../api/catalogs'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'

const normalizarRespuesta = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

export default function AutoridadesPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const [items, setItems] = useState([])
  const [profesiones, setProfesiones] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const cargarAutoridades = async () => {
    try {
      setLoading(true)
      const data = await autoridadesApi.getAll()
      setItems(normalizarRespuesta(data))
    } catch (_error) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const cargarProfesiones = async () => {
    try {
      const data = await profesionesApi.getAll()
      setProfesiones(normalizarRespuesta(data))
    } catch (_error) {
      setProfesiones([])
    }
  }

  useEffect(() => {
    cargarAutoridades()
    cargarProfesiones()
  }, [])

  const limpiarFormulario = () => {
    reset({
      codigo: '',
      descripcion: '',
      nombre: '',
      id_profesion: '',
      firma: null,
      sello: null,
    })
  }

  const openCreate = () => {
    setEditing(null)
    limpiarFormulario()
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)

    reset({
      codigo: row.codigo || '',
      descripcion: row.descripcion || '',
      nombre: row.nombre || '',
      id_profesion: row.id_profesion || '',
      firma: null,
      sello: null,
    })

    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    limpiarFormulario()
  }

  const openView = async (row) => {
    try {
      const data = await autoridadesApi.getOne(row.id)
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
    try {
      setSaving(true)

      const formData = new FormData()

      if (!editing) {
        formData.append('codigo', data.codigo.trim())
      }

      formData.append('descripcion', data.descripcion.trim())
      formData.append('nombre', data.nombre.trim())
      formData.append('id_profesion', Number(data.id_profesion))

      if (data.firma && data.firma[0]) {
        formData.append('firma', data.firma[0])
      }

      if (data.sello && data.sello[0]) {
        formData.append('sello', data.sello[0])
      }

      if (editing) {
        await autoridadesApi.update(editing.id, formData)
      } else {
        await autoridadesApi.create(formData)
      }

      await cargarAutoridades()
      closeModal()
    } catch (error) {
      const msg = error?.response?.data?.message || 'No se pudo guardar la autoridad'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  const renderImagen = (url, alt) => {
    if (!url) {
      return (
        <div style={{
          border: '1px dashed #ccc',
          borderRadius: 10,
          padding: 16,
          textAlign: 'center',
          color: '#777',
        }}>
          Sin imagen
        </div>
      )
    }

    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 12,
        background: '#fff',
        textAlign: 'center',
      }}>
        <img
          src={getPublicFileUrl(url)}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: 180,
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
          <h1 className="page-title">Autoridades</h1>
          <p className="page-sub">
            Gestión de autoridades académicas y administrativas
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nueva autoridad
          </button>
        )}
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Código</th>
              <th>Descripción</th>
              <th>Nombre</th>
              <th>Profesión</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>
                  Cargando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>
                  No hay autoridades registradas.
                </td>
              </tr>
            ) : (
              items.map(row => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.codigo}</td>
                  <td>{row.descripcion}</td>
                  <td>{row.nombre}</td>
                  <td>{row.profesion_subfijo || row.profesion || '—'}</td>
                  <td>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 8,
                    }}>
                      <button
                        type="button"
                        className="btn-table btn-table-secondary"
                        onClick={() => openView(row)}
                      >
                        Ver
                      </button>

                      {canWrite && (
                        <button
                          type="button"
                          className="btn-table btn-table-primary"
                          onClick={() => openEdit(row)}
                        >
                          Editar
                        </button>
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
        title={editing ? 'Editar autoridad' : 'Nueva autoridad'}
        width={620}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Código</label>

            <input
              className={`form-input ${errors.codigo ? 'error' : ''}`}
              placeholder="COO_ING_SISTEMAS"
              disabled={!!editing}
              {...register('codigo', {
                required: editing ? false : 'Requerido',
              })}
            />

            {editing && (
              <p className="form-hint">
                El código no se puede modificar.
              </p>
            )}

            {errors.codigo && (
              <p className="form-error">
                {errors.codigo.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Descripción / Cargo</label>

            <input
              className={`form-input ${errors.descripcion ? 'error' : ''}`}
              placeholder="Coordinador de Ingeniería en Ciencias y Sistemas"
              {...register('descripcion', {
                required: 'Requerido',
              })}
            />

            {errors.descripcion && (
              <p className="form-error">
                {errors.descripcion.message}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Nombre</label>

            <input
              className={`form-input ${errors.nombre ? 'error' : ''}`}
              placeholder="Nombre de la autoridad"
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

              {profesiones.map(profesion => (
                <option key={profesion.id} value={profesion.id}>
                  {profesion.nombre} - {profesion.subfijo}
                </option>
              ))}
            </select>

            {errors.id_profesion && (
              <p className="form-error">
                {errors.id_profesion.message}
              </p>
            )}
          </div>

          {editing && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 16,
            }}>
              <div>
                <label className="form-label">Firma actual</label>
                {renderImagen(editing.url_firma, 'Firma actual')}
              </div>

              <div>
                <label className="form-label">Sello actual</label>
                {renderImagen(editing.url_sello, 'Sello actual')}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Firma de la autoridad
            </label>

            <input
              type="file"
              className="form-input"
              accept="image/png,image/jpeg"
              {...register('firma')}
            />

            <p className="form-hint">
              Formatos permitidos: PNG y JPG. Al editar, si no seleccionas una nueva imagen, se conserva la actual.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              Sello de la autoridad
            </label>

            <input
              type="file"
              className="form-input"
              accept="image/png,image/jpeg"
              {...register('sello')}
            />

            <p className="form-hint">
              Formatos permitidos: PNG y JPG. Al editar, si no seleccionas una nueva imagen, se conserva el actual.
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
        title="Detalle de autoridad"
        width={720}
      >
        {selected && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              marginBottom: 18,
            }}>
              <div>
                <strong>ID</strong>
                <p>{selected.id}</p>
              </div>

              <div>
                <strong>Código</strong>
                <p>{selected.codigo}</p>
              </div>

              <div>
                <strong>Descripción / Cargo</strong>
                <p>{selected.descripcion}</p>
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
                <p>{selected.profesion_subfijo || '—'}</p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}>
              <div>
                <strong>Firma</strong>
                <div style={{ marginTop: 8 }}>
                  {renderImagen(selected.url_firma, 'Firma de autoridad')}
                </div>
              </div>

              <div>
                <strong>Sello</strong>
                <div style={{ marginTop: 8 }}>
                  {renderImagen(selected.url_sello, 'Sello de autoridad')}
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
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}