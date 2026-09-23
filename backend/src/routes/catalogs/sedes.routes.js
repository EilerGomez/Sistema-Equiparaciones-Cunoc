const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const { sedeCtrl } = require('../../controllers/catalogs.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get('/', sedeCtrl.getAll)
router.get('/:id', sedeCtrl.getOne)

router.post('/', canWrite, v([
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('Nombre requerido'),

  body('ubicacion')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),
]), sedeCtrl.create)

router.put('/:id', canWrite, v([
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('Nombre requerido'),

  body('ubicacion')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),
]), sedeCtrl.update)

router.delete('/:id', canWrite, sedeCtrl.remove)

module.exports = router