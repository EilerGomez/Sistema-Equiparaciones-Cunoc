const { pool } = require('../config/db')

const SedeModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        nombre,
        ubicacion
      FROM cede
      ORDER BY nombre ASC
      `
    )

    return rows
  },

  async findById(id) {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        nombre,
        ubicacion
      FROM cede
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    )

    return rows[0] || null
  },

  async create({ nombre, ubicacion }) {
    const [result] = await pool.query(
      `
      INSERT INTO cede (
        nombre,
        ubicacion
      )
      VALUES (?, ?)
      `,
      [
        nombre,
        ubicacion || null,
      ]
    )

    return result.insertId
  },

  async update(id, { nombre, ubicacion }) {
    const [result] = await pool.query(
      `
      UPDATE cede
      SET
        nombre = ?,
        ubicacion = ?
      WHERE id = ?
      `,
      [
        nombre,
        ubicacion || null,
        id,
      ]
    )

    return result.affectedRows
  },

  async delete(id) {
    const [result] = await pool.query(
      `
      DELETE FROM cede
      WHERE id = ?
      `,
      [id]
    )

    return result.affectedRows
  },
}

module.exports = SedeModel