const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const { carreraCtrl } = require('../../controllers/catalogs.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get('/', carreraCtrl.getAll)

router.get('/:id', carreraCtrl.getOne)

router.post('/', canWrite, v([
  body('codigo')
    .trim()
    .notEmpty()
    .withMessage('Código requerido'),

  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('Descripción requerida'),

  body('subfijo')
    .trim()
    .notEmpty()
    .withMessage('Subfijo requerido'),

  body('id_institucion')
    .notEmpty()
    .withMessage('Institución requerida')
    .isInt({ min: 1 })
    .withMessage('Institución inválida')
    .toInt(),
]), carreraCtrl.create)

router.put('/:id', canWrite, v([
  body('codigo')
    .trim()
    .notEmpty()
    .withMessage('Código requerido'),

  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('Descripción requerida'),

  body('subfijo')
    .trim()
    .notEmpty()
    .withMessage('Subfijo requerido'),

  body('id_institucion')
    .notEmpty()
    .withMessage('Institución requerida')
    .isInt({ min: 1 })
    .withMessage('Institución inválida')
    .toInt(),
]), carreraCtrl.update)

router.delete('/:id', canWrite, carreraCtrl.remove)

module.exports = router