const { spawn } = require('child_process')
const path      = require('path')
const fs        = require('fs')

const UserModel       = require('../models/user.model')
const EstudianteModel = require('../models/estudiante.model')
const { signAccessToken } = require('../utils/jwt')

const SCRIPT_PATH = path.resolve(__dirname, '../../scripts/constancia_reader.py')

// ── Llama al script Python con la ruta del PDF ────────────
function leerConstanciaPython(rutaPdf) {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env.PYTHON_BIN || path.resolve(__dirname, '../../venv/bin/python')

    const py = spawn(pythonBin, [SCRIPT_PATH, rutaPdf], {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    })

    let stdout = ''
    let stderr = ''

    py.stdout.on('data', d => {
      stdout += d.toString('utf-8')
    })

    py.stderr.on('data', d => {
      stderr += d.toString('utf-8')
    })

    py.on('close', code => {
      try { fs.unlinkSync(rutaPdf) } catch (_) {}

      if (code !== 0) {
        return reject(new Error(`Error en script Python (${code}): ${stderr || 'sin stderr'}`))
      }

      try {
        resolve(JSON.parse(stdout))
      } catch {
        reject(new Error(`Respuesta invalida del script Python. STDOUT: ${stdout || 'sin stdout'}`))
      }
    })

    py.on('error', err => {
      try { fs.unlinkSync(rutaPdf) } catch (_) {}
      reject(new Error(`No se pudo iniciar Python: ${err.message}`))
    })
  })
}

// ── POST /api/auth/constancia ─────────────────────────────
// Requiere: authenticate middleware + multer (campo "constancia")
const leerConstancia = async (req, res) => {
  const rutaPdf = req.file?.path

  if (!rutaPdf) {
    return res.status(400).json({ message: 'Debes adjuntar el PDF de la constancia' })
  }

  try {
    // 1. Python lee el PDF
    const resultado = await leerConstanciaPython(rutaPdf)

    if (resultado.error) {
      return res.status(422).json({
        message: resultado.error,
        detalle: resultado.texto_extraido || null,
      })
    }

    const { registro_academico, carnet, nombre } = resultado
    const userId = req.user.id

    // 2. Verifica si ya tiene estudiante asociado
    const yaAsociado = await EstudianteModel.findByUsuarioId(userId)
    if (yaAsociado) {
      return res.status(409).json({
        message: 'Ya tienes datos de estudiante registrados en tu cuenta',
      })
    }

    let estudiante

    // 3. Busca si existe estudiante con ese carnet + registro
    const existente = await EstudianteModel.findByCarnetYRegistro(carnet, registro_academico)

    if (existente) {
      // Verifica que no esté asociado a otro usuario
      if (existente.usuario_id && existente.usuario_id !== userId) {
        return res.status(409).json({
          message: 'Ese carnet ya está asociado a otra cuenta',
        })
      }

      // Asocia el usuario y actualiza nombre del estudiante con el del PDF
      await EstudianteModel.asociarUsuario(existente.id, userId)
      await EstudianteModel.updateNombre(existente.id, nombre)
      estudiante = await EstudianteModel.findById(existente.id)

    } else {
      // Crea el estudiante nuevo con los datos del PDF
      const nuevoId = await EstudianteModel.create({
        nombre_completo:    nombre,
        carnet:             carnet,
        registro_academico: registro_academico,
        usuario_id:         userId,
      })
      estudiante = await EstudianteModel.findById(nuevoId)
    }

    // 4. Actualiza el nombre del usuario con el nombre del PDF
    await UserModel.updateNombre(userId, nombre)

    // 5. Genera nuevo accessToken con datos completos del estudiante
    const user = await UserModel.findById(userId)

    const newAccessToken = signAccessToken({
      id:                 user.id,
      rol:                user.rol,
      estudiante_id:      estudiante.id,
      carnet:             estudiante.carnet,
      registro_academico: estudiante.registro_academico,
    })

    return res.json({
      message: 'Constancia leída y datos vinculados correctamente',
      extraido: { nombre, carnet, registro_academico },
      accessToken: newAccessToken,
      user: {
        id:                 user.id,
        nombre:             user.nombre,
        email:              user.email,
        rol:                user.rol,
        estudiante_id:      estudiante.id,
        carnet:             estudiante.carnet,
        registro_academico: estudiante.registro_academico,
      },
    })

  } catch (err) {
    console.error('leerConstancia error:', err)
    if (req.file?.path) try { fs.unlinkSync(req.file.path) } catch (_) {}
    return res.status(500).json({ message: err.message || 'Error interno del servidor' })
  }
}

module.exports = { leerConstancia }