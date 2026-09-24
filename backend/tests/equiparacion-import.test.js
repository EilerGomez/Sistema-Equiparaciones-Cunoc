const {test}=require('node:test')
const assert=require('node:assert/strict')
const PDFDocument=require('pdfkit')
const {readPdf}=require('../src/services/equiparacion-import.reader')
const {code,preview}=require('../src/services/equiparacion-import.service')

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
    if(sql.includes('FROM autoridades_carrera'))return [[{id_carrera:4,id_autoridad_coordinador:6}]]
    if(sql.includes("codigo='DIRECTOR_ING'"))return [[{id:7,nombre:'Director'}]]
    return [[]]
  }}
  const result=await preview(parsed,db)
  assert.deepEqual(result.seleccion,{id_pensum_de:12,id_pensum_a:25,id_sede:3})
  assert.equal(result.estudiante_existente,null)
  assert.deepEqual(result.advertencias,[])
  assert.ok(calls.every(sql=>/^SELECT /.test(sql)))
})
