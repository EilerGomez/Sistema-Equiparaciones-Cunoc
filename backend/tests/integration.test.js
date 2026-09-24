const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('fs/promises')
const path=require('path')
const mysql=require('mysql2/promise')
const crypto=require('crypto')
const enabled=process.env.RUN_DB_TESTS==='1'
test('MySQL: DDL, catalogos, permisos, CRUD, PDF, transacciones y correlativos',{skip:!enabled},async()=>{
 const name=process.env.DB_NAME
 assert.match(name||'',/^equiparacion_test_[a-z0-9_]+$/)
 process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex')
 process.env.JWT_REFRESH_SECRET=crypto.randomBytes(32).toString('hex')
 process.env.NODE_ENV='test'
 const conn=await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,multipleStatements:true})
 let server,pool
 try{
  await conn.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.query(`USE \`${name}\``)
  for(const file of ['001_esquema.sql','002_sistemas_2016_2025.sql','003_catalogos_equivalencias.sql','004_importacion_pdf.sql','005_valores_catalogo_importados.sql','006_codigo_dictamen_origen.sql'])await conn.query(await fs.readFile(path.join(__dirname,'../sql',file),'utf8'))
  pool=require('../src/config/db').pool
  const service=require('../src/services/equiparacion.service')
  const {hashPassword}=require('../src/utils/password')
  const password='LocalTest123456!'
  await conn.query("INSERT INTO usuarios(nombre,email,password_hash,rol_id) VALUES ('Admin prueba','admin@test.local',?,1),('Alumno','alumno@test.local',?,3)",[await hashPassword(password),await hashPassword(password)])
  await conn.query("INSERT INTO estudiante(nombre_completo,carnet,registro_academico) VALUES ('Estudiante de prueba','202000001','RA-001')")
  await conn.query("INSERT INTO autoridades(codigo,descripcion,nombre,id_profesion) VALUES ('COO','Coordinador de carrera','Coordinador de prueba',2),('DIR','Director de division','Director de prueba',2)")
  const app=require('../src/app')
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r))
  const base=`http://127.0.0.1:${server.address().port}/api`
  let token
  async function req(url,method='GET',body,auth=token){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:body?JSON.stringify(body):undefined});const data=r.headers.get('content-type')?.includes('application/json')?await r.json():Buffer.from(await r.arrayBuffer());return {status:r.status,data}}
  assert.equal((await req('/equiparaciones')).status,401)
  const login=await req('/auth/login','POST',{email:'admin@test.local',password});assert.equal(login.status,200);token=login.data.accessToken
  const student=await req('/auth/login','POST',{email:'alumno@test.local',password});assert.equal((await req('/equiparaciones','GET',null,student.data.accessToken)).status,403)
  const cats=await req('/equiparaciones/catalogos');assert.equal(cats.status,200);assert.equal(cats.data.equivalencias.length,52)
  const src=JSON.parse(await fs.readFile(path.join(__dirname,'../sql/equivalencias_sistemas.json'),'utf8'))
  for(const row of src){const found=cats.data.equivalencias.find(c=>c.curso_de_codigo===row.codigo_de&&c.curso_a_codigo===row.codigo_a);assert.ok(found);assert.equal(Number(found.porcentaje),row.porcentaje);assert.equal(found.opinion,row.opinion)}
  for(const route of ['estudiantes','catalogs/profesiones','catalogs/instituciones','catalogs/carreras','catalogs/pensum','catalogs/cursos','catalogs/sedes','catalogs/autoridades','catalogs/equivalencias'])assert.equal((await req('/'+route)).status,200,route)
  const pairs=cats.data.equivalencias.map(c=>({id_curso_de:c.id_curso_de,id_curso_a:c.id_curso_a}))
  assert.equal(cats.data.pensums.length,10);assert.ok(cats.data.autoridades.some(a=>a.codigo==='DIRECTOR_ING'))
  const body={id_estudiante:1,id_sede:1,id_pensum_de:cats.data.pensums.find(p=>p.codigo==='2016-56').id,id_pensum_a:cats.data.pensums.find(p=>p.codigo==='2025-58').id,id_autoridad_coordinador:999,id_autoridad_director:999,prov_ryca:'TEST-1',fecha_prov_ryca:'2026-09-22',num_expediente:'TEST-EXP',estado:'LISTO',cursos:pairs}
  const created=await req('/equiparaciones','POST',body);assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(created.data.codigo,`1-${service.anioActual()}`);assert.equal(created.data.cursos.length,52)
  assert.equal(created.data.estado,'PENDIENTE');assert.equal(created.data.id_autoridad_coordinador,1);assert.equal(created.data.id_autoridad_director,2)
  const id=created.data.id
  const available=await req(`/equiparaciones/${id}/equivalencias`)
  assert.equal(available.status,200,JSON.stringify(available.data))
  assert.equal(available.data.length,52)
  assert.equal((await req('/equiparaciones/999999/equivalencias')).status,404)
  assert.equal((await req('/equiparaciones','POST',{...body,cursos:[pairs[0],pairs[0]]})).status,400)
  assert.equal((await req('/equiparaciones','POST',{...body,id_estudiante:999999})).status,400)
  assert.equal((await req('/equiparaciones','POST',{...body,id_pensum_de:body.id_pensum_a,id_pensum_a:body.id_pensum_de})).status,400)
  assert.equal((await req('/equiparaciones','POST',{...body,id_pensum_a:cats.data.pensums.find(p=>p.codigo==='2025-34').id})).status,400)
  assert.equal((await req('/equiparaciones','POST',{...body,cursos:[{id_curso_de:pairs[0].id_curso_de,id_curso_a:pairs[1].id_curso_a}]})).status,400)
  const preview=await req(`/equiparaciones/${id}/pdf`);assert.equal(preview.status,200);assert.equal(preview.data.subarray(0,5).toString(),'%PDF-');assert.equal((await req(`/equiparaciones/${id}`)).data.fecha_impresion,null)
  const pdf=await req(`/equiparaciones/${id}/pdf?download=1`);assert.equal(pdf.status,200);assert.ok((await req(`/equiparaciones/${id}`)).data.fecha_impresion)
  if(process.env.PDF_TEST_OUTPUT)await fs.writeFile(process.env.PDF_TEST_OUTPUT,pdf.data)
  const metadata=await req(`/equiparaciones/${id}`,'PUT',{id_estudiante:1,id_pensum_de:body.id_pensum_de,id_pensum_a:body.id_pensum_a,num_expediente:'EXP-ACTUALIZADO',cursos:[],estado:'LISTO',correlativo:900,anio:2099});assert.equal(metadata.status,200);assert.equal(metadata.data.codigo,created.data.codigo);assert.equal(metadata.data.cursos.length,52);assert.equal(metadata.data.estado,'PENDIENTE')
  const updated=await req(`/equiparaciones/${id}/cursos`,'PUT',{cursos:pairs.slice(0,3)});assert.equal(updated.status,200);assert.equal(updated.data.cursos.length,3);assert.equal(updated.data.fecha_impresion,null)
  assert.equal((await req(`/equiparaciones/${id}/estado`,'PATCH',{estado:'ENVIADO'})).status,400)
  const ready=await req(`/equiparaciones/${id}/estado`,'PATCH',{estado:'LISTO'});assert.equal(ready.status,200);assert.equal(ready.data.estado,'LISTO')
  if(process.env.PDF_SMALL_OUTPUT)await fs.writeFile(process.env.PDF_SMALL_OUTPUT,(await req(`/equiparaciones/${id}/pdf`)).data)
  const concurrent=await Promise.all(Array.from({length:6},()=>req('/equiparaciones','POST',{...body,cursos:[pairs[0]]})))
  assert.ok(concurrent.every(r=>r.status===201),JSON.stringify(concurrent))
  assert.deepEqual(concurrent.map(r=>r.data.correlativo).sort((a,b)=>a-b),[2,3,4,5,6,7])
  await conn.query(`INSERT IGNORE INTO pensum_curso(id_curso,id_pensum) SELECT c.id,p.id FROM curso c JOIN pensum p ON p.codigo='2024-35' WHERE c.codigo='3011'`)
  await conn.query(`INSERT IGNORE INTO equivalencia_curso(id_curso_de,id_curso_a) SELECT d.id,a.id FROM curso d JOIN curso a ON a.codigo='3011' WHERE d.codigo='3003'`)
  const source=await conn.query("SELECT id FROM curso WHERE codigo='3003'")
  const target=await conn.query("SELECT id FROM curso WHERE codigo='3011'")
  const other=await req('/equiparaciones','POST',{...body,id_pensum_de:cats.data.pensums.find(p=>p.codigo==='2025-58').id,id_pensum_a:cats.data.pensums.find(p=>p.codigo==='2024-35').id,cursos:[{id_curso_de:source[0][0].id,id_curso_a:target[0][0].id}]})
  assert.equal(other.status,201,JSON.stringify(other.data));assert.equal(other.data.carrera_a,'Ingeniería Industrial');assert.equal(other.data.estado,'PENDIENTE')
  const year=await pool.getConnection()
  try{await year.beginTransaction();assert.equal(await service.nextNumber(year,2030),1);assert.equal(await service.nextNumber(year,2030),2);assert.equal(await service.nextNumber(year,2031),1);await year.rollback()}finally{year.release()}
  const eq=cats.data.equivalencias[0]
  assert.equal((await req('/catalogs/equivalencias','PUT',{...eq,old_id_curso_de:eq.id_curso_de,old_id_curso_a:eq.id_curso_a,porcentaje:50})).status,409)
  assert.equal((await req('/catalogs/equivalencias','DELETE',eq)).status,409)
  const list=await req('/equiparaciones?search=202000001&estado=LISTO');assert.equal(list.data.total,1)
  assert.equal(list.data.items[0].carrera_de,'Ingeniería en Ciencias y Sistemas')
  assert.equal(Number(list.data.items[0].pensum_de_anio),2016)
  assert.equal(list.data.items[0].carrera_a,'Ingeniería en Ciencias y Sistemas')
  assert.equal(Number(list.data.items[0].pensum_a_anio),2025)
  assert.equal((await req('/equiparaciones/999999')).status,404)
  console.log('52 pares verificados; creacion, edicion, PDF, rollback, 6 creaciones concurrentes y cambio anual OK')
 }finally{
  if(server)await new Promise(r=>server.close(r))
  if(pool)await pool.end()
  await conn.query(`DROP DATABASE IF EXISTS \`${name}\``);await conn.end()
 }
})
