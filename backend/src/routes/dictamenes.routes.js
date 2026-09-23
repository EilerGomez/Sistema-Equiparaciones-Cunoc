const router = require('express').Router()
const { body } = require('express-validator')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { handleValidation } = require('../middlewares/validate.middleware')
const dictamenCtrl = require('../controllers/dictamen.controller')
const uploadProvs = require('../middlewares/uploadProvs.middleware')
const dictamenImportCtrl = require('../controllers/dictamen_import.controller')
const uploadDictamenArchivo = require('../middlewares/uploadDictamenArchivo.middleware')

const canWrite = [authenticate, authorize('admin', 'coordinador')]
const canRead = authenticate

const v = (rules) => [...rules, handleValidation]

const reglasDictamen = [
  body('id_carrera_equivalencia')
    .isInt({ min: 1 })
    .withMessage('Carrera de equivalencia requerida')
    .toInt(),

  body('id_sede')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Sede inválida')
    .toInt(),

  body('prov_ryca')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body('fecha_prov_ryca')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Fecha Prov. RYCA inválida'),

  body('id_estudiante')
    .isInt({ min: 1 })
    .withMessage('Estudiante requerido')
    .toInt(),

  body('id_carrera_de')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Carrera origen inválida')
    .toInt(),

  body('id_pensum_de')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Pensum origen inválido')
    .toInt(),

  body('id_institucion_de')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Institución origen inválida')
    .toInt(),

  body('id_carrera_a')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Carrera destino inválida')
    .toInt(),

  body('id_pensum_a')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Pensum destino inválido')
    .toInt(),

  body('id_institucion_a')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Institución destino inválida')
    .toInt(),

  body('id_autoridad_coordinador')
    .isInt({ min: 1 })
    .withMessage('Autoridad coordinador requerida')
    .toInt(),

  body('id_autoridad_director')
    .isInt({ min: 1 })
    .withMessage('Autoridad director requerida')
    .toInt(),

  body('num_expediente')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body('estado')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body('url_archivo')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body('observaciones')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body('cursos')
    .optional()
    .isArray()
    .withMessage('Cursos debe ser un arreglo'),

  body('cursos.*.numero')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Número de curso inválido')
    .toInt(),

  body('cursos.*.id_curso_de')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Curso origen inválido')
    .toInt(),

  body('cursos.*.id_curso_a')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Curso destino inválido')
    .toInt(),

  body('cursos.*.porcentaje')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Porcentaje inválido')
    .toFloat(),

  body('cursos.*.opinion')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body('cursos.*.id_docente_encargado_curso')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Docente encargado inválido')
    .toInt(),
]

router.get('/', canRead, dictamenCtrl.getAll)

router.post(
  '/cargar-provs',
  canWrite,
  uploadProvs.array('archivos', 30),
  dictamenImportCtrl.cargarProvs
)

router.get('/:id', canRead, dictamenCtrl.getOne)

router.post(
  '/',
  canWrite,
  v(reglasDictamen),
  dictamenCtrl.create
)

router.put(
  '/:id',
  canWrite,
  v(reglasDictamen),
  dictamenCtrl.update
)

router.patch(
  '/:id/observaciones',
  canWrite,
  [
    body('observaciones')
      .optional({ nullable: true, checkFalsy: true })
      .isLength({ max: 500 })
      .withMessage('Las observaciones no pueden superar 500 caracteres')
      .trim(),

    handleValidation,
  ],
  dictamenCtrl.updateObservaciones
)
router.patch(
  '/:id/estado',
  canWrite,
  [
    body('estado')
      .notEmpty().withMessage('Estado requerido')
      .isIn(['PENDIENTE', 'ENVIADO', 'RECHAZADO', 'ACEPTADO', 'LISTO'])
      .withMessage('Estado inválido'),
    handleValidation,
  ],
  dictamenCtrl.updateEstado
)

router.patch(
   '/:id/archivo',
   canWrite,
   uploadDictamenArchivo.single('archivo'),
   dictamenCtrl.subirArchivoDictamen
)


router.delete(
  '/:id/archivo',
  canWrite,
  dictamenCtrl.eliminarArchivo
)

router.delete(
  '/:id',
  canWrite,
  dictamenCtrl.remove
)

router.patch(
  '/:id/imprimir-dictamen',
  canWrite,
  dictamenCtrl.marcarImpresionDictamen
)

router.patch(
  '/:id/imprimir-cartas',
  canWrite,
  [
    body('id_docente_encargado_curso')
      .optional({ nullable: true, checkFalsy: true })
      .isInt({ min: 1 })
      .withMessage('Docente inválido')
      .toInt(),

    handleValidation,
  ],
  dictamenCtrl.marcarImpresionCartas
)

router.get(
  '/:id/cartas-por-docente',
  canRead,
  dictamenCtrl.getCartasPorDocente
)

module.exports = router