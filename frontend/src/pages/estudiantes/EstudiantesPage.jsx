import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useCrud } from '../../hooks/useCrud'
import { estudiantesApi } from '../../api/estudiantes'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'nombre_completo', label: 'Nombre completo' },
  { key: 'carnet', label: 'Carnet' },
  { key: 'registro_academico', label: 'Registro académico' },
]

export default function EstudiantesPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const {
    items,
    loading,
    saving,
    create,
    update,
    remove,
  } = useCrud(estudiantesApi)

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
      nombre_completo: '',
      carnet: '',
      registro_academico: '',
    })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    reset({
      nombre_completo: row.nombre_completo || '',
      carnet: row.carnet || '',
      registro_academico: row.registro_academico || '',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const onSubmit = async (data) => {
    const body = {
      nombre_completo: data.nombre_completo.trim(),
      carnet: data.carnet.trim(),
      registro_academico: data.registro_academico.trim(),
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
          <h1 className="page-title">Estudiantes</h1>
          <p className="page-sub">
            Registro de estudiantes para dictámenes de equivalencias.
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nuevo estudiante
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
        title={editing ? 'Editar estudiante' : 'Nuevo estudiante'}
        width={560}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input
              className={`form-input ${errors.nombre_completo ? 'error' : ''}`}
              {...register('nombre_completo', { required: 'Requerido' })}
            />
            {errors.nombre_completo && (
              <p className="form-error">{errors.nombre_completo.message}</p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Carnet</label>
              <input
                className={`form-input ${errors.carnet ? 'error' : ''}`}
                {...register('carnet', { required: 'Requerido' })}
              />
              {errors.carnet && (
                <p className="form-error">{errors.carnet.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Registro académico</label>
              <input
                className={`form-input ${errors.registro_academico ? 'error' : ''}`}
                {...register('registro_academico', { required: 'Requerido' })}
              />
              {errors.registro_academico && (
                <p className="form-error">{errors.registro_academico.message}</p>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-table btn-table-secondary" onClick={closeModal}>
              Cancelar
            </button>

            <button type="submit" className="btn-table btn-table-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await remove(toDelete.id)
          setToDelete(null)
        }}
        message={`¿Eliminar al estudiante "${toDelete?.nombre_completo}"?`}
      />
    </div>
  )
}