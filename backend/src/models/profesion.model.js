const { pool } = require('../config/db');

const ProfesionModel = {
  async findAll() {
    const [rows] = await pool.query(
      `SELECT * FROM profesiones ORDER BY nombre ASC`
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT * FROM profesiones WHERE id = ? LIMIT 1`, [id]
    );
    return rows[0] || null;
  },

  async create({ nombre, subfijo }) {
    const [result] = await pool.query(
      `INSERT INTO profesiones (nombre, subfijo) VALUES (?, ?)`,
      [nombre, subfijo]
    );
    return result.insertId;
  },

  async update(id, { nombre, subfijo }) {
    const [result] = await pool.query(
      `UPDATE profesiones SET nombre = ?, subfijo = ? WHERE id = ?`,
      [nombre, subfijo, id]
    );
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await pool.query(
      `DELETE FROM profesiones WHERE id = ?`, [id]
    );
    return result.affectedRows;
  },
};

module.exports = ProfesionModel;
