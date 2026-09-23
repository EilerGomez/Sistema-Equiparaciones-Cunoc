const { pool } = require('../config/db');

const PensumModel = {
  async findAll(filters = {}) {
    let query = `
      SELECT
        p.*,
        c.descripcion AS carrera,
        c.subfijo     AS carrera_subfijo,
        c.id_institucion,
        i.codigo      AS institucion_codigo,
        i.nombre      AS institucion_nombre
      FROM pensum p
      JOIN carreras    c ON c.id = p.id_carrera
      JOIN instituciones i ON i.id = c.id_institucion
    `
    const params = []

    if (filters.id_institucion) {
      query += ' WHERE c.id_institucion = ?'
      params.push(Number(filters.id_institucion))
    }

    query += ' ORDER BY p.anio DESC, c.descripcion'

    const [rows] = await pool.query(query, params)
    return rows
  },

  async findByCodigo(codigo) {
    const [rows] = await pool.query(
      `SELECT p.*, c.descripcion AS carrera, c.subfijo AS carrera_subfijo
       FROM pensum p
       JOIN carreras c ON c.id = p.id_carrera
       WHERE p.codigo = ? LIMIT 1`,
      [codigo]
    );
    return rows[0] || null;
  },

  async findByCarrera(id_carrera) {
    const [rows] = await pool.query(
      `SELECT * FROM pensum WHERE id_carrera = ? ORDER BY anio DESC`,
      [id_carrera]
    );
    return rows;
  },

  async create({ codigo, anio, descripcion, vigencia, id_carrera }) {
    await pool.query(
      `INSERT INTO pensum (codigo, anio, descripcion, vigencia, id_carrera)
       VALUES (?, ?, ?, ?, ?)`,
      [codigo, anio, descripcion, vigencia, id_carrera]
    );
    return codigo;
  },

  async update(codigoActual, { codigo, anio, descripcion, vigencia, id_carrera }) {
    const [result] = await pool.query(
      `UPDATE pensum SET codigo = ?, anio = ?, descripcion = ?, vigencia = ?, id_carrera = ?
       WHERE codigo = ?`,
      [codigo, anio, descripcion, vigencia, id_carrera, codigoActual]
    );
    return result.affectedRows;
  },

  async delete(codigo) {
    const [result] = await pool.query(
      `DELETE FROM pensum WHERE codigo = ?`, [codigo]
    );
    return result.affectedRows;
  },
};

module.exports = PensumModel;