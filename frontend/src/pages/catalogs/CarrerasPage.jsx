import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useCrud } from '../../hooks/useCrud'
import { carrerasApi, institucionesApi } from '../../api/catalogs'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'codigo', label: 'Código' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'subfijo', label: 'Subfijo' },
  { key: 'institucion_codigo', label: 'Institución' },
]

const normalizarRespuesta = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

export default function CarrerasPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const {
    items,
    loading,
    saving,
    create,
    update,
  } = useCrud(carrerasApi)

  const [instituciones, setInstituciones] = useState([])
  const [loadingInstituciones, setLoadingInstituciones] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [errorCatalogo, setErrorCatalogo] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    cargarInstituciones()
  }, [])

  const cargarInstituciones = async () => {
    try {
      setLoadingInstituciones(true)
      setErrorCatalogo('')

      const data = await institucionesApi.getAll()
      setInstituciones(normalizarRespuesta(data))
    } catch (err) {
      setErrorCatalogo(
        err.response?.data?.message ||
        err.message ||
        'Error al cargar instituciones'
      )
    } finally {
      setLoadingInstituciones(false)
    }
  }

  const openCreate = () => {
    setEditing(null)

    reset({
      codigo: '',
      descripcion: '',
      subfijo: '',
      id_institucion: '',
    })

    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)

    reset({
      codigo: row.codigo || '',
      descripcion: row.descripcion || '',
      subfijo: row.subfijo || '',
      id_institucion: row.id_institucion || '',
    })

    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)

    reset({
      codigo: '',
      descripcion: '',
      subfijo: '',
      id_institucion: '',
    })
  }

  const onSubmit = async (data) => {
    const body = {
      codigo: editing ? editing.codigo : data.codigo.trim(),
      descripcion: data.descripcion.trim(),
      subfijo: data.subfijo.trim(),
      id_institucion: Number(data.id_institucion),
    }

    const ok = editing
      ? await update(editing.id, body)
      : await create(body)

    if (ok) {
      closeModal()
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Carreras</h1>
          <p className="page-sub">
            Carreras universitarias registradas por institución
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nueva carrera
          </button>
        )}
      </div>

      {errorCatalogo && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {errorCatalogo}
        </div>
      )}

      <DataTable
        columns={COLUMNS}
        data={items}
        loading={loading}
        canWrite={canWrite}
        onEdit={openEdit}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar carrera' : 'Nueva carrera'}
        width={620}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Código</label>

              <input
                className={`form-input ${errors.codigo ? 'error' : ''}`}
                placeholder="120058"
                disabled={!!editing}
                {...register('codigo', {
                  required: 'Requerido',
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
              <label className="form-label">Subfijo</label>

              <input
                className={`form-input ${errors.subfijo ? 'error' : ''}`}
                placeholder="Ing. Sistemas"
                {...register('subfijo', {
                  required: 'Requerido',
                })}
              />

              {errors.subfijo && (
                <p className="form-error">
                  {errors.subfijo.message}
                </p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>

            <input
              className={`form-input ${errors.descripcion ? 'error' : ''}`}
              placeholder="Ingeniería en Ciencias y Sistemas"
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
            <label className="form-label">Institución</label>

            <select
              className={`form-input ${errors.id_institucion ? 'error' : ''}`}
              disabled={loadingInstituciones}
              {...register('id_institucion', {
                required: 'Requerido',
              })}
            >
              <option value="">
                {loadingInstituciones ? 'Cargando instituciones...' : 'Seleccionar institución...'}
              </option>

              {instituciones.map((institucion) => (
                <option key={institucion.id} value={institucion.id}>
                  {institucion.codigo} - {institucion.nombre}
                </option>
              ))}
            </select>

            {errors.id_institucion && (
              <p className="form-error">
                {errors.id_institucion.message}
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
    </div>
  )
}