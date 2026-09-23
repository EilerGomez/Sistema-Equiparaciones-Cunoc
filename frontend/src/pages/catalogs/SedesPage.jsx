import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useCrud } from '../../hooks/useCrud'
import { sedesApi } from '../../api/catalogs'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
  {
    key: 'ubicacion',
    label: 'Ubicación',
    render: (value) => value || '—',
  },
]

export default function SedesPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const {
    items,
    loading,
    saving,
    create,
    update,
    remove,
  } = useCrud(sedesApi)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const openCreate = () => {
    setEditing(null)

    reset({
      nombre: '',
      ubicacion: '',
    })

    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)

    reset({
      nombre: row.nombre || '',
      ubicacion: row.ubicacion || '',
    })

    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)

    reset({
      nombre: '',
      ubicacion: '',
    })
  }

  const onSubmit = async (data) => {
    const body = {
      nombre: data.nombre.trim(),
      ubicacion: data.ubicacion?.trim() || '',
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sedes</h1>
          <p className="page-sub">
            Gestión de sedes registradas
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nueva sede
          </button>
        )}
      </div>

      <DataTable
        columns={COLUMNS}
        data={items}
        loading={loading}
        canWrite={canWrite}
        onEdit={openEdit}
        onDelete={setToDelete}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar sede' : 'Nueva sede'}
        width={520}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Nombre</label>

            <input
              className={`form-input ${errors.nombre ? 'error' : ''}`}
              placeholder="Quetzaltenango"
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
            <label className="form-label">Ubicación</label>

            <input
              className="form-input"
              placeholder="Dirección o referencia"
              {...register('ubicacion')}
            />
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

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        message={`¿Eliminar la sede "${toDelete?.nombre}"?`}
      />
    </div>
  )
}