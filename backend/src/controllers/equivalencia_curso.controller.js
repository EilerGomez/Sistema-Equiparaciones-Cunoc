const EquivalenciaCursoModel = require('../models/equivalencia_curso.model')

const getAll = async (_req, res) => {
  try {
    const rows = await EquivalenciaCursoModel.findAll()
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const getOne = async (req, res) => {
  try {
    const { id_curso_de, id_curso_a } = req.params

    const row = await EquivalenciaCursoModel.findOne({
      id_curso_de,
      id_curso_a,
    })

    if (!row) {
      return res.status(404).json({
        message: 'Equivalencia no encontrada',
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
    const { id_curso_de, id_curso_a } = req.body

    if (Number(id_curso_de) === Number(id_curso_a)) {
      return res.status(400).json({
        message: 'El curso de origen y el curso equivalente no pueden ser el mismo',
      })
    }

    const exists = await EquivalenciaCursoModel.exists({
      id_curso_de,
      id_curso_a,
    })

    if (exists) {
      return res.status(409).json({
        message: 'Esa equivalencia ya existe',
      })
    }

    await EquivalenciaCursoModel.create({
      id_curso_de,
      id_curso_a,
    })

    res.status(201).json({
      message: 'Equivalencia creada',
      id_curso_de: Number(id_curso_de),
      id_curso_a: Number(id_curso_a),
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        message: 'Uno de los cursos seleccionados no existe',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const update = async (req, res) => {
  try {
    const {
      old_id_curso_de,
      old_id_curso_a,
      id_curso_de,
      id_curso_a,
    } = req.body

    if (Number(id_curso_de) === Number(id_curso_a)) {
      return res.status(400).json({
        message: 'El curso de origen y el curso equivalente no pueden ser el mismo',
      })
    }

    const current = await EquivalenciaCursoModel.findOne({
      id_curso_de: old_id_curso_de,
      id_curso_a: old_id_curso_a,
    })

    if (!current) {
      return res.status(404).json({
        message: 'Equivalencia no encontrada',
      })
    }

    const cambioLlave =
      Number(old_id_curso_de) !== Number(id_curso_de) ||
      Number(old_id_curso_a) !== Number(id_curso_a)

    if (cambioLlave) {
      const exists = await EquivalenciaCursoModel.exists({
        id_curso_de,
        id_curso_a,
      })

      if (exists) {
        return res.status(409).json({
          message: 'Ya existe una equivalencia con esos cursos',
        })
      }
    }

    const affected = await EquivalenciaCursoModel.update({
      old_id_curso_de,
      old_id_curso_a,
      id_curso_de,
      id_curso_a,
    })

    if (!affected) {
      return res.status(404).json({
        message: 'Equivalencia no encontrada',
      })
    }

    res.json({
      message: 'Equivalencia actualizada',
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        message: 'Uno de los cursos seleccionados no existe',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const remove = async (req, res) => {
  try {
    const { id_curso_de, id_curso_a } = req.body

    const affected = await EquivalenciaCursoModel.delete({
      id_curso_de,
      id_curso_a,
    })

    if (!affected) {
      return res.status(404).json({
        message: 'Equivalencia no encontrada',
      })
    }

    res.json({
      message: 'Equivalencia eliminada',
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
  remove,
}