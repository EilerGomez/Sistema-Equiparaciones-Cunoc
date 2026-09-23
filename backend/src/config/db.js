const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset:  'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone: 'Z',
  dateStrings: ['DATE']
});

pool.on('connection', conn => { conn.query("SET time_zone = '+00:00'") });

const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL conectado correctamente');
    conn.release();
  } catch (err) {
    console.error('Error conectando a MySQL:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
