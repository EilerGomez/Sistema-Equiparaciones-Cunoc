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
