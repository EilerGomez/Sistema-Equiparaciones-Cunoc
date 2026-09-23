const { spawn } = require('child_process')
const path = require('path')
const { pool } = require('../config/db')
const { sendScraperResultEmail } = require('../services/email.service')

const SCRAPER_PATH = path.resolve(__dirname, '../python/scraper.py')

let procesoActivo = false

const status = (_req, res) => {
  res.json({ activo: procesoActivo })
}

// ── Helpers de consulta ───────────────────────────────────

const obtenerCiclo = async (id_ciclo) => {
  const [[ciclo]] = await pool.query(
    `SELECT
       c.id,
       c.anio,
       cc.codigo AS codigo_ciclo,
       CONCAT(cc.codigo, ' ', c.anio) AS ciclo_descripcion
     FROM ciclo c
     JOIN codigo_ciclo cc ON cc.id = c.id_codigo_ciclo
     WHERE c.id = ?
     LIMIT 1`,
    [Number(id_ciclo)]
  )
  return ciclo || null
}

const obtenerPensumResumen = async (id_pensum, id_institucion) => {
  if (!id_pensum || id_pensum === 'todos') {
    // Trae nombre de la institución
    const [[inst]] = await pool.query(
      `SELECT codigo, nombre FROM instituciones WHERE id = ? LIMIT 1`,
      [Number(id_institucion)]
    )
    return inst ? `Todos los pensums de ${inst.codigo}` : 'Todos los pensums'
  }
  const [[pensum]] = await pool.query(
    `SELECT p.codigo, p.descripcion, p.anio, ca.subfijo AS carrera_subfijo
     FROM pensum p
     JOIN carreras ca ON ca.id = p.id_carrera
     WHERE p.id = ? LIMIT 1`,
    [Number(id_pensum)]
  )
  return pensum
    ? `${pensum.codigo} — ${pensum.descripcion} (${pensum.carrera_subfijo})`
    : `Pensum ID ${id_pensum}`
}

const obtenerCursos = async (id_pensum, id_institucion) => {
  /*
   * Estructura nueva:
   *   curso  (id, codigo, nombre)
   *   pensum_curso (id_curso, id_pensum, semestre)
   *   pensum (id, id_carrera)
   *   carreras (id, id_institucion)
   *
   * Si viene id_pensum específico → filtra por pensum
   * Si viene 'todos'              → filtra por institución (vía carrera)
   */
  let query
  let params

  if (id_pensum && id_pensum !== 'todos') {
    query = `
      SELECT DISTINCT c.codigo, c.nombre
      FROM curso c
      JOIN pensum_curso pc ON pc.id_curso = c.id
      WHERE pc.id_pensum = ?
      ORDER BY c.nombre ASC`
    params = [Number(id_pensum)]
  } else {
    query = `
      SELECT DISTINCT c.codigo, c.nombre
      FROM curso c
      JOIN pensum_curso pc  ON pc.id_curso  = c.id
      JOIN pensum      p   ON p.id          = pc.id_pensum
      JOIN carreras    ca  ON ca.id         = p.id_carrera
      WHERE ca.id_institucion = ?
      ORDER BY c.nombre ASC`
    params = [Number(id_institucion)]
  }

  const [cursos] = await pool.query(query, params)
  return cursos
}

// ── Endpoint POST /run ────────────────────────────────────

const run = async (req, res) => {
  try {
    if (procesoActivo) {
      return res.status(409).json({
        message: 'Ya hay un proceso en ejecución. Espera a que termine.',
      })
    }

    const { id_pensum, id_ciclo, id_institucion } = req.body
    const userEmail = req.user?.email
    const userName  = req.user?.nombre || 'Usuario'

    if (!id_ciclo) {
      return res.status(400).json({ message: 'id_ciclo es requerido' })
    }
    if (!id_institucion) {
      return res.status(400).json({ message: 'id_institucion es requerido' })
    }

    const ciclo = await obtenerCiclo(id_ciclo)
    if (!ciclo) return res.status(404).json({ message: 'Ciclo no encontrado' })

    const cursos = await obtenerCursos(id_pensum, id_institucion)
    if (!cursos.length) {
      return res.status(404).json({ message: 'No hay cursos para los parámetros indicados' })
    }

    const pensumResumen = await obtenerPensumResumen(id_pensum, id_institucion)

    procesoActivo = true

    res.json({
      message: `Proceso iniciado. Se procesarán ${cursos.length} cursos. Recibirás un correo al finalizar.`,
      cursos:  cursos.length,
      ciclo:   ciclo.ciclo_descripcion,
      pensum:  pensumResumen,
    })

    _runScraperBackground({
      cursos,
      anio:              String(ciclo.anio),
      id_ciclo:          ciclo.id,
      codigo_ciclo: ciclo.codigo_ciclo,
      ciclo_descripcion: ciclo.ciclo_descripcion,
      userEmail,
      userName,
      pensumResumen,
    })

  } catch (err) {
    procesoActivo = false
    console.error('scraper.run error:', err)
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error interno del servidor' })
    }
  }
}

// ── Background ────────────────────────────────────────────

async function _runScraperBackground({
  cursos, anio, id_ciclo,codigo_ciclo, ciclo_descripcion, userEmail, userName, pensumResumen,
}) {
  const startTime = Date.now()
  console.log(`🔄 Scraper iniciado — ${cursos.length} cursos | ${ciclo_descripcion} | ${pensumResumen}`)

  try {
    const resultado = await _ejecutarPython(JSON.stringify({ cursos, anio, id_ciclo,codigo_ciclo }))

    const docentes     = Array.isArray(resultado.docentes)      ? resultado.docentes      : []
    const docenteCurso = Array.isArray(resultado.docente_curso) ? resultado.docente_curso : []

    console.log(`📦 Python devolvió: ${docentes.length} docentes, ${docenteCurso.length} relaciones`)

    // Inserta docentes nuevos
    let docentesInsertados = 0
    for (const doc of docentes) {
      const nombre = String(doc.nombre || '').trim()
      if (!nombre) continue
      const [[existing]] = await pool.query(
        'SELECT id FROM docente WHERE nombre = ? LIMIT 1', [nombre]
      )
      if (!existing) {
        await pool.query(
          'INSERT IGNORE INTO docente (nombre, id_profesion) VALUES (?, ?)', [nombre, 1]
        )
        docentesInsertados++
      }
    }

    // Inserta relaciones docente_curso
    let relacionesInsertadas = 0
    let relacionesOmitidas   = 0

    for (const rel of docenteCurso) {
      const idCurso       = String(rel.id_curso        || '').trim()
      const nombreDocente = String(rel.nombre_docente  || '').trim()
      const idCicloRel    = Number(rel.id_ciclo)

      if (!idCurso || !nombreDocente || !idCicloRel) continue

      const [[docente]] = await pool.query(
        'SELECT id FROM docente WHERE nombre = ? LIMIT 1', [nombreDocente]
      )
      if (!docente) { console.warn(`⚠ Docente no encontrado: ${nombreDocente}`); continue }

      const [[existeRel]] = await pool.query(
        `SELECT 1 FROM docente_curso
         WHERE id_curso = ? AND id_docente = ? AND id_ciclo = ? LIMIT 1`,
        [idCurso, docente.id, idCicloRel]
      )
      if (existeRel) { relacionesOmitidas++; continue }

      await pool.query(
        `INSERT INTO docente_curso (id_curso, id_docente, id_ciclo, activo) VALUES (?, ?, ?, 1)`,
        [idCurso, docente.id, idCicloRel]
      )
      relacionesInsertadas++
    }

    const duracion = Math.round((Date.now() - startTime) / 1000)
    console.log(`✅ Scraper finalizado en ${duracion}s`)

    if (userEmail) {
      await sendScraperResultEmail({
        to: userEmail, nombre: userName,
        resumen: {
          pensum: pensumResumen, ciclo: ciclo_descripcion, anio,
          cursosProcessados: cursos.length,
          docentesInsertados, relacionesInsertadas, relacionesOmitidas,
          duracionSegundos: duracion,
        },
      })
    }

  } catch (err) {
    console.error('❌ Error en scraper background:', err)
    if (userEmail) {
      try { await sendScraperResultEmail({ to: userEmail, nombre: userName, error: err.message }) } catch (_) {}
    }
  } finally {
    procesoActivo = false
  }
}

// ── Python child process ──────────────────────────────────

function _ejecutarPython(input) {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env.PYTHON_BIN || path.resolve(__dirname, '../../venv/bin/python')

    const py = spawn(pythonBin, [SCRAPER_PATH], {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    })

    let chunks = []
    let stderr = ''

    py.stdout.on('data', d => { chunks.push(d) })

    py.stderr.on('data', d => {
      const text = d.toString('utf-8')
      stderr += text
      process.stdout.write(text)
    })

    py.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`Python salió con código ${code}: ${stderr}`))
      }

      try {
        const stdout = Buffer.concat(chunks).toString('utf-8')
        resolve(JSON.parse(stdout))
      } catch (e) {
        reject(new Error(`Error parseando JSON de Python: ${e.message}`))
      }
    })

    py.on('error', err => reject(new Error(`No se pudo iniciar Python: ${err.message}`)))

    py.stdin.write(input, 'utf-8')
    py.stdin.end()
  })
}

module.exports = { run, status }