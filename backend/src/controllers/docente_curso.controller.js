const DocenteCursoModel = require('../models/docente_curso.model')

const getAll = async (_req, res) => {
  try {
    res.json(await DocenteCursoModel.findAll())
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const getByCiclo = async (req, res) => {
  try {
    res.json(await DocenteCursoModel.findByCiclo(req.params.id_ciclo))
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const create = async (req, res) => {
  try {
    const { id_curso, id_docente, id_ciclo, activo = 0 } = req.body

    if (!id_curso || !id_docente || !id_ciclo) {
      return res.status(400).json({
        message: 'id_curso, id_docente e id_ciclo son obligatorios',
      })
    }

    const exists = await DocenteCursoModel.exists({
      id_curso,
      id_docente,
      id_ciclo,
    })

    if (exists) {
      return res.status(409).json({
        message: 'Ya existe esa asignación',
      })
    }

    await DocenteCursoModel.create({
      id_curso,
      id_docente,
      id_ciclo,
      activo,
    })

    res.status(201).json({
      message: 'Asignación creada',
      id_curso,
      id_docente,
      id_ciclo,
      activo,
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        message: 'Alguna referencia no existe. Revise curso, docente o ciclo.',
      })
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Ya existe esa asignación',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const update = async (req, res) => {
  try {
    const {
      old_id_curso,
      old_id_docente,
      old_id_ciclo,
      id_curso,
      id_docente,
      id_ciclo,
      activo = 0,
    } = req.body

    if (
      !old_id_curso ||
      !old_id_docente ||
      !old_id_ciclo ||
      !id_curso ||
      !id_docente ||
      !id_ciclo
    ) {
      return res.status(400).json({
        message: 'Faltan datos para actualizar la asignación',
      })
    }

    const affected = await DocenteCursoModel.update({
      old_id_curso,
      old_id_docente,
      old_id_ciclo,
      id_curso,
      id_docente,
      id_ciclo,
      activo,
    })

    if (!affected) {
      return res.status(404).json({
        message: 'Asignación no encontrada',
      })
    }

    res.json({
      message: 'Asignación actualizada',
      id_curso,
      id_docente,
      id_ciclo,
      activo,
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        message: 'Alguna referencia no existe. Revise curso, docente o ciclo.',
      })
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Ya existe esa asignación',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const updateActivo = async (req, res) => {
  try {
    const { id_curso, id_docente, id_ciclo, activo } = req.body

    if (!id_curso || !id_docente || !id_ciclo || activo === undefined) {
      return res.status(400).json({
        message: 'id_curso, id_docente, id_ciclo y activo son obligatorios',
      })
    }

    const affected = await DocenteCursoModel.updateActivo({
      id_curso,
      id_docente,
      id_ciclo,
      activo,
    })

    if (!affected) {
      return res.status(404).json({
        message: 'Asignación no encontrada',
      })
    }

    res.json({
      message: 'Estado actualizado',
      id_curso,
      id_docente,
      id_ciclo,
      activo,
      affected,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const updateActivoByCiclo = async (req, res) => {
  try {
    const { id_ciclo } = req.params
    const { activo } = req.body

    if (!id_ciclo || activo === undefined) {
      return res.status(400).json({
        message: 'id_ciclo y activo son obligatorios',
      })
    }

    const affected = await DocenteCursoModel.updateActivoByCiclo({
      id_ciclo,
      activo,
    })

    res.json({
      message: Number(activo) === 1
        ? 'Asignaciones activadas por ciclo'
        : 'Asignaciones desactivadas por ciclo',
      id_ciclo: Number(id_ciclo),
      activo: Number(activo),
      affected,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const remove = async (req, res) => {
  try {
    const { id_curso, id_docente, id_ciclo } = req.body

    if (!id_curso || !id_docente || !id_ciclo) {
      return res.status(400).json({
        message: 'id_curso, id_docente e id_ciclo son obligatorios',
      })
    }

    const affected = await DocenteCursoModel.delete({
      id_curso,
      id_docente,
      id_ciclo,
    })

    if (!affected) {
      return res.status(404).json({
        message: 'Asignación no encontrada',
      })
    }

    res.json({
      message: 'Asignación eliminada',
      affected,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const removeByCiclo = async (req, res) => {
  try {
    const { id_ciclo } = req.params

    if (!id_ciclo) {
      return res.status(400).json({
        message: 'id_ciclo es obligatorio',
      })
    }

    const affected = await DocenteCursoModel.deleteByCiclo({
      id_ciclo,
    })

    res.json({
      message: 'Asignaciones eliminadas por ciclo',
      id_ciclo: Number(id_ciclo),
      affected,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

module.exports = {
  getAll,
  getByCiclo,
  create,
  update,
  updateActivo,
  updateActivoByCiclo,
  remove,
  removeByCiclo,
}