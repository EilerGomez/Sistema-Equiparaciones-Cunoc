import { AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } from 'docx'

const TWIPS=10206
const proportions=[5,9,23,4,9,23,12,15]
const widths=proportions.map(value=>Math.round(TWIPS*value/100))
widths[widths.length-1]+=TWIPS-widths.reduce((sum,value)=>sum+value,0)
const line={style:BorderStyle.SINGLE,size:4,color:'333333'}
const borders={top:line,bottom:line,left:line,right:line,insideHorizontal:line,insideVertical:line}
const run=(text,{bold=false,font='Cambria',size=20}={})=>new TextRun({text:String(text??''),bold,font,size})
const lines=(text,options={})=>String(text??'').split('\n').map((part,index)=>new TextRun({text:part,break:index?1:undefined,font:options.font||'Calibri Light',size:options.size||20,bold:!!options.bold}))
const para=(children,options={})=>new Paragraph({children:Array.isArray(children)?children:[run(children)],spacing:{before:0,after:80},...options})
const cell=(content,options={})=>new TableCell({children:[para(lines(content,{bold:options.bold}),{alignment:options.center?AlignmentType.CENTER:AlignmentType.LEFT,spacing:{before:0,after:0}})],width:{size:options.width||widths[0],type:WidthType.DXA},columnSpan:options.span||1,margins:{top:45,bottom:45,left:55,right:55}})
const image=(data,type,width,height)=>new ImageRun({type,data,transformation:{width,height}})

function fechaGuatemala(value){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('es-GT',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Guatemala'}).formatToParts(value?new Date(value):new Date()).map(part=>[part.type,part.value]))
  return `${parts.month} ${parts.day} de ${parts.year}`
}

function tabla(documento){
  const grupo=(inicio,cantidad)=>widths.slice(inicio,inicio+cantidad).reduce((a,b)=>a+b,0)
  const encabezado=new TableRow({tableHeader:true,cantSplit:true,children:[
    cell('No.',{bold:true,center:true,width:widths[0]}),
    cell(`Pensum ${documento.pensum_de_anio}\n${documento.carrera_de}\n${documento.institucion_de_codigo || 'CUNOC'}`,{bold:true,center:true,width:grupo(1,3),span:3}),
    cell(`Pensum ${documento.pensum_a_anio}\n${documento.carrera_a}\n${documento.institucion_a_codigo || 'CUNOC'}`,{bold:true,center:true,width:grupo(4,2),span:2}),
    cell('Porcentaje',{bold:true,center:true,width:widths[6]}),cell('Opinión',{bold:true,center:true,width:widths[7]})
  ]})
  const subencabezado=new TableRow({tableHeader:true,cantSplit:true,children:[
    cell('',{width:widths[0]}),cell('Código',{bold:true,center:true,width:widths[1]}),cell('Nombre del curso',{bold:true,center:true,width:widths[2]}),cell('Por',{bold:true,center:true,width:widths[3]}),
    cell('Código',{bold:true,center:true,width:widths[4]}),cell('Nombre del curso',{bold:true,center:true,width:widths[5]}),cell('',{width:widths[6]}),cell('',{width:widths[7]})
  ]})
  const filas=(documento.cursos||[]).map(curso=>new TableRow({cantSplit:true,children:[
    cell(curso.numero,{center:true,width:widths[0]}),cell(curso.curso_de_codigo,{center:true,width:widths[1]}),cell(curso.curso_de_nombre,{width:widths[2]}),
    cell('Por',{center:true,width:widths[3]}),cell(curso.curso_a_codigo,{center:true,width:widths[4]}),cell(curso.curso_a_nombre,{width:widths[5]}),
    cell(`${Number(curso.porcentaje)}%`,{center:true,width:widths[6]}),cell(curso.opinion,{center:true,width:widths[7]})
  ]}))
  return new Table({rows:[encabezado,subencabezado,...filas],width:{size:TWIPS,type:WidthType.DXA},columnWidths:widths,layout:TableLayoutType.FIXED,borders,margins:{top:45,bottom:45,left:55,right:55}})
}

function autoridad(documento,role,imagenes){
  const firma=imagenes[`${role}Firma`],sello=imagenes[`${role}Sello`]
  const nombre=`${documento[`${role}_subfijo`] || ''} ${documento[`${role}_nombre`] || ''}`.trim().toUpperCase()
  const alineacion=role==='coordinador'?AlignmentType.RIGHT:AlignmentType.CENTER
  const result=[]
  if(firma||sello)result.push(para([...(firma?[image(firma.data,firma.type,160,58)]:[]),...(sello?[image(sello.data,sello.type,74,74)]:[])],{alignment:alineacion,spacing:{before:100,after:0},keepNext:true}))
  result.push(para([run(nombre,{bold:true,font:'Calibri Light'})],{alignment:alineacion,spacing:{before:0,after:0},keepNext:true}))
  result.push(para([run(documento[`${role}_cargo`]?.toUpperCase(),{bold:true,font:'Calibri Light'})],{alignment:alineacion,spacing:{before:0,after:90}}))
  return result
}

export async function crearWordEquiparacion(documento,imagenes={}){
  const cabecera=imagenes.cabecera
  const contenido=[]
  if(cabecera)contenido.push(para([image(cabecera.data,cabecera.type,567,84)],{alignment:AlignmentType.CENTER,spacing:{before:0,after:55}}))
  contenido.push(para([run(`Dic. Equiv. ${documento.carrera_a_subfijo || 'Ing. Sistemas'} No. ${documento.codigo}`,{bold:true})],{alignment:AlignmentType.RIGHT,spacing:{before:0,after:0}}))
  contenido.push(para([run(`${documento.sede_nombre || 'Quetzaltenango'}, ${fechaGuatemala(documento.fecha_impresion)}`,{bold:true})],{alignment:AlignmentType.RIGHT,spacing:{before:0,after:180}}))
  contenido.push(para(['Señores:','Comisión Académica','Centro Universitario de Occidente','Edificio.'].flatMap((line,index)=>index?[new TextRun({break:1}),run(line,{bold:true,size:22})]:[run(line,{bold:true,size:22})]),{spacing:{before:0,after:180}}))
  contenido.push(para([run('Estimados Señores:',{bold:true,size:22})],{spacing:{before:0,after:140}}))
  contenido.push(para([
    run('Envío el expediente de él (la) Estudiante: '),run(documento.estudiante_nombre,{bold:true}),run(', Carné No. '),run(documento.estudiante_carnet,{bold:true}),
    run(', y Registro Académico No. '),run(documento.registro_academico,{bold:true}),run(`, estudiante de la carrera de ${documento.carrera_de}, quien solicita `),
    run('EQUIVALENCIA DE CURSOS',{bold:true}),run(` para su validez Académica en la Carrera de ${documento.carrera_a} Pensum ${documento.pensum_a_anio} ${documento.institucion_a_codigo || 'CUNOC'}, emitiéndose `),
    run('DICTAMEN FAVORABLE',{bold:true}),run(' a los cursos que a continuación se detallan:')
  ],{alignment:AlignmentType.JUSTIFIED,indent:{firstLine:570},spacing:{before:0,after:140}}))
  contenido.push(tabla(documento))
  contenido.push(para([run('Sin otro particular, me es grato suscribirme, atentamente,',{font:'Times New Roman',size:22})],{spacing:{before:150,after:180},keepNext:true}))
  contenido.push(para([run('“ID Y ENSEÑAD A TODOS”',{font:'Calibri Light',size:22,bold:true})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:350},keepNext:true}))
  contenido.push(...autoridad(documento,'coordinador',imagenes))
  contenido.push(para([run('Vo. Bo.:',{font:'Calibri Light',bold:true})],{spacing:{before:260,after:0},keepNext:true}))
  contenido.push(...autoridad(documento,'director',imagenes))
  contenido.push(para(lines(`cc. Archivo\nEAPA/JFRS/agg\nExp. No. ${documento.num_expediente || documento.codigo}`,{font:'Calibri Light',size:16}),{spacing:{before:180,after:0}}))
  const doc=new Document({sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:737,bottom:850,left:850,right:850}}},children:contenido}]})
  return Packer.toBlob(doc)
}

async function cargarImagen(path){
  if(!path)return null
  const response=await fetch(path,{credentials:'same-origin'})
  if(!response.ok)throw new Error(`No se pudo cargar la imagen ${path}`)
  const data=new Uint8Array(await response.arrayBuffer())
  const type=path.toLowerCase().match(/\.(jpe?g)(?:\?|$)/)?'jpg':'png'
  return {data,type}
}

export async function descargarWordEquiparacion(documento){
  const imagenes={}
  const rutas={cabecera:'/images/encabezado-equiparacion.png',coordinadorFirma:documento.coordinador_firma,coordinadorSello:documento.coordinador_sello,directorFirma:documento.director_firma,directorSello:documento.director_sello}
  await Promise.all(Object.entries(rutas).map(async([key,path])=>{
    if(key!=='cabecera'&&(!path||!path.startsWith('/uploads/')))return
    imagenes[key]=await cargarImagen(path)
  }))
  const blob=await crearWordEquiparacion(documento,imagenes)
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url
  link.download=`equiparacion-${documento.codigo}.docx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),60000)
}
