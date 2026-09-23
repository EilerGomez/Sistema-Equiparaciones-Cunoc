import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useCrud } from '../../hooks/useCrud'
import { ciclosApi, codigoCicloApi } from '../../api/catalogs'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'codigo', label: 'Tipo de ciclo' },
  { key: 'anio', label: 'Año' },
  { key: 'descripcion', label: 'Descripción' },
]

const normalizarRespuesta = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

export default function CiclosPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const {
    items,
    loading,
    saving,
    create,
    update,
  } = useCrud(ciclosApi)

  const [codigosCiclo, setCodigosCiclo] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    codigoCicloApi.getAll()
      .then(data => setCodigosCiclo(normalizarRespuesta(data)))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setEditing(null)

    reset({
      id_codigo_ciclo: '',
      anio: new Date().getFullYear(),
    })

    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)

    reset({
      id_codigo_ciclo: row.id_codigo_ciclo || '',
      anio: row.anio || new Date().getFullYear(),
    })

    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)

    reset({
      id_codigo_ciclo: '',
      anio: '',
    })
  }

  const onSubmit = async (data) => {
    const body = {
      id_codigo_ciclo: Number(data.id_codigo_ciclo),
      anio: Number(data.anio),
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
          <h1 className="page-title">Ciclos</h1>
          <p className="page-sub">
            Periodos académicos de un año
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nuevo ciclo
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
        title={editing ? 'Editar ciclo' : 'Nuevo ciclo'}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Tipo de ciclo</label>

              <select
                className={`form-input ${errors.id_codigo_ciclo ? 'error' : ''}`}
                {...register('id_codigo_ciclo', {
                  required: 'Requerido',
                })}
              >
                <option value="">Seleccionar...</option>

                {codigosCiclo.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.codigo}
                  </option>
                ))}
              </select>

              {errors.id_codigo_ciclo && (
                <p className="form-error">
                  {errors.id_codigo_ciclo.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Año</label>

              <input
                type="number"
                className={`form-input ${errors.anio ? 'error' : ''}`}
                placeholder={new Date().getFullYear()}
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

              {errors.anio && (
                <p className="form-error">
                  {errors.anio.message}
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