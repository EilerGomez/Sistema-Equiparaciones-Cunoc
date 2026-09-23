const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../middlewares/auth.middleware')
const { handleValidation } = require('../middlewares/validate.middleware')
const ctrl = require('../controllers/configuracion_id_dictamen.controller')

// Solo admin puede cambiar la configuración
const soloAdmin = authorize('admin')

router.get('/dictamen-id', soloAdmin, ctrl.getDictamenAutoIncrement)

router.post('/dictamen-id', soloAdmin,
  [
    body('nuevo_id')
      .isInt({ min: 1 })
      .withMessage('Debe ser un número entero mayor a 0'),
    handleValidation,
  ],
  ctrl.setDictamenAutoIncrement
)

module.exports = router