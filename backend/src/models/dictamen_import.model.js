const { pool } = require('../config/db')

const normalizarTexto = (texto) => {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const similitudTexto = (a, b) => {
  const aa = normalizarTexto(a)
  const bb = normalizarTexto(b)

  if (!aa || !bb) return 0
  if (aa === bb) return 1
  if (aa.includes(bb) || bb.includes(aa)) return 0.94

  const m = aa.length
  const n = bb.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const costo = aa[i - 1] === bb[j - 1] ? 0 : 1

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + costo
      )
    }
  }

  const distancia = dp[m][n]
  const maxLen = Math.max(m, n)

  return maxLen === 0 ? 0 : 1 - distancia / maxLen
}

const limpiarObservaciones = (observaciones) => {
  return Array.from(new Set(
    observaciones
      .filter(Boolean)
      .map(obs => String(obs).trim())
      .filter(Boolean)
  ))
}

const observacionesTexto = (observaciones) => {
  const limpias = limpiarObservaciones(observaciones)
  const texto = limpias.join(', ')

  if (texto.length <= 500) return texto

  return `${texto.slice(0, 497)}...`
}

const toNullableInt = (value) => {
  if (value === undefined || value === null || value === '') return null

  const n = Number(value)

  return Number.isFinite(n) && n > 0 ? n : null
}

const codigoCursoNormalizado = (codigo) => {
  const numeros = String(codigo || '').replace(/\D/g, '')

  if (!numeros) return ''

  if (numeros.length < 3) return numeros.padStart(3, '0')

  return numeros
}

const DictamenImportModel = {
  async importarDesdeExtraccion({ extraccion, url_archivo }) {
    const conn = await pool.getConnection()
    const observaciones = []

    try {
      await conn.beginTransaction()

      for (const advertencia of extraccion.advertencias_parser || []) {
        observaciones.push(advertencia)
      }

      const sede = await this.findSedeByNombre(extraccion.sede_nombre, conn)
      const idSede = sede?.id || 1

      

      const estudianteInfo = extraccion.estudiante || {}

      if (!estudianteInfo.carnet && !estudianteInfo.registro_academico) {
        throw new Error('No se pudo leer carné ni registro académico del estudiante')
      }

      let estudiante = await this.findEstudianteByCarnetOrRegistro({
        carnet: estudianteInfo.carnet,
        registro_academico: estudianteInfo.registro_academico,
        conn,
      })

      if (!estudiante) {
        const idEstudiante = await this.createEstudiante({
          nombre_completo: estudianteInfo.nombre_completo || 'SIN NOMBRE',
          carnet: estudianteInfo.carnet || estudianteInfo.registro_academico,
          registro_academico: estudianteInfo.registro_academico || estudianteInfo.carnet,
          conn,
        })

        estudiante = await this.findEstudianteById(idEstudiante, conn)
      }

      let carreraEquivalencia = await this.findCarreraByCodigo(
        extraccion.carrera_equivalencia_codigo,
        conn
      )

    
      const carreraOrigen = await this.findCarreraByNombre(
        extraccion.carrera_de_nombre,
        conn
      )

      if (!carreraEquivalencia) {
        observaciones.push(`No se encontró carrera de equivalencia con código "${extraccion.carrera_equivalencia_codigo || ''}"`)

        if (carreraOrigen) {
          observaciones.push('Se usó la carrera origen como carrera de equivalencia por respaldo')
          carreraEquivalencia = carreraOrigen
        } else {
          throw new Error('No se pudo determinar la carrera de equivalencia ni la carrera origen')
        }
      }

      const carreraDestino = carreraEquivalencia


      const pensumDe = carreraOrigen
        ? await this.findPensumByCarreraVigencia({
            id_carrera: carreraOrigen.id,
            vigencia: 0,
            conn,
          })
        : null

      if (carreraOrigen && !pensumDe) {
        observaciones.push(`No se encontró pensum no vigente para la carrera origen "${carreraOrigen.descripcion}"`)
      }

      const pensumA = await this.findPensumByCarreraVigencia({
        id_carrera: carreraDestino.id,
        vigencia: 1,
        conn,
      })

      if (!pensumA) {
        observaciones.push(`No se encontró pensum vigente para la carrera destino "${carreraDestino.descripcion}"`)
      }
      // Buscar coordinador según la carrera de equivalencia
      const codigoCarreraEquivalencia = String(carreraEquivalencia.codigo || '').trim()
      console.log('Código carrera equivalencia:', codigoCarreraEquivalencia)
      const mapaCoordinador = {
        '120058': 'COO_ING_SISTEMAS',
        '120034': 'COO_ING_MECANICA',
        '120033': 'COO_ING_CIVIL',
        '120035': 'COO_ING_INDUSTRIAL',
        '120036': 'COO_ING_MECANICA_INDUSTRIAL',
      }

      const codigoCoordinador = mapaCoordinador[codigoCarreraEquivalencia] || null
      let idCoordinador = 1 // fallback al primero

      if (codigoCoordinador) {
        const [rowsCoord] = await conn.query(
          `SELECT id FROM autoridades WHERE codigo = ? LIMIT 1`,
          [codigoCoordinador]
        )
        if (rowsCoord[0]) idCoordinador = rowsCoord[0].id
      }
      const [insertDictamen] = await conn.query(
        `
        INSERT INTO dictamen (
          id_carrera_equivalencia,
          codigo,
          id_sede,
          fecha_impresion,
          prov_ryca,
          fecha_prov_ryca,
          id_estudiante,
          id_carrera_de,
          id_pensum_de,
          id_institucion_de,
          id_carrera_a,
          id_pensum_a,
          id_institucion_a,
          id_autoridad_coordinador,
          id_autoridad_director,
          num_expediente,
          url_archivo,
          estado,
          observaciones
        )
        VALUES (?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'PENDIENTE', ?)
        `,
        [
          Number(carreraEquivalencia.id),
          Number(idSede),
          extraccion.prov_ryca || null,
          extraccion.fecha_prov_ryca || null,
          Number(estudiante.id),

          carreraOrigen?.id || null,
          pensumDe?.id || null,
          carreraOrigen?.id_institucion || null,

          carreraDestino.id,
          pensumA?.id || null,
          carreraDestino.id_institucion || null,

          idCoordinador,
          2,
          url_archivo || null,
          observacionesTexto(observaciones),
        ]
      )

      const idDictamen = insertDictamen.insertId
      const codigo = `${String(idDictamen).padStart(2, '0')}-${new Date().getFullYear()}`

      await conn.query(
        `
        UPDATE dictamen
        SET codigo = ?
        WHERE id = ?
        `,
        [codigo, idDictamen]
      )

      const cursosInsertados = await this.insertarCursosDesdeExtraccion({
        conn,
        id_dictamen: idDictamen,
        cursos_solicitados: extraccion.cursos_solicitados || [],
        observaciones,
      })

      await conn.query(
        `
        UPDATE dictamen
        SET observaciones = ?
        WHERE id = ?
        `,
        [observacionesTexto(observaciones), idDictamen]
      )

      await conn.commit()

      return {
        ok: true,
        id: idDictamen,
        codigo,
        estado: 'PENDIENTE',
        url_archivo,
        cursos_insertados: cursosInsertados,
        observaciones: limpiarObservaciones(observaciones),
      }
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async insertarCursosDesdeExtraccion({ conn, id_dictamen, cursos_solicitados, observaciones }) {
    let numero = 1
    let insertados = 0
    const cursosUsados = new Set()

    for (const cursoPdf of cursos_solicitados) {
      const codigoDe = codigoCursoNormalizado(cursoPdf.codigo_de)
      const nombreDe = String(cursoPdf.nombre_de || '').trim()

      let cursoDe = null

      if (codigoDe) {
        cursoDe = await this.findCursoByCodigo(codigoDe, conn)

        if (!cursoDe) {
          observaciones.push(`No existe el curso con código ${codigoDe}`)
          continue
        }
      } else if (nombreDe) {
        const cursosPorNombre = await this.findCursosByNombre(nombreDe, conn)

        if (cursosPorNombre.length === 0) {
          observaciones.push(`No existe curso con nombre similar a "${nombreDe}"`)
          continue
        }

        cursoDe = cursosPorNombre[0]

        if (cursosPorNombre.length > 1) {
          observaciones.push(`El curso solicitado "${nombreDe}" coincide con varios cursos, se usó el código ${cursoDe.codigo}`)
        } else {
          observaciones.push(`El curso solicitado "${nombreDe}" no traía código, se encontró por nombre con código ${cursoDe.codigo}`)
        }
      } else {
        observaciones.push('Se encontró un curso solicitado sin código ni nombre')
        continue
      }

      const codigoReferencia = cursoDe.codigo

      if (cursosUsados.has(String(cursoDe.id))) {
        observaciones.push(`El curso con código ${codigoReferencia} aparece repetido en la solicitud`)
        continue
      }

      cursosUsados.add(String(cursoDe.id))

      if (cursoPdf.codigo_de_inferido) {
        observaciones.push(`El código ${codigoReferencia} fue inferido por Python para el curso "${nombreDe}"`)
      }

      const equivalencias = await this.findEquivalenciasByCursoDe(cursoDe.id, conn)

      if (equivalencias.length === 0) {
        observaciones.push(`El curso con código ${codigoReferencia} no tiene equivalencia registrada`)
        continue
      }

      if (equivalencias.length > 1) {
        observaciones.push(`El curso con código ${codigoReferencia} tiene más de una equivalencia, se agregó la primera encontrada`)
      }

      const equivalencia = equivalencias[0]
      const cursoA = await this.findCursoById(equivalencia.id_curso_a, conn)

      if (!cursoA) {
        observaciones.push(`No se encontró el curso destino de la equivalencia para el curso ${codigoReferencia}`)
        continue
      }

      const docentes = await this.findDocentesActivosByCursoCodigo(cursoA.codigo, conn)

      let idDocente = null

      if (docentes.length === 0) {
        observaciones.push(`No hay docente activo asignado para el curso destino ${cursoA.codigo}`)
      } else {
        idDocente = docentes[0].id_docente

        if (docentes.length > 1) {
          observaciones.push(`El curso destino ${cursoA.codigo} tiene varios docentes activos, se asignó el primero encontrado`)
        }
      }

      try {
        await conn.query(
          `
          INSERT INTO cursos_dictamen (
            numero,
            id_dictamen,
            id_curso_de,
            id_curso_a,
            porcentaje,
            opinion,
            id_docente_encargado_curso,
            fecha_impresion
          )
          VALUES (?, ?, ?, ?, 100.00, 'EQUIVALENTE', ?, NULL)
          `,
          [
            numero,
            Number(id_dictamen),
            Number(cursoDe.id),
            Number(cursoA.id),
            toNullableInt(idDocente),
          ]
        )

        numero += 1
        insertados += 1
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          observaciones.push(`El curso ${codigoReferencia} ya estaba repetido dentro del dictamen`)
          continue
        }

        throw err
      }
    }

    return insertados
  },

  async findSedeByNombre(nombre, conn = pool) {
    const [rows] = await conn.query(
      `
      SELECT *
      FROM cede
      `
    )

    const buscado = normalizarTexto(nombre)

    if (!buscado) return null

    return rows.find(row => {
      const nombreDb = normalizarTexto(row.nombre)

      return nombreDb === buscado ||
        nombreDb.includes(buscado) ||
        buscado.includes(nombreDb)
    }) || null
  },

  async findEstudianteById(id, conn = pool) {
    const [rows] = await conn.query(
      `
      SELECT *
      FROM estudiante
      WHERE id = ?
      LIMIT 1
      `,
      [Number(id)]
    )

    return rows[0] || null
  },

  async findEstudianteByCarnetOrRegistro({ carnet, registro_academico, conn = pool }) {
    const conditions = []
    const params = []

    if (carnet) {
      conditions.push('carnet = ?')
      params.push(String(carnet).trim())
    }

    if (registro_academico) {
      conditions.push('registro_academico = ?')
      params.push(String(registro_academico).trim())
    }

    if (conditions.length === 0) return null

    const [rows] = await conn.query(
      `
      SELECT *
      FROM estudiante
      WHERE ${conditions.join(' OR ')}
      LIMIT 1
      `,
      params
    )

    return rows[0] || null
  },

  async createEstudiante({ nombre_completo, carnet, registro_academico, conn = pool }) {
    const [result] = await conn.query(
      `
      INSERT INTO estudiante (
        nombre_completo,
        carnet,
        registro_academico
      )
      VALUES (?, ?, ?)
      `,
      [
        String(nombre_completo || '').trim(),
        String(carnet || '').trim(),
        String(registro_academico || '').trim(),
      ]
    )

    return result.insertId
  },

  async findCarreraByCodigo(codigo, conn = pool) {
    if (!codigo) return null

    const [rows] = await conn.query(
      `
      SELECT *
      FROM carreras
      WHERE codigo = ?
      LIMIT 1
      `,
      [String(codigo).trim()]
    )

    return rows[0] || null
  },

  async findCarreraByNombre(nombre, conn = pool) {
    if (!nombre) return null

    const [rows] = await conn.query(
      `
      SELECT *
      FROM carreras
      `
    )

    const buscado = normalizarTexto(nombre)

    return rows.find(row => {
      const nombreDb = normalizarTexto(row.descripcion)

      return nombreDb === buscado ||
        nombreDb.includes(buscado) ||
        buscado.includes(nombreDb)
    }) || null
  },

  async findPensumByCarreraVigencia({ id_carrera, vigencia, conn = pool }) {
    const [rows] = await conn.query(
      `
      SELECT *
      FROM pensum
      WHERE id_carrera = ?
        AND vigencia = ?
      ORDER BY anio DESC, id DESC
      LIMIT 1
      `,
      [
        Number(id_carrera),
        Number(vigencia),
      ]
    )

    return rows[0] || null
  },

  async findCursoByCodigo(codigo, conn = pool) {
    const codigoNormal = codigoCursoNormalizado(codigo)

    const [rows] = await conn.query(
      `
      SELECT *
      FROM curso
      WHERE codigo = ?
      LIMIT 1
      `,
      [codigoNormal]
    )

    return rows[0] || null
  },

  async findCursosByNombre(nombre, conn = pool) {
    const [rows] = await conn.query(
      `
      SELECT *
      FROM curso
      `
    )

    const candidatos = rows
      .map(row => ({
        ...row,
        score: similitudTexto(nombre, row.nombre),
      }))
      .filter(row => row.score >= 0.84)
      .sort((a, b) => b.score - a.score)

    return candidatos
  },

  async findCursoById(id, conn = pool) {
    const [rows] = await conn.query(
      `
      SELECT *
      FROM curso
      WHERE id = ?
      LIMIT 1
      `,
      [Number(id)]
    )

    return rows[0] || null
  },

  async findEquivalenciasByCursoDe(id_curso_de, conn = pool) {
    const [rows] = await conn.query(
      `
      SELECT
        ec.id_curso_de,
        ec.id_curso_a,
        ca.codigo AS curso_a_codigo,
        ca.nombre AS curso_a_nombre
      FROM equivalencia_curso ec
      JOIN curso ca
        ON ca.id = ec.id_curso_a
      WHERE ec.id_curso_de = ?
      ORDER BY ec.id_curso_a ASC
      `,
      [Number(id_curso_de)]
    )

    return rows
  },

  async findDocentesActivosByCursoCodigo(codigo_curso, conn = pool) {
    const [rows] = await conn.query(
      `
      SELECT
        dc.id_docente,
        d.nombre AS docente_nombre,
        d.codigo AS docente_codigo
      FROM docente_curso dc
      JOIN docente d
        ON d.id = dc.id_docente
      WHERE dc.id_curso = ?
        AND dc.activo = 1
      ORDER BY d.nombre ASC
      `,
      [String(codigo_curso).trim()]
    )

    return rows
  },
}

module.exports = DictamenImportModel