const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const { docenteCtrl } = require('../../controllers/catalogs.controller')
const uploadDocente = require('../../middlewares/uploadDocente.middleware')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get('/', docenteCtrl.getAll)
router.get('/:id', docenteCtrl.getOne)

router.post(
  '/',
  canWrite,
  uploadDocente,
  v([
    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('Nombre requerido'),

    body('id_profesion')
      .isInt({ min: 1 })
      .withMessage('Profesión requerida'),

    body('correo')
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage('Correo inválido'),
  ]),
  docenteCtrl.create
)

router.put(
  '/:id',
  canWrite,
  uploadDocente,
  v([
    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('Nombre requerido'),

    body('id_profesion')
      .isInt({ min: 1 })
      .withMessage('Profesión requerida'),

    body('correo')
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage('Correo inválido'),
  ]),
  docenteCtrl.update
)

router.delete('/:id', canWrite, docenteCtrl.remove)

module.exports = router