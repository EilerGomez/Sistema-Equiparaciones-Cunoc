const CodigoCicloModel = require('../models/codigo_ciclo.model')

const getAll = async (_req, res) => {
  try {
    const rows = await CodigoCicloModel.findAll()
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      message: 'Error interno'
    })
  }
}

const getOne = async (req, res) => {
  try {
    const row = await CodigoCicloModel.findById(req.params.id)

    if (!row) {
      return res.status(404).json({
        message: 'Código de ciclo no encontrado'
      })
    }

    res.json(row)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      message: 'Error interno'
    })
  }
}

module.exports = {
  getAll,
  getOne,
}