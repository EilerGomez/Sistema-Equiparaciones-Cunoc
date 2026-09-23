const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../middlewares/auth.middleware')
const { handleValidation } = require('../middlewares/validate.middleware')
const estudianteCtrl = require('../controllers/estudiante.controller')

const canWrite = authorize()
const v = (rules) => [...rules, handleValidation]

router.get('/', estudianteCtrl.getAll)
router.get('/:id', estudianteCtrl.getOne)

router.post('/', canWrite, v([
  body('nombre_completo')
    .trim()
    .notEmpty()
    .withMessage('Nombre completo requerido'),

  body('carnet')
    .trim()
    .notEmpty()
    .withMessage('Carnet requerido'),

  body('registro_academico')
    .trim()
    .notEmpty()
    .withMessage('Registro académico requerido'),
]), estudianteCtrl.create)

router.put('/:id', canWrite, v([
  body('nombre_completo')
    .trim()
    .notEmpty()
    .withMessage('Nombre completo requerido'),

  body('carnet')
    .trim()
    .notEmpty()
    .withMessage('Carnet requerido'),

  body('registro_academico')
    .trim()
    .notEmpty()
    .withMessage('Registro académico requerido'),
]), estudianteCtrl.update)

router.delete('/:id', canWrite, estudianteCtrl.remove)

module.exports = router