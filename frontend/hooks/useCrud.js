import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

export const useCrud = (apiObj, { pkField = 'id' } = {}) => {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiObj.getAll()
      setItems(data)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [apiObj])

  useEffect(() => { load() }, [load])

  const create = async (body) => {
    setSaving(true)
    try {
      const item = await apiObj.create(body)
      setItems(prev => [...prev, item])
      toast.success('Creado correctamente')
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear')
      return false
    } finally {
      setSaving(false)
    }
  }

  const update = async (id, body) => {
    setSaving(true)
    try {
      const item = await apiObj.update(id, body)
      setItems(prev => prev.map(i => i[pkField] === id ? item : i))
      toast.success('Actualizado correctamente')
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar')
      return false
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    try {
      await apiObj.remove(id)
      setItems(prev => prev.filter(i => i[pkField] !== id))
      toast.success('Eliminado correctamente')
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se puede eliminar')
      return false
    }
  }

  return { items, loading, saving, load, create, update, remove }
}
