require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool, testConnection } = require('./db');

const migrate = async () => {
  await testConnection();
  const conn = await pool.getConnection();

  try {
    console.log('🔄 Ejecutando migraciones...');

    // ── Existentes ────────────────────────────────────────

    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nombre    VARCHAR(50) NOT NULL UNIQUE,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      INSERT IGNORE INTO roles (nombre) VALUES ('admin'), ('coordinador'), ('estudiante')
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nombre         VARCHAR(100) NOT NULL,
        email          VARCHAR(150) NOT NULL UNIQUE,
        password_hash  VARCHAR(255) NOT NULL,
        rol_id         INT UNSIGNED NOT NULL DEFAULT 3,
        activo         TINYINT(1) NOT NULL DEFAULT 1,
        creado_en      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (rol_id) REFERENCES roles(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NOT NULL,
        token      VARCHAR(512) NOT NULL,
        tipo       ENUM('refresh', 'reset_password', 'verificacion') NOT NULL,
        expira_en  DATETIME NOT NULL,
        usado      TINYINT(1) NOT NULL DEFAULT 0,
        creado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_token (token(255)),
        INDEX idx_usuario_tipo (usuario_id, tipo)
      )
    `);

    // ── Nuevas ────────────────────────────────────────────

    await conn.query(`
      CREATE TABLE IF NOT EXISTS profesiones (
        id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nombre  VARCHAR(100) NOT NULL,
        subfijo VARCHAR(20)  NOT NULL COMMENT 'Ej: Ing., Lic., Dr.'
      )
    `);
     await conn.query(`
      INSERT IGNORE INTO profesiones (nombre, subfijo)
      VALUES ('No indica', 'No indica'),
             ('Ingeniería', 'Ing.'),
             ('Licenciatura', 'Lic.'),
             ('Doctorado', 'Dr.'),
             ('Maestría', 'Msc.')
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS carreras (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo      VARCHAR(20)  NOT NULL UNIQUE,
        descripcion VARCHAR(150) NOT NULL UNIQUE,
        subfijo      VARCHAR(50)  NOT NULL COMMENT 'Ej: Ing. Sistemas, Ing. Civil, Ing. Industrial, etc.'
      )
    `);

    await conn.query(`
      INSERT IGNORE INTO carreras (codigo, descripcion, subfijo)
      VALUES ('120058', 'Ingeniería en Ciencias y Sistemas', 'Ing. Sistemas')
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS pensum (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo      CHAR(10)     NOT NULL UNIQUE,
        anio        YEAR         NOT NULL,
        descripcion VARCHAR(150) NOT NULL,
        vigencia    INT          NOT NULL COMMENT '1 = vigente, 0 = no vigente',
        id_carrera  INT UNSIGNED NOT NULL,
        FOREIGN KEY (id_carrera) REFERENCES carreras(id)
      )
    `);

    await conn.query(`
      INSERT IGNORE INTO pensum (codigo, anio, descripcion, vigencia, id_carrera)
      SELECT '2025-58', 2025, 'Pensum 2025', 1, id FROM carreras WHERE codigo = '120058'
      UNION ALL
      SELECT '2016-58', 2016, 'Pensum 2016', 0, id FROM carreras WHERE codigo = '120058'
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS ciclo (
        id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(20) NOT NULL,
        anio   YEAR        NOT NULL,
        UNIQUE KEY uq_ciclo (codigo, anio)
      )
    `);

    await conn.query(`
      INSERT IGNORE INTO ciclo (codigo, anio)
      VALUES ('Año 2026', 2026)
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS curso (
        id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo    CHAR(10)     NOT NULL,
        nombre    VARCHAR(150) NOT NULL,
        id_pensum CHAR(10)     NOT NULL,
        semestre  INT          NOT NULL,
        (codigo, id_pensum) UNIQUE,

      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS docente (
        id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo       VARCHAR(20)  NULL UNIQUE COMMENT 'Código opcional del docente',
        nombre       VARCHAR(150) NOT NULL UNIQUE,
        telefono     VARCHAR(20)  NULL,
        correo       VARCHAR(150) NULL UNIQUE,
        id_profesion INT UNSIGNED NOT NULL,
        FOREIGN KEY (id_profesion) REFERENCES profesiones(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS docente_curso (
        id_curso   CHAR(10)     NOT NULL,
        id_docente INT UNSIGNED NOT NULL,
        id_ciclo   INT UNSIGNED NOT NULL,
        activo    TINYINT(1)  NOT NULL DEFAULT 0,
        PRIMARY KEY (id_curso, id_docente, id_ciclo),
        FOREIGN KEY (id_curso)   REFERENCES curso(codigo) ON UPDATE CASCADE,
        FOREIGN KEY (id_docente) REFERENCES docente(id),
        FOREIGN KEY (id_ciclo)   REFERENCES ciclo(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS instituciones (
        id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(20)  NOT NULL UNIQUE,
        nombre VARCHAR(150) NOT NULL
      )
    `);

    await conn.query(`
      INSERT IGNORE INTO instituciones (codigo, nombre)
      VALUES ('USAC',  'Universidad de San Carlos de Guatemala'),
             ('CUNOC', 'Centro Universitario de Occidente')
    `);
        await conn.query(`
      CREATE TABLE IF NOT EXISTS autoridades (
        id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        codigo       VARCHAR(50)  NOT NULL UNIQUE,
        descripcion  VARCHAR(200) NOT NULL,
        nombre       VARCHAR(150) NOT NULL,
        id_profesion INT UNSIGNED NOT NULL,
        FOREIGN KEY (id_profesion) REFERENCES profesiones(id)
      )
    `);

    await conn.query(`
      INSERT IGNORE INTO autoridades (codigo, descripcion, nombre, id_profesion)
      SELECT 'COO_ING_SISTEMAS',
             'Coordinador de Ingeniería en Ciencias y Sistemas',
             'Juan Perez',
             id
      FROM profesiones
      WHERE nombre = 'Ingeniería'

      UNION ALL

      SELECT 'DIRECTOR_ING',
             'Director de Ciencias de la Ingeniería',
             'Raul',
             id
      FROM profesiones
      WHERE nombre = 'Ingeniería'
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS cede (
        id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nombre    VARCHAR(150) NOT NULL UNIQUE,
        ubicacion VARCHAR(255) NULL
      )
    `);

    await conn.query(`
      INSERT IGNORE INTO cede (nombre, ubicacion)
      VALUES ('Quetzaltenango', '')
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS equivalencia_curso (
        id_curso1 INT UNSIGNED NOT NULL,
        id_curso2 INT UNSIGNED NOT NULL,

        PRIMARY KEY (id_curso1, id_curso2),

        FOREIGN KEY (id_curso1) REFERENCES curso(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        FOREIGN KEY (id_curso2) REFERENCES curso(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CHECK (id_curso1 <> id_curso2)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS equivalencia_curso (
        codigo_curso_de CHAR(10) NOT NULL,
        id_pensum_de    CHAR(10) NOT NULL,

        codigo_curso_a  CHAR(10) NOT NULL,
        id_pensum_a     CHAR(10) NOT NULL,

        entre_pensum TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = si, 0 = no',

        PRIMARY KEY (
          codigo_curso_de,
          id_pensum_de,
          codigo_curso_a,
          id_pensum_a
        ),

        FOREIGN KEY (codigo_curso_de) REFERENCES curso(codigo)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        FOREIGN KEY (id_pensum_de) REFERENCES pensum(codigo)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        FOREIGN KEY (codigo_curso_a) REFERENCES curso(codigo)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        FOREIGN KEY (id_pensum_a) REFERENCES pensum(codigo)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CHECK (
          NOT (
            codigo_curso_de = codigo_curso_a
            AND id_pensum_de = id_pensum_a
          )
        )
      )
    `);
    console.log('✅ Migraciones completadas');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
};

migrate();