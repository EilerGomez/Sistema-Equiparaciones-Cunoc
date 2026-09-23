const fs = require('fs')
const path = require('path')
const DictamenModel = require('../models/dictamen.model')

const getRutaArchivoLocal = (urlArchivo) => {
  if (!urlArchivo) return null

  const clean = String(urlArchivo).trim()

  if (!clean) return null

  let pathname = clean

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      pathname = new URL(clean).pathname
    } catch (_) {
      pathname = clean
    }
  }

  const sinQuery = pathname.split('?')[0]
  const normalizado = decodeURIComponent(sinQuery).replace(/^\/+/, '')

  if (!normalizado.startsWith('uploads/')) {
    return null
  }

  return path.join(__dirname, '..', '..', normalizado)
}

const eliminarArchivoFisico = async (urlArchivo) => {
  const ruta = getRutaArchivoLocal(urlArchivo)

  if (!ruta) return false

  try {
    if (fs.existsSync(ruta)) {
      await fs.promises.unlink(ruta)
      return true
    }

    return false
  } catch (err) {
    console.error('Error eliminando archivo físico:', err)
    return false
  }
}

const getAll = async (req, res) => {
  try {
    const result = await DictamenModel.findAll({
      q: req.query.q || '',
      fecha_desde: req.query.fecha_desde || '',
      fecha_hasta: req.query.fecha_hasta || '',
      estado:      req.query.estado || '',
      page: req.query.page || 1,
      limit: req.query.limit || 20,
    })

    res.json({
      data: result.rows,
      meta: result.meta,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const getOne = async (req, res) => {
  try {
    const dictamen = await DictamenModel.findById(req.params.id)

    if (!dictamen) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }

    res.json(dictamen)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const create = async (req, res) => {
  try {
    const result = await DictamenModel.createWithCursos(req.body)
    const dictamen = await DictamenModel.findById(result.id)

    res.status(201).json({
      message: 'Dictamen creado',
      data: dictamen,
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        message: 'Alguna referencia no existe. Revise estudiante, carreras, pensums, instituciones, autoridades, cursos o docentes.',
      })
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Ya existe un dato duplicado en el dictamen',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const update = async (req, res) => {
  try {
    const affected = await DictamenModel.updateWithCursos(req.params.id, req.body)

    if (!affected) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }

    const dictamen = await DictamenModel.findById(req.params.id)

    res.json({
      message: 'Dictamen actualizado',
      data: dictamen,
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        message: 'Alguna referencia no existe. Revise estudiante, carreras, pensums, instituciones, autoridades, cursos o docentes.',
      })
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Ya existe un curso repetido dentro del dictamen',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const remove = async (req, res) => {
  try {
    const dictamen = await DictamenModel.findById(req.params.id)

    if (!dictamen) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }

    await eliminarArchivoFisico(dictamen.url_archivo)

    const affected = await DictamenModel.delete(req.params.id)

    if (!affected) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }

    res.json({
      message: 'Dictamen eliminado',
    })
  } catch (err) {
    console.error(err)

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        message: 'No se puede eliminar el dictamen porque tiene registros relacionados.',
      })
    }

    res.status(500).json({ message: 'Error interno' })
  }
}

const updateObservaciones = async (req, res) => {
  try {
    const affected = await DictamenModel.updateObservaciones(
      req.params.id,
      req.body.observaciones
    )

    if (!affected) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }

    const dictamen = await DictamenModel.findById(req.params.id)

    res.json({
      message: 'Observaciones actualizadas',
      data: dictamen,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const eliminarArchivo = async (req, res) => {
  try {
    const dictamen = await DictamenModel.findById(req.params.id)

    if (!dictamen) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }

    if (!dictamen.url_archivo) {
      return res.status(400).json({
        message: 'El dictamen no tiene archivo asociado',
      })
    }

    await eliminarArchivoFisico(dictamen.url_archivo)

    const affected = await DictamenModel.updateArchivo(req.params.id, null)

    if (!affected) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }

    const actualizado = await DictamenModel.findById(req.params.id)

    res.json({
      message: 'Archivo eliminado',
      data: actualizado,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const marcarImpresionDictamen = async (req, res) => {
  try {
    const affected = await DictamenModel.marcarImpresionDictamen(req.params.id)

    if (!affected) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }

    const dictamen = await DictamenModel.findById(req.params.id)

    res.json({
      message: 'Fecha de impresión del dictamen actualizada',
      data: dictamen,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const marcarImpresionCartas = async (req, res) => {
  try {
    const affected = await DictamenModel.marcarImpresionCartas({
      id_dictamen: req.params.id,
      id_docente_encargado_curso: req.body.id_docente_encargado_curso || null,
    })

    if (!affected) {
      return res.status(404).json({
        message: 'No se encontraron cursos imprimibles para actualizar',
      })
    }

    res.json({
      message: 'Fecha de impresión de cartas actualizada',
      affected,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const getCartasPorDocente = async (req, res) => {
  try {
    const dictamen = await DictamenModel.findById(req.params.id)

    if (!dictamen) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }

    const cartas = await DictamenModel.findCartasPorDocente(req.params.id)
    const omitidos = await DictamenModel.findCursosOmitidosCarta(req.params.id)

    res.json({
      dictamen,
      cartas,
      omitidos,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}

const updateEstado = async (req, res) => {
  try {
    const { estado } = req.body
    const estadosValidos = ['PENDIENTE', 'ENVIADO', 'RECHAZADO', 'ACEPTADO', 'LISTO']
 
    if (!estadosValidos.includes(String(estado || '').toUpperCase())) {
      return res.status(400).json({
        message: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`,
      })
    }
 
    const affected = await DictamenModel.updateEstado(
      req.params.id,
      String(estado).toUpperCase()
    )
 
    if (!affected) {
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }
 
    const dictamen = await DictamenModel.findById(req.params.id)
 
    res.json({
      message: 'Estado actualizado',
      data: dictamen,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno' })
  }
}
 
const subirArchivoDictamen = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Debes adjuntar un archivo PDF' })
    }
 
    const dictamen = await DictamenModel.findById(req.params.id)
    if (!dictamen) {
      // Borra el archivo recién subido si el dictamen no existe
      try { fs.unlinkSync(req.file.path) } catch (_) {}
      return res.status(404).json({ message: 'Dictamen no encontrado' })
    }
 
    // Si ya tenía un archivo anterior, lo elimina del disco
    if (dictamen.url_archivo) {
      await eliminarArchivoFisico(dictamen.url_archivo)
    }
 
    // Construye la URL relativa igual que en cargarProvs
    const nombre    = path.basename(req.file.path)
    const urlArchivo = `/uploads/provs/${nombre}`
 
    await DictamenModel.updateArchivo(req.params.id, urlArchivo)
 
    const actualizado = await DictamenModel.findById(req.params.id)
 
    res.json({
      message:    'Archivo actualizado correctamente',
      url_archivo: urlArchivo,
      data:        actualizado,
    })
  } catch (err) {
    console.error('subirArchivoDictamen error:', err)
    if (req.file?.path) try { fs.unlinkSync(req.file.path) } catch (_) {}
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}



module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  updateObservaciones,
  eliminarArchivo,
  marcarImpresionDictamen,
  marcarImpresionCartas,
  getCartasPorDocente,
  updateEstado,
  subirArchivoDictamen,
}