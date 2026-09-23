const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const { cicloCtrl } = require('../../controllers/catalogs.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get('/', cicloCtrl.getAll)
router.get('/:id', cicloCtrl.getOne)

router.post('/', canWrite, v([
  body('id_codigo_ciclo')
    .isInt({ min: 1 })
    .withMessage('Código de ciclo requerido'),

  body('anio')
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Año inválido'),
]), cicloCtrl.create)

router.put('/:id', canWrite, v([
  body('id_codigo_ciclo')
    .isInt({ min: 1 })
    .withMessage('Código de ciclo requerido'),

  body('anio')
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Año inválido'),
]), cicloCtrl.update)

router.delete('/:id', canWrite, cicloCtrl.remove)

module.exports = router