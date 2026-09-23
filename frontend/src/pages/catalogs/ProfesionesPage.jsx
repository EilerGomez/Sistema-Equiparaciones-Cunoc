import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useCrud } from '../../hooks/useCrud'
import { profesionesApi } from '../../api/catalogs'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'

const COLUMNS = [
  { key: 'id',      label: 'ID' },
  { key: 'nombre',  label: 'Nombre' },
  { key: 'subfijo', label: 'Subfijo' },
]

export default function ProfesionesPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)
  const { items, loading, saving, create, update, remove } = useCrud(profesionesApi)

  const [modalOpen, setModalOpen]     = useState(false)
  const [editing,   setEditing]       = useState(null)
  const [toDelete,  setToDelete]      = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit   = (row) => { setEditing(row); reset(row); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const onSubmit = async (data) => {
    const ok = editing
      ? await update(editing.id, data)
      : await create(data)
    if (ok) closeModal()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profesiones</h1>
          <p className="page-sub">Títulos y subfijos académicos</p>
        </div>
        {canWrite && (
          <button className="btn-add" onClick={openCreate}>+ Nueva profesión</button>
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar profesión' : 'Nueva profesión'}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className={`form-input ${errors.nombre ? 'error' : ''}`}
              placeholder="Ingeniero, Licenciado, Doctor"
              {...register('nombre', { required: 'Requerido' })} />
            {errors.nombre && <p className="form-error">⚠ {errors.nombre.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Subfijo</label>
            <input className={`form-input ${errors.subfijo ? 'error' : ''}`}
              placeholder="Ing., Lic., Dr."
              {...register('subfijo', { required: 'Requerido' })} />
            {errors.subfijo && <p className="form-error">⚠ {errors.subfijo.message}</p>}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-table btn-table-secondary" onClick={closeModal}>Cancelar</button>
            <button type="submit" className="btn-table btn-table-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await remove(toDelete.id); setToDelete(null) }}
        message={`¿Eliminar la profesión "${toDelete?.nombre}"?`}
      />
    </div>
  )
}
