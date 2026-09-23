const { pool } = require('../config/db');

const UserModel = {
  async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT u.*, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.email = ? AND u.activo = 1
       LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.activo, u.creado_en, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.id = ? AND u.activo = 1
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ nombre, email, passwordHash, rolId = 3 }) {
    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES (?, ?, ?, ?)`,
      [nombre, email, passwordHash, rolId]
    );
    return result.insertId;
  },

  async updatePassword(id, passwordHash) {
    await pool.query(
      `UPDATE usuarios SET password_hash = ? WHERE id = ?`,
      [passwordHash, id]
    );
  },
  async updateNombre(id, nombre) {
      const [result] = await pool.query(
        `UPDATE usuarios SET nombre = ? WHERE id = ?`,
        [String(nombre).trim(), Number(id)]
      )
      return result.affectedRows
    },
};

module.exports = UserModel;
