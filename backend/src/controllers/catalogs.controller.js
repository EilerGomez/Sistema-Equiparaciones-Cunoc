const makeCrud = require('./crud.factory')

const ProfesionModel    = require('../models/profesion.model')
const CarreraModel      = require('../models/carrera.model')
const PensumModel       = require('../models/pensum.model')
const CicloModel        = require('../models/ciclo.model')
const InstitucionModel  = require('../models/institucion.model')
const SedeModel         = require('../models/sede.model')

const cursoCtrl = require('./curso.controller')
const codigoCicloCtrl = require('./codigo_ciclo.controller')
const autoridadCtrl = require('./autoridad.controller')
const docenteCtrl = require('./docente.controller')

const profesionCtrl = makeCrud(ProfesionModel, {
  notFoundMsg: 'Profesión no encontrada'
})

const carreraCtrl = makeCrud(CarreraModel, {
  notFoundMsg: 'Carrera no encontrada',
  dupMsg: 'Código o descripción ya existe'
})

const pensumCtrl = makeCrud(PensumModel, {
  pk: 'codigo',
  findOne: 'findByCodigo',
  notFoundMsg: 'Pensum no encontrado'
})
// Sobreescribe getAll para soportar ?id_institucion
pensumCtrl.getAll = async (req, res) => {
  try {
    const filters = {}
    if (req.query.id_institucion) filters.id_institucion = req.query.id_institucion
    const rows = await PensumModel.findAll(filters)
    res.json(rows)
  } catch (err) {
    console.error('pensum.getAll:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

const cicloCtrl = makeCrud(CicloModel, {
  notFoundMsg: 'Ciclo no encontrado',
  dupMsg: 'Ya existe ese ciclo en ese año'
})

const institucionCtrl = makeCrud(InstitucionModel, {
  notFoundMsg: 'Institución no encontrada',
  dupMsg: 'Código ya existe'
})

const sedeCtrl = makeCrud(SedeModel, {
  notFoundMsg: 'Sede no encontrada',
  dupMsg: 'Ya existe esa sede'
})

module.exports = {
  profesionCtrl,
  carreraCtrl,
  pensumCtrl,
  cicloCtrl,
  cursoCtrl,
  docenteCtrl,
  institucionCtrl,
  sedeCtrl,
  autoridadCtrl,
  codigoCicloCtrl,
}