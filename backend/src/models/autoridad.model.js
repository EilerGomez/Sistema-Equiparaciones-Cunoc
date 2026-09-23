const { pool } = require('../config/db')

const AutoridadModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.codigo,
        a.descripcion,
        a.nombre,
        a.id_profesion,
        a.url_firma,
        a.url_sello,
        p.nombre AS profesion,
        p.subfijo AS profesion_subfijo
      FROM autoridades a
      JOIN profesiones p ON p.id = a.id_profesion
      ORDER BY a.descripcion ASC, a.nombre ASC
      `
    )

    return rows
  },

  async findById(id) {
    const [rows] = await pool.query(
      `
      SELECT
        a.id,
        a.codigo,
        a.descripcion,
        a.nombre,
        a.id_profesion,
        a.url_firma,
        a.url_sello,
        p.nombre AS profesion,
        p.subfijo AS profesion_subfijo
      FROM autoridades a
      JOIN profesiones p ON p.id = a.id_profesion
      WHERE a.id = ?
      LIMIT 1
      `,
      [Number(id)]
    )

    return rows[0] || null
  },

  async create({ codigo, descripcion, nombre, id_profesion }) {
    const [result] = await pool.query(
      `
      INSERT INTO autoridades (
        codigo,
        descripcion,
        nombre,
        id_profesion,
        url_firma,
        url_sello
      )
      VALUES (?, ?, ?, ?, NULL, NULL)
      `,
      [
        String(codigo).trim(),
        String(descripcion).trim(),
        String(nombre).trim(),
        Number(id_profesion),
      ]
    )

    return result.insertId
  },

  async update(id, { descripcion, nombre, id_profesion }) {
    const [result] = await pool.query(
      `
      UPDATE autoridades
      SET
        descripcion = ?,
        nombre = ?,
        id_profesion = ?
      WHERE id = ?
      `,
      [
        String(descripcion).trim(),
        String(nombre).trim(),
        Number(id_profesion),
        Number(id),
      ]
    )

    return result.affectedRows
  },

  async updateImages(id, { url_firma, url_sello }) {
    const fields = []
    const values = []

    if (url_firma !== undefined) {
      fields.push('url_firma = ?')
      values.push(url_firma)
    }

    if (url_sello !== undefined) {
      fields.push('url_sello = ?')
      values.push(url_sello)
    }

    if (fields.length === 0) {
      return 0
    }

    values.push(Number(id))

    const [result] = await pool.query(
      `
      UPDATE autoridades
      SET ${fields.join(', ')}
      WHERE id = ?
      `,
      values
    )

    return result.affectedRows
  },

  async delete(id) {
    const [result] = await pool.query(
      `
      DELETE FROM autoridades
      WHERE id = ?
      `,
      [Number(id)]
    )

    return result.affectedRows
  },
}

module.exports = AutoridadModel