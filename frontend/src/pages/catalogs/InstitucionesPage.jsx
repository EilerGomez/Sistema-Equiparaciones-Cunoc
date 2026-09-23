import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useCrud } from '../../hooks/useCrud'
import { institucionesApi } from '../../api/catalogs'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'

const COLUMNS = [
  { key: 'id',     label: 'ID' },
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre' },
]

export default function InstitucionesPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)
  const { items, loading, saving, create, update, remove } = useCrud(institucionesApi)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [toDelete,  setToDelete]  = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const openCreate = () => { 
    setEditing(null); 
    reset({}); 
    setModalOpen(true);
     reset({ codigo: '', nombre: '' }) 
  }
  const openEdit   = (row) => { setEditing(row); reset(row); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const onSubmit = async (data) => {
    const ok = editing ? await update(editing.id, data) : await create(data)
    if (ok) closeModal()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Instituciones</h1>
          <p className="page-sub">Universidades y centros registrados</p>
        </div>
        {canWrite && <button className="btn-add" onClick={openCreate}>+ Nueva institución</button>}
      </div>

      <DataTable columns={COLUMNS} data={items} loading={loading}
        canWrite={canWrite} onEdit={openEdit} onDelete={setToDelete} />

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar institución' : 'Nueva institución'}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Código</label>
            <input className={`form-input ${errors.codigo ? 'error' : ''}`}
              placeholder="USAC" disabled={!!editing}
              {...register('codigo', { required: 'Requerido' })} />
            {errors.codigo && <p className="form-error">⚠ {errors.codigo.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className={`form-input ${errors.nombre ? 'error' : ''}`}
              placeholder="Universidad de San Carlos de Guatemala"
              {...register('nombre', { required: 'Requerido' })} />
            {errors.nombre && <p className="form-error">⚠ {errors.nombre.message}</p>}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-table btn-table-secondary" onClick={closeModal}>Cancelar</button>
            <button type="submit" className="btn-table btn-table-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>


    </div>
  )
}
