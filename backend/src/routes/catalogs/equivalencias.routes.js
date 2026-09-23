const router = require('express').Router()
const { body, param } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const equivalenciaCtrl = require('../../controllers/equivalencia_curso.controller')

const canWrite = authorize('admin', 'coordinador')
const v = (rules) => [...rules, handleValidation]

router.get('/', equivalenciaCtrl.getAll)

router.get(
  '/:id_curso_de/:id_curso_a',
  v([
    param('id_curso_de')
      .isInt({ min: 1 })
      .withMessage('Curso de origen inválido'),

    param('id_curso_a')
      .isInt({ min: 1 })
      .withMessage('Curso equivalente inválido'),
  ]),
  equivalenciaCtrl.getOne
)

router.post(
  '/',
  canWrite,
  v([
    body('id_curso_de')
      .isInt({ min: 1 })
      .withMessage('Curso de origen requerido'),

    body('id_curso_a')
      .isInt({ min: 1 })
      .withMessage('Curso equivalente requerido'),
  ]),
  equivalenciaCtrl.create
)

router.put(
  '/',
  canWrite,
  v([
    body('old_id_curso_de')
      .isInt({ min: 1 })
      .withMessage('Curso anterior de origen requerido'),

    body('old_id_curso_a')
      .isInt({ min: 1 })
      .withMessage('Curso anterior equivalente requerido'),

    body('id_curso_de')
      .isInt({ min: 1 })
      .withMessage('Curso de origen requerido'),

    body('id_curso_a')
      .isInt({ min: 1 })
      .withMessage('Curso equivalente requerido'),
  ]),
  equivalenciaCtrl.update
)

router.delete(
  '/',
  canWrite,
  v([
    body('id_curso_de')
      .isInt({ min: 1 })
      .withMessage('Curso de origen requerido'),

    body('id_curso_a')
      .isInt({ min: 1 })
      .withMessage('Curso equivalente requerido'),
  ]),
  equivalenciaCtrl.remove
)

module.exports = router