const fs = require('fs/promises')
const path = require('path')
const DocenteModel = require('../models/docente.model')

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads')
const UPLOAD_DIR = path.join(UPLOAD_ROOT, 'docentes')
const PUBLIC_DIR = '/uploads/docentes'

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

const eliminarArchivoLocal = async (url) => {
  if (!url) return

  const cleanUrl = String(url).split('?')[0]

  if (!cleanUrl.startsWith('/uploads/')) {
    return
  }

  const relativePath = cleanUrl.replace('/uploads/', '')
  const fullPath = path.join(UPLOAD_ROOT, relativePath)

  const resolvedRoot = path.resolve(UPLOAD_ROOT)
  const resolvedFile = path.resolve(fullPath)

  if (!resolvedFile.startsWith(resolvedRoot)) {
    return
  }

  try {
    await fs.unlink(resolvedFile)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

const eliminarFirmasAnterioresPorId = async (id) => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })

    const files = await fs.readdir(UPLOAD_DIR)
    const baseName = `firma_Docente_id_${id}`

    const filesToDelete = files.filter(file => file.startsWith(baseName + '.'))

    await Promise.all(
      filesToDelete.map(file => fs.unlink(path.join(UPLOAD_DIR, file)))
    )
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

const guardarFirma = async ({ file, id }) => {
  if (!file) return null

  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  await eliminarFirmasAnterioresPorId(id)

  const extension = obtenerExtension(file)
  const fileName = `firma_Docente_id_${id}${extension}`
  const fullPath = path.join(UPLOAD_DIR, fileName)

  await fs.writeFile(fullPath, file.buffer)

  return `${PUBLIC_DIR}/${fileName}`
}

const docenteCtrl = {
  async getAll(_req, res) {
    try {
      const rows = await DocenteModel.findAll()
      res.json(rows)
    } catch (error) {
      res.status(500).json({
        message: 'Error al obtener docentes',
        error: error.message,
      })
    }
  },

  async getOne(req, res) {
    try {
      const row = await DocenteModel.findById(req.params.id)

      if (!row) {
        return res.status(404).json({
          message: 'Docente no encontrado',
        })
      }

      res.json(row)
    } catch (error) {
      res.status(500).json({
        message: 'Error al obtener docente',
        error: error.message,
      })
    }
  },

  async create(req, res) {
    try {
      const { codigo, nombre, telefono, correo, id_profesion } = req.body

      const id = await DocenteModel.create({
        codigo,
        nombre,
        telefono,
        correo,
        id_profesion,
      })

      const url_firma = await guardarFirma({
        file: req.file,
        id,
      })

      if (url_firma) {
        await DocenteModel.updateFirma(id, url_firma)
      }

      const created = await DocenteModel.findById(id)

      res.status(201).json({
        message: 'Docente creado correctamente',
        data: created,
      })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          message: 'Código, nombre o correo ya existe',
        })
      }

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
          message: 'La profesión seleccionada no existe',
        })
      }

      res.status(500).json({
        message: 'Error al crear docente',
        error: error.message,
      })
    }
  },

  async update(req, res) {
    try {
      const id = Number(req.params.id)
      const actual = await DocenteModel.findById(id)

      if (!actual) {
        return res.status(404).json({
          message: 'Docente no encontrado',
        })
      }

      const { codigo, nombre, telefono, correo, id_profesion } = req.body

      await DocenteModel.update(id, {
        codigo,
        nombre,
        telefono,
        correo,
        id_profesion,
      })

      if (req.file) {
        const url_firma = await guardarFirma({
          file: req.file,
          id,
        })

        await DocenteModel.updateFirma(id, url_firma)
      }

      const updated = await DocenteModel.findById(id)

      res.json({
        message: 'Docente actualizado correctamente',
        data: updated,
      })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          message: 'Código, nombre o correo ya existe',
        })
      }

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
          message: 'La profesión seleccionada no existe',
        })
      }

      res.status(500).json({
        message: 'Error al actualizar docente',
        error: error.message,
      })
    }
  },

  async remove(req, res) {
    try {
      const id = Number(req.params.id)
      const actual = await DocenteModel.findById(id)

      if (!actual) {
        return res.status(404).json({
          message: 'Docente no encontrado',
        })
      }

      await eliminarArchivoLocal(actual.url_firma)
      await eliminarFirmasAnterioresPorId(id)

      await DocenteModel.delete(id)

      res.json({
        message: 'Docente eliminado correctamente',
      })
    } catch (error) {
      res.status(500).json({
        message: 'Error al eliminar docente',
        error: error.message,
      })
    }
  },
}

module.exports = docenteCtrl