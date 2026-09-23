import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/client'
import EquiparacionPrint from './EquiparacionPrint'

const pair=course=>`${course.id_curso_de}:${course.id_curso_a}`
const normalized=value=>String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
const errorMessage=error=>error.response?.data?.message || (error.response?.status ? `Error HTTP ${error.response.status}. Verifica que el backend esté actualizado.` : error.isAxiosError ? 'No hay conexión con el servidor. Comprueba que esté funcionando en el puerto 3001.' : `Error en la interfaz: ${error.message}`)

export default function EquiparacionDetallePage(){
  const {id}=useParams()
  const navigate=useNavigate()
  const [detail,setDetail]=useState(null)
  const [available,setAvailable]=useState([])
  const [courses,setCourses]=useState([])
  const [editing,setEditing]=useState(false)
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [loadingCourses,setLoadingCourses]=useState(false)
  const [error,setError]=useState('')
  const [courseError,setCourseError]=useState('')
  const [revision,setRevision]=useState(0)
  const [preview,setPreview]=useState(null)
  const [printData,setPrintData]=useState(null)
  const [pdfBusy,setPdfBusy]=useState(false)
  const previewUrl=useRef(null)
  useEffect(()=>()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current)},[])
  useEffect(()=>{
    let live=true
    setLoading(true)
    setError('')
    api.get(`/equiparaciones/${id}`).then(({data})=>{
      if(live){setDetail(data);setCourses((data.cursos || []).map(c=>({id_curso_de:c.id_curso_de,id_curso_a:c.id_curso_a})))}
    }).catch(e=>{if(live)setError(errorMessage(e))}).finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[id,revision])
  const filtered=available.filter(c=>normalized(`${c.curso_de_codigo} ${c.curso_de_nombre} ${c.curso_a_codigo} ${c.curso_a_nombre}`).includes(normalized(query)))
  const selected=new Set(courses.map(pair))
  function toggle(course){setCourses(current=>current.some(c=>pair(c)===pair(course))?current.filter(c=>pair(c)!==pair(course)):[...current,{id_curso_de:course.id_curso_de,id_curso_a:course.id_curso_a}])}
  async function openCourseEditor(){
    setCourseError('')
    setLoadingCourses(true)
    try{
      const {data}=await api.get(`/equiparaciones/${id}/equivalencias`)
      setAvailable(data)
      setCourses(detail.cursos.map(c=>({id_curso_de:c.id_curso_de,id_curso_a:c.id_curso_a})))
      setEditing(true)
    }catch(e){setCourseError(`No se pudieron cargar los cursos: ${errorMessage(e)}`)}finally{setLoadingCourses(false)}
  }
  async function saveCourses(){
    if(courses.length===0){toast.error('Selecciona al menos una equivalencia');return}
    setSaving(true)
    try{
      const {data}=await api.put(`/equiparaciones/${id}/cursos`,{cursos:courses})
      setDetail(data);setCourses(data.cursos.map(c=>({id_curso_de:c.id_curso_de,id_curso_a:c.id_curso_a})));setEditing(false)
      toast.success('Cursos actualizados')
    }catch(e){toast.error(errorMessage(e))}finally{setSaving(false)}
  }
  function closePreview(){
    setPreview(null)
    if(previewUrl.current){URL.revokeObjectURL(previewUrl.current);previewUrl.current=null}
  }
  async function preparePrint(){
    if(!detail?.cursos?.length){toast.error('Agrega cursos antes de imprimir');return}
    setPdfBusy(true)
    try{
      const {data}=await api.post(`/equiparaciones/${id}/impresion`)
      setDetail(data)
      setPrintData(data)
    }catch(e){toast.error(errorMessage(e))}finally{setPdfBusy(false)}
  }
  async function pdf(){
    setPdfBusy(true)
    try{
      const {data}=await api.get(`/equiparaciones/${id}/pdf`,{params:{download:'0'},responseType:'blob',timeout:60000})
      const url=URL.createObjectURL(data)
      closePreview()
      previewUrl.current=url
      setPreview({url})
    }catch(e){
      let message=errorMessage(e)
      if(e.response?.data instanceof Blob){try{message=JSON.parse(await e.response.data.text()).message}catch{}}
      toast.error(message)
    }finally{setPdfBusy(false)}
  }
  if(loading)return <div className="eq-page"><p>Cargando equiparacion...</p></div>
  if(error||!detail)return <div className="eq-page"><Link className="eq-btn" to="/dashboard/equiparacion">Volver</Link><p className="eq-error">{error || 'Documento no encontrado'}</p><button className="eq-btn" onClick={()=>setRevision(x=>x+1)}>Reintentar</button></div>
  return <div className="eq-page eq-detail-page">
    <div className="eq-heading"><div><Link className="eq-back" to="/dashboard/equiparacion">← Volver al listado</Link><span className="eq-eyebrow">DOCUMENTO / {detail.codigo}</span><h1>Equiparacion {detail.codigo}</h1><p>{detail.estudiante_nombre} · Carnet {detail.estudiante_carnet} · Registro {detail.registro_academico}</p></div><div className="eq-detail-header-actions"><span className={`eq-badge ${String(detail.estado).toLowerCase()}`}>{detail.estado}</span><div className="eq-actions"><button className="eq-btn" onClick={()=>navigate(`/dashboard/equiparacion?editar=${id}`)} disabled={editing||saving}>Editar</button><button className="eq-btn" onClick={()=>pdf()} disabled={!detail.cursos.length||pdfBusy||editing}>{pdfBusy?'Cargando...':'Visualizar'}</button><button className="eq-btn primary" onClick={preparePrint} disabled={!detail.cursos.length||pdfBusy||editing}>PDF</button></div></div></div>
    <section className="eq-card eq-detail-summary"><div><small>Pensum de origen</small><strong>{detail.pensum_de_anio} · {detail.carrera_de}</strong></div><div><small>Pensum de destino</small><strong>{detail.pensum_a_anio} · {detail.carrera_a}</strong></div><div><small>Cursos seleccionados</small><strong>{detail.cursos.length}</strong></div></section>
    <section className="eq-card eq-detail-courses"><div className="eq-detail-toolbar"><div><span className="eq-eyebrow">CURSOS DEL DOCUMENTO</span><h2>{editing?'Cambiar cursos':'Listado de cursos'}</h2></div><div className="eq-actions">{editing?<><button className="eq-btn" onClick={()=>{setEditing(false);setCourses(detail.cursos.map(c=>({id_curso_de:c.id_curso_de,id_curso_a:c.id_curso_a})))}} disabled={saving}>Cancelar</button><button className="eq-btn primary" onClick={saveCourses} disabled={saving||!courses.length}>{saving?'Guardando...':'Guardar cursos'}</button></>:<button className="eq-btn primary" onClick={openCourseEditor} disabled={loadingCourses}>{loadingCourses?'Cargando cursos...':'Cambiar cursos'}</button>}</div></div>
      {courseError&&<p className="eq-error" role="alert">{courseError}</p>}
      {editing?<><div className="eq-selection-bar"><input aria-label="Buscar cursos" placeholder="Buscar codigo o nombre, con o sin tilde" value={query} onChange={e=>setQuery(e.target.value)}/><strong>{courses.length} seleccionados</strong><button className="eq-btn" onClick={()=>setCourses(available.map(c=>({id_curso_de:c.id_curso_de,id_curso_a:c.id_curso_a})))}>Seleccionar todos</button><button className="eq-btn" onClick={()=>setCourses([])}>Limpiar</button></div><div className="eq-course-list"><table className="eq-table"><thead><tr><th>Incluir</th><th>Curso de origen</th><th>Curso de destino</th><th>%</th><th>Opinion</th></tr></thead><tbody>{filtered.map(course=><tr key={pair(course)} className={selected.has(pair(course))?'eq-selected':''}><td><input type="checkbox" aria-label={`Seleccionar ${course.curso_de_codigo}`} checked={selected.has(pair(course))} onChange={()=>toggle(course)}/></td><td><small>{course.curso_de_codigo}</small>{course.curso_de_nombre}</td><td><small>{course.curso_a_codigo}</small>{course.curso_a_nombre}</td><td>{Number(course.porcentaje)}</td><td>{course.opinion}</td></tr>)}{!filtered.length&&<tr><td colSpan="5" className="eq-empty">No hay equivalencias para estos pensums o esta busqueda.</td></tr>}</tbody></table></div></>:<div className="eq-table-scroll"><table className="eq-table"><thead><tr><th>No.</th><th>Curso de origen</th><th>Curso de destino</th><th>Porcentaje</th><th>Opinion</th></tr></thead><tbody>{detail.cursos.map(course=><tr key={course.numero}><td>{course.numero}</td><td><small>{course.curso_de_codigo}</small>{course.curso_de_nombre}</td><td><small>{course.curso_a_codigo}</small>{course.curso_a_nombre}</td><td>{Number(course.porcentaje)}%</td><td>{course.opinion}</td></tr>)}{!detail.cursos.length&&<tr><td colSpan="5" className="eq-empty">Esta equiparacion todavia no tiene cursos. Usa Cambiar cursos para agregarlos.</td></tr>}</tbody></table></div>}
    </section>
    {preview&&<div className="eq-overlay"><section className="eq-dialog eq-preview" role="dialog" aria-modal="true" aria-label="Vista previa de equiparacion"><div className="eq-dialog-heading"><h2>Equiparacion {detail.codigo}</h2><div className="eq-actions"><button className="eq-btn primary" onClick={preparePrint}>Imprimir / Guardar PDF</button><button className="eq-btn" onClick={closePreview}>Cerrar</button></div></div><p className="eq-print-hint">El botón PDF prepara la impresión desde la página.</p><iframe title={`Documento ${detail.codigo}`} src={preview.url}/></section></div>}
    {printData&&<EquiparacionPrint documento={printData} onClose={()=>setPrintData(null)}/>}
  </div>
}
