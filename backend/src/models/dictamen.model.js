const { pool } = require('../config/db')

const toNullableInt = (value) => {
  if (value === undefined || value === null || value === '') return null

  const n = Number(value)

  return Number.isFinite(n) && n > 0 ? n : null
}

const toNullableString = (value) => {
  if (value === undefined || value === null || value === '') return null

  const text = String(value).trim()

  return text || null
}

const DictamenModel = {
  async findAll({ q = '', fecha_desde = '', fecha_hasta = '', estado = '', page = 1, limit = 20 } = {}) {
    const where = []
    const params = []

    if (q && String(q).trim()) {
      const search = `%${String(q).trim()}%`

      where.push(`
        (
          d.codigo LIKE ?
          OR d.prov_ryca LIKE ?
          OR d.num_expediente LIKE ?
          OR d.estado LIKE ?
          OR d.observaciones LIKE ?
          OR d.url_archivo LIKE ?
          OR e.nombre_completo LIKE ?
          OR e.carnet LIKE ?
          OR e.registro_academico LIKE ?
          OR sede.nombre LIKE ?
          OR pensum_de.codigo LIKE ?
          OR pensum_a.codigo LIKE ?
          OR carrera_de.descripcion LIKE ?
          OR carrera_a.descripcion LIKE ?
        )
      `)

      params.push(
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search
      )
    }

    if (fecha_desde) {
      where.push(`d.creado_en >= CONCAT(?, ' 00:00:00')`)
      params.push(fecha_desde)
    }

    if (fecha_hasta) {
      where.push(`d.creado_en <= CONCAT(?, ' 23:59:59')`)
      params.push(fecha_hasta)
    }
    if (estado && String(estado).trim()) {
      where.push(`d.estado = ?`)
      params.push(String(estado).trim().toUpperCase())
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const pageNum = Math.max(Number(page) || 1, 1)
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100)
    const offset = (pageNum - 1) * limitNum

    const [countRows] = await pool.query(
      `
      SELECT COUNT(DISTINCT d.id) AS total
      FROM dictamen d

      JOIN estudiante e
        ON e.id = d.id_estudiante

      LEFT JOIN cede sede
        ON sede.id = d.id_sede

      LEFT JOIN carreras carrera_de
        ON carrera_de.id = d.id_carrera_de

      LEFT JOIN pensum pensum_de
        ON pensum_de.id = d.id_pensum_de

      LEFT JOIN carreras carrera_a
        ON carrera_a.id = d.id_carrera_a

      LEFT JOIN pensum pensum_a
        ON pensum_a.id = d.id_pensum_a

      ${whereSql}
      `,
      params
    )

    const total = Number(countRows[0]?.total || 0)

    const [rows] = await pool.query(
      `
      SELECT
        d.id,
        d.codigo,
        d.prov_ryca,
        d.fecha_prov_ryca,
        d.fecha_impresion,
        d.num_expediente,
        d.url_archivo,
        d.estado,
        d.observaciones,
        d.creado_en,
        d.actualizado_en,

        e.nombre_completo AS estudiante_nombre,
        e.carnet AS estudiante_carnet,
        e.registro_academico,

        sede.nombre AS sede_nombre,

        carrera_de.descripcion AS carrera_de,
        pensum_de.codigo AS pensum_de_codigo,
        pensum_de.descripcion AS pensum_de,

        carrera_a.descripcion AS carrera_a,
        pensum_a.codigo AS pensum_a_codigo,
        pensum_a.descripcion AS pensum_a,

        COUNT(cd.numero) AS total_cursos

      FROM dictamen d

      JOIN estudiante e
        ON e.id = d.id_estudiante

      LEFT JOIN cede sede
        ON sede.id = d.id_sede

      LEFT JOIN carreras carrera_de
        ON carrera_de.id = d.id_carrera_de

      LEFT JOIN pensum pensum_de
        ON pensum_de.id = d.id_pensum_de

      LEFT JOIN carreras carrera_a
        ON carrera_a.id = d.id_carrera_a

      LEFT JOIN pensum pensum_a
        ON pensum_a.id = d.id_pensum_a

      LEFT JOIN cursos_dictamen cd
        ON cd.id_dictamen = d.id

      ${whereSql}

      GROUP BY
        d.id,
        d.codigo,
        d.prov_ryca,
        d.fecha_prov_ryca,
        d.fecha_impresion,
        d.num_expediente,
        d.url_archivo,
        d.estado,
        d.observaciones,
        d.creado_en,
        d.actualizado_en,
        e.nombre_completo,
        e.carnet,
        e.registro_academico,
        sede.nombre,
        carrera_de.descripcion,
        pensum_de.codigo,
        pensum_de.descripcion,
        carrera_a.descripcion,
        pensum_a.codigo,
        pensum_a.descripcion

      ORDER BY d.creado_en DESC, d.id DESC

      LIMIT ? OFFSET ?
      `,
      [...params, limitNum, offset]
    )

    return {
      rows,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  },
  async updateObservaciones(id, observaciones) {
    const [result] = await pool.query(
      `
    UPDATE dictamen
    SET observaciones = ?
    WHERE id = ?
    `,
      [
        observaciones === undefined || observaciones === null || observaciones === ''
          ? null
          : String(observaciones).trim(),
        Number(id),
      ]
    )

    return result.affectedRows
  },

  async updateArchivo(id, url_archivo) {
    const [result] = await pool.query(
      `
    UPDATE dictamen
    SET url_archivo = ?
    WHERE id = ?
    `,
      [
        url_archivo === undefined || url_archivo === null || url_archivo === ''
          ? null
          : String(url_archivo).trim(),
        Number(id),
      ]
    )

    return result.affectedRows
  },
  async updateEstado(id, estado) {
    const [result] = await pool.query(`UPDATE dictamen SET estado = ? WHERE id = ?`, [estado, Number(id)])
    return result.affectedRows
  },

  async findById(id) {
    const [[dictamen]] = await pool.query(
      `
    SELECT
      d.*,

      e.nombre_completo AS estudiante_nombre,
      e.carnet AS estudiante_carnet,
      e.registro_academico,

      sede.nombre AS sede_nombre,
      sede.ubicacion AS sede_ubicacion,

      carrera_eq.descripcion AS carrera_equivalencia,
      carrera_eq.subfijo AS carrera_equivalencia_subfijo,

      carrera_de.descripcion AS carrera_de,
      carrera_de.subfijo AS carrera_de_subfijo,
      pensum_de.codigo AS pensum_de_codigo,
      pensum_de.anio AS pensum_de_anio,
      pensum_de.descripcion AS pensum_de_descripcion,
      inst_de.codigo AS institucion_de_codigo,
      inst_de.nombre AS institucion_de,

      carrera_a.descripcion AS carrera_a,
      carrera_a.subfijo AS carrera_a_subfijo,
      pensum_a.codigo AS pensum_a_codigo,
      pensum_a.anio AS pensum_a_anio,
      pensum_a.descripcion AS pensum_a_descripcion,
      inst_a.codigo AS institucion_a_codigo,
      inst_a.nombre AS institucion_a,

      aut_coord.nombre AS coordinador_nombre,
      aut_coord.descripcion AS coordinador_cargo,
      aut_coord.url_firma AS coordinador_url_firma,
      aut_coord.url_sello AS coordinador_url_sello,
      prof_coord.subfijo AS coordinador_subfijo,

      aut_dir.nombre AS director_nombre,
      aut_dir.descripcion AS director_cargo,
      aut_dir.url_firma AS director_url_firma,
      aut_dir.url_sello AS director_url_sello,
      prof_dir.subfijo AS director_subfijo

    FROM dictamen d

    JOIN estudiante e
      ON e.id = d.id_estudiante

    LEFT JOIN cede sede
      ON sede.id = d.id_sede

    JOIN carreras carrera_eq
      ON carrera_eq.id = d.id_carrera_equivalencia

    LEFT JOIN carreras carrera_de
      ON carrera_de.id = d.id_carrera_de

    LEFT JOIN pensum pensum_de
      ON pensum_de.id = d.id_pensum_de

    LEFT JOIN instituciones inst_de
      ON inst_de.id = d.id_institucion_de

    LEFT JOIN carreras carrera_a
      ON carrera_a.id = d.id_carrera_a

    LEFT JOIN pensum pensum_a
      ON pensum_a.id = d.id_pensum_a

    LEFT JOIN instituciones inst_a
      ON inst_a.id = d.id_institucion_a

    JOIN autoridades aut_coord
      ON aut_coord.id = d.id_autoridad_coordinador

    LEFT JOIN profesiones prof_coord
      ON prof_coord.id = aut_coord.id_profesion

    JOIN autoridades aut_dir
      ON aut_dir.id = d.id_autoridad_director

    LEFT JOIN profesiones prof_dir
      ON prof_dir.id = aut_dir.id_profesion

    WHERE d.id = ?

    LIMIT 1
    `,
      [Number(id)]
    )

    if (!dictamen) return null

    const [cursos] = await this.findCursosByDictamen(id)

    return {
      ...dictamen,
      cursos,
    }
  },

  async findCursosByDictamen(id_dictamen) {
    return pool.query(
      `
      SELECT
        cd.numero,
        cd.id_dictamen,
        cd.id_curso_de,
        cd.id_curso_a,
        cd.porcentaje,
        cd.opinion,
        cd.id_docente_encargado_curso,
        cd.fecha_impresion,

        cde.codigo AS curso_de_codigo,
        cde.nombre AS curso_de_nombre,

        ca.codigo AS curso_a_codigo,
        ca.nombre AS curso_a_nombre,

        pc_a.semestre AS curso_a_semestre,

        cfg.nombre_semestre AS nombre_semestre_carta,
        COALESCE(cfg.omite_carta, 0) AS omite_carta,

        doc.nombre AS docente_nombre,
        doc.codigo AS docente_codigo,
        doc.id_profesion AS docente_id_profesion,
        prof.subfijo AS docente_subfijo

      FROM cursos_dictamen cd

      JOIN dictamen d
        ON d.id = cd.id_dictamen

      LEFT JOIN curso cde
        ON cde.id = cd.id_curso_de

      LEFT JOIN curso ca
        ON ca.id = cd.id_curso_a

      LEFT JOIN pensum_curso pc_a
        ON pc_a.id_curso = cd.id_curso_a
        AND pc_a.id_pensum = d.id_pensum_a

      LEFT JOIN configuracion_cartas_dictamen cfg
        ON cfg.semestre = pc_a.semestre

      LEFT JOIN docente doc
        ON doc.id = cd.id_docente_encargado_curso

      LEFT JOIN profesiones prof
        ON prof.id = doc.id_profesion

      WHERE cd.id_dictamen = ?

      ORDER BY cd.numero ASC
      `,
      [Number(id_dictamen)]
    )
  },

  async createWithCursos(data) {
    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()

      const [result] = await conn.query(
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
        VALUES (?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          Number(data.id_carrera_equivalencia),
          toNullableInt(data.id_sede),
          toNullableString(data.prov_ryca),
          data.fecha_prov_ryca || null,
          Number(data.id_estudiante),

          toNullableInt(data.id_carrera_de),
          toNullableInt(data.id_pensum_de),
          toNullableInt(data.id_institucion_de),

          toNullableInt(data.id_carrera_a),
          toNullableInt(data.id_pensum_a),
          toNullableInt(data.id_institucion_a),

          Number(data.id_autoridad_coordinador),
          Number(data.id_autoridad_director),

          toNullableString(data.num_expediente),
          toNullableString(data.url_archivo),
          toNullableString(data.estado) || 'PENDIENTE',
          toNullableString(data.observaciones),
        ]
      )

      const idDictamen = result.insertId
      const codigo = `${String(idDictamen).padStart(2, '0')}-${new Date().getFullYear()}`

      await conn.query(
        `
        UPDATE dictamen
        SET codigo = ?
        WHERE id = ?
        `,
        [codigo, idDictamen]
      )

      await insertarCursosDictamen(conn, idDictamen, data.cursos || [])

      await conn.commit()

      return {
        id: idDictamen,
        codigo,
      }
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async updateWithCursos(id, data) {
    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()

      const [result] = await conn.query(
        `
        UPDATE dictamen
        SET
          id_carrera_equivalencia = ?,
          id_sede = ?,
          prov_ryca = ?,
          fecha_prov_ryca = ?,
          id_estudiante = ?,
          id_carrera_de = ?,
          id_pensum_de = ?,
          id_institucion_de = ?,
          id_carrera_a = ?,
          id_pensum_a = ?,
          id_institucion_a = ?,
          id_autoridad_coordinador = ?,
          id_autoridad_director = ?,
          num_expediente = ?,
          url_archivo = ?,
          estado = ?,
          observaciones = ?
        WHERE id = ?
        `,
        [
          Number(data.id_carrera_equivalencia),
          toNullableInt(data.id_sede),
          toNullableString(data.prov_ryca),
          data.fecha_prov_ryca || null,
          Number(data.id_estudiante),

          toNullableInt(data.id_carrera_de),
          toNullableInt(data.id_pensum_de),
          toNullableInt(data.id_institucion_de),

          toNullableInt(data.id_carrera_a),
          toNullableInt(data.id_pensum_a),
          toNullableInt(data.id_institucion_a),

          Number(data.id_autoridad_coordinador),
          Number(data.id_autoridad_director),

          toNullableString(data.num_expediente),
          toNullableString(data.url_archivo),
          toNullableString(data.estado) || 'PENDIENTE',
          toNullableString(data.observaciones),

          Number(id),
        ]
      )

      if (!result.affectedRows) {
        await conn.rollback()
        return 0
      }

      if (Array.isArray(data.cursos)) {
        await conn.query(
          `
          DELETE FROM cursos_dictamen
          WHERE id_dictamen = ?
          `,
          [Number(id)]
        )

        await insertarCursosDictamen(conn, Number(id), data.cursos)
      }

      await conn.commit()

      return result.affectedRows
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async delete(id) {
    const [result] = await pool.query(
      `
      DELETE FROM dictamen
      WHERE id = ?
      `,
      [Number(id)]
    )

    return result.affectedRows
  },

  async marcarImpresionDictamen(id) {
    const [result] = await pool.query(
      `
      UPDATE dictamen
      SET fecha_impresion = NOW()
      WHERE id = ?
      `,
      [Number(id)]
    )

    return result.affectedRows
  },

  async marcarImpresionCartas({ id_dictamen, id_docente_encargado_curso = null }) {
    const params = [Number(id_dictamen)]

    let sql = `
      UPDATE cursos_dictamen cd

      JOIN dictamen d
        ON d.id = cd.id_dictamen

      LEFT JOIN pensum_curso pc_a
        ON pc_a.id_curso = cd.id_curso_a
        AND pc_a.id_pensum = d.id_pensum_a

      LEFT JOIN configuracion_cartas_dictamen cfg
        ON cfg.semestre = pc_a.semestre

      SET cd.fecha_impresion = NOW()

      WHERE cd.id_dictamen = ?
        AND cd.id_docente_encargado_curso IS NOT NULL
        AND COALESCE(cfg.omite_carta, 0) = 0
    `

    if (id_docente_encargado_curso) {
      sql += `
        AND cd.id_docente_encargado_curso = ?
      `
      params.push(Number(id_docente_encargado_curso))
    }

    const [result] = await pool.query(sql, params)

    return result.affectedRows
  },

  async findCartasPorDocente(id_dictamen) {
    const [rows] = await pool.query(
      `
      SELECT
        cd.numero,
        cd.id_dictamen,
        cd.id_curso_de,
        cd.id_curso_a,
        cd.porcentaje,
        cd.opinion,
        cd.fecha_impresion,

        cde.codigo AS curso_de_codigo,
        cde.nombre AS curso_de_nombre,

        ca.codigo AS curso_a_codigo,
        ca.nombre AS curso_a_nombre,

        pc_a.semestre AS curso_a_semestre,

        doc.id AS docente_id,
        doc.nombre AS docente_nombre,
        doc.codigo AS docente_codigo,
        doc.id_profesion AS docente_id_profesion,
        doc.url_firma AS docente_url_firma,
        prof.subfijo AS docente_subfijo

      FROM cursos_dictamen cd

      JOIN dictamen d
        ON d.id = cd.id_dictamen

      LEFT JOIN curso cde
        ON cde.id = cd.id_curso_de

      LEFT JOIN curso ca
        ON ca.id = cd.id_curso_a

      LEFT JOIN pensum_curso pc_a
        ON pc_a.id_curso = cd.id_curso_a
        AND pc_a.id_pensum = d.id_pensum_a

      LEFT JOIN configuracion_cartas_dictamen cfg
        ON cfg.semestre = pc_a.semestre

      JOIN docente doc
        ON doc.id = cd.id_docente_encargado_curso

      LEFT JOIN profesiones prof
        ON prof.id = doc.id_profesion

      WHERE cd.id_dictamen = ?
        AND cd.id_docente_encargado_curso IS NOT NULL
        AND COALESCE(cfg.omite_carta, 0) = 0

      ORDER BY
        doc.nombre ASC,
        cd.numero ASC
      `,
      [Number(id_dictamen)]
    )

    const grupos = new Map()

    for (const row of rows) {
      const key = String(row.docente_id)

      if (!grupos.has(key)) {
        grupos.set(key, {
          docente_id: row.docente_id,
          docente_nombre: row.docente_nombre,
          docente_codigo: row.docente_codigo,
          docente_id_profesion: row.docente_id_profesion,
          docente_url_firma: row.docente_url_firma, 
          docente_subfijo: row.docente_subfijo,
          cursos: [],
        })
      }

      grupos.get(key).cursos.push({
        numero: row.numero,
        id_curso_de: row.id_curso_de,
        id_curso_a: row.id_curso_a,
        curso_de_codigo: row.curso_de_codigo,
        curso_de_nombre: row.curso_de_nombre,
        curso_a_codigo: row.curso_a_codigo,
        curso_a_nombre: row.curso_a_nombre,
        curso_a_semestre: row.curso_a_semestre,
        porcentaje: row.porcentaje,
        opinion: row.opinion,
        fecha_impresion: row.fecha_impresion,
      })
    }

    return Array.from(grupos.values())
  },

  async findCursosOmitidosCarta(id_dictamen) {
    const [rows] = await pool.query(
      `
      SELECT
        cd.numero,
        cd.id_dictamen,
        cd.id_curso_de,
        cd.id_curso_a,
        cd.porcentaje,
        cd.opinion,
        cd.fecha_impresion,

        cde.codigo AS curso_de_codigo,
        cde.nombre AS curso_de_nombre,

        ca.codigo AS curso_a_codigo,
        ca.nombre AS curso_a_nombre,

        pc_a.semestre AS curso_a_semestre,
        cfg.nombre_semestre,
        cfg.omite_carta,

        doc.id AS docente_id,
        doc.nombre AS docente_nombre,
        prof.subfijo AS docente_subfijo

      FROM cursos_dictamen cd

      JOIN dictamen d
        ON d.id = cd.id_dictamen

      LEFT JOIN curso cde
        ON cde.id = cd.id_curso_de

      LEFT JOIN curso ca
        ON ca.id = cd.id_curso_a

      LEFT JOIN pensum_curso pc_a
        ON pc_a.id_curso = cd.id_curso_a
        AND pc_a.id_pensum = d.id_pensum_a

      LEFT JOIN configuracion_cartas_dictamen cfg
        ON cfg.semestre = pc_a.semestre

      LEFT JOIN docente doc
        ON doc.id = cd.id_docente_encargado_curso

      LEFT JOIN profesiones prof
        ON prof.id = doc.id_profesion

      WHERE cd.id_dictamen = ?
        AND COALESCE(cfg.omite_carta, 0) = 1

      ORDER BY cd.numero ASC
      `,
      [Number(id_dictamen)]
    )

    return rows
  },
}

async function insertarCursosDictamen(conn, idDictamen, cursos) {
  for (let i = 0; i < cursos.length; i++) {
    const curso = cursos[i]

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
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      [
        Number(curso.numero || i + 1),
        Number(idDictamen),
        toNullableInt(curso.id_curso_de),
        toNullableInt(curso.id_curso_a),
        curso.porcentaje === undefined || curso.porcentaje === null || curso.porcentaje === ''
          ? 100
          : Number(curso.porcentaje),
        curso.opinion ? String(curso.opinion).trim() : 'EQUIVALENTE',
        toNullableInt(curso.id_docente_encargado_curso),
      ]
    )
  }

}






module.exports = DictamenModel