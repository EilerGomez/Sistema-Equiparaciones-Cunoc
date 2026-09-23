const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const configCtrl = require('../../controllers/configuracion_cartas_dictamen.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get('/', configCtrl.getAll)
router.get('/:id', configCtrl.getOne)

router.post('/', canWrite, v([
  body('semestre')
    .isInt({ min: 1, max: 20 })
    .withMessage('Semestre inválido'),

  body('nombre_semestre')
    .trim()
    .notEmpty()
    .withMessage('Nombre del semestre requerido'),

  body('omite_carta')
    .optional()
    .isBoolean()
    .withMessage('Valor de omitir carta inválido'),
]), configCtrl.create)

router.put('/:id', canWrite, v([
  body('semestre')
    .isInt({ min: 1, max: 20 })
    .withMessage('Semestre inválido'),

  body('nombre_semestre')
    .trim()
    .notEmpty()
    .withMessage('Nombre del semestre requerido'),

  body('omite_carta')
    .optional()
    .isBoolean()
    .withMessage('Valor de omitir carta inválido'),
]), configCtrl.update)

router.patch('/:id/omite-carta', canWrite, v([
  body('omite_carta')
    .isBoolean()
    .withMessage('Valor de omitir carta inválido'),
]), configCtrl.updateOmitirCarta)

router.delete('/:id', canWrite, configCtrl.remove)

module.exports = router