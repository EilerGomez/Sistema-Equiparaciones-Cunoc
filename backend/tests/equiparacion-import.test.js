const {test}=require('node:test')
const assert=require('node:assert/strict')
const PDFDocument=require('pdfkit')
const fs=require('node:fs/promises')
const os=require('node:os')
const path=require('node:path')
const {readPdf}=require('../src/services/equiparacion-import.reader')
const {code,preview,saveImported}=require('../src/services/equiparacion-import.service')
const {anioActual}=require('../src/services/equiparacion.service')

function samplePdf(){
  return new Promise(resolve=>{
    const doc=new PDFDocument({size:'A4',margin:0})
    const chunks=[]
    doc.on('data',chunk=>chunks.push(chunk))
    doc.on('end',()=>resolve(Buffer.concat(chunks)))
    doc.fontSize(10).text('Dic. Equiv. Ing. Mecanica No. 126-2026',360,70,{lineBreak:false})
    doc.text('Quetzaltenango, 23 de septiembre de 2026',340,90,{lineBreak:false})
    doc.text('Estudiante: Ana Maria Lopez, Carne No. 3341439501001, y Registro Academico No. 201531868',65,180,{lineBreak:false})
    doc.text('en Ingenieria Mecanica Pensum 2012 CUNOC, para su validez Academica en la',65,200,{lineBreak:false})
    doc.text('Carrera de Ingenieria Mecanica Pensum 2025 CUNOC.',65,220,{lineBreak:false})
    doc.text('No.',76,267,{lineBreak:false})
    doc.fontSize(8).text('Porcentaje',425,267,{lineBreak:false})
    doc.text('Opinion',470,267,{lineBreak:false})
    doc.fontSize(10)
    for(const [label,x] of [['Codigo',99],['Nombre',162],['Por',252],['Codigo',275],['Nombre',338]])doc.text(label,x,298,{lineBreak:false})
    for(const [number,y,from,name,to,target] of [[1,313,'028','Social Humanistica 1','3003','Area Social Humanistica 1'],[2,333,'072','Fisica Basica','3007','Fisica Basica']]){
      for(const [text,x] of [[String(number),77],[from,104],[name,130],['Por',252],[to,278],[target,306],['100%',438],['EQUIVALENTE',470]])doc.text(text,x,y,{lineBreak:false})
    }
    doc.text('Sin otro particular',67,400,{lineBreak:false})
    doc.text('Exp. No. 91-2026',67,680,{lineBreak:false})
    doc.end()
  })
}

test('el PDF se previsualiza sin insertar datos y normaliza ceros iniciales',async()=>{
  const buffer=await samplePdf()
  const data=await readPdf(buffer)
  assert.equal(data.codigo,'126-2026')
  assert.equal(data.fecha_impresion,'2026-09-23')
  assert.equal(data.estudiante.carnet,'3341439501001')
  assert.equal(data.origen.anio,2012)
  assert.equal(data.destino.anio,2025)
  assert.equal(data.num_expediente,'91-2026')
  assert.deepEqual(data.cursos.map(row=>row.curso_de_codigo),['28','72'])
  assert.equal(code('00028'),'28')
})

test('la vista previa elige el pensum exacto y no crea al estudiante',async()=>{
  const parsed=await readPdf(await samplePdf())
  const calls=[]
  const db={query:async(sql)=>{
    calls.push(sql)
    if(sql.includes('FROM pensum p JOIN carreras'))return [[
      {id:12,anio:2012,vigencia:0,id_carrera:4,carrera:'Ingeniería Mecánica',subfijo:'Ing. Mecánica',institucion:'CUNOC'},
      {id:25,anio:2025,vigencia:1,id_carrera:4,carrera:'Ingeniería Mecánica',subfijo:'Ing. Mecánica',institucion:'CUNOC'}
    ]]
    if(sql.includes('FROM cede'))return [[{id:3,nombre:'Quetzaltenango'}]]
    if(sql.includes('FROM autoridades_carrera'))return [[{id_carrera:4,id_autoridad_coordinador:6,nombre:'Juan Coordinador'}]]
    if(sql.includes("codigo='DIRECTOR_ING'"))return [[{id:7,nombre:'Director'}]]
    if(sql.includes('FROM equivalencia_curso ec'))return [[{curso_de_codigo:'028',curso_a_codigo:'3003',porcentaje:'90.00',opinion:'APROBADO'}]]
    return [[]]
  }}
  const result=await preview(parsed,db)
  assert.deepEqual(result.seleccion,{id_pensum_de:12,id_pensum_a:25,id_sede:3})
  assert.equal(result.estudiante_existente,null)
  assert.equal(result.catalogos.coordinadores[0].nombre,'Juan Coordinador')
  assert.deepEqual(result.advertencias,[])
  assert.equal(result.extraido.cursos[0].porcentaje,90)
  assert.equal(result.extraido.cursos[0].opinion,'APROBADO')
  assert.equal(result.extraido.cursos[0].equivalencia_existente,true)
  assert.equal(result.extraido.cursos[1].porcentaje,100)
  assert.equal(result.extraido.cursos[1].opinion,'EQUIVALENTE')
  assert.equal(result.extraido.cursos[1].equivalencia_existente,false)
  assert.ok(calls.every(sql=>/^SELECT /.test(sql)))
})

test('la importacion asigna correlativo propio y conserva el dictamen original',async()=>{
  const parsed=await readPdf(await samplePdf())
  parsed.codigo='126-2024'
  parsed.anio=2024
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'equiparacion-import-test-'))
  const previous=process.env.UPLOAD_ROOT
  process.env.UPLOAD_ROOT=directory
  let inserted,selectedCourses,committed=false
  const courseIds={28:1,3003:2,72:3,3007:4}
  const conn={
    beginTransaction:async()=>{},commit:async()=>{committed=true},rollback:async()=>{},release:()=>{},
    query:async(sql,args=[])=>{
      if(sql.startsWith('SELECT p.id,p.id_carrera,p.vigencia'))return [[{id:12,id_carrera:4,id_institucion:1,vigencia:0},{id:25,id_carrera:4,id_institucion:1,vigencia:1}]]
      if(sql.includes('FROM autoridades_carrera ac'))return [[{coordinador:6,director:7}]]
      if(sql.startsWith('SELECT p.id,p.anio,c.descripcion'))return [[{id:12,anio:2012,carrera:'Ingeniería Mecánica',subfijo:'Ing. Mecánica',institucion:'CUNOC'},{id:25,anio:2025,carrera:'Ingeniería Mecánica',subfijo:'Ing. Mecánica',institucion:'CUNOC'}]]
      if(sql.startsWith('SELECT id,nombre FROM cede'))return [[{id:3,nombre:'Quetzaltenango'}]]
      if(sql.startsWith('SELECT id,carnet,registro_academico'))return [[{id:9,carnet:parsed.estudiante.carnet,registro_academico:parsed.estudiante.registro_academico}]]
      if(sql.startsWith('SELECT id,codigo,nombre FROM curso'))return [[{id:courseIds[args[0]],codigo:args[0]}]]
      if(sql.startsWith('SELECT LAST_INSERT_ID()'))return [[{numero:1}]]
      if(sql.startsWith('INSERT INTO equiparacion(')){inserted=args;return [{insertId:51}]}
      if(sql.startsWith('INSERT INTO cursos_equiparacion(')){selectedCourses=args;return [{}]}
      return [{}]
    }
  }
  try{
    const id=await saveImported(parsed,{id_pensum_de:12,id_pensum_a:25,id_sede:3},Buffer.from('%PDF-mock'),{getConnection:async()=>conn})
    assert.equal(id,51)
    assert.equal(inserted[1],anioActual())
    assert.equal(inserted[2],1)
    assert.equal(inserted[3],'126-2024')
    assert.equal(selectedCourses[0][0][1],51)
    assert.equal(committed,true)
  }finally{
    if(previous===undefined)delete process.env.UPLOAD_ROOT
    else process.env.UPLOAD_ROOT=previous
    await fs.rm(directory,{recursive:true,force:true})
  }
})
