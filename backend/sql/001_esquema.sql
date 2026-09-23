CREATE TABLE IF NOT EXISTS roles (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(50) NOT NULL UNIQUE,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS usuarios (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 rol_id INT UNSIGNED NOT NULL,
 activo TINYINT(1) NOT NULL DEFAULT 1,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS tokens (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 token VARCHAR(512) NOT NULL,
 tipo ENUM('refresh','reset_password','verificacion') NOT NULL,
 expira_en DATETIME NOT NULL,
 usado TINYINT(1) NOT NULL DEFAULT 0,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
 INDEX idx_token (token(255)),
 INDEX idx_usuario_tipo (usuario_id,tipo)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS profesiones (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL UNIQUE,
 subfijo VARCHAR(20) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS instituciones (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(20) NOT NULL UNIQUE,
 nombre VARCHAR(150) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS carreras (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(20) NOT NULL UNIQUE,
 descripcion VARCHAR(150) NOT NULL,
 subfijo VARCHAR(50) NOT NULL,
 id_institucion INT UNSIGNED NOT NULL,
 FOREIGN KEY (id_institucion) REFERENCES instituciones(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS pensum (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(20) NOT NULL UNIQUE,
 anio YEAR NOT NULL,
 descripcion VARCHAR(150) NOT NULL,
 vigencia TINYINT(1) NOT NULL DEFAULT 0,
 id_carrera INT UNSIGNED NOT NULL,
 FOREIGN KEY (id_carrera) REFERENCES carreras(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS curso (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(20) NOT NULL UNIQUE,
 nombre VARCHAR(150) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS pensum_curso (
 id_curso INT UNSIGNED NOT NULL,
 id_pensum INT UNSIGNED NOT NULL,
 semestre INT UNSIGNED NULL,
 PRIMARY KEY (id_curso,id_pensum),
 FOREIGN KEY (id_curso) REFERENCES curso(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_pensum) REFERENCES pensum(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CHECK (semestre IS NULL OR semestre BETWEEN 1 AND 20)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS equivalencia_curso (
 id_curso_de INT UNSIGNED NOT NULL,
 id_curso_a INT UNSIGNED NOT NULL,
 porcentaje DECIMAL(5,2) NOT NULL DEFAULT 100.00,
 opinion VARCHAR(50) NOT NULL DEFAULT 'EQUIVALENTE',
 PRIMARY KEY (id_curso_de,id_curso_a),
 FOREIGN KEY (id_curso_de) REFERENCES curso(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_curso_a) REFERENCES curso(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CHECK (porcentaje BETWEEN 0 AND 100),
 CHECK (CHAR_LENGTH(TRIM(opinion)) > 0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS cede (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(150) NOT NULL UNIQUE,
 ubicacion VARCHAR(255) NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS autoridades (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(50) NOT NULL UNIQUE,
 descripcion VARCHAR(200) NOT NULL,
 nombre VARCHAR(150) NOT NULL,
 id_profesion INT UNSIGNED NOT NULL,
 url_firma VARCHAR(700) NULL,
 url_sello VARCHAR(700) NULL,
 FOREIGN KEY (id_profesion) REFERENCES profesiones(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS estudiante (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombre_completo VARCHAR(150) NOT NULL,
 carnet VARCHAR(30) NOT NULL UNIQUE,
 registro_academico VARCHAR(50) NOT NULL,
 usuario_id INT UNSIGNED NULL UNIQUE,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS correlativo_equiparacion (
 anio SMALLINT UNSIGNED PRIMARY KEY,
 ultimo_numero INT UNSIGNED NOT NULL DEFAULT 0,
 CHECK (anio BETWEEN 2000 AND 9999)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS equiparacion (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_carrera_equivalencia INT UNSIGNED NOT NULL,
 anio SMALLINT UNSIGNED NOT NULL,
 correlativo INT UNSIGNED NOT NULL,
 codigo VARCHAR(30) GENERATED ALWAYS AS (CONCAT(correlativo,'-',anio)) STORED,
 id_sede INT UNSIGNED NULL,
 fecha_impresion DATETIME NULL,
 prov_ryca VARCHAR(20) NULL,
 fecha_prov_ryca DATE NULL,
 id_estudiante INT UNSIGNED NOT NULL,
 id_carrera_de INT UNSIGNED NULL,
 id_pensum_de INT UNSIGNED NULL,
 id_institucion_de INT UNSIGNED NULL,
 id_carrera_a INT UNSIGNED NULL,
 id_pensum_a INT UNSIGNED NULL,
 id_institucion_a INT UNSIGNED NULL,
 id_autoridad_coordinador INT UNSIGNED NOT NULL,
 id_autoridad_director INT UNSIGNED NOT NULL,
 num_expediente VARCHAR(80) NULL,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 url_archivo VARCHAR(700) NULL,
 estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
 observaciones VARCHAR(1000) NULL,
 UNIQUE KEY uq_equiparacion_anual (anio,correlativo),
 UNIQUE KEY uq_equiparacion_codigo (codigo),
 INDEX idx_equiparacion_estudiante (id_estudiante),
 FOREIGN KEY (anio) REFERENCES correlativo_equiparacion(anio) ON DELETE RESTRICT,
 FOREIGN KEY (id_carrera_equivalencia) REFERENCES carreras(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_sede) REFERENCES cede(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_estudiante) REFERENCES estudiante(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_carrera_de) REFERENCES carreras(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_pensum_de) REFERENCES pensum(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_institucion_de) REFERENCES instituciones(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_carrera_a) REFERENCES carreras(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_pensum_a) REFERENCES pensum(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_institucion_a) REFERENCES instituciones(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_autoridad_coordinador) REFERENCES autoridades(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_autoridad_director) REFERENCES autoridades(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 CHECK (correlativo > 0),
 CHECK (estado IN ('PENDIENTE','LISTO'))
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS cursos_equiparacion (
 numero INT UNSIGNED NOT NULL,
 id_equiparacion INT UNSIGNED NOT NULL,
 id_curso_de INT UNSIGNED NULL,
 id_curso_a INT UNSIGNED NULL,
 fecha_impresion DATETIME NULL,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id_equiparacion,numero),
 UNIQUE KEY uq_equiparacion_equivalencia (id_equiparacion,id_curso_de,id_curso_a),
 FOREIGN KEY (id_equiparacion) REFERENCES equiparacion(id) ON UPDATE CASCADE ON DELETE CASCADE,
 FOREIGN KEY (id_curso_de,id_curso_a) REFERENCES equivalencia_curso(id_curso_de,id_curso_a) ON UPDATE CASCADE ON DELETE RESTRICT,
 CHECK (numero > 0)
) ENGINE=InnoDB;
INSERT IGNORE INTO roles(id,nombre) VALUES (1,'admin'),(2,'coordinador'),(3,'estudiante');
INSERT IGNORE INTO usuarios(nombre,email,password_hash,rol_id,activo)
 SELECT 'Ana García','anagabriela_garcia@cunoc.edu.gt',
 '$argon2id$v=19$m=65536,t=3,p=2$9K+CHigjnf331EN/mKA+kQ$RuM6kiiSaFD4AqV1bU+fZn227uk076pN8vlbM68bMz4',
 id,1 FROM roles WHERE nombre='admin';
INSERT IGNORE INTO profesiones(nombre,subfijo) VALUES ('No indica',''),('Ingenieria','Ing.'),('Licenciatura','Lic.'),('Doctorado','Dr.'),('Maestria','MSc.');
INSERT IGNORE INTO instituciones(codigo,nombre) VALUES ('CUNOC','Centro Universitario de Occidente');
INSERT IGNORE INTO cede(nombre,ubicacion) VALUES ('Quetzaltenango','Quetzaltenango, Guatemala');
INSERT IGNORE INTO carreras(codigo,descripcion,subfijo,id_institucion)
 SELECT '120058','Ingenieria en Ciencias y Sistemas','Ing. Sistemas',id FROM instituciones WHERE codigo='CUNOC';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2016-56',2016,'Pensum Sistemas 2016',0,id FROM carreras WHERE codigo='120058';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2025-58',2025,'Pensum Sistemas 2025',1,id FROM carreras WHERE codigo='120058';
