const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const multer = require('multer')

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'provs')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const limpiarNombre = (valor) => {
  return String(valor || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const base = limpiarNombre(path.basename(file.originalname || 'prov', ext))
    const token = crypto.randomBytes(6).toString('hex')
    const timestamp = Date.now()

    cb(null, `${base}_${timestamp}_${token}${ext || '.pdf'}`)
  },
})

const fileFilter = (_req, file, cb) => {
  const isPdf =
    file.mimetype === 'application/pdf' ||
    path.extname(file.originalname || '').toLowerCase() === '.pdf'

  if (!isPdf) {
    return cb(new Error('Solo se permiten archivos PDF'))
  }

  cb(null, true)
}

const uploadProvs = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 30,
  },
})

module.exports = uploadProvs