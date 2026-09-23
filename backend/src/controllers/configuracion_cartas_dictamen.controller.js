const ConfiguracionCartasDictamenModel = require('../models/configuracion_cartas_dictamen.model')

const getAll = async (_req, res) => {
  try {
    res.json(await ConfiguracionCartasDictamenModel.findAll())
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const getOne = async (req, res) => {
  try {
    const row = await ConfiguracionCartasDictamenModel.findById(req.params.id)

    if (!row) {
      return res.status(404).json({
        message: 'Configuración no encontrada',
      })
    }

    res.json(row)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const create = async (req, res) => {
  try {
    const id = await ConfiguracionCartasDictamenModel.create(req.body)
    const row = await ConfiguracionCartasDictamenModel.findById(id)

    res.status(201).json({
      message: 'Configuración creada',
      data: row,
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Ya existe configuración para ese semestre',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const update = async (req, res) => {
  try {
    const affected = await ConfiguracionCartasDictamenModel.update(req.params.id, req.body)

    if (!affected) {
      return res.status(404).json({
        message: 'Configuración no encontrada',
      })
    }

    const row = await ConfiguracionCartasDictamenModel.findById(req.params.id)

    res.json({
      message: 'Configuración actualizada',
      data: row,
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Ya existe configuración para ese semestre',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const updateOmitirCarta = async (req, res) => {
  try {
    const affected = await ConfiguracionCartasDictamenModel.updateOmitirCarta(
      req.params.id,
      req.body
    )

    if (!affected) {
      return res.status(404).json({
        message: 'Configuración no encontrada',
      })
    }

    const row = await ConfiguracionCartasDictamenModel.findById(req.params.id)

    res.json({
      message: 'Estado de impresión actualizado',
      data: row,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const remove = async (req, res) => {
  try {
    const affected = await ConfiguracionCartasDictamenModel.delete(req.params.id)

    if (!affected) {
      return res.status(404).json({
        message: 'Configuración no encontrada',
      })
    }

    res.json({
      message: 'Configuración eliminada',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  updateOmitirCarta,
  remove,
}