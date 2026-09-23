const { pool } = require('../config/db');

const InstitucionModel = {
  async findAll() {
    const [rows] = await pool.query(
      `SELECT * FROM instituciones ORDER BY nombre ASC`
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT * FROM instituciones WHERE id = ? LIMIT 1`, [id]
    );
    return rows[0] || null;
  },

  async create({ codigo, nombre }) {
    const [result] = await pool.query(
      `INSERT INTO instituciones (codigo, nombre) VALUES (?, ?)`,
      [codigo, nombre]
    );
    return result.insertId;
  },

  async update(id, { codigo, nombre }) {
    const [result] = await pool.query(
      `UPDATE instituciones SET codigo = ?, nombre = ? WHERE id = ?`,
      [codigo, nombre, id]
    );
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await pool.query(
      `DELETE FROM instituciones WHERE id = ?`, [id]
    );
    return result.affectedRows;
  },
};

module.exports = InstitucionModel;
