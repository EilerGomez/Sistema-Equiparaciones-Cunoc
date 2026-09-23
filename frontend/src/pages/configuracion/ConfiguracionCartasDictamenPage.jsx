import { useEffect, useState } from 'react'
import { configuracionCartasDictamenApi } from '../../api/catalogs'
import { DataTable } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'

const COLUMNS = [
  { key: 'semestre', label: 'Semestre' },
  { key: 'nombre_semestre', label: 'Nombre' },
  {
    key: 'omite_carta',
    label: 'Omitir carta',
    render: (v) => (
      <span className={`badge ${Number(v) === 1 ? 'badge-muted' : 'badge-success'}`}>
        {Number(v) === 1 ? 'Sí omite' : 'Sí imprime'}
      </span>
    ),
  },
]

const normalizarRespuesta = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

export default function ConfiguracionCartasDictamenPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const [form, setForm] = useState({
    semestre: '',
    nombre_semestre: '',
    omite_carta: 0,
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError('')

      const data = await configuracionCartasDictamenApi.getAll()
      setItems(normalizarRespuesta(data))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({
      semestre: '',
      nombre_semestre: '',
      omite_carta: 0,
    })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      semestre: row.semestre || '',
      nombre_semestre: row.nombre_semestre || '',
      omite_carta: Number(row.omite_carta) || 0,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
  }

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target

    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }))
  }

  const guardar = async (e) => {
    e.preventDefault()

    if (!form.semestre || !form.nombre_semestre.trim()) {
      setError('Debe ingresar semestre y nombre.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMensaje('')

      const body = {
        semestre: Number(form.semestre),
        nombre_semestre: form.nombre_semestre.trim(),
        omite_carta: Number(form.omite_carta) === 1,
      }

      if (editing) {
        await configuracionCartasDictamenApi.update(editing.id, body)
        setMensaje('Configuración actualizada correctamente.')
      } else {
        await configuracionCartasDictamenApi.create(body)
        setMensaje('Configuración creada correctamente.')
      }

      closeModal()
      await cargarDatos()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const toggleOmitir = async (row) => {
    try {
      setError('')
      setMensaje('')

      await configuracionCartasDictamenApi.updateOmitirCarta(row.id, {
        omite_carta: Number(row.omite_carta) === 1 ? false : true,
      })

      await cargarDatos()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al actualizar estado')
    }
  }

  const eliminar = async () => {
    if (!toDelete) return

    try {
      setSaving(true)
      setError('')
      setMensaje('')

      await configuracionCartasDictamenApi.remove(toDelete.id)
      setMensaje('Configuración eliminada correctamente.')
      setToDelete(null)
      await cargarDatos()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración de cartas</h1>
          <p className="page-sub">
            Define qué semestres generan carta para docente y cuáles solo aparecen en el dictamen.
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nueva configuración
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {mensaje && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {mensaje}
        </div>
      )}

      <DataTable
        columns={COLUMNS}
        data={items}
        loading={loading}
        canWrite={canWrite}
        onEdit={openEdit}
        onDelete={setToDelete}
        customActions={(row) => (
          <button
            type="button"
            className="btn-table btn-table-secondary"
            onClick={() => toggleOmitir(row)}
          >
            {Number(row.omite_carta) === 1 ? 'Permitir carta' : 'Omitir carta'}
          </button>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar configuración' : 'Nueva configuración'}
        width={520}
      >
        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Semestre</label>
            <input
              type="number"
              className="form-input"
              name="semestre"
              value={form.semestre}
              onChange={handleChange}
              min="1"
              max="20"
              placeholder="1"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nombre del semestre</label>
            <input
              className="form-input"
              name="nombre_semestre"
              value={form.nombre_semestre}
              onChange={handleChange}
              placeholder="Primer semestre"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Impresión de carta</label>

            <label style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-soft)' }}>
              <input
                type="checkbox"
                name="omite_carta"
                checked={Number(form.omite_carta) === 1}
                onChange={handleChange}
              />
              Omitir carta para este semestre
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-table btn-table-secondary"
              onClick={closeModal}
              disabled={saving}
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
        onConfirm={eliminar}
        message={`¿Eliminar la configuración del semestre "${toDelete?.nombre_semestre}"?`}
      />
    </div>
  )
}