SET @sql = (SELECT IF(COUNT(*)=0,
 'ALTER TABLE equiparacion ADD COLUMN codigo_dictamen_origen VARCHAR(50) NULL AFTER codigo',
 'SELECT 1') FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='equiparacion' AND COLUMN_NAME='codigo_dictamen_origen');
PREPARE migracion_codigo FROM @sql;
EXECUTE migracion_codigo;
DEALLOCATE PREPARE migracion_codigo;

DROP TEMPORARY TABLE IF EXISTS equiparaciones_importadas_renumerar;
CREATE TEMPORARY TABLE equiparaciones_importadas_renumerar AS
SELECT e.id,e.codigo AS codigo_dictamen_origen,
 COALESCE(manuales.ultimo_numero,0)+ROW_NUMBER() OVER (PARTITION BY e.anio ORDER BY e.creado_en,e.id) AS nuevo_numero,
 COALESCE(todos.ultimo_numero,0)+COUNT(*) OVER (PARTITION BY e.anio)+ROW_NUMBER() OVER (PARTITION BY e.anio ORDER BY e.creado_en,e.id) AS numero_temporal
FROM equiparacion e
LEFT JOIN (
 SELECT anio,MAX(correlativo) AS ultimo_numero FROM equiparacion
 WHERE url_archivo IS NULL OR url_archivo NOT LIKE '/uploads/equiparaciones/%.pdf'
 GROUP BY anio
) manuales ON manuales.anio=e.anio
LEFT JOIN (
 SELECT anio,MAX(correlativo) AS ultimo_numero FROM equiparacion GROUP BY anio
) todos ON todos.anio=e.anio
WHERE e.url_archivo LIKE '/uploads/equiparaciones/%.pdf' AND e.codigo_dictamen_origen IS NULL;

START TRANSACTION;
UPDATE equiparacion e JOIN equiparaciones_importadas_renumerar r ON r.id=e.id
SET e.correlativo=r.numero_temporal,e.codigo_dictamen_origen=r.codigo_dictamen_origen;
UPDATE equiparacion e JOIN equiparaciones_importadas_renumerar r ON r.id=e.id
SET e.correlativo=r.nuevo_numero;
UPDATE correlativo_equiparacion c
SET c.ultimo_numero=COALESCE((SELECT MAX(e.correlativo) FROM equiparacion e WHERE e.anio=c.anio),0);
COMMIT;
DROP TEMPORARY TABLE equiparaciones_importadas_renumerar;
