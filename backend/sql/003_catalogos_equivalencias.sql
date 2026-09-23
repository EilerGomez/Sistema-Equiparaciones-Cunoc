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
