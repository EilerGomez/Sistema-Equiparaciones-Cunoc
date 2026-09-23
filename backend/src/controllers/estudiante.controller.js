const EstudianteModel = require('../models/estudiante.model')

const getAll = async (_req, res) => {
  try {
    res.json(await EstudianteModel.findAll())
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const getOne = async (req, res) => {
  try {
    const estudiante = await EstudianteModel.findById(req.params.id)

    if (!estudiante) {
      return res.status(404).json({ message: 'Estudiante no encontrado' })
    }

    res.json(estudiante)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const create = async (req, res) => {
  try {
    const id = await EstudianteModel.create(req.body)
    const estudiante = await EstudianteModel.findById(id)

    res.status(201).json({
      message: 'Estudiante creado',
      data: estudiante,
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'El carnet o registro académico ya existe',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const update = async (req, res) => {
  try {
    const affected = await EstudianteModel.update(req.params.id, req.body)

    if (!affected) {
      return res.status(404).json({ message: 'Estudiante no encontrado' })
    }

    const estudiante = await EstudianteModel.findById(req.params.id)

    res.json({
      message: 'Estudiante actualizado',
      data: estudiante,
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'El carnet o registro académico ya existe',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const remove = async (req, res) => {
  try {
    const affected = await EstudianteModel.delete(req.params.id)

    if (!affected) {
      return res.status(404).json({ message: 'Estudiante no encontrado' })
    }

    res.json({ message: 'Estudiante eliminado' })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        message: 'No se puede eliminar porque el estudiante tiene dictámenes asociados',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
}