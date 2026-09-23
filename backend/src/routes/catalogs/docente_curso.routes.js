const router = require('express').Router()
const { body, param } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const dcCtrl = require('../../controllers/docente_curso.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get('/', dcCtrl.getAll)

router.get(
  '/ciclo/:id_ciclo',
  [
    param('id_ciclo')
      .isInt({ min: 1 })
      .withMessage('Ciclo inválido'),

    handleValidation,
  ],
  dcCtrl.getByCiclo
)

router.post('/', canWrite, v([
  body('id_curso')
    .trim()
    .notEmpty()
    .withMessage('Curso requerido'),

  body('id_docente')
    .isInt({ min: 1 })
    .withMessage('Docente requerido')
    .toInt(),

  body('id_ciclo')
    .isInt({ min: 1 })
    .withMessage('Ciclo requerido')
    .toInt(),

  body('activo')
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage('Activo debe ser 0 o 1')
    .toInt(),
]), dcCtrl.create)

router.put('/', canWrite, v([
  body('old_id_curso')
    .trim()
    .notEmpty()
    .withMessage('Curso anterior requerido'),

  body('old_id_docente')
    .isInt({ min: 1 })
    .withMessage('Docente anterior requerido')
    .toInt(),

  body('old_id_ciclo')
    .isInt({ min: 1 })
    .withMessage('Ciclo anterior requerido')
    .toInt(),

  body('id_curso')
    .trim()
    .notEmpty()
    .withMessage('Curso requerido'),

  body('id_docente')
    .isInt({ min: 1 })
    .withMessage('Docente requerido')
    .toInt(),

  body('id_ciclo')
    .isInt({ min: 1 })
    .withMessage('Ciclo requerido')
    .toInt(),

  body('activo')
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage('Activo debe ser 0 o 1')
    .toInt(),
]), dcCtrl.update)

router.patch('/activo', canWrite, v([
  body('id_curso')
    .trim()
    .notEmpty()
    .withMessage('Curso requerido'),

  body('id_docente')
    .isInt({ min: 1 })
    .withMessage('Docente requerido')
    .toInt(),

  body('id_ciclo')
    .isInt({ min: 1 })
    .withMessage('Ciclo requerido')
    .toInt(),

  body('activo')
    .isInt({ min: 0, max: 1 })
    .withMessage('Activo debe ser 0 o 1')
    .toInt(),
]), dcCtrl.updateActivo)

router.patch('/ciclo/:id_ciclo/activo', canWrite, v([
  param('id_ciclo')
    .isInt({ min: 1 })
    .withMessage('Ciclo inválido')
    .toInt(),

  body('activo')
    .isInt({ min: 0, max: 1 })
    .withMessage('Activo debe ser 0 o 1')
    .toInt(),
]), dcCtrl.updateActivoByCiclo)

router.delete('/ciclo/:id_ciclo', canWrite, v([
  param('id_ciclo')
    .isInt({ min: 1 })
    .withMessage('Ciclo inválido')
    .toInt(),
]), dcCtrl.removeByCiclo)

router.delete('/', canWrite, v([
  body('id_curso')
    .trim()
    .notEmpty()
    .withMessage('Curso requerido'),

  body('id_docente')
    .isInt({ min: 1 })
    .withMessage('Docente requerido')
    .toInt(),

  body('id_ciclo')
    .isInt({ min: 1 })
    .withMessage('Ciclo requerido')
    .toInt(),
]), dcCtrl.remove)

module.exports = router