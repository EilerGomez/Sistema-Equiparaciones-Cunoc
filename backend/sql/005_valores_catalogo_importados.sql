UPDATE cursos_equiparacion ce
JOIN equiparacion e ON e.id=ce.id_equiparacion
SET ce.porcentaje=NULL,ce.opinion=NULL
WHERE e.url_archivo LIKE '/uploads/equiparaciones/%.pdf'
  AND (ce.porcentaje IS NOT NULL OR ce.opinion IS NOT NULL);
