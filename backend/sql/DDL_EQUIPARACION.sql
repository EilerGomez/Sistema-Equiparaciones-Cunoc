CREATE DATABASE IF NOT EXISTS equiparacion_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE equiparacion_db;
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
 porcentaje DECIMAL(5,2) NULL,
 opinion VARCHAR(50) NULL,
 fecha_impresion DATETIME NULL,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id_equiparacion,numero),
 UNIQUE KEY uq_equiparacion_equivalencia (id_equiparacion,id_curso_de,id_curso_a),
 FOREIGN KEY (id_equiparacion) REFERENCES equiparacion(id) ON UPDATE CASCADE ON DELETE CASCADE,
 FOREIGN KEY (id_curso_de,id_curso_a) REFERENCES equivalencia_curso(id_curso_de,id_curso_a) ON UPDATE CASCADE ON DELETE RESTRICT,
 CHECK (numero > 0)
) ENGINE=InnoDB;
SET @sql = (SELECT IF(COUNT(*)=0,
 'ALTER TABLE cursos_equiparacion ADD COLUMN porcentaje DECIMAL(5,2) NULL AFTER id_curso_a',
 'SELECT 1') FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cursos_equiparacion' AND COLUMN_NAME='porcentaje');
PREPARE migracion_pdf FROM @sql;
EXECUTE migracion_pdf;
DEALLOCATE PREPARE migracion_pdf;
SET @sql = (SELECT IF(COUNT(*)=0,
 'ALTER TABLE cursos_equiparacion ADD COLUMN opinion VARCHAR(50) NULL AFTER porcentaje',
 'SELECT 1') FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cursos_equiparacion' AND COLUMN_NAME='opinion');
PREPARE migracion_pdf FROM @sql;
EXECUTE migracion_pdf;
DEALLOCATE PREPARE migracion_pdf;
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

INSERT IGNORE INTO curso(codigo,nombre) VALUES ('28','Social Humanística 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='28' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3003','Área Social Humanística 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3003' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='28' AND a.codigo='3003';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('29','Social Humanística 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='29' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3011','Área Social Humanística 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3011' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='29' AND a.codigo='3011';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('72','Física Básica');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='72' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3007','Física Básica');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3007' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='72' AND a.codigo='3007';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('146','Física 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='146' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3014','Física 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3014' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='146' AND a.codigo='3014';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('169','Matemática Básica 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='169' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3000','Área Matemática Básica 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3000' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='169' AND a.codigo='3000';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('170','Matemática Básica 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='170' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3006','Área Matemática Básica 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3006' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='170' AND a.codigo='3006';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2667','Técnicas de Investigación y Estudio');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2667' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3005','Técnicas de Estudio e Investigación');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3005' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2667' AND a.codigo='3005';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('290','Matemática Intermedia 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='290' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3013','Área Matemática Intermedia 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3013' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,95.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='290' AND a.codigo='3013';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('291','Matemática Intermedia 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='291' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3021','Área Matemática Intermedia 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3021' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,95.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='291' AND a.codigo='3021';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('292','Matemática Intermedia 3');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='292' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3022','Área Matemática Intermedia 3');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3022' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,95.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='292' AND a.codigo='3022';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('674','Matemática Aplicada 3');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='674' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3027','Matemática Aplicada 3');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3027' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,95.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='674' AND a.codigo='3027';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('673','Matemática Aplicada 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='673' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3028','Matemática Aplicada 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3028' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,95.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='673' AND a.codigo='3028';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('147','Física 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='147' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3023','Física 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3023' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,97.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='147' AND a.codigo='3023';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('177','Deportes 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='177' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3082','Deportes 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3082' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='177' AND a.codigo='3082';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('178','Deportes 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='178' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3086','Deportes 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3086' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='178' AND a.codigo='3086';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2795','Matemática de Cómputo 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2795' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3231','Matemática para Computación 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3231' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2795' AND a.codigo='3231';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2796','Introducción a la Programación y Computación 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2796' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3234','Introducción a la Programación y Computación 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3234' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2796' AND a.codigo='3234';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2797','Lógica de Sistemas');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2797' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3232','Lógica de Sistemas');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3232' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2797' AND a.codigo='3232';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('949','Estadística 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='949' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3090','Estadística 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3090' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='949' AND a.codigo='3090';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2799','Matemática de Cómputo 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2799' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3233','Matemática para Computación 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3233' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2799' AND a.codigo='3233';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2800','Introducción a la Programación y Computación 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2800' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3236','Introducción a la Programación y Computación 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3236' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2800' AND a.codigo='3236';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2803','Organización de Lenguajes y Compiladores 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2803' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3239','Organización de Lenguajes y Compiladores 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3239' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2803' AND a.codigo='3239';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2804','Organización Computacional');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2804' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3240','Organización Computacional');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3240' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2804' AND a.codigo='3240';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2805','Estructura de Datos');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2805' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3241','Estructura de Datos');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3241' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2805' AND a.codigo='3241';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2807','Práctica Inicial TI');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2807' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3238','Prácticas Iniciales');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3238' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2807' AND a.codigo='3238';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('685','Investigación de Operaciones 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='685' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3243','Investigación de Operaciones 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3243' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='685' AND a.codigo='3243';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2809','Economía');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2809' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3244','Economía');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3244' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2809' AND a.codigo='3244';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2810','Organización de Lenguajes y Compiladores 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2810' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3245','Organización de Lenguajes y Compiladores 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3245' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2810' AND a.codigo='3245';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2811','Arquitectura de Computadores y Ensambladores 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2811' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3246','Arquitectura de Computadoras y Ensambladores 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3246' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2811' AND a.codigo='3246';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2812','Manejo e Implementación de Archivos');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2812' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3247','Manejo e Implementación de Archivos');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3247' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2812' AND a.codigo='3247';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('795','Investigación de Operaciones 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='795' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3249','Investigación de Operaciones 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3249' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='795' AND a.codigo='3249';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2813','Teoría de Sistemas 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2813' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3248','Teoría de Sistemas 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3248' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2813' AND a.codigo='3248';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2814','Sistemas Operativos 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2814' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3250','Sistemas Operativos 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3250' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2814' AND a.codigo='3250';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2816','Redes de Computadoras 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2816' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3252','Redes de Computadoras 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3252' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2816' AND a.codigo='3252';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2817','Sistemas de Bases de Datos 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2817' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3253','Sistemas de Bases de Datos 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3253' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2817' AND a.codigo='3253';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2818','Práctica Intermedia TI');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2818' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3254','Prácticas Intermedias');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3254' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2818' AND a.codigo='3254';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2815','Arquitectura de Computadores y Ensambladores 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2815' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3251','Arquitectura de Computadoras y Ensambladores 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3251' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2815' AND a.codigo='3251';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2821','Sistemas de Bases de Datos 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2821' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3257','Sistemas de Bases de Datos 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3257' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2821' AND a.codigo='3257';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2819','Sistemas Operativos 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2819' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3255','Sistemas Operativos 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3255' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2819' AND a.codigo='3255';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2820','Redes de Computadoras 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2820' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3256','Redes de Computadoras 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3256' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2820' AND a.codigo='3256';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2822','Análisis y Diseño de Sistemas 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2822' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3258','Análisis y Diseño de Sistemas 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3258' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2822' AND a.codigo='3258';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2823','Seminario de Sistemas 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2823' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3259','Seminario de Sistemas 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3259' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2823' AND a.codigo='3259';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2824','Modelación y Simulación 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2824' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3260','Modelación y Simulación 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3260' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2824' AND a.codigo='3260';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2825','Sistemas Organizacionales y Gerenciales 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2825' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3261','Sistemas Organizacionales y Gerenciales 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3261' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2825' AND a.codigo='3261';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2826','Inteligencia Artificial');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2826' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3262','Inteligencia Artificial 1');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3262' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,90.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2826' AND a.codigo='3262';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2827','Análisis y Diseño de Sistemas 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2827' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3264','Análisis y Diseño de Sistemas 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3264' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2827' AND a.codigo='3264';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2828','Seminario de Sistemas 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2828' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3265','Seminario de Sistemas 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3265' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2828' AND a.codigo='3265';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2829','Práctica Final');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2829' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3268','Prácticas Finales Ingeniería en Ciencia y Sistemas');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3268' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2829' AND a.codigo='3268';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2834','Sistemas Organizacionales y Gerenciales 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2834' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3270','Sistemas Organizacionales y Gerenciales 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3270' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2834' AND a.codigo='3270';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2835','Modelación y Simulación 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2835' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3269','Modelación y Simulación 2');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3269' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2835' AND a.codigo='3269';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2836','Software Avanzado');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2836' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3274','Software Avanzado');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3274' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2836' AND a.codigo='3274';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('2837','Seminario de Investigación');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='2837' AND p.codigo='2016-56';
INSERT IGNORE INTO curso(codigo,nombre) VALUES ('3278','Seminario de Investigación');
INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) SELECT c.id,p.id,NULL FROM curso c CROSS JOIN pensum p WHERE c.codigo='3278' AND p.codigo='2025-58';
INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) SELECT d.id,a.id,100.0,'EQUIVALENTE' FROM curso d CROSS JOIN curso a WHERE d.codigo='2837' AND a.codigo='3278';

-- Catalogos compartidos con el sistema de equivalencias.
UPDATE profesiones SET nombre='Ingeniería',subfijo='Ing.' WHERE nombre='Ingenieria';
UPDATE profesiones SET nombre='Maestría',subfijo='Msc.' WHERE nombre='Maestria';
UPDATE profesiones SET subfijo='No indica' WHERE nombre='No indica';
INSERT IGNORE INTO instituciones(codigo,nombre) VALUES ('USAC','Universidad de San Carlos de Guatemala');
UPDATE instituciones SET nombre='Centro Universitario de Occidente' WHERE codigo='CUNOC';
UPDATE cede SET ubicacion='' WHERE nombre='Quetzaltenango';
INSERT IGNORE INTO carreras(codigo,descripcion,subfijo,id_institucion)
 SELECT '120034','Ingeniería Mecánica','Ing. Mecánica',id FROM instituciones WHERE codigo='CUNOC';
INSERT IGNORE INTO carreras(codigo,descripcion,subfijo,id_institucion)
 SELECT '120033','Ingeniería Civil','Ing. Civil',id FROM instituciones WHERE codigo='CUNOC';
INSERT IGNORE INTO carreras(codigo,descripcion,subfijo,id_institucion)
 SELECT '120035','Ingeniería Industrial','Ing. Industrial',id FROM instituciones WHERE codigo='CUNOC';
INSERT IGNORE INTO carreras(codigo,descripcion,subfijo,id_institucion)
 SELECT '120036','Ingeniería Mecánica Industrial','Ing. Mecánica Industrial',id FROM instituciones WHERE codigo='CUNOC';
UPDATE carreras SET descripcion='Ingeniería en Ciencias y Sistemas' WHERE codigo='120058';
UPDATE pensum SET codigo='2016-56',descripcion='Pensum Sistemas 2016',vigencia=0 WHERE codigo='2016-58';
UPDATE pensum SET descripcion='Pensum Sistemas 2025',vigencia=1 WHERE codigo='2025-58';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2012-34',2012,'Pensum Mecanica 2012',0,id FROM carreras WHERE codigo='120034';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2012-33',2012,'Pensum Civil 2012',0,id FROM carreras WHERE codigo='120033';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2012-35',2012,'Pensum Industrial 2012',0,id FROM carreras WHERE codigo='120035';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2012-36',2012,'Pensum Mecanica Industrial 2012',0,id FROM carreras WHERE codigo='120036';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2025-34',2025,'Pensum Mecanica 2025',1,id FROM carreras WHERE codigo='120034';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2025-33',2025,'Pensum Civil 2025',1,id FROM carreras WHERE codigo='120033';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2024-35',2024,'Pensum Industrial 2024',1,id FROM carreras WHERE codigo='120035';
INSERT IGNORE INTO pensum(codigo,anio,descripcion,vigencia,id_carrera)
 SELECT '2025-36',2025,'Pensum Mecanica Industrial 2025',1,id FROM carreras WHERE codigo='120036';
INSERT IGNORE INTO autoridades(codigo,descripcion,nombre,id_profesion)
 SELECT 'COO_ING_SISTEMAS','Coordinador Ingeniería en Ciencias y Sistemas','JUAN FRANCISCO ROJAS SANTIZO',id FROM profesiones WHERE nombre='Ingeniería';
INSERT IGNORE INTO autoridades(codigo,descripcion,nombre,id_profesion)
 SELECT 'DIRECTOR_ING','Director Division Ciencias de la Ingenería','EDELMAN CÁNDIDO MONZÓN LÓPEZ',id FROM profesiones WHERE nombre='Ingeniería';
INSERT IGNORE INTO autoridades(codigo,descripcion,nombre,id_profesion)
 SELECT 'COO_ING_MECANICA','Coordinador Ingeniería Mecánica','EDWIN ARIEL PÉREZ ALVAREZ',id FROM profesiones WHERE nombre='Ingeniería';
INSERT IGNORE INTO autoridades(codigo,descripcion,nombre,id_profesion)
 SELECT 'COO_ING_CIVIL','Coordinador Ingeniería Civil','NERY IVÁN PÉREZ MORALES',id FROM profesiones WHERE nombre='Ingeniería';
INSERT IGNORE INTO autoridades(codigo,descripcion,nombre,id_profesion)
 SELECT 'COO_ING_INDUSTRIAL','Coordinador Ingeniería Industrial','MARÍA ELENA PÉREZ MORALES',id FROM profesiones WHERE nombre='Ingeniería';
INSERT IGNORE INTO autoridades(codigo,descripcion,nombre,id_profesion)
 SELECT 'COO_ING_MECANICA_INDUSTRIAL','Coordinador Ingeniería Mecánica Industrial','JUAN JOSÉ GODÍNEZ GODÍNEZ',id FROM profesiones WHERE nombre='Ingeniería';
CREATE TABLE IF NOT EXISTS autoridades_carrera (
 id_carrera INT UNSIGNED PRIMARY KEY,
 id_autoridad_coordinador INT UNSIGNED NOT NULL,
 FOREIGN KEY (id_carrera) REFERENCES carreras(id) ON UPDATE CASCADE ON DELETE CASCADE,
 FOREIGN KEY (id_autoridad_coordinador) REFERENCES autoridades(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
INSERT INTO autoridades_carrera(id_carrera,id_autoridad_coordinador)
 SELECT c.id,a.id FROM carreras c JOIN autoridades a ON a.codigo='COO_ING_SISTEMAS' WHERE c.codigo='120058'
 ON DUPLICATE KEY UPDATE id_autoridad_coordinador=VALUES(id_autoridad_coordinador);
INSERT INTO autoridades_carrera(id_carrera,id_autoridad_coordinador)
 SELECT c.id,a.id FROM carreras c JOIN autoridades a ON a.codigo='COO_ING_MECANICA' WHERE c.codigo='120034'
 ON DUPLICATE KEY UPDATE id_autoridad_coordinador=VALUES(id_autoridad_coordinador);
INSERT INTO autoridades_carrera(id_carrera,id_autoridad_coordinador)
 SELECT c.id,a.id FROM carreras c JOIN autoridades a ON a.codigo='COO_ING_CIVIL' WHERE c.codigo='120033'
 ON DUPLICATE KEY UPDATE id_autoridad_coordinador=VALUES(id_autoridad_coordinador);
INSERT INTO autoridades_carrera(id_carrera,id_autoridad_coordinador)
 SELECT c.id,a.id FROM carreras c JOIN autoridades a ON a.codigo='COO_ING_INDUSTRIAL' WHERE c.codigo='120035'
 ON DUPLICATE KEY UPDATE id_autoridad_coordinador=VALUES(id_autoridad_coordinador);
INSERT INTO autoridades_carrera(id_carrera,id_autoridad_coordinador)
 SELECT c.id,a.id FROM carreras c JOIN autoridades a ON a.codigo='COO_ING_MECANICA_INDUSTRIAL' WHERE c.codigo='120036'
 ON DUPLICATE KEY UPDATE id_autoridad_coordinador=VALUES(id_autoridad_coordinador);
CREATE TABLE IF NOT EXISTS codigo_ciclo (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;
INSERT IGNORE INTO codigo_ciclo(codigo) VALUES ('Primer Semestre'),('Escuela de Vacaciones Diciembre'),('Escuela de Vacaciones Junio'),('Segundo Semestre');
CREATE TABLE IF NOT EXISTS ciclo (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_codigo_ciclo INT UNSIGNED NOT NULL,
 anio YEAR NOT NULL,
 UNIQUE KEY uq_ciclo(id_codigo_ciclo,anio),
 FOREIGN KEY (id_codigo_ciclo) REFERENCES codigo_ciclo(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
INSERT IGNORE INTO ciclo(id_codigo_ciclo,anio) SELECT id,2026 FROM codigo_ciclo WHERE codigo='Primer Semestre';
CREATE TABLE IF NOT EXISTS docente (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(20) NULL UNIQUE,
 nombre VARCHAR(150) NOT NULL UNIQUE,
 telefono VARCHAR(20) NULL,
 correo VARCHAR(150) NULL UNIQUE,
 id_profesion INT UNSIGNED NOT NULL,
 url_firma VARCHAR(700) NULL,
 FOREIGN KEY (id_profesion) REFERENCES profesiones(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS docente_curso (
 id_curso VARCHAR(20) NOT NULL,
 id_docente INT UNSIGNED NOT NULL,
 id_ciclo INT UNSIGNED NOT NULL,
 activo TINYINT(1) NOT NULL DEFAULT 0,
 PRIMARY KEY(id_curso,id_docente,id_ciclo),
 FOREIGN KEY (id_curso) REFERENCES curso(codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_docente) REFERENCES docente(id) ON UPDATE CASCADE ON DELETE RESTRICT,
 FOREIGN KEY (id_ciclo) REFERENCES ciclo(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS configuracion_cartas_dictamen (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 semestre INT NOT NULL UNIQUE,
 nombre_semestre VARCHAR(100) NOT NULL,
 omite_carta TINYINT(1) NOT NULL DEFAULT 0,
 creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
INSERT IGNORE INTO configuracion_cartas_dictamen(semestre,nombre_semestre,omite_carta) VALUES
 (1,'Primer semestre',0),(2,'Segundo semestre',0),(3,'Tercer semestre',0),(4,'Cuarto semestre',0),(5,'Quinto semestre',0),
 (6,'Sexto semestre',0),(7,'Séptimo semestre',0),(8,'Octavo semestre',0),(9,'Noveno semestre',0),(10,'Décimo semestre',0);

GRANT SELECT ON equiparacion_db.* TO 'user_project_equivalencias'@'localhost';
GRANT UPDATE ON equiparacion_db.* TO 'user_project_equivalencias'@'localhost';
GRANT INSERT ON equiparacion_db.* TO 'user_project_equivalencias'@'localhost';
GRANT DELETE ON equiparacion_db.* TO 'user_project_equivalencias'@'localhost';
GRANT ALTER ON equiparacion_db.* TO 'user_project_equivalencias'@'localhost';
GRANT CREATE ON equiparacion_db.* TO 'user_project_equivalencias'@'localhost';
