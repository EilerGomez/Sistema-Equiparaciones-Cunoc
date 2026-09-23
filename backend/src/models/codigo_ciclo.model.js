const { pool } = require('../config/db')

const CodigoCicloModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        codigo
      FROM codigo_ciclo
      ORDER BY id ASC
      `
    )

    return rows
  },

  async findById(id) {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        codigo
      FROM codigo_ciclo
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    )

    return rows[0] || null
  },
}

module.exports = CodigoCicloModel