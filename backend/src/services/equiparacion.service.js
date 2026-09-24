const { pool } = require('../config/db')

const estados = ['PENDIENTE', 'LISTO']
const fallo = (status, message) => Object.assign(new Error(message), { status })
const entero = value => Number.isSafeInteger(Number(value)) && Number(value) > 0
const anioActual = (date = new Date()) => Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Guatemala', year: 'numeric' }).format(date))
const fields = ['id_carrera_equivalencia','id_sede','prov_ryca','fecha_prov_ryca','id_estudiante','id_carrera_de','id_pensum_de','id_institucion_de','id_carrera_a','id_pensum_a','id_institucion_a','id_autoridad_coordinador','id_autoridad_director','num_expediente','estado','observaciones']

function validate(body) {
  const required = ['id_estudiante','id_pensum_de','id_pensum_a']
  for (const key of required) if (!entero(body[key])) throw fallo(400, `Campo requerido o invalido: ${key}`)
  if (Number(body.id_pensum_de) === Number(body.id_pensum_a)) throw fallo(400, 'Selecciona pensums diferentes')
  if (body.id_sede && !entero(body.id_sede)) throw fallo(400, 'Sede invalida')
  if (body.estado && !estados.includes(body.estado)) throw fallo(400, 'Estado invalido')
  for (const [key,max] of [['prov_ryca',20],['num_expediente',80],['observaciones',1000]]) {
    if (body[key] != null && (typeof body[key] !== 'string' || body[key].length > max)) throw fallo(400, `Campo ${key}: maximo ${max} caracteres`)
  }
  if (body.fecha_prov_ryca && (!/^\d{4}-\d{2}-\d{2}$/.test(body.fecha_prov_ryca) || !Number.isFinite(Date.parse(body.fecha_prov_ryca)) || new Date(body.fecha_prov_ryca).toISOString().slice(0,10) !== body.fecha_prov_ryca)) throw fallo(400, 'Fecha de providencia invalida')
  validateCourses(body.cursos)
}

function validateCourses(cursos) {
  if (!Array.isArray(cursos) || !cursos.length || cursos.length > 200) throw fallo(400, 'Selecciona entre 1 y 200 equivalencias')
  const pairs = new Set()
  for (const c of cursos) {
    if (!c || !entero(c.id_curso_de) || !entero(c.id_curso_a)) throw fallo(400, 'Curso invalido')
    const key = `${Number(c.id_curso_de)}:${Number(c.id_curso_a)}`
    if (pairs.has(key)) throw fallo(400, 'No se permiten equivalencias duplicadas')
    pairs.add(key)
  }
}

async function resolvePensums(conn,origen,destino) {
  if (!entero(origen)||!entero(destino)||Number(origen)===Number(destino)) throw fallo(400,'Selecciona pensums diferentes')
  const [pensums]=await conn.query('SELECT p.id,p.id_carrera,p.vigencia,c.id_institucion FROM pensum p JOIN carreras c ON c.id=p.id_carrera WHERE p.id IN (?,?)',[origen,destino])
  const de=pensums.find(p=>Number(p.id)===Number(origen))
  const a=pensums.find(p=>Number(p.id)===Number(destino))
  if(!de||!a||Number(a.vigencia)!==1) throw fallo(400,'El destino debe ser un pensum vigente; el origen puede ser antiguo o vigente')
  const [[autoridades]]=await conn.query(`SELECT ac.id_autoridad_coordinador AS coordinador,
    (SELECT id FROM autoridades WHERE codigo='DIRECTOR_ING' ORDER BY id LIMIT 1) AS director
    FROM autoridades_carrera ac WHERE ac.id_carrera=?`,[a.id_carrera])
  if(!autoridades?.coordinador||!autoridades?.director)throw fallo(400,'Configura el coordinador de la carrera destino y el director de Ingenieria')
  return {de,a,autoridades}
}

async function checkCourses(conn,de,a,cursos) {
  for(const c of cursos){
    const [[exists]]=await conn.query(`SELECT ec.id_curso_de FROM equivalencia_curso ec
      JOIN pensum_curso d ON d.id_curso=ec.id_curso_de AND d.id_pensum=?
      JOIN pensum_curso a ON a.id_curso=ec.id_curso_a AND a.id_pensum=?
      WHERE ec.id_curso_de=? AND ec.id_curso_a=? LOCK IN SHARE MODE`,[de.id,a.id,c.id_curso_de,c.id_curso_a])
    if(!exists)throw fallo(400,'Una equivalencia no pertenece a los pensums seleccionados')
  }
}

async function nextNumber(conn, anio) {
  await conn.query('INSERT INTO correlativo_equiparacion(anio,ultimo_numero) VALUES (?,0) ON DUPLICATE KEY UPDATE ultimo_numero=ultimo_numero', [anio])
  await conn.query('UPDATE correlativo_equiparacion SET ultimo_numero=LAST_INSERT_ID(ultimo_numero+1) WHERE anio=?', [anio])
  const [[row]] = await conn.query('SELECT LAST_INSERT_ID() AS numero')
  return Number(row.numero)
}

async function save(body, id = null) {
  validate(body)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (id) {
      const [[old]] = await conn.query('SELECT id FROM equiparacion WHERE id=? FOR UPDATE',[id])
      if (!old) throw fallo(404, 'Equiparacion no encontrada')
    }
    const {de,a,autoridades}=await resolvePensums(conn,body.id_pensum_de,body.id_pensum_a)
    const data = {...body, id_carrera_equivalencia:a.id_carrera,id_carrera_de:de.id_carrera,id_institucion_de:de.id_institucion,id_carrera_a:a.id_carrera,id_institucion_a:a.id_institucion,id_autoridad_coordinador:autoridades.coordinador,id_autoridad_director:autoridades.director,estado:id?body.estado || 'PENDIENTE':'PENDIENTE'}
    await checkCourses(conn,de,a,body.cursos)
    const values = fields.map(k => data[k] === '' || data[k] == null ? null : data[k])
    if (id) {
      await conn.query(`UPDATE equiparacion SET ${fields.map(k=>`${k}=?`).join(',')},fecha_impresion=NULL,url_archivo=NULL WHERE id=?`,[...values,id])
      await conn.query('DELETE FROM cursos_equiparacion WHERE id_equiparacion=?',[id])
    } else {
      const anio = anioActual()
      const correlativo = await nextNumber(conn,anio)
      const [result] = await conn.query(`INSERT INTO equiparacion (${fields.join(',')},anio,correlativo) VALUES (${[...fields,'anio','correlativo'].map(()=>'?').join(',')})`,[...values,anio,correlativo])
      id = result.insertId
    }
    await conn.query('INSERT INTO cursos_equiparacion(numero,id_equiparacion,id_curso_de,id_curso_a) VALUES ?', [body.cursos.map((c,i)=>[i+1,id,Number(c.id_curso_de),Number(c.id_curso_a)])])
    await conn.commit()
    return id
  } catch (err) {
    await conn.rollback()
    throw err
  } finally { conn.release() }
}

async function updateMetadata(id,body){
  const conn=await pool.getConnection()
  try{
    await conn.beginTransaction()
    const [[old]]=await conn.query('SELECT * FROM equiparacion WHERE id=? FOR UPDATE',[id])
    if(!old)throw fallo(404,'Equiparacion no encontrada')
    const estudiante=body.id_estudiante ?? old.id_estudiante
    const sede=body.id_sede===undefined?old.id_sede:body.id_sede || null
    const origen=body.id_pensum_de ?? old.id_pensum_de
    const destino=body.id_pensum_a ?? old.id_pensum_a
    if(!entero(estudiante)||(sede&&!entero(sede)))throw fallo(400,'Estudiante o sede invalida')
    const expediente=body.num_expediente===undefined?old.num_expediente:body.num_expediente
    const observaciones=body.observaciones===undefined?old.observaciones:body.observaciones
    if((expediente!=null&&(typeof expediente!=='string'||expediente.length>80))||(observaciones!=null&&(typeof observaciones!=='string'||observaciones.length>1000)))throw fallo(400,'Expediente u observaciones invalidos')
    const {de,a,autoridades}=await resolvePensums(conn,origen,destino)
    const changed=Number(origen)!==Number(old.id_pensum_de)||Number(destino)!==Number(old.id_pensum_a)
    await conn.query(`UPDATE equiparacion SET id_estudiante=?,id_sede=?,id_pensum_de=?,id_pensum_a=?,id_carrera_de=?,id_carrera_a=?,id_carrera_equivalencia=?,id_institucion_de=?,id_institucion_a=?,id_autoridad_coordinador=?,id_autoridad_director=?,num_expediente=?,observaciones=?,estado=IF(?,'PENDIENTE',estado),fecha_impresion=IF(url_archivo IS NULL,NULL,fecha_impresion) WHERE id=?`,[estudiante,sede,origen,destino,de.id_carrera,a.id_carrera,a.id_carrera,de.id_institucion,a.id_institucion,autoridades.coordinador,autoridades.director,expediente||null,observaciones||null,changed,id])
    if(changed)await conn.query('DELETE FROM cursos_equiparacion WHERE id_equiparacion=?',[id])
    await conn.commit()
    return {cursosReiniciados:changed}
  }catch(err){await conn.rollback();throw err}finally{conn.release()}
}

async function updateCourses(id,cursos){
  validateCourses(cursos)
  const conn=await pool.getConnection()
  try{
    await conn.beginTransaction()
    const [[old]]=await conn.query('SELECT id,id_pensum_de,id_pensum_a FROM equiparacion WHERE id=? FOR UPDATE',[id])
    if(!old)throw fallo(404,'Equiparacion no encontrada')
    const {de,a}=await resolvePensums(conn,old.id_pensum_de,old.id_pensum_a)
    await checkCourses(conn,de,a,cursos)
    const [existing]=await conn.query('SELECT id_curso_de,id_curso_a,porcentaje,opinion FROM cursos_equiparacion WHERE id_equiparacion=?',[id])
    const overrides=new Map(existing.map(row=>[`${row.id_curso_de}:${row.id_curso_a}`,row]))
    await conn.query('DELETE FROM cursos_equiparacion WHERE id_equiparacion=?',[id])
    await conn.query('INSERT INTO cursos_equiparacion(numero,id_equiparacion,id_curso_de,id_curso_a,porcentaje,opinion) VALUES ?',[cursos.map((c,i)=>{
      const old=overrides.get(`${Number(c.id_curso_de)}:${Number(c.id_curso_a)}`)
      return [i+1,id,Number(c.id_curso_de),Number(c.id_curso_a),old?.porcentaje??null,old?.opinion??null]
    })])
    await conn.query('UPDATE equiparacion SET fecha_impresion=IF(url_archivo IS NULL,NULL,fecha_impresion) WHERE id=?',[id])
    await conn.commit()
  }catch(err){await conn.rollback();throw err}finally{conn.release()}
}

async function updateEstado(id,estado){
  if(!estados.includes(estado))throw fallo(400,'El estado debe ser PENDIENTE o LISTO')
  const conn=await pool.getConnection()
  try{
    await conn.beginTransaction()
    const [[old]]=await conn.query('SELECT id FROM equiparacion WHERE id=? FOR UPDATE',[id])
    if(!old)throw fallo(404,'Equiparacion no encontrada')
    if(estado==='LISTO'){
      const [[row]]=await conn.query('SELECT COUNT(*) AS total FROM cursos_equiparacion WHERE id_equiparacion=?',[id])
      if(!row.total)throw fallo(400,'Agrega cursos antes de marcar la equiparacion como LISTO')
    }
    await conn.query('UPDATE equiparacion SET estado=? WHERE id=?',[estado,id])
    await conn.commit()
  }catch(err){await conn.rollback();throw err}finally{conn.release()}
}

const detailSql = `SELECT e.*,s.nombre_completo AS estudiante_nombre,s.carnet AS estudiante_carnet,s.registro_academico,
  sede.nombre AS sede_nombre,pd.anio AS pensum_de_anio,pa.anio AS pensum_a_anio,
  cd.descripcion AS carrera_de,ca.descripcion AS carrera_a,ca.subfijo AS carrera_a_subfijo,ide.nombre AS institucion_de,ia.nombre AS institucion_a,
  ide.codigo AS institucion_de_codigo,ia.codigo AS institucion_a_codigo,
  ac.nombre AS coordinador_nombre,ac.descripcion AS coordinador_cargo,ac.url_firma AS coordinador_firma,ac.url_sello AS coordinador_sello,pc.subfijo AS coordinador_subfijo,
  ad.nombre AS director_nombre,ad.descripcion AS director_cargo,ad.url_firma AS director_firma,ad.url_sello AS director_sello,pr.subfijo AS director_subfijo
  FROM equiparacion e JOIN estudiante s ON s.id=e.id_estudiante
  LEFT JOIN cede sede ON sede.id=e.id_sede
  LEFT JOIN pensum pd ON pd.id=e.id_pensum_de LEFT JOIN pensum pa ON pa.id=e.id_pensum_a
  LEFT JOIN carreras cd ON cd.id=e.id_carrera_de LEFT JOIN carreras ca ON ca.id=e.id_carrera_a
  LEFT JOIN instituciones ide ON ide.id=e.id_institucion_de LEFT JOIN instituciones ia ON ia.id=e.id_institucion_a
  JOIN autoridades ac ON ac.id=e.id_autoridad_coordinador JOIN autoridades ad ON ad.id=e.id_autoridad_director
  JOIN profesiones pc ON pc.id=ac.id_profesion JOIN profesiones pr ON pr.id=ad.id_profesion`

async function detail(id, conn = pool) {
  const [[row]] = await conn.query(detailSql+' WHERE e.id=?',[id])
  if (!row) throw fallo(404,'Equiparacion no encontrada')
  const [cursos] = await conn.query(`SELECT ce.numero,ce.id_equiparacion,ce.id_curso_de,ce.id_curso_a,ce.fecha_impresion,ce.creado_en,ce.actualizado_en,
    COALESCE(ce.porcentaje,ec.porcentaje) AS porcentaje,COALESCE(ce.opinion,ec.opinion) AS opinion,d.codigo AS curso_de_codigo,d.nombre AS curso_de_nombre,a.codigo AS curso_a_codigo,a.nombre AS curso_a_nombre
    FROM cursos_equiparacion ce JOIN equivalencia_curso ec ON ec.id_curso_de=ce.id_curso_de AND ec.id_curso_a=ce.id_curso_a
    JOIN curso d ON d.id=ce.id_curso_de JOIN curso a ON a.id=ce.id_curso_a WHERE ce.id_equiparacion=? ORDER BY ce.numero`,[id])
  return {...row,cursos}
}

module.exports = {save,updateMetadata,updateCourses,updateEstado,detail,nextNumber,anioActual,validate,validateCourses,resolvePensums,estados,fallo}
