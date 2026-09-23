const fs = require('fs/promises')
const path = require('path')
const AutoridadModel = require('../models/autoridad.model')

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_ROOT || path.join(__dirname, '../../uploads'))
const UPLOAD_DIR = path.join(UPLOAD_ROOT, 'autoridades')
const PUBLIC_DIR = '/uploads/autoridades'

const limpiarCodigo = (codigo) => {
  return String(codigo || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
}

const obtenerExtension = (file) => {
  const extOriginal = path.extname(file.originalname || '').toLowerCase()

  if (extOriginal) {
    return extOriginal
  }

  const mapa = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/svg+xml': '.svg',
  }

  return mapa[file.mimetype] || '.img'
}

const eliminarImagenesAnteriores = async ({ tipo, codigo, id }) => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })

    const files = await fs.readdir(UPLOAD_DIR)
    const codigoLimpio = limpiarCodigo(codigo)
    const baseName = `${tipo}_autoridad_${codigoLimpio}_${id}`

    const filesToDelete = files.filter(file => {
      return file.startsWith(baseName + '.')
    })

    await Promise.all(
      filesToDelete.map(file => fs.unlink(path.join(UPLOAD_DIR, file)))
    )
  } catch (_error) {}
}

const guardarImagen = async ({ file, tipo, codigo, id }) => {
  if (!file) return null

  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  await eliminarImagenesAnteriores({
    tipo,
    codigo,
    id,
  })

  const codigoLimpio = limpiarCodigo(codigo)
  const extension = obtenerExtension(file)
  const fileName = `${tipo}_autoridad_${codigoLimpio}_${id}${extension}`
  const fullPath = path.join(UPLOAD_DIR, fileName)

  await fs.writeFile(fullPath, file.buffer)

  return `${PUBLIC_DIR}/${fileName}`
}

const eliminarArchivoLocal = async (url) => {
  if (!url) return

  try {
    const cleanUrl = String(url).split('?')[0]
    const relativePath = cleanUrl.replace('/uploads/', '')
    const fullPath = path.join(UPLOAD_ROOT, relativePath)

    await fs.unlink(fullPath)
  } catch (_error) {}
}

const getFile = (req, field) => {
  return req.files && req.files[field] && req.files[field][0]
    ? req.files[field][0]
    : null
}

const autoridadCtrl = {
  async getAll(_req, res) {
    try {
      const rows = await AutoridadModel.findAll()
      res.json(rows)
    } catch (error) {
      res.status(500).json({
        message: 'Error al obtener autoridades',
        error: error.message,
      })
    }
  },

  async getOne(req, res) {
    try {
      const row = await AutoridadModel.findById(req.params.id)

      if (!row) {
        return res.status(404).json({
          message: 'Autoridad no encontrada',
        })
      }

      res.json(row)
    } catch (error) {
      res.status(500).json({
        message: 'Error al obtener autoridad',
        error: error.message,
      })
    }
  },

  async create(req, res) {
    try {
      const { codigo, descripcion, nombre, id_profesion } = req.body

      const id = await AutoridadModel.create({
        codigo,
        descripcion,
        nombre,
        id_profesion,
      })

      const firma = getFile(req, 'firma')
      const sello = getFile(req, 'sello')

      const url_firma = await guardarImagen({
        file: firma,
        tipo: 'firma',
        codigo,
        id,
      })

      const url_sello = await guardarImagen({
        file: sello,
        tipo: 'sello',
        codigo,
        id,
      })

      if (url_firma || url_sello) {
        await AutoridadModel.updateImages(id, {
          url_firma: url_firma || undefined,
          url_sello: url_sello || undefined,
        })
      }

      const created = await AutoridadModel.findById(id)

      res.status(201).json({
        message: 'Autoridad creada correctamente',
        data: created,
      })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          message: 'Código de autoridad ya existe',
        })
      }

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
          message: 'La profesión seleccionada no existe',
        })
      }

      res.status(500).json({
        message: 'Error al crear autoridad',
        error: error.message,
      })
    }
  },

  async update(req, res) {
    try {
      const id = Number(req.params.id)
      const actual = await AutoridadModel.findById(id)

      if (!actual) {
        return res.status(404).json({
          message: 'Autoridad no encontrada',
        })
      }

      const { descripcion, nombre, id_profesion } = req.body

      await AutoridadModel.update(id, {
        descripcion,
        nombre,
        id_profesion,
      })

      const firma = getFile(req, 'firma')
      const sello = getFile(req, 'sello')

      const url_firma = await guardarImagen({
        file: firma,
        tipo: 'firma',
        codigo: actual.codigo,
        id,
      })

      const url_sello = await guardarImagen({
        file: sello,
        tipo: 'sello',
        codigo: actual.codigo,
        id,
      })

      if (url_firma || url_sello) {
        await AutoridadModel.updateImages(id, {
          url_firma: url_firma || undefined,
          url_sello: url_sello || undefined,
        })
      }

      const updated = await AutoridadModel.findById(id)

      res.json({
        message: 'Autoridad actualizada correctamente',
        data: updated,
      })
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
          message: 'La profesión seleccionada no existe',
        })
      }

      res.status(500).json({
        message: 'Error al actualizar autoridad',
        error: error.message,
      })
    }
  },

  async delete(req, res) {
    try {
      const id = Number(req.params.id)
      const actual = await AutoridadModel.findById(id)

      if (!actual) {
        return res.status(404).json({
          message: 'Autoridad no encontrada',
        })
      }

      await AutoridadModel.delete(id)

      await eliminarArchivoLocal(actual.url_firma)
      await eliminarArchivoLocal(actual.url_sello)

      res.json({
        message: 'Autoridad eliminada correctamente',
      })
    } catch (error) {
      res.status(500).json({
        message: 'Error al eliminar autoridad',
        error: error.message,
      })
    }
  },
}

module.exports = autoridadCtrl
