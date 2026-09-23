const multer = require('multer')

const storage = multer.memoryStorage()

const fileFilter = (_req, file, cb) => {
  if (!['image/png','image/jpeg'].includes(file.mimetype)) {
    return cb(Object.assign(new Error('Solo se permiten firmas y sellos PNG o JPG'), {status:400}))
  }

  cb(null, true)
}

const uploadAutoridad = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).fields([
  { name: 'firma', maxCount: 1 },
  { name: 'sello', maxCount: 1 },
])

module.exports = uploadAutoridad