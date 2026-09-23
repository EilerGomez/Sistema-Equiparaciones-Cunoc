const { pool } = require('../config/db')

const EstudianteModel = {
  async findAll() {
    const [rows] = await pool.query(`
      SELECT
        e.id,
        e.nombre_completo,
        e.carnet,
        e.registro_academico,
        e.usuario_id,
        e.creado_en,
        e.actualizado_en
      FROM estudiante e
      ORDER BY e.nombre_completo ASC
    `)
    return rows
  },

  async findById(id) {
    const [rows] = await pool.query(`
      SELECT id, nombre_completo, carnet, registro_academico, usuario_id, creado_en, actualizado_en
      FROM estudiante WHERE id = ? LIMIT 1
    `, [Number(id)])
    return rows[0] || null
  },

  async findByUsuarioId(usuario_id) {
    const [rows] = await pool.query(`
      SELECT id, nombre_completo, carnet, registro_academico, usuario_id
      FROM estudiante WHERE usuario_id = ? LIMIT 1
    `, [Number(usuario_id)])
    return rows[0] || null
  },

  async findByCarnetYRegistro(carnet, registro_academico) {
    const [rows] = await pool.query(`
      SELECT id, nombre_completo, carnet, registro_academico, usuario_id
      FROM estudiante
      WHERE carnet = ? AND registro_academico = ? LIMIT 1
    `, [carnet.trim(), registro_academico.trim()])
    return rows[0] || null
  },

  // Asocia un usuario a un estudiante existente
  async asociarUsuario(id, usuario_id) {
    const [result] = await pool.query(`
      UPDATE estudiante SET usuario_id = ? WHERE id = ?
    `, [Number(usuario_id), Number(id)])
    return result.affectedRows
  },

  async create({ nombre_completo, carnet, registro_academico, usuario_id = null }) {
    const [result] = await pool.query(`
      INSERT INTO estudiante (nombre_completo, carnet, registro_academico, usuario_id)
      VALUES (?, ?, ?, ?)
    `, [
      String(nombre_completo).trim(),
      String(carnet).trim(),
      String(registro_academico).trim(),
      usuario_id,
    ])
    return result.insertId
  },

  async update(id, { nombre_completo, carnet, registro_academico }) {
    const [result] = await pool.query(`
      UPDATE estudiante SET nombre_completo = ?, carnet = ?, registro_academico = ?
      WHERE id = ?
    `, [
      String(nombre_completo).trim(),
      String(carnet).trim(),
      String(registro_academico).trim(),
      Number(id),
    ])
    return result.affectedRows
  },

  async delete(id) {
    const [result] = await pool.query(`DELETE FROM estudiante WHERE id = ?`, [Number(id)])
    return result.affectedRows
  },

  async updateNombre(id, nombre_completo) {
    const [result] = await pool.query(
      `UPDATE estudiante SET nombre_completo = ? WHERE id = ?`,
      [String(nombre_completo).trim(), Number(id)]
    )
    return result.affectedRows
  },

}

module.exports = EstudianteModel