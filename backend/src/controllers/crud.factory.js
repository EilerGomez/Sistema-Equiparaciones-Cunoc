// Factory que genera controladores CRUD estándar para cualquier modelo
// que tenga: findAll, findById/findByCodigo, create, update, delete

const makeCrudController = (Model, {
  pk = 'id',          // nombre del parámetro en la ruta (:id, :codigo)
  findOne = null,     // nombre del método findBy... si no es findById
  notFoundMsg = 'Registro no encontrado',
  dupMsg = 'Ya existe un registro con ese valor único',
} = {}) => {

  const getOne = findOne
    ? (key) => Model[findOne](key)
    : (key) => Model.findById(key)

  return {
    getAll: async (_req, res) => {
      try {
        const data = await Model.findAll()
        res.json(data)
      } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Error interno' })
      }
    },

    getOne: async (req, res) => {
      try {
        const item = await getOne(req.params[pk])
        if (!item) return res.status(404).json({ message: notFoundMsg })
        res.json(item)
      } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Error interno' })
      }
    },

    create: async (req, res) => {
      try {
        const newId = await Model.create(req.body)
        const item  = await getOne(newId)
        res.status(201).json(item)
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: dupMsg })
        }
        console.error(err)
        res.status(500).json({ message: 'Error interno' })
      }
    },

    update: async (req, res) => {
      try {
        const key      = req.params[pk]
        const affected = await Model.update(key, req.body)
        if (!affected) return res.status(404).json({ message: notFoundMsg })
        const item = await getOne(key)
        res.json(item)
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: dupMsg })
        }
        console.error(err)
        res.status(500).json({ message: 'Error interno' })
      }
    },

    remove: async (req, res) => {
      try {
        const affected = await Model.delete(req.params[pk])
        if (!affected) return res.status(404).json({ message: notFoundMsg })
        res.json({ message: 'Eliminado correctamente' })
      } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
          return res.status(409).json({
            message: 'No se puede eliminar: tiene registros relacionados',
          })
        }
        console.error(err)
        res.status(500).json({ message: 'Error interno' })
      }
    },
  }
}

module.exports = makeCrudController
