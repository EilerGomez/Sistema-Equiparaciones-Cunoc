const { pool } = require('../config/db')

const DocenteCursoModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        dc.id_curso,
        dc.id_docente,
        dc.id_ciclo,
        dc.activo,

        c.id AS curso_id,
        c.codigo AS curso_codigo,
        c.nombre AS curso_nombre,

        pc.id_pensum,
        pc.semestre AS curso_semestre,

        pe.codigo AS pensum_codigo,
        pe.descripcion AS pensum_descripcion,
        pe.anio AS pensum_anio,
        pe.vigencia AS pensum_vigencia,

        ca.id AS carrera_id,
        ca.codigo AS carrera_codigo,
        ca.descripcion AS carrera_descripcion,
        ca.subfijo AS carrera_subfijo,

        d.codigo AS docente_codigo,
        d.nombre AS docente_nombre,
        d.telefono AS docente_telefono,
        d.correo AS docente_correo,

        pr.nombre AS docente_profesion,
        pr.subfijo AS docente_subfijo,

        ci.id_codigo_ciclo,
        cc.codigo AS ciclo_codigo,
        ci.anio AS ciclo_anio,
        CONCAT(cc.codigo, ' ', ci.anio) AS ciclo_descripcion

      FROM docente_curso dc

      JOIN curso c
        ON c.codigo = dc.id_curso

      LEFT JOIN pensum_curso pc
        ON pc.id_curso = c.id

      LEFT JOIN pensum pe
        ON pe.id = pc.id_pensum

      LEFT JOIN carreras ca
        ON ca.id = pe.id_carrera

      JOIN docente d
        ON d.id = dc.id_docente

      LEFT JOIN profesiones pr
        ON pr.id = d.id_profesion

      JOIN ciclo ci
        ON ci.id = dc.id_ciclo

      JOIN codigo_ciclo cc
        ON cc.id = ci.id_codigo_ciclo

      ORDER BY
        ci.anio DESC,
        cc.codigo ASC,
        pe.vigencia DESC,
        pe.anio DESC,
        pc.semestre ASC,
        c.nombre ASC,
        d.nombre ASC
      `
    )

    return rows
  },

  async findByCiclo(id_ciclo) {
    const [rows] = await pool.query(
      `
      SELECT
        dc.id_curso,
        dc.id_docente,
        dc.id_ciclo,
        dc.activo,

        c.id AS curso_id,
        c.codigo AS curso_codigo,
        c.nombre AS curso_nombre,

        pc.id_pensum,
        pc.semestre AS curso_semestre,

        pe.codigo AS pensum_codigo,
        pe.descripcion AS pensum_descripcion,
        pe.anio AS pensum_anio,
        pe.vigencia AS pensum_vigencia,

        ca.id AS carrera_id,
        ca.codigo AS carrera_codigo,
        ca.descripcion AS carrera_descripcion,
        ca.subfijo AS carrera_subfijo,

        d.codigo AS docente_codigo,
        d.nombre AS docente_nombre,
        d.telefono AS docente_telefono,
        d.correo AS docente_correo,

        pr.nombre AS docente_profesion,
        pr.subfijo AS docente_subfijo,

        ci.id_codigo_ciclo,
        cc.codigo AS ciclo_codigo,
        ci.anio AS ciclo_anio,
        CONCAT(cc.codigo, ' ', ci.anio) AS ciclo_descripcion

      FROM docente_curso dc

      JOIN curso c
        ON c.codigo = dc.id_curso

      LEFT JOIN pensum_curso pc
        ON pc.id_curso = c.id

      LEFT JOIN pensum pe
        ON pe.id = pc.id_pensum

      LEFT JOIN carreras ca
        ON ca.id = pe.id_carrera

      JOIN docente d
        ON d.id = dc.id_docente

      LEFT JOIN profesiones pr
        ON pr.id = d.id_profesion

      JOIN ciclo ci
        ON ci.id = dc.id_ciclo

      JOIN codigo_ciclo cc
        ON cc.id = ci.id_codigo_ciclo

      WHERE dc.id_ciclo = ?

      ORDER BY
        pe.vigencia DESC,
        pe.anio DESC,
        pc.semestre ASC,
        c.nombre ASC,
        d.nombre ASC
      `,
      [Number(id_ciclo)]
    )

    return rows
  },

  async exists({ id_curso, id_docente, id_ciclo }) {
    const [rows] = await pool.query(
      `
      SELECT 1
      FROM docente_curso
      WHERE id_curso = ?
        AND id_docente = ?
        AND id_ciclo = ?
      LIMIT 1
      `,
      [
        String(id_curso).trim(),
        Number(id_docente),
        Number(id_ciclo),
      ]
    )

    return rows.length > 0
  },

  async create({ id_curso, id_docente, id_ciclo, activo = 0 }) {
    const [result] = await pool.query(
      `
      INSERT INTO docente_curso (
        id_curso,
        id_docente,
        id_ciclo,
        activo
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        String(id_curso).trim(),
        Number(id_docente),
        Number(id_ciclo),
        Number(activo || 0),
      ]
    )

    return result.affectedRows
  },

  async update({
    old_id_curso,
    old_id_docente,
    old_id_ciclo,
    id_curso,
    id_docente,
    id_ciclo,
    activo,
  }) {
    const [result] = await pool.query(
      `
      UPDATE docente_curso
      SET
        id_curso = ?,
        id_docente = ?,
        id_ciclo = ?,
        activo = COALESCE(?, activo)
      WHERE id_curso = ?
        AND id_docente = ?
        AND id_ciclo = ?
      `,
      [
        String(id_curso).trim(),
        Number(id_docente),
        Number(id_ciclo),
        activo === undefined || activo === null ? null : Number(activo),

        String(old_id_curso).trim(),
        Number(old_id_docente),
        Number(old_id_ciclo),
      ]
    )

    return result.affectedRows
  },

  async updateActivo({ id_curso, id_docente, id_ciclo, activo }) {
    const [result] = await pool.query(
      `
      UPDATE docente_curso
      SET activo = ?
      WHERE id_curso = ?
        AND id_docente = ?
        AND id_ciclo = ?
      `,
      [
        Number(activo),
        String(id_curso).trim(),
        Number(id_docente),
        Number(id_ciclo),
      ]
    )

    return result.affectedRows
  },

  async updateActivoByCiclo({ id_ciclo, activo }) {
    const [result] = await pool.query(
      `
      UPDATE docente_curso
      SET activo = ?
      WHERE id_ciclo = ?
      `,
      [
        Number(activo),
        Number(id_ciclo),
      ]
    )

    return result.affectedRows
  },

  async delete({ id_curso, id_docente, id_ciclo }) {
    const [result] = await pool.query(
      `
      DELETE FROM docente_curso
      WHERE id_curso = ?
        AND id_docente = ?
        AND id_ciclo = ?
      `,
      [
        String(id_curso).trim(),
        Number(id_docente),
        Number(id_ciclo),
      ]
    )

    return result.affectedRows
  },

  async deleteByCiclo({ id_ciclo }) {
    const [result] = await pool.query(
      `
      DELETE FROM docente_curso
      WHERE id_ciclo = ?
      `,
      [Number(id_ciclo)]
    )

    return result.affectedRows
  },
}

module.exports = DocenteCursoModel