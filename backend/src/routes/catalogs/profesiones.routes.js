const router     = require('express').Router()
const { body }   = require('express-validator')
const { authorize }      = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const { profesionCtrl }  = require('../../controllers/catalogs.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get   ('/',    profesionCtrl.getAll)
router.get   ('/:id', profesionCtrl.getOne)
router.post  ('/', canWrite, v([
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('subfijo').trim().notEmpty().withMessage('Subfijo requerido (Ej: Ing., Lic.)'),
]), profesionCtrl.create)
router.put   ('/:id', canWrite, v([
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('subfijo').trim().notEmpty().withMessage('Subfijo requerido'),
]), profesionCtrl.update)
router.delete('/:id', canWrite, profesionCtrl.remove)

module.exports = router
