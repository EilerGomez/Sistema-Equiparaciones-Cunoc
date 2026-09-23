const { pool } = require('../config/db')

const CicloModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.id_codigo_ciclo,
        cc.codigo,
        c.anio,
        CONCAT(cc.codigo, ' ', c.anio) AS descripcion
      FROM ciclo c
      JOIN codigo_ciclo cc ON cc.id = c.id_codigo_ciclo
      ORDER BY c.anio DESC, cc.codigo ASC
      `
    )

    return rows
  },

  async findById(id) {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.id_codigo_ciclo,
        cc.codigo,
        c.anio,
        CONCAT(cc.codigo, ' ', c.anio) AS descripcion
      FROM ciclo c
      JOIN codigo_ciclo cc ON cc.id = c.id_codigo_ciclo
      WHERE c.id = ?
      LIMIT 1
      `,
      [id]
    )

    return rows[0] || null
  },

  async create({ id_codigo_ciclo, anio }) {
    const [result] = await pool.query(
      `
      INSERT INTO ciclo (
        id_codigo_ciclo,
        anio
      )
      VALUES (?, ?)
      `,
      [id_codigo_ciclo, anio]
    )

    return result.insertId
  },

  async update(id, { id_codigo_ciclo, anio }) {
    const [result] = await pool.query(
      `
      UPDATE ciclo
      SET
        id_codigo_ciclo = ?,
        anio = ?
      WHERE id = ?
      `,
      [id_codigo_ciclo, anio, id]
    )

    return result.affectedRows
  },

  async delete(id) {
    const [result] = await pool.query(
      `
      DELETE FROM ciclo
      WHERE id = ?
      `,
      [id]
    )

    return result.affectedRows
  },
}

module.exports = CicloModel