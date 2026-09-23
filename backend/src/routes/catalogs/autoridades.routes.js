const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const { autoridadCtrl } = require('../../controllers/catalogs.controller')
const uploadAutoridad = require('../../middlewares/uploadAutoridad.middleware')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get('/', autoridadCtrl.getAll)
router.get('/:id', autoridadCtrl.getOne)

router.post(
  '/',
  canWrite,
  uploadAutoridad,
  v([
    body('codigo')
      .trim()
      .notEmpty()
      .withMessage('Código requerido'),

    body('descripcion')
      .trim()
      .notEmpty()
      .withMessage('Descripción requerida'),

    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('Nombre requerido'),

    body('id_profesion')
      .isInt({ min: 1 })
      .withMessage('Profesión requerida'),
  ]),
  autoridadCtrl.create
)

router.put(
  '/:id',
  canWrite,
  uploadAutoridad,
  v([
    body('descripcion')
      .trim()
      .notEmpty()
      .withMessage('Descripción requerida'),

    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('Nombre requerido'),

    body('id_profesion')
      .isInt({ min: 1 })
      .withMessage('Profesión requerida'),
  ]),
  autoridadCtrl.update
)

router.delete('/:id', canWrite, autoridadCtrl.delete)

module.exports = router