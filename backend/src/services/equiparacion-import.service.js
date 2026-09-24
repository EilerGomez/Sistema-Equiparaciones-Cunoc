const path=require('path')
const fs=require('fs/promises')
const {randomUUID}=require('crypto')
const {pool}=require('../config/db')
const equiparacion=require('./equiparacion.service')

const fail=(status,message)=>Object.assign(new Error(message),{status})
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()
const number=value=>Number.isSafeInteger(Number(value))&&Number(value)>0
const code=value=>/^\d+$/.test(String(value).trim())?String(BigInt(String(value).trim())):String(value).trim().toUpperCase()

async function catalogs(db=pool){
  const [[pensums],[sedes],[coordinadores],[directores]]=await Promise.all([
    db.query('SELECT p.id,p.anio,p.vigencia,p.id_carrera,c.descripcion AS carrera,c.subfijo,i.codigo AS institucion FROM pensum p JOIN carreras c ON c.id=p.id_carrera JOIN instituciones i ON i.id=c.id_institucion ORDER BY c.descripcion,p.anio'),
    db.query('SELECT id,nombre FROM cede ORDER BY nombre'),
    db.query('SELECT id_carrera,id_autoridad_coordinador FROM autoridades_carrera'),
    db.query("SELECT id,nombre FROM autoridades WHERE codigo='DIRECTOR_ING' ORDER BY id LIMIT 1")
  ])
  return {pensums,sedes,coordinadores,director:directores[0]||null}
}

function selectedPensum(pensums,extracted,subfijo=''){
  return pensums.find(p=>Number(p.anio)===Number(extracted.anio)&&norm(p.institucion)===norm(extracted.institucion)&&norm(p.carrera)===norm(extracted.carrera))
    || pensums.find(p=>Number(p.anio)===Number(extracted.anio)&&norm(p.institucion)===norm(extracted.institucion)&&subfijo&&norm(p.subfijo)===norm(subfijo))
}

async function preview(parsed,db=pool){
  const available=await catalogs(db)
  const origin=selectedPensum(available.pensums,parsed.origen)
  const destination=selectedPensum(available.pensums,parsed.destino,parsed.subfijo)
  const sede=available.sedes.find(s=>norm(s.nombre)===norm(parsed.sede))
  const [students]=await db.query('SELECT id,nombre_completo,carnet,registro_academico FROM estudiante WHERE carnet=? OR registro_academico=?',[parsed.estudiante.carnet,parsed.estudiante.registro_academico])
  const warnings=[]
  if(!origin)warnings.push('No se encontro el pensum de origen; selecciona uno del catalogo.')
  if(!destination)warnings.push('No se encontro el pensum de destino; selecciona uno del catalogo.')
  if(destination&&!Number(destination.vigencia))warnings.push('El pensum de destino no esta vigente.')
  if(destination&&norm(destination.subfijo)!==norm(parsed.subfijo))warnings.push('La abreviatura del encabezado no coincide con la carrera destino.')
  if(!sede)warnings.push('No se encontro la sede del PDF; selecciona una.')
  if(students.length>1||students.length===1&&(students[0].carnet!==parsed.estudiante.carnet||students[0].registro_academico!==parsed.estudiante.registro_academico))warnings.push('El carnet y el registro academico coinciden con estudiantes diferentes o con datos distintos; revisa el catalogo.')
  if(destination&&!available.coordinadores.some(c=>Number(c.id_carrera)===Number(destination.id_carrera)))warnings.push('Falta configurar el coordinador de la carrera destino.')
  if(!available.director)warnings.push('Falta configurar DIRECTOR_ING.')
  const [[existing]]=await db.query('SELECT id FROM equiparacion WHERE anio=? AND correlativo=?',[parsed.anio,parsed.correlativo])
  if(existing)warnings.push(`La equiparacion ${parsed.codigo} ya existe.`)
  return {extraido:parsed,catalogos:available,seleccion:{id_pensum_de:origin?.id||'',id_pensum_a:destination?.id||'',id_sede:sede?.id||''},estudiante_existente:students.length===1?students[0]:null,advertencias:warnings}
}

async function findOrCreateCourse(conn,codigo,nombre){
  codigo=code(codigo)
  if(!codigo||codigo.length>20||!nombre||nombre.length>150)throw fail(422,'Codigo o nombre de curso invalido en el PDF')
  const [matches]=await conn.query(`SELECT id,codigo,nombre FROM curso WHERE codigo=? OR (codigo REGEXP '^[0-9]+$' AND CAST(codigo AS UNSIGNED)=?) ORDER BY (codigo=?) DESC,id LIMIT 2 FOR UPDATE`,[codigo,/^\d+$/.test(codigo)?Number(codigo):-1,codigo])
  if(matches.length>1&&code(matches[0].codigo)===code(matches[1].codigo))throw fail(409,`Hay codigos de curso duplicados con ceros a la izquierda: ${codigo}`)
  if(matches[0])return matches[0].id
  const [result]=await conn.query('INSERT INTO curso(codigo,nombre) VALUES (?,?)',[codigo,nombre])
  return result.insertId
}

async function saveImported(parsed,selection,buffer){
  if(!parsed||!Array.isArray(parsed.cursos)||!parsed.cursos.length||parsed.cursos.length>200)throw fail(422,'El PDF no contiene cursos validos')
  if(!number(selection.id_pensum_de)||!number(selection.id_pensum_a)||!number(selection.id_sede))throw fail(422,'Selecciona los dos pensums y la sede')
  const student=selection.estudiante||parsed.estudiante
  const name=String(student.nombre_completo||'').trim(),carnet=String(student.carnet||'').trim(),registro=String(student.registro_academico||'').trim()
  if(!name||name.length>150||!/^\d{3,30}$/.test(carnet)||!/^\d{3,50}$/.test(registro))throw fail(422,'Revisa nombre, carnet y registro academico del estudiante')
  const expediente=String(selection.num_expediente??parsed.num_expediente??'').trim()
  if(expediente.length>80)throw fail(422,'El expediente es demasiado largo')
  const filename=`${randomUUID()}.pdf`
  const directory=path.join(process.env.UPLOAD_ROOT||path.join(__dirname,'../../uploads'),'equiparaciones')
  const target=path.join(directory,filename)
  await fs.mkdir(directory,{recursive:true})
  await fs.writeFile(target,buffer,{flag:'wx'})
  let conn
  try{
    conn=await pool.getConnection()
    await conn.beginTransaction()
    const [[existing]]=await conn.query('SELECT id FROM equiparacion WHERE anio=? AND correlativo=? FOR UPDATE',[parsed.anio,parsed.correlativo])
    if(existing)throw fail(409,`La equiparacion ${parsed.codigo} ya existe`)
    const {de,a,autoridades}=await equiparacion.resolvePensums(conn,selection.id_pensum_de,selection.id_pensum_a)
    const [selected]=await conn.query('SELECT p.id,p.anio,c.descripcion AS carrera,c.subfijo,i.codigo AS institucion FROM pensum p JOIN carreras c ON c.id=p.id_carrera JOIN instituciones i ON i.id=c.id_institucion WHERE p.id IN (?,?)',[de.id,a.id])
    for(const [item,extracted] of [[de,parsed.origen],[a,parsed.destino]]){
      const record=selected.find(p=>Number(p.id)===Number(item.id))
      if(Number(record?.anio)!==Number(extracted.anio)||norm(record?.institucion)!==norm(extracted.institucion)||norm(record?.carrera)!==norm(extracted.carrera))throw fail(422,'Los pensums seleccionados no corresponden a la carrera, año o institucion del PDF')
    }
    if(norm(selected.find(p=>Number(p.id)===Number(a.id))?.subfijo)!==norm(parsed.subfijo))throw fail(422,'La abreviatura del encabezado no corresponde a la carrera destino')
    const [[sede]]=await conn.query('SELECT id,nombre FROM cede WHERE id=?',[selection.id_sede])
    if(!sede)throw fail(422,'La sede seleccionada no existe')
    const [students]=await conn.query('SELECT id,carnet,registro_academico FROM estudiante WHERE carnet=? OR registro_academico=? FOR UPDATE',[carnet,registro])
    if(students.length>1||students.length===1&&(students[0].carnet!==carnet||students[0].registro_academico!==registro))throw fail(409,'El carnet o registro academico pertenece a un estudiante con datos diferentes')
    let studentId=students[0]?.id
    if(!studentId){const [result]=await conn.query('INSERT INTO estudiante(nombre_completo,carnet,registro_academico) VALUES (?,?,?)',[name,carnet,registro]);studentId=result.insertId}
    const pairs=[]
    const seen=new Set()
    for(const row of parsed.cursos){
      const source=await findOrCreateCourse(conn,row.curso_de_codigo,row.curso_de_nombre)
      const targetId=await findOrCreateCourse(conn,row.curso_a_codigo,row.curso_a_nombre)
      const pair=`${source}:${targetId}`
      if(seen.has(pair))throw fail(422,'El PDF contiene una equivalencia duplicada')
      seen.add(pair)
      if(!Number.isFinite(row.porcentaje)||row.porcentaje<0||row.porcentaje>100||!row.opinion||row.opinion.length>50)throw fail(422,'Porcentaje u opinion invalida en el PDF')
      await conn.query('INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) VALUES (?,?,NULL),(?,?,NULL)',[source,de.id,targetId,a.id])
      await conn.query('INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) VALUES (?,?,?,?)',[source,targetId,row.porcentaje,row.opinion])
      pairs.push([row.numero,source,targetId,row.porcentaje,row.opinion])
    }
    await conn.query('INSERT INTO correlativo_equiparacion(anio,ultimo_numero) VALUES (?,?) ON DUPLICATE KEY UPDATE ultimo_numero=GREATEST(ultimo_numero,VALUES(ultimo_numero))',[parsed.anio,parsed.correlativo])
    const [result]=await conn.query(`INSERT INTO equiparacion(id_carrera_equivalencia,anio,correlativo,id_sede,fecha_impresion,id_estudiante,id_carrera_de,id_pensum_de,id_institucion_de,id_carrera_a,id_pensum_a,id_institucion_a,id_autoridad_coordinador,id_autoridad_director,num_expediente,url_archivo,estado)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PENDIENTE')`,[a.id_carrera,parsed.anio,parsed.correlativo,sede.id,`${parsed.fecha_impresion} 12:00:00`,studentId,de.id_carrera,de.id,de.id_institucion,a.id_carrera,a.id,a.id_institucion,autoridades.coordinador,autoridades.director,expediente||null,`/uploads/equiparaciones/${filename}`])
    await conn.query('INSERT INTO cursos_equiparacion(numero,id_equiparacion,id_curso_de,id_curso_a,porcentaje,opinion) VALUES ?',[pairs.map(row=>[row[0],result.insertId,...row.slice(1)])])
    await conn.commit()
    return result.insertId
  }catch(error){if(conn)await conn.rollback().catch(()=>{});await fs.unlink(target).catch(()=>{});throw error}finally{conn?.release()}
}

module.exports={preview,saveImported,code,norm}
