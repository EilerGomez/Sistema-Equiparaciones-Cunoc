const router = require('express').Router()
const { authenticate, authorize } = require('../middlewares/auth.middleware')
router.use('/auth', require('./auth.routes'))
router.use('/catalogs', authenticate, authorize('admin','coordinador'), require('./catalogs/index'))
router.use('/estudiantes', authenticate, authorize('admin','coordinador'), require('./estudiantes.routes'))
router.use('/equiparaciones', authenticate, require('./equiparaciones.routes'))
router.get('/health', (_,res) => res.json({status:'ok',sistema:'equiparacion'}))
module.exports=router
