const router     = require('express').Router()
const { body }   = require('express-validator')
const { authorize }        = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const { pensumCtrl }       = require('../../controllers/catalogs.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get   ('/',        pensumCtrl.getAll)
router.get   ('/:codigo', pensumCtrl.getOne)
router.post  ('/', canWrite, v([
  body('codigo').trim().notEmpty().withMessage('Código requerido'),
  body('anio').isInt({ min: 1900, max: 2100 }).withMessage('Año inválido'),
  body('descripcion').trim().notEmpty().withMessage('Descripción requerida'),
  body('vigencia').isInt({ min: 0, max: 1 }).withMessage('Vigencia debe ser 0 o 1'),
  body('id_carrera').isInt({ min: 1 }).withMessage('Carrera requerida'),
]), pensumCtrl.create)
router.put   ('/:codigo', canWrite, v([
  body('anio').isInt({ min: 1900, max: 2100 }).withMessage('Año inválido'),
  body('descripcion').trim().notEmpty().withMessage('Descripción requerida'),
  body('vigencia').isInt({ min: 0, max: 1 }).withMessage('Vigencia debe ser 0 o 1'),
  body('id_carrera').isInt({ min: 1 }).withMessage('Carrera requerida'),
]), pensumCtrl.update)
router.delete('/:codigo', canWrite, pensumCtrl.remove)

module.exports = router
