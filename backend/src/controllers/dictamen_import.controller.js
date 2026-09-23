const fs = require('fs')
const path = require('path')
const DictamenImportModel = require('../models/dictamen_import.model')
const { leerProvPdf } = require('../utils/provPythonReader')

const getArchivoUrl = (file) => {
  const nombre = path.basename(file.path)
  return `/uploads/provs/${nombre}`
}

const eliminarArchivoFisico = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    console.error('Error al eliminar archivo físico:', err)
  }
}

const cargarProvs = async (req, res) => {
  try {
    const files = req.files || []

    if (files.length === 0) {
      return res.status(400).json({
        message: 'Debe cargar al menos un archivo PDF',
      })
    }

    const resultados = []

    for (const file of files) {
      const urlArchivo = getArchivoUrl(file)

      try {
        const extraccion = await leerProvPdf(file.path)

        // Si Python no pudo leer el PDF, eliminar el archivo y registrar el error
        if (!extraccion.ok) {
          eliminarArchivoFisico(file.path)

          resultados.push({
            ok: false,
            archivo: file.originalname,
            error: extraccion.error || 'No se pudo leer el PDF',
          })

          continue
        }

        const creado = await DictamenImportModel.importarDesdeExtraccion({
          extraccion,
          url_archivo: urlArchivo,
        })

        resultados.push({
          ok: true,
          archivo: file.originalname,
          url_archivo: urlArchivo,
          extraccion,
          dictamen: creado,
        })
      } catch (err) {
        // Si falló la importación a BD, eliminar el archivo físico
        eliminarArchivoFisico(file.path)

        resultados.push({
          ok: false,
          archivo: file.originalname,
          error: err.message || 'Error al procesar PDF',
        })
      }
    }

    const exitosos = resultados.filter(item => item.ok).length
    const fallidos = resultados.length - exitosos

    res.status(201).json({
      message: `Carga finalizada. Dictámenes creados: ${exitosos}. Fallidos: ${fallidos}.`,
      total: resultados.length,
      exitosos,
      fallidos,
      data: resultados,
    })
  } catch (err) {
    // Error general — eliminar todos los archivos subidos
    for (const file of req.files || []) {
      eliminarArchivoFisico(file.path)
    }

    console.error(err)
    res.status(500).json({
      message: 'Error interno al cargar PROVs',
    })
  }
}

module.exports = {
  cargarProvs,
}