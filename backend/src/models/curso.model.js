const { pool } = require('../config/db')

const createError = (code, message) => {
  const err = new Error(message)
  err.code = code
  return err
}

const parseKey = (key) => {
  const parts = String(key).split(':')

  if (parts.length !== 2) {
    throw createError('BAD_KEY', 'Identificador de curso inválido')
  }

  const id_curso = Number(parts[0])
  const id_pensum = Number(parts[1])

  if (!id_curso || !id_pensum) {
    throw createError('BAD_KEY', 'Identificador de curso inválido')
  }

  return { id_curso, id_pensum }
}

const CursoModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        CONCAT(c.id, ':', pc.id_pensum) AS id,
        CONCAT(c.id, ':', pc.id_pensum) AS curso_pensum_key,

        c.id AS id_curso,
        c.codigo,
        c.nombre,

        pc.id_pensum,
        pc.semestre,

        p.codigo AS pensum_codigo,
        p.descripcion AS pensum_desc,
        p.anio AS pensum_anio,

        ca.id AS id_carrera,
        ca.codigo AS carrera_codigo,
        ca.descripcion AS carrera_desc,
        ca.subfijo AS carrera_subfijo
      FROM curso c
      JOIN pensum_curso pc ON pc.id_curso = c.id
      JOIN pensum p ON p.id = pc.id_pensum
      JOIN carreras ca ON ca.id = p.id_carrera
      ORDER BY pc.semestre ASC, c.nombre ASC
      `
    )

    return rows
  },

  async findById(key) {
    const { id_curso, id_pensum } = parseKey(key)

    const [rows] = await pool.query(
      `
      SELECT
        CONCAT(c.id, ':', pc.id_pensum) AS id,
        CONCAT(c.id, ':', pc.id_pensum) AS curso_pensum_key,

        c.id AS id_curso,
        c.codigo,
        c.nombre,

        pc.id_pensum,
        pc.semestre,

        p.codigo AS pensum_codigo,
        p.descripcion AS pensum_desc,
        p.anio AS pensum_anio,

        ca.id AS id_carrera,
        ca.codigo AS carrera_codigo,
        ca.descripcion AS carrera_desc,
        ca.subfijo AS carrera_subfijo
      FROM curso c
      JOIN pensum_curso pc ON pc.id_curso = c.id
      JOIN pensum p ON p.id = pc.id_pensum
      JOIN carreras ca ON ca.id = p.id_carrera
      WHERE c.id = ?
        AND pc.id_pensum = ?
      LIMIT 1
      `,
      [id_curso, id_pensum]
    )

    return rows[0] || null
  },

  async findByCodigo(codigo) {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.codigo,
        c.nombre
      FROM curso c
      WHERE c.codigo = ?
      LIMIT 1
      `,
      [codigo]
    )

    return rows[0] || null
  },

  async findByPensum(id_pensum) {
    const [rows] = await pool.query(
      `
      SELECT
        CONCAT(c.id, ':', pc.id_pensum) AS id,
        CONCAT(c.id, ':', pc.id_pensum) AS curso_pensum_key,

        c.id AS id_curso,
        c.codigo,
        c.nombre,

        pc.id_pensum,
        pc.semestre,

        p.codigo AS pensum_codigo,
        p.descripcion AS pensum_desc,
        p.anio AS pensum_anio,

        ca.subfijo AS carrera_subfijo
      FROM curso c
      JOIN pensum_curso pc ON pc.id_curso = c.id
      JOIN pensum p ON p.id = pc.id_pensum
      JOIN carreras ca ON ca.id = p.id_carrera
      WHERE pc.id_pensum = ?
      ORDER BY pc.semestre ASC, c.nombre ASC
      `,
      [id_pensum]
    )

    return rows
  },

  async existsCursoPensum({ id_curso, id_pensum }) {
    const [rows] = await pool.query(
      `
      SELECT 1
      FROM pensum_curso
      WHERE id_curso = ?
        AND id_pensum = ?
      LIMIT 1
      `,
      [id_curso, id_pensum]
    )

    return rows.length > 0
  },

  async create({ codigo, nombre, id_pensum, semestre }) {
    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()

      const codigoLimpio = String(codigo).trim()
      const nombreLimpio = String(nombre).trim()
      const idPensumNum = Number(id_pensum)
      const semestreNum = Number(semestre)

      const [cursoRows] = await conn.query(
        `
        SELECT id, codigo, nombre
        FROM curso
        WHERE codigo = ?
        LIMIT 1
        `,
        [codigoLimpio]
      )

      let idCurso

      if (cursoRows.length > 0) {
        idCurso = cursoRows[0].id
      } else {
        const [insertCurso] = await conn.query(
          `
          INSERT INTO curso (
            codigo,
            nombre
          )
          VALUES (?, ?)
          `,
          [codigoLimpio, nombreLimpio]
        )

        idCurso = insertCurso.insertId
      }

      const [relacionRows] = await conn.query(
        `
        SELECT 1
        FROM pensum_curso
        WHERE id_curso = ?
          AND id_pensum = ?
        LIMIT 1
        `,
        [idCurso, idPensumNum]
      )

      if (relacionRows.length > 0) {
        throw createError(
          'DUP_CURSO_PENSUM',
          'Ese curso ya está registrado en ese pensum'
        )
      }

      await conn.query(
        `
        INSERT INTO pensum_curso (
          id_curso,
          id_pensum,
          semestre
        )
        VALUES (?, ?, ?)
        `,
        [idCurso, idPensumNum, semestreNum]
      )

      await conn.commit()

      return `${idCurso}:${idPensumNum}`
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async update(key, { codigo, nombre, id_pensum, semestre }) {
    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()

      const { id_curso: oldIdCurso, id_pensum: oldIdPensum } = parseKey(key)

      const codigoLimpio = String(codigo).trim()
      const nombreLimpio = String(nombre).trim()
      const newIdPensum = Number(id_pensum)
      const newSemestre = Number(semestre)

      const [oldRows] = await conn.query(
        `
        SELECT
          c.id,
          c.codigo,
          c.nombre,
          pc.id_pensum,
          pc.semestre
        FROM curso c
        JOIN pensum_curso pc ON pc.id_curso = c.id
        WHERE c.id = ?
          AND pc.id_pensum = ?
        LIMIT 1
        `,
        [oldIdCurso, oldIdPensum]
      )

      if (oldRows.length === 0) {
        throw createError('NOT_FOUND', 'Curso no encontrado')
      }

      const [targetRows] = await conn.query(
        `
        SELECT id, codigo, nombre
        FROM curso
        WHERE codigo = ?
        LIMIT 1
        `,
        [codigoLimpio]
      )

      let targetIdCurso = oldIdCurso

      if (targetRows.length > 0 && Number(targetRows[0].id) !== Number(oldIdCurso)) {
        targetIdCurso = targetRows[0].id
      } else {
        await conn.query(
          `
          UPDATE curso
          SET
            codigo = ?,
            nombre = ?
          WHERE id = ?
          `,
          [codigoLimpio, nombreLimpio, oldIdCurso]
        )

        targetIdCurso = oldIdCurso
      }

      const [duplicateRows] = await conn.query(
        `
        SELECT 1
        FROM pensum_curso
        WHERE id_curso = ?
          AND id_pensum = ?
          AND NOT (
            id_curso = ?
            AND id_pensum = ?
          )
        LIMIT 1
        `,
        [targetIdCurso, newIdPensum, oldIdCurso, oldIdPensum]
      )

      if (duplicateRows.length > 0) {
        throw createError(
          'DUP_CURSO_PENSUM',
          'Ese curso ya está registrado en ese pensum'
        )
      }

      if (
        Number(targetIdCurso) === Number(oldIdCurso) &&
        Number(newIdPensum) === Number(oldIdPensum)
      ) {
        await conn.query(
          `
          UPDATE pensum_curso
          SET semestre = ?
          WHERE id_curso = ?
            AND id_pensum = ?
          `,
          [newSemestre, oldIdCurso, oldIdPensum]
        )
      } else {
        await conn.query(
          `
          DELETE FROM pensum_curso
          WHERE id_curso = ?
            AND id_pensum = ?
          `,
          [oldIdCurso, oldIdPensum]
        )

        await conn.query(
          `
          INSERT INTO pensum_curso (
            id_curso,
            id_pensum,
            semestre
          )
          VALUES (?, ?, ?)
          `,
          [targetIdCurso, newIdPensum, newSemestre]
        )
      }

      await conn.commit()

      return 1
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async delete(key) {
    const { id_curso, id_pensum } = parseKey(key)

    const [result] = await pool.query(
      `
      DELETE FROM pensum_curso
      WHERE id_curso = ?
        AND id_pensum = ?
      `,
      [id_curso, id_pensum]
    )

    return result.affectedRows
  },
}

module.exports = CursoModel