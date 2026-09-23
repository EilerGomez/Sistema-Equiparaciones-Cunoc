const { pool } = require('../config/db')

const EquivalenciaCursoModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        ec.id_curso_de,
        ec.id_curso_a,

        cde.codigo AS curso_de_codigo,
        cde.nombre AS curso_de_nombre,

        ca.codigo AS curso_a_codigo,
        ca.nombre AS curso_a_nombre,

        GROUP_CONCAT(
          DISTINCT CASE
            WHEN pde.vigencia = 0 THEN CONCAT(pde.codigo, ' - ', pde.descripcion)
          END
          ORDER BY pde.anio DESC SEPARATOR ', '
        ) AS pensums_de_no_vigentes,

        GROUP_CONCAT(
          DISTINCT CASE
            WHEN pa.vigencia = 1 THEN CONCAT(pa.codigo, ' - ', pa.descripcion)
          END
          ORDER BY pa.anio DESC SEPARATOR ', '
        ) AS pensums_a_vigentes

      FROM equivalencia_curso ec

      JOIN curso cde
        ON cde.id = ec.id_curso_de

      JOIN curso ca
        ON ca.id = ec.id_curso_a

      LEFT JOIN pensum_curso pcde
        ON pcde.id_curso = cde.id

      LEFT JOIN pensum pde
        ON pde.id = pcde.id_pensum

      LEFT JOIN pensum_curso pca
        ON pca.id_curso = ca.id

      LEFT JOIN pensum pa
        ON pa.id = pca.id_pensum

      GROUP BY
        ec.id_curso_de,
        ec.id_curso_a,
        cde.codigo,
        cde.nombre,
        ca.codigo,
        ca.nombre

      ORDER BY
        cde.codigo ASC,
        ca.codigo ASC
      `
    )

    return rows
  },

  async findOne({ id_curso_de, id_curso_a }) {
    const [rows] = await pool.query(
      `
      SELECT
        ec.id_curso_de,
        ec.id_curso_a,

        cde.codigo AS curso_de_codigo,
        cde.nombre AS curso_de_nombre,

        ca.codigo AS curso_a_codigo,
        ca.nombre AS curso_a_nombre

      FROM equivalencia_curso ec

      JOIN curso cde
        ON cde.id = ec.id_curso_de

      JOIN curso ca
        ON ca.id = ec.id_curso_a

      WHERE ec.id_curso_de = ?
        AND ec.id_curso_a = ?

      LIMIT 1
      `,
      [
        Number(id_curso_de),
        Number(id_curso_a),
      ]
    )

    return rows[0] || null
  },

  async exists({ id_curso_de, id_curso_a }) {
    const [rows] = await pool.query(
      `
      SELECT 1
      FROM equivalencia_curso
      WHERE id_curso_de = ?
        AND id_curso_a = ?
      LIMIT 1
      `,
      [
        Number(id_curso_de),
        Number(id_curso_a),
      ]
    )

    return rows.length > 0
  },

  async create({ id_curso_de, id_curso_a }) {
    const [result] = await pool.query(
      `
      INSERT INTO equivalencia_curso (
        id_curso_de,
        id_curso_a
      )
      VALUES (?, ?)
      `,
      [
        Number(id_curso_de),
        Number(id_curso_a),
      ]
    )

    return result.affectedRows
  },

  async update({
    old_id_curso_de,
    old_id_curso_a,
    id_curso_de,
    id_curso_a,
  }) {
    const [result] = await pool.query(
      `
      UPDATE equivalencia_curso
      SET
        id_curso_de = ?,
        id_curso_a = ?
      WHERE id_curso_de = ?
        AND id_curso_a = ?
      `,
      [
        Number(id_curso_de),
        Number(id_curso_a),
        Number(old_id_curso_de),
        Number(old_id_curso_a),
      ]
    )

    return result.affectedRows
  },

  async delete({ id_curso_de, id_curso_a }) {
    const [result] = await pool.query(
      `
      DELETE FROM equivalencia_curso
      WHERE id_curso_de = ?
        AND id_curso_a = ?
      `,
      [
        Number(id_curso_de),
        Number(id_curso_a),
      ]
    )

    return result.affectedRows
  },
}

module.exports = EquivalenciaCursoModel