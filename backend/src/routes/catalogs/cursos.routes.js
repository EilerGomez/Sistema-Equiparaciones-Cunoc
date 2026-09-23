const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const { cursoCtrl } = require('../../controllers/catalogs.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get('/', async (req, res, next) => {
  // Si viene ?id_pensum, delega a findByPensum
  if (req.query.id_pensum) {
    try {
      const CursoModel = require('../../models/curso.model')
      const rows = await CursoModel.findByPensum(Number(req.query.id_pensum))
      return res.json(rows)
    } catch (err) {
      console.error('cursos?id_pensum error:', err)
      return res.status(500).json({ message: 'Error interno' })
    }
  }
  // Si no, usa el getAll normal del factory
  return cursoCtrl.getAll(req, res, next)
})
router.get('/:id', cursoCtrl.getOne)

router.post('/', canWrite, v([
  body('codigo')
    .trim()
    .notEmpty()
    .withMessage('Código requerido'),

  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('Nombre requerido'),

  body('id_pensum')
    .isInt({ min: 1 })
    .withMessage('Pensum requerido'),

  body('semestre')
    .isInt({ min: 1, max: 20 })
    .withMessage('Semestre inválido'),
]), cursoCtrl.create)

router.put('/:id', canWrite, v([
  body('codigo')
    .trim()
    .notEmpty()
    .withMessage('Código requerido'),

  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('Nombre requerido'),

  body('id_pensum')
    .isInt({ min: 1 })
    .withMessage('Pensum requerido'),

  body('semestre')
    .isInt({ min: 1, max: 20 })
    .withMessage('Semestre inválido'),
]), cursoCtrl.update)

router.delete('/:id', canWrite, cursoCtrl.remove)

module.exports = router