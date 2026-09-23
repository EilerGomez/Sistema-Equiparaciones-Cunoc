const { pool } = require('../config/db')

const getDictamenAutoIncrement = async (_req, res) => {
  try {
    const [[row]] = await pool.query(`
      SELECT AUTO_INCREMENT AS proximo_id
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'dictamen'
      LIMIT 1
    `)

    const [[ultimo]] = await pool.query(`
      SELECT COALESCE(MAX(id), 0) AS ultimo_id FROM dictamen
    `)

    const ultimo_id  = Number(ultimo?.ultimo_id  || 0)
    // AUTO_INCREMENT a veces viene igual al max — asegura que sea al menos max+1
    const proximo_id = Math.max(Number(row?.proximo_id || 1), ultimo_id + 1)

    res.json({ proximo_id, ultimo_id })
  } catch (err) {
    console.error('getDictamenAutoIncrement error:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

const setDictamenAutoIncrement = async (req, res) => {
  try {
    const nuevo_id = Number(req.body.nuevo_id)

    if (!Number.isInteger(nuevo_id) || nuevo_id < 1) {
      return res.status(400).json({ message: 'El ID debe ser un número entero positivo' })
    }

    const [[existente]] = await pool.query(
      `SELECT id FROM dictamen WHERE id >= ? LIMIT 1`,
      [nuevo_id]
    )

    if (existente) {
      return res.status(409).json({
        message: `Ya existe un dictamen con ID ${existente.id}. El nuevo ID debe ser mayor que el último registrado.`,
        id_conflicto: existente.id,
      })
    }

    await pool.query(`ALTER TABLE dictamen AUTO_INCREMENT = ?`, [nuevo_id])

    const [[confirmacion]] = await pool.query(`
      SELECT AUTO_INCREMENT AS proximo_id
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'dictamen'
      LIMIT 1
    `)

    const [[ultimo]] = await pool.query(
      `SELECT COALESCE(MAX(id), 0) AS ultimo_id FROM dictamen`
    )

    const ultimo_id  = Number(ultimo?.ultimo_id || 0)
    const proximo_id = Math.max(Number(confirmacion?.proximo_id || nuevo_id), ultimo_id + 1)

    res.json({
      message: `El próximo dictamen se creará con ID ${proximo_id}`,
      proximo_id,
    })
  } catch (err) {
    console.error('setDictamenAutoIncrement error:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

module.exports = { getDictamenAutoIncrement, setDictamenAutoIncrement }