const { pool } = require('../config/db')

const ConfiguracionCartasDictamenModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        semestre,
        nombre_semestre,
        omite_carta,
        creado_en,
        actualizado_en
      FROM configuracion_cartas_dictamen
      ORDER BY semestre ASC
      `
    )

    return rows
  },

  async findById(id) {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        semestre,
        nombre_semestre,
        omite_carta,
        creado_en,
        actualizado_en
      FROM configuracion_cartas_dictamen
      WHERE id = ?
      LIMIT 1
      `,
      [Number(id)]
    )

    return rows[0] || null
  },

  async findBySemestre(semestre) {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        semestre,
        nombre_semestre,
        omite_carta,
        creado_en,
        actualizado_en
      FROM configuracion_cartas_dictamen
      WHERE semestre = ?
      LIMIT 1
      `,
      [Number(semestre)]
    )

    return rows[0] || null
  },

  async create({ semestre, nombre_semestre, omite_carta = 0 }) {
    const [result] = await pool.query(
      `
      INSERT INTO configuracion_cartas_dictamen (
        semestre,
        nombre_semestre,
        omite_carta
      )
      VALUES (?, ?, ?)
      `,
      [
        Number(semestre),
        String(nombre_semestre).trim(),
        Number(omite_carta) ? 1 : 0,
      ]
    )

    return result.insertId
  },

  async update(id, { semestre, nombre_semestre, omite_carta }) {
    const [result] = await pool.query(
      `
      UPDATE configuracion_cartas_dictamen
      SET
        semestre = ?,
        nombre_semestre = ?,
        omite_carta = ?
      WHERE id = ?
      `,
      [
        Number(semestre),
        String(nombre_semestre).trim(),
        Number(omite_carta) ? 1 : 0,
        Number(id),
      ]
    )

    return result.affectedRows
  },

  async updateOmitirCarta(id, { omite_carta }) {
    const [result] = await pool.query(
      `
      UPDATE configuracion_cartas_dictamen
      SET omite_carta = ?
      WHERE id = ?
      `,
      [
        Number(omite_carta) ? 1 : 0,
        Number(id),
      ]
    )

    return result.affectedRows
  },

  async delete(id) {
    const [result] = await pool.query(
      `
      DELETE FROM configuracion_cartas_dictamen
      WHERE id = ?
      `,
      [Number(id)]
    )

    return result.affectedRows
  },
}

module.exports = ConfiguracionCartasDictamenModel