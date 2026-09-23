const router = require('express').Router()

router.use('/profesiones', require('./profesiones.routes'))
router.use('/carreras', require('./carreras.routes'))
router.use('/pensum', require('./pensum.routes'))
router.use('/cursos', require('./cursos.routes'))
router.use('/instituciones', require('./instituciones.routes'))
router.use('/sedes', require('./sedes.routes'))
router.use('/autoridades', require('./autoridades.routes'))
router.use('/equivalencias', require('./equivalencias-equiparacion.routes'))

module.exports = router