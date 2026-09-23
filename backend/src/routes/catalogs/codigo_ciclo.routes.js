const router = require('express').Router()
const { codigoCicloCtrl } = require('../../controllers/catalogs.controller')

router.get('/', codigoCicloCtrl.getAll)
router.get('/:id', codigoCicloCtrl.getOne)

module.exports = router