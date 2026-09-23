const CursoModel = require('../models/curso.model')

const handleError = (err, res) => {
  console.error(err)

  if (err.code === 'DUP_CURSO_PENSUM') {
    return res.status(409).json({
      message: err.message || 'Ese curso ya está registrado en ese pensum'
    })
  }

  if (err.code === 'BAD_KEY') {
    return res.status(400).json({
      message: err.message || 'Identificador inválido'
    })
  }

  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({
      message: err.message || 'Curso no encontrado'
    })
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      message: 'Código de curso duplicado'
    })
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      message: 'El pensum seleccionado no existe'
    })
  }

  return res.status(500).json({
    message: 'Error interno'
  })
}

const getAll = async (_req, res) => {
  try {
    const rows = await CursoModel.findAll()
    res.json(rows)
  } catch (err) {
    handleError(err, res)
  }
}

const getOne = async (req, res) => {
  try {
    const row = await CursoModel.findById(req.params.id)

    if (!row) {
      return res.status(404).json({
        message: 'Curso no encontrado'
      })
    }

    res.json(row)
  } catch (err) {
    handleError(err, res)
  }
}

const getByPensum = async (req, res) => {
  try {
    const rows = await CursoModel.findByPensum(req.params.id_pensum)
    res.json(rows)
  } catch (err) {
    handleError(err, res)
  }
}

const create = async (req, res) => {
  try {
    const { codigo, nombre, id_pensum, semestre } = req.body

    if (!codigo || !nombre || !id_pensum || !semestre) {
      return res.status(400).json({
        message: 'Código, nombre, pensum y semestre son obligatorios'
      })
    }

    const id = await CursoModel.create({
      codigo,
      nombre,
      id_pensum,
      semestre
    })

    res.status(201).json({
      message: 'Curso registrado correctamente',
      id
    })
  } catch (err) {
    handleError(err, res)
  }
}

const update = async (req, res) => {
  try {
    const { codigo, nombre, id_pensum, semestre } = req.body

    if (!codigo || !nombre || !id_pensum || !semestre) {
      return res.status(400).json({
        message: 'Código, nombre, pensum y semestre son obligatorios'
      })
    }

    const affected = await CursoModel.update(req.params.id, {
      codigo,
      nombre,
      id_pensum,
      semestre
    })

    if (!affected) {
      return res.status(404).json({
        message: 'Curso no encontrado'
      })
    }

    res.json({
      message: 'Curso actualizado correctamente'
    })
  } catch (err) {
    handleError(err, res)
  }
}

const remove = async (req, res) => {
  try {
    const affected = await CursoModel.delete(req.params.id)

    if (!affected) {
      return res.status(404).json({
        message: 'Curso no encontrado'
      })
    }

    res.json({
      message: 'Curso eliminado correctamente del pensum'
    })
  } catch (err) {
    handleError(err, res)
  }
}

module.exports = {
  getAll,
  getOne,
  getByPensum,
  create,
  update,
  remove
}