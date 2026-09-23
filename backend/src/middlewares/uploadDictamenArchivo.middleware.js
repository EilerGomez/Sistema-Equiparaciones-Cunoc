const path   = require('path')
const fs     = require('fs')
const crypto = require('crypto')
const multer = require('multer')

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'provs')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const limpiarNombre = (valor) =>
  String(valor || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const ext   = path.extname(file.originalname || '').toLowerCase()
    const base  = limpiarNombre(path.basename(file.originalname || 'dictamen', ext))
    const token = crypto.randomBytes(6).toString('hex')
    const ts    = Date.now()
    cb(null, `${base}_${ts}_${token}${ext || '.pdf'}`)
  },
})

const fileFilter = (_req, file, cb) => {
  const isPdf =
    file.mimetype === 'application/pdf' ||
    path.extname(file.originalname || '').toLowerCase() === '.pdf'
  if (!isPdf) return cb(new Error('Solo se permiten archivos PDF'))
  cb(null, true)
}

const uploadDictamenArchivo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
})

module.exports = uploadDictamenArchivo