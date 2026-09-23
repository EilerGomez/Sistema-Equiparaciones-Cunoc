const { pool } = require('../config/db');

const CarreraModel = {
  async findAll() {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.codigo,
        c.descripcion,
        c.subfijo,
        c.id_institucion,
        i.codigo AS institucion_codigo,
        i.nombre AS institucion_nombre,
        CONCAT(i.codigo, ' - ', i.nombre) AS institucion
      FROM carreras c
      INNER JOIN instituciones i
        ON i.id = c.id_institucion
      ORDER BY c.descripcion ASC
      `
    );

    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.codigo,
        c.descripcion,
        c.subfijo,
        c.id_institucion,
        i.codigo AS institucion_codigo,
        i.nombre AS institucion_nombre,
        CONCAT(i.codigo, ' - ', i.nombre) AS institucion
      FROM carreras c
      INNER JOIN instituciones i
        ON i.id = c.id_institucion
      WHERE c.id = ?
      LIMIT 1
      `,
      [id]
    );

    return rows[0] || null;
  },

  async findByCodigo(codigo) {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.codigo,
        c.descripcion,
        c.subfijo,
        c.id_institucion,
        i.codigo AS institucion_codigo,
        i.nombre AS institucion_nombre,
        CONCAT(i.codigo, ' - ', i.nombre) AS institucion
      FROM carreras c
      INNER JOIN instituciones i
        ON i.id = c.id_institucion
      WHERE c.codigo = ?
      LIMIT 1
      `,
      [codigo]
    );

    return rows[0] || null;
  },

  async create({ codigo, descripcion, subfijo, id_institucion }) {
    const [result] = await pool.query(
      `
      INSERT INTO carreras (
        codigo,
        descripcion,
        subfijo,
        id_institucion
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        codigo,
        descripcion,
        subfijo,
        Number(id_institucion),
      ]
    );

    return result.insertId;
  },

  async update(id, { codigo, descripcion, subfijo, id_institucion }) {
    const [result] = await pool.query(
      `
      UPDATE carreras
      SET
        codigo = ?,
        descripcion = ?,
        subfijo = ?,
        id_institucion = ?
      WHERE id = ?
      `,
      [
        codigo,
        descripcion,
        subfijo,
        Number(id_institucion),
        id,
      ]
    );

    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await pool.query(
      `DELETE FROM carreras WHERE id = ?`,
      [id]
    );

    return result.affectedRows;
  },
};

module.exports = CarreraModel;