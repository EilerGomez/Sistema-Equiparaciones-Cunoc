const { pool } = require('../config/db');

const TokenModel = {
  async create({ usuarioId, token, tipo, expiresInMinutes }) {
    const expiraEn = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const [result] = await pool.query(
      `INSERT INTO tokens (usuario_id, token, tipo, expira_en) VALUES (?, ?, ?, ?)`,
      [usuarioId, token, tipo, expiraEn]
    );
    return result.insertId;
  },

  async findValid({ token, tipo }) {
    const [rows] = await pool.query(
      `SELECT * FROM tokens
       WHERE token = ? AND tipo = ? AND usado = 0 AND expira_en > NOW()
       LIMIT 1`,
      [token, tipo]
    );
    return rows[0] || null;
  },

  async markUsed(id) {
    await pool.query(`UPDATE tokens SET usado = 1 WHERE id = ?`, [id]);
  },

  async revokeAllForUser({ usuarioId, tipo }) {
    await pool.query(
      `UPDATE tokens SET usado = 1 WHERE usuario_id = ? AND tipo = ? AND usado = 0`,
      [usuarioId, tipo]
    );
  },

  async deleteExpired() {
    await pool.query(`DELETE FROM tokens WHERE expira_en < NOW()`);
  },
};

module.exports = TokenModel;
