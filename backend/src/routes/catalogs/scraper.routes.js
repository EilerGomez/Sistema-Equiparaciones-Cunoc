const router = require('express').Router()
const { body } = require('express-validator')
const { authorize } = require('../../middlewares/auth.middleware')
const { handleValidation } = require('../../middlewares/validate.middleware')
const scraperCtrl = require('../../controllers/scraper.controller')

router.post(
  '/run',
  authorize('admin', 'coordinador'),
  [
    body('id_ciclo')
      .isInt({ min: 1 })
      .withMessage('Ciclo requerido'),

    body('id_pensum')
      .optional({ nullable: true, checkFalsy: true })
      .custom(value => {
        if (value === 'todos') return true
        return Number.isInteger(Number(value)) && Number(value) >= 1
      })
      .withMessage('Pensum inválido'),

    handleValidation,
  ],
  scraperCtrl.run
)

router.get('/status', scraperCtrl.status)

module.exports = router