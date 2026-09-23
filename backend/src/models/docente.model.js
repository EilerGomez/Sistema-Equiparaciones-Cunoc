const { pool } = require('../config/db')

const DocenteModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        d.id,
        d.codigo,
        d.nombre,
        d.telefono,
        d.correo,
        d.id_profesion,
        d.url_firma,
        p.nombre AS profesion,
        p.subfijo AS subfijo,
        p.subfijo AS profesion_subfijo
      FROM docente d
      JOIN profesiones p ON p.id = d.id_profesion
      ORDER BY d.nombre ASC
      `
    )

    return rows
  },

  async findById(id) {
    const [rows] = await pool.query(
      `
      SELECT
        d.id,
        d.codigo,
        d.nombre,
        d.telefono,
        d.correo,
        d.id_profesion,
        d.url_firma,
        p.nombre AS profesion,
        p.subfijo AS subfijo,
        p.subfijo AS profesion_subfijo
      FROM docente d
      JOIN profesiones p ON p.id = d.id_profesion
      WHERE d.id = ?
      LIMIT 1
      `,
      [Number(id)]
    )

    return rows[0] || null
  },

  async create({ codigo, nombre, telefono, correo, id_profesion }) {
    const [result] = await pool.query(
      `
      INSERT INTO docente (
        codigo,
        nombre,
        telefono,
        correo,
        id_profesion,
        url_firma
      )
      VALUES (?, ?, ?, ?, ?, NULL)
      `,
      [
        codigo ? String(codigo).trim() : null,
        String(nombre).trim(),
        telefono ? String(telefono).trim() : null,
        correo ? String(correo).trim() : null,
        Number(id_profesion),
      ]
    )

    return result.insertId
  },

  async update(id, { codigo, nombre, telefono, correo, id_profesion }) {
    const [result] = await pool.query(
      `
      UPDATE docente
      SET
        codigo = ?,
        nombre = ?,
        telefono = ?,
        correo = ?,
        id_profesion = ?
      WHERE id = ?
      `,
      [
        codigo ? String(codigo).trim() : null,
        String(nombre).trim(),
        telefono ? String(telefono).trim() : null,
        correo ? String(correo).trim() : null,
        Number(id_profesion),
        Number(id),
      ]
    )

    return result.affectedRows
  },

  async updateFirma(id, url_firma) {
    const [result] = await pool.query(
      `
      UPDATE docente
      SET url_firma = ?
      WHERE id = ?
      `,
      [url_firma, Number(id)]
    )

    return result.affectedRows
  },

  async delete(id) {
    const [result] = await pool.query(
      `
      DELETE FROM docente
      WHERE id = ?
      `,
      [Number(id)]
    )

    return result.affectedRows
  },
}

module.exports = DocenteModel