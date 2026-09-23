require('dotenv').config()

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const path = require('path')
const { testConnection } = require('./config/db')

const app = express()
const PORT = process.env.PORT || 3001

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, '../uploads')

// ─── Seguridad ────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false,
  frameguard: false,
  contentSecurityPolicy: { directives: { frameSrc: ["'self'", 'blob:'], upgradeInsecureRequests: null } },
}))

app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3001', 'http://localhost:5174'],
  credentials: true,
}))

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}))

// ─── Archivos estáticos ───────────────────────────────────
// Sirve imagenes de firmas, sellos y archivos subidos.
app.use('/uploads', express.static(UPLOAD_ROOT))

// ─── Parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Logger ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

// ─── Deshabilita caché ────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

// ─── Rutas ────────────────────────────────────────────────
app.use('/api', require('./routes'))

// prueba para el local, levantar el frontend desde el backend (no recomendado para producción)
const FRONTEND_DIST = path.join(__dirname, '..', 'public')
const INDEX_HTML = path.join(FRONTEND_DIST, 'index.html')

app.use(express.static(FRONTEND_DIST))

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(INDEX_HTML)
})
///////

// 404
app.use((_, res) => res.status(404).json({ message: 'Ruta no encontrada' }))

// Error handler global
app.use((err, _req, res, _next) => {
  if (process.env.NODE_ENV !== 'test') console.error(err.stack)
  const status = err.status || ({ER_DUP_ENTRY:409, ER_NO_REFERENCED_ROW_2:400, ER_ROW_IS_REFERENCED_2:409}[err.code]) || 500
  const message = err.status ? err.message : ({ER_DUP_ENTRY:'El registro ya existe', ER_NO_REFERENCED_ROW_2:'Una referencia no existe', ER_ROW_IS_REFERENCED_2:'El registro esta en uso y no puede eliminarse'}[err.code]) || 'Error interno del servidor'
  res.status(status).json({ message })
})

// ─── Inicio ───────────────────────────────────────────────
const start = async () => {
  await testConnection()

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
    console.log(`Entorno: ${process.env.NODE_ENV}`)
    console.log(`Uploads: ${UPLOAD_ROOT}`)
  })
}

if (require.main === module) start().catch(err => { console.error(err.message); process.exitCode = 1 })
module.exports = app