import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import printCss from './equiparacion-print.css?inline'
import './equiparacion-print.css'

function fechaGuatemala(value){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('es-GT',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Guatemala'}).formatToParts(value?new Date(value):new Date()).map(part=>[part.type,part.value]))
  return `${parts.month} ${parts.day} de ${parts.year}`
}

function asset(value){
  return typeof value==='string'&&value.startsWith('/uploads/')?value:null
}

function Autoridad({documento,role}){
  const firma=asset(documento[`${role}_firma`])
  const sello=asset(documento[`${role}_sello`])
  return <div className={`eq-print-authority eq-print-${role}`}>
    {firma&&<img className="eq-print-firma" src={firma} alt=""/>}
    {sello&&<img className="eq-print-sello" src={sello} alt=""/>}
    <div className="eq-print-authority-name">{`${documento[`${role}_subfijo`] || ''} ${documento[`${role}_nombre`] || ''}`.trim()}</div>
    <div className="eq-print-authority-role">{documento[`${role}_cargo`]}</div>
  </div>
}

function TablaCursos({documento,cursos}){
  return <table className="eq-print-table">
    <colgroup>{[5,9,23,4,9,23,12,15].map((width,index)=><col key={index} style={{width:`${width}%`}}/>)}</colgroup>
    <thead><tr><th rowSpan="2">No.</th><th colSpan="3">Pensum {documento.pensum_de_anio}<br/>{documento.carrera_de}<br/>{documento.institucion_de_codigo || 'CUNOC'}</th><th colSpan="2">Pensum {documento.pensum_a_anio}<br/>{documento.carrera_a}<br/>{documento.institucion_a_codigo || 'CUNOC'}</th><th rowSpan="2">Porcentaje</th><th rowSpan="2">Opinión</th></tr>
      <tr><th>Código</th><th>Nombre del curso</th><th>Por</th><th>Código</th><th>Nombre del curso</th></tr></thead>
    <tbody>{cursos.map((course,index)=><tr key={course.numero} className={cursos.length>14&&index===cursos.length-9?'eq-print-final-section':''}><td>{course.numero}</td><td>{course.curso_de_codigo}</td><td>{course.curso_de_nombre}</td><td className="eq-print-center">Por</td><td>{course.curso_a_codigo}</td><td>{course.curso_a_nombre}</td><td>{Number(course.porcentaje)}%</td><td>{course.opinion}</td></tr>)}</tbody>
  </table>
}

function Cierre({documento}){
  return <div className="eq-print-closing">
    <p>Sin otro particular, me es grato suscribirme, atentamente,</p>
    <strong className="eq-print-motto">“ID Y ENSEÑAD A TODOS”</strong>
    <div className="eq-print-signatures"><div/><Autoridad documento={documento} role="coordinador"/></div>
    <div className="eq-print-vobo"><b>Vo. Bo.:</b><Autoridad documento={documento} role="director"/></div>
    <div className="eq-print-copy">cc. Archivo<br/>EAPA/JFRS/agg<br/>Exp. No. {documento.num_expediente || documento.codigo}</div>
  </div>
}

function Paginas({documento}){
  const title=`Dic. Equiv. ${documento.carrera_a_subfijo || 'Ing. Sistemas'} No. ${documento.codigo}`
  const date=`${documento.sede_nombre || 'Quetzaltenango'}, ${fechaGuatemala(documento.fecha_impresion)}`
  return <div className="eq-print-paper">
    <div className="eq-print-heading"><img className="eq-print-header" src="/images/encabezado-equiparacion.png" alt=""/><div className="eq-print-title"><div>{title}</div><div>{date}</div></div></div>
    <p className="eq-print-recipient"><strong>Señores:<br/>Comisión Académica<br/>Centro Universitario de Occidente<br/>Edificio.</strong></p>
    <p className="eq-print-greeting"><strong>Estimados Señores:</strong></p>
    <p className="eq-print-intro">Envío el expediente de él (la) Estudiante: <strong>{documento.estudiante_nombre}</strong>, Carné No. <strong>{documento.estudiante_carnet}</strong>, y Registro Académico No. <strong>{documento.registro_academico}</strong>, estudiante de la carrera de {documento.carrera_de}, quien solicita <strong>EQUIVALENCIA DE CURSOS</strong> para su validez Académica en la Carrera de {documento.carrera_a} Pensum {documento.pensum_a_anio} {documento.institucion_a_codigo || 'CUNOC'}, emitiéndose <strong>DICTAMEN FAVORABLE</strong> a los cursos que a continuación se detallan:</p>
    <TablaCursos documento={documento} cursos={documento.cursos || []}/>
    <Cierre documento={documento}/>
  </div>
}

export default function EquiparacionPrint({documento,onClose}){
  const areaRef=useRef(null)
  const frameRef=useRef(null)
  const printingRef=useRef(false)
  const [wordBusy,setWordBusy]=useState(false)

  async function downloadWord(){
    setWordBusy(true)
    try{
      const {descargarWordEquiparacion}=await import('./equiparacion-word')
      await descargarWordEquiparacion(documento)
    }
    catch(error){toast.error(error.message || 'No se pudo generar el documento Word')}
    finally{setWordBusy(false)}
  }

  function print(){
    if(!areaRef.current||printingRef.current)return
    printingRef.current=true
    frameRef.current?.remove()
    const frame=document.createElement('iframe')
    frame.title=`Impresion equiparacion ${documento.codigo}`
    frame.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0'
    document.body.appendChild(frame)
    frameRef.current=frame
    const doc=frame.contentDocument
    const nombre=`Equiparacion_${String(documento.codigo).replace(/[^a-zA-Z0-9_-]/g,'_')}`
    doc.open()
    doc.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${nombre}</title><base href="${window.location.origin}/"><style>${printCss}</style></head><body>${areaRef.current.innerHTML}</body></html>`)
    doc.close()
    let done=false
    const ready=async()=>{
      if(done)return
      done=true
      await Promise.all([...doc.images].map(img=>img.decode?.().catch(()=>{}) || Promise.resolve()))
      if(doc.fonts)await doc.fonts.ready
      if(!frame.isConnected)return
      frame.contentWindow.focus()
      frame.contentWindow.print()
      printingRef.current=false
    }
    frame.onload=ready
    setTimeout(ready,300)
  }

  useEffect(()=>{
    const timer=setTimeout(print,300)
    return()=>{clearTimeout(timer);frameRef.current?.remove();frameRef.current=null}
  },[])

  return <div className="eq-overlay eq-print-panel"><section className="eq-dialog" role="dialog" aria-modal="true" aria-label="Impresion de equiparacion">
    <div className="eq-dialog-heading"><h2>Equiparacion {documento.codigo}</h2><div className="eq-actions"><button className="eq-btn primary" onClick={print}>Imprimir / Guardar PDF</button><button className="eq-btn" onClick={downloadWord} disabled={wordBusy}>{wordBusy?'Generando Word...':'Word editable'}</button><button className="eq-btn" onClick={onClose}>Cerrar</button></div></div>
    <p>El PDF tiene una tabla continua. Para editar con certeza una sola tabla en Word, descarga «Word editable».</p>
    <div className="eq-print-preview" ref={areaRef}><Paginas documento={documento}/></div>
  </section></div>
}
