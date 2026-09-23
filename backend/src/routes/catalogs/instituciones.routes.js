const router     = require('express').Router()
const { body }   = require('express-validator')
const { authorize }        = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const { institucionCtrl }  = require('../../controllers/catalogs.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get   ('/',    institucionCtrl.getAll)
router.get   ('/:id', institucionCtrl.getOne)
router.post  ('/', canWrite, v([
  body('codigo').trim().notEmpty().withMessage('Código requerido'),
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
]), institucionCtrl.create)
router.put   ('/:id', canWrite, v([
  body('codigo').trim().notEmpty().withMessage('Código requerido'),
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
]), institucionCtrl.update)
router.delete('/:id', canWrite, institucionCtrl.remove)

module.exports = router
