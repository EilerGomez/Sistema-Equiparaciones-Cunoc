const multer = require('multer')

const storage = multer.memoryStorage()

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Solo se permiten archivos de imagen'))
  }

  cb(null, true)
}

const uploadDocente = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single('firma')

module.exports = uploadDocente