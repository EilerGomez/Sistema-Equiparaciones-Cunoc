const router   = require('express').Router()
const multer   = require('multer')
const path     = require('path')
const { authenticate } = require('../middlewares/auth.middleware')
const { leerConstancia } = require('../controllers/constancia.controller')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(__dirname, '../../uploads'))
  },
  filename: (_req, file, cb) => {
    const unique = `constancia_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`
    cb(null, unique)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true)
    cb(new Error('Solo se aceptan archivos PDF'))
  },
})

// POST /api/auth/constancia
router.post('/', authenticate, upload.single('constancia'), leerConstancia)

module.exports = router