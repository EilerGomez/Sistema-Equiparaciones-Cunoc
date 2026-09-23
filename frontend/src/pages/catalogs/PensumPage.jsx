import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useCrud } from '../../hooks/useCrud'
import { pensumApi, carrerasApi } from '../../api/catalogs'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'

const COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'anio', label: 'Año' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'carrera', label: 'Carrera' },
  {
    key: 'vigencia',
    label: 'Vigente',
    render: (v) => (
      <span className={`badge ${Number(v) === 1 ? 'badge-success' : 'badge-muted'}`}>
        {Number(v) === 1 ? 'Sí' : 'No'}
      </span>
    ),
  },
]

export default function PensumPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const {
    items,
    loading,
    saving,
    create,
    update,
  } = useCrud(pensumApi, { pkField: 'codigo' })

  const [carreras, setCarreras] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    carrerasApi.getAll()
      .then(setCarreras)
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setEditing(null)

    reset({
      codigo: '',
      anio: '',
      descripcion: '',
      id_carrera: '',
      vigencia: '1',
    })

    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)

    reset({
      codigo: row.codigo || '',
      anio: row.anio || '',
      descripcion: row.descripcion || '',
      id_carrera: row.id_carrera || '',
      vigencia: String(Number(row.vigencia) === 1 ? 1 : 0),
    })

    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)

    reset({
      codigo: '',
      anio: '',
      descripcion: '',
      id_carrera: '',
      vigencia: '1',
    })
  }

  const onSubmit = async (data) => {
    const body = {
      codigo: editing ? editing.codigo : data.codigo.trim(),
      anio: editing ? Number(editing.anio) : Number(data.anio),
      descripcion: data.descripcion.trim(),
      id_carrera: Number(data.id_carrera),
      vigencia: Number(data.vigencia),
    }

    const ok = editing
      ? await update(editing.codigo, body)
      : await create(body)

    if (ok) {
      closeModal()
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pensum</h1>
          <p className="page-sub">Planes de estudio por carrera</p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nuevo pensum
          </button>
        )}
      </div>

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
        title={editing ? 'Editar pensum' : 'Nuevo pensum'}
        width={560}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Código</label>

              <input
                className={`form-input ${errors.codigo ? 'error' : ''}`}
                placeholder="2025-58"
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
              <label className="form-label">Año</label>

              <input
                type="number"
                className={`form-input ${errors.anio ? 'error' : ''}`}
                placeholder="2025"
                disabled={!!editing}
                {...register('anio', {
                  required: 'Requerido',
                  min: {
                    value: 1900,
                    message: 'Año inválido',
                  },
                  max: {
                    value: 2100,
                    message: 'Año inválido',
                  },
                })}
              />

              {editing && (
                <p className="form-hint">
                  El año no se puede modificar.
                </p>
              )}

              {errors.anio && (
                <p className="form-error">
                  {errors.anio.message}
                </p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>

            <input
              className={`form-input ${errors.descripcion ? 'error' : ''}`}
              placeholder="Pensum 2025"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Carrera</label>

              <select
                className={`form-input ${errors.id_carrera ? 'error' : ''}`}
                {...register('id_carrera', {
                  required: 'Requerido',
                })}
              >
                <option value="">Seleccionar...</option>

                {carreras.map(carrera => (
                  <option key={carrera.id} value={carrera.id}>
                    {carrera.descripcion}
                  </option>
                ))}
              </select>

              {errors.id_carrera && (
                <p className="form-error">
                  {errors.id_carrera.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>

              <select
                className={`form-input ${errors.vigencia ? 'error' : ''}`}
                {...register('vigencia', {
                  required: 'Requerido',
                })}
              >
                <option value="1">Activo / Vigente</option>
                <option value="0">Inactivo / No vigente</option>
              </select>

              {errors.vigencia && (
                <p className="form-error">
                  {errors.vigencia.message}
                </p>
              )}
            </div>
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
