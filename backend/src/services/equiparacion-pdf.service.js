const PDFDocument = require('pdfkit')
const path = require('path')
const fs = require('fs')

function dateText(value) {
  // A SQL DATE has no time zone; interpreting it as UTC midnight shifts it to the previous day in Guatemala.
  const date = value ? new Date(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value) : new Date()
  const parts=Object.fromEntries(new Intl.DateTimeFormat('es-GT',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Guatemala'}).formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]))
  return `${parts.month} ${parts.day} de ${parts.year}`
}
function imagePath(url) {
  if (!url || !url.startsWith('/uploads/')) return null
  const root = path.resolve(process.env.UPLOAD_ROOT || path.join(__dirname,'../../uploads'))
  const file = path.resolve(root,url.slice('/uploads/'.length))
  return file.startsWith(root+path.sep) && fs.existsSync(file) ? file : null
}
function generatePdf(e) {
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margin:42,autoFirstPage:false,bufferPages:true,info:{Title:`Equiparación ${e.codigo}`,Author:'Centro Universitario de Occidente'}})
    const fonts=path.join(__dirname,'../../assets/fonts')
    doc.registerFont('Cambria',path.join(fonts,'Caladea-Regular.ttf'))
    doc.registerFont('CambriaBold',path.join(fonts,'Caladea-Bold.ttf'))
    doc.registerFont('CalibriLight',path.join(fonts,'Carlito-Regular.ttf'))
    doc.registerFont('CalibriLightBold',path.join(fonts,'Carlito-Bold.ttf'))
    doc.registerFont('TimesNewRoman',path.join(fonts,'LiberationSerif-Regular.ttf'))
    doc.registerFont('TimesNewRomanBold',path.join(fonts,'LiberationSerif-Bold.ttf'))
    const buffers=[]
    doc.on('data',chunk=>buffers.push(chunk));doc.on('end',()=>resolve(Buffer.concat(buffers)));doc.on('error',reject)
    try {
      const left=42,width=511.28,bottom=790
      const headerFile=path.join(__dirname,'../../public/images/encabezado-equiparacion.png')
      const text=(value,x,y,w,size=10,bold=false,align='left',family='Cambria',lineGap=0)=>doc.font(family+(bold?'Bold':'')).fontSize(size).fillColor('#111111').text(String(value ?? ''),x,y,{width:w,align,lineGap})
      const newPage=()=>{
        doc.addPage()
        if(fs.existsSync(headerFile)){
          const header=doc.openImage(headerFile)
          const scale=Math.min(width/header.width,62/header.height)
          const headerWidth=header.width*scale
          doc.image(header,(doc.page.width-headerWidth)/2,22,{width:headerWidth,height:header.height*scale})
        }
        doc.y=100
      }
      newPage()
      const title=`Dic. Equiv. ${e.carrera_a_subfijo || 'Ing. Sistemas'} No. ${e.codigo}`
      const rightX=left+width*0.55,rightWidth=width*0.45
      const titleHeight=doc.font('CambriaBold').fontSize(10).heightOfString(title,{width:rightWidth})
      const dateY=Math.max(114,100+titleHeight+2)
      const dateLabel=`${e.sede_nombre || 'Quetzaltenango'}, ${dateText(e.fecha_impresion || new Date())}`
      const dateHeight=doc.font('CambriaBold').fontSize(10).heightOfString(dateLabel,{width:rightWidth})
      const addressY=Math.max(143,dateY+dateHeight+8)
      text(title,rightX,100,rightWidth,10,true,'left')
      text(dateLabel,rightX,dateY,rightWidth,10,true,'left')
      text('Señores:\nComisión Académica\nCentro Universitario de Occidente\nEdificio.',left,addressY,width,11,true)
      text('Estimados Señores:',left,addressY+54,width,11,true)
      const intro=[
        ['Envío el expediente de él (la) Estudiante: ',false],[`${e.estudiante_nombre},`,true],
        [' Carné No. ',false],[`${e.estudiante_carnet},`,true],[' y Registro Académico No. ',false],[`${e.registro_academico},`,true],
        [' estudiante de la carrera de ',false],[`${e.carrera_de},`,false],[' quien solicita ',false],
        ['EQUIVALENCIA DE CURSOS',true],[' para su validez Académica en la Carrera de ',false],
        [e.carrera_a,false],[` Pensum ${e.pensum_a_anio} ${e.institucion_a_codigo || 'CUNOC'}, emitiéndose `,false],
        ['DICTAMEN FAVORABLE',true],[' a los cursos que a continuación se detallan:',false]
      ]
      const introY=addressY+83
      const words=intro.flatMap(([value,bold])=>String(value ?? '').trim().split(/\s+/).filter(Boolean).map(word=>({word,bold})))
      const normalSpace=doc.font('Cambria').fontSize(10).widthOfString(' ')
      const lines=[];let line=[],used=0
      for(const token of words){
        const wordWidth=doc.font(token.bold?'CambriaBold':'Cambria').fontSize(10).widthOfString(token.word)
        if(line.length&&used+normalSpace+wordWidth>width){lines.push(line);line=[];used=0}
        line.push({...token,width:wordWidth});used+=wordWidth+(line.length>1?normalSpace:0)
      }
      if(line.length)lines.push(line)
      lines.forEach((current,index)=>{
        const spare=width-current.reduce((sum,item)=>sum+item.width,0)
        const gap=current.length>1?(index===lines.length-1?normalSpace:spare/(current.length-1)):0
        let x=left
        for(const item of current){doc.font(item.bold?'CambriaBold':'Cambria').fontSize(10).text(item.word,x,introY+index*12.5,{lineBreak:false});x+=item.width+gap}
      })
      let y=introY+lines.length*12.5+10
      const cols=[28,39,123,22,39,123,53,84]
      const xs=[left];for(const w of cols)xs.push(xs[xs.length-1]+w)
      const border=(x,yy,w,h)=>doc.lineWidth(.5).strokeColor('#111111').rect(x,yy,w,h).stroke()
      function row(values,height,head=false){
        values.forEach((value,i)=>{
          border(xs[i],y,cols[i],height)
          const align=[0,1,3,4,6].includes(i)?'center':'left'
          text(value,xs[i]+3,y+2,cols[i]-6,10,head,align,'CalibriLight')
        })
        y+=height
      }
      function tableHeader(){
        if(y+62>bottom){newPage();y=108}
        const h=43
        border(xs[0],y,cols[0],h);text('No.',xs[0],y+14,cols[0],10,true,'center','CalibriLight')
        border(xs[1],y,cols[1]+cols[2]+cols[3],h)
        text(`Pensum ${e.pensum_de_anio}\n${e.carrera_de}\n${e.institucion_de_codigo || 'CUNOC'}`,xs[1]+2,y+3,cols[1]+cols[2]+cols[3]-4,10,true,'center','CalibriLight')
        border(xs[4],y,cols[4]+cols[5],h)
        text(`Pensum ${e.pensum_a_anio}\n${e.carrera_a}\n${e.institucion_a_codigo || 'CUNOC'}`,xs[4]+2,y+3,cols[4]+cols[5]-4,10,true,'center','CalibriLight')
        border(xs[6],y,cols[6],h);text('Porcentaje',xs[6]+2,y+14,cols[6]-4,10,true,'center','CalibriLight')
        border(xs[7],y,cols[7],h);text('Opinión',xs[7]+2,y+14,cols[7]-4,10,true,'center','CalibriLight')
        y+=h
        row(['','Código','Nombre del curso','Por','Código','Nombre del curso','',''],19,true)
      }
      tableHeader()
      for(const course of e.cursos){
        const values=[course.numero,course.curso_de_codigo,course.curso_de_nombre,'',course.curso_a_codigo,course.curso_a_nombre,`${Number(course.porcentaje)}%`,course.opinion]
        doc.font('CalibriLight').fontSize(10)
        const height=Math.max(19,...values.map((value,i)=>doc.heightOfString(String(value),{width:cols[i]-6,lineGap:0})+4))
        if(y+height>bottom-8){newPage();y=108;tableHeader()}
        row(values,height)
      }
      if(y+220>bottom){newPage();y=115}
      const closingY=y+8
      text('Sin otro particular, me es grato suscribirme, atentamente,',left+35,closingY,width-70,11,false,'left','TimesNewRoman')
      text('“ID Y ENSEÑAD A TODOS”',left,closingY+27,width,11,true,'center','CalibriLight')
      // Bottom-align both images within their space, just above each authority's name.
      const containedImage=(file,x,top,w,h)=>{
        if(!file)return
        const source=doc.openImage(file)
        const scale=Math.min(w/source.width,h/source.height)
        const actualW=source.width*scale,actualH=source.height*scale
        doc.image(source,x+(w-actualW)/2,top+h-actualH,{width:actualW,height:actualH})
      }
      const authority=(role,x,top,w,caption)=>{
        const firm=imagePath(e[`${role}_firma`]),stamp=imagePath(e[`${role}_sello`])
        containedImage(firm,x+w*.12,top+3,w*.58,43)
        text(`${e[`${role}_subfijo`] || ''} ${e[`${role}_nombre`] || ''}`.trim().toUpperCase(),x,top+49,w,10,true,'center','CalibriLight')
        text(caption || e[`${role}_cargo`],x,top+63,w,10,true,'center','CalibriLight')
        containedImage(stamp,x+w*.64,top-7,w*.32,60)
      }
      authority('coordinador',left+width*.53,closingY+47,width*.46,String(e.coordinador_cargo || '').toUpperCase())
      text('Vo. Bo.:',left,closingY+114,45,10,true,'left','CalibriLight')
      authority('director',left+26,closingY+81,width*.48,String(e.director_cargo || '').toUpperCase())
      text(`cc. Archivo\nEAPA/JFRS/agg\nExp. No. ${e.num_expediente || e.codigo}`,left,closingY+180,width,8,false,'left','CalibriLight')
      const pages=doc.bufferedPageRange()
      if(pages.count>1){for(let n=0;n<pages.count;n++){doc.switchToPage(n);text(`${n+1} / ${pages.count}`,left,784,width,8,false,'right','CalibriLight')}}
      doc.end()
    }catch(error){doc.destroy();reject(error)}
  })
}
module.exports={generatePdf}
