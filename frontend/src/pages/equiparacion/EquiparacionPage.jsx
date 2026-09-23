import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/client'
import EquiparacionPrint from './EquiparacionPrint'

const statuses=['PENDIENTE','LISTO']
const blank={id_estudiante:'',id_sede:'',id_pensum_de:'',id_pensum_a:'',id_autoridad_coordinador:'',id_autoridad_director:'',num_expediente:'',estado:'PENDIENTE',observaciones:'',cursos:[]}
const emptyStudent={nombre_completo:'',carnet:'',registro_academico:''}
const pair=c=>`${c.id_curso_de}:${c.id_curso_a}`
const normalized=value=>String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
const errorMessage=e=>e.response?.data?.message || 'No se pudo completar la operacion. Revisa la conexion.'
const date=value=>value?new Date(value).toLocaleDateString('es-GT',{timeZone:'America/Guatemala'}):'Sin descargar'
const destinationFor=(catalogs,originId)=>{
  const origin=catalogs.pensums.find(p=>Number(p.id)===Number(originId))
  return catalogs.pensums.filter(p=>Number(p.vigencia)===1&&Number(p.id)!==Number(originId))
    .sort((a,b)=>Number(Number(b.id_carrera)===Number(origin?.id_carrera))-Number(Number(a.id_carrera)===Number(origin?.id_carrera)) || Number(b.anio)-Number(a.anio))[0]
}
const coordinatorFor=(catalogs,destinationId)=>{
  const target=catalogs.pensums.find(p=>Number(p.id)===Number(destinationId))
  return catalogs.coordinadores.find(row=>Number(row.id_carrera)===Number(target?.id_carrera))?.id_autoridad_coordinador || ''
}

export default function EquiparacionPage(){
  const navigate=useNavigate()
  const location=useLocation()
  const [rows,setRows]=useState({items:[],total:0})
  const [catalogs,setCatalogs]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('')
  const [page,setPage]=useState(1)
  const [revision,setRevision]=useState(0)
  const [form,setForm]=useState(null)
  const [saving,setSaving]=useState(false)
  const [courseSearch,setCourseSearch]=useState('')
  const [studentQuery,setStudentQuery]=useState('')
  const [studentResults,setStudentResults]=useState([])
  const [searchingStudent,setSearchingStudent]=useState(false)
  const [studentModal,setStudentModal]=useState(false)
  const [newStudent,setNewStudent]=useState(emptyStudent)
  const [stateModal,setStateModal]=useState(null)
  const [preview,setPreview]=useState(null)
  const [printData,setPrintData]=useState(null)
  const [busy,setBusy]=useState(null)
  const [returnToDetail,setReturnToDetail]=useState(null)
  const previewUrl=useRef(null)
  const editRequest=useRef(null)

  useEffect(()=>()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current)},[])
  useEffect(()=>{
    const requested=new URLSearchParams(location.search).get('editar')
    if(!requested||!/^\d+$/.test(requested)||editRequest.current===requested)return
    editRequest.current=requested
    setReturnToDetail(requested)
    navigate('/dashboard/equiparacion',{replace:true})
    openForm({id:Number(requested)})
  },[location.search,navigate])
  useEffect(()=>{
    const controller=new AbortController()
    const timer=setTimeout(async()=>{
      setLoading(true);setError('')
      try{const {data}=await api.get('/equiparaciones',{params:{page,search,estado:filter},signal:controller.signal});setRows(data)}
      catch(e){if(e.code!=='ERR_CANCELED')setError(errorMessage(e))}
      finally{if(!controller.signal.aborted)setLoading(false)}
    },180)
    return()=>{clearTimeout(timer);controller.abort()}
  },[page,search,filter,revision])

  async function openForm(row){
    setBusy(row?.id || 'new');setError('')
    try{
      const {data:c}=await api.get('/equiparaciones/catalogos')
      setCatalogs(c)
      if(row){
        const {data}=await api.get(`/equiparaciones/${row.id}`)
        setForm({...blank,...data})
        setStudentQuery(`${data.estudiante_nombre} | ${data.estudiante_carnet} | ${data.registro_academico}`)
      }else{
        const origin=c.pensums.find(p=>c.equivalencias.some(eq=>Number(eq.id_pensum_de)===Number(p.id))) || c.pensums[0]
        const dest=destinationFor(c,origin?.id)
        setForm({...blank,id_sede:c.sedes[0]?.id || '',id_pensum_de:origin?.id || '',id_pensum_a:dest?.id || '',id_autoridad_coordinador:coordinatorFor(c,dest?.id),id_autoridad_director:c.autoridades.find(a=>a.codigo==='DIRECTOR_ING')?.id || ''})
        setStudentQuery('')
      }
      setStudentResults([]);setStudentModal(false);setNewStudent(emptyStudent);setCourseSearch('')
    }catch(e){setError(errorMessage(e))}finally{setBusy(null)}
  }
  function closeForm(){
    setForm(null)
    if(returnToDetail){navigate(`/dashboard/equiparacion/${returnToDetail}`);setReturnToDetail(null)}
  }
  const available=useMemo(()=>catalogs&&form?catalogs.equivalencias.filter(c=>Number(c.id_pensum_de)===Number(form.id_pensum_de)&&Number(c.id_pensum_a)===Number(form.id_pensum_a)):[],[catalogs,form])
  const filtered=available.filter(c=>normalized(`${c.curso_de_codigo} ${c.curso_de_nombre} ${c.curso_a_codigo} ${c.curso_a_nombre}`).includes(normalized(courseSearch)))
  const selected=new Set(form?.cursos.map(pair))
  const update=(key,value)=>setForm(current=>{
    if(key==='id_pensum_de'){
      const dest=destinationFor(catalogs,value)
      return {...current,id_pensum_de:value,id_pensum_a:dest?.id || '',id_autoridad_coordinador:coordinatorFor(catalogs,dest?.id),cursos:[]}
    }
    if(key==='id_pensum_a')return {...current,id_pensum_a:value,id_autoridad_coordinador:coordinatorFor(catalogs,value),cursos:[]}
    return {...current,[key]:value}
  })
  function toggle(course){setForm(current=>({...current,cursos:current.cursos.some(c=>pair(c)===pair(course))?current.cursos.filter(c=>pair(c)!==pair(course)):[...current.cursos,{id_curso_de:course.id_curso_de,id_curso_a:course.id_curso_a}]}))}
  async function searchStudent(){
    if(studentQuery.trim().length<2){toast.error('Ingresa al menos dos caracteres');return}
    setSearchingStudent(true)
    try{const {data}=await api.get('/equiparaciones/estudiantes/buscar',{params:{buscar:studentQuery.trim()}});setStudentResults(data)}
    catch(e){toast.error(errorMessage(e))}finally{setSearchingStudent(false)}
  }
  async function createStudent(event){
    event.preventDefault()
    if(Object.values(newStudent).some(value=>!value.trim())){toast.error('Completa los tres datos del estudiante');return}
    setSearchingStudent(true)
    try{
      const {data}=await api.post('/estudiantes',newStudent)
      const student=data.data
      setCatalogs(c=>({...c,estudiantes:[...c.estudiantes,student]}))
      setForm(current=>({...current,id_estudiante:student.id}))
      setStudentQuery(`${student.nombre_completo} | ${student.carnet} | ${student.registro_academico}`)
      setStudentResults([]);setStudentModal(false);setNewStudent(emptyStudent)
      toast.success('Estudiante registrado')
    }catch(e){toast.error(errorMessage(e))}finally{setSearchingStudent(false)}
  }
  async function save(event){
    event.preventDefault()
    if(!form.id_estudiante){toast.error('Selecciona o registra un estudiante');return}
    if(!form.id&&form.cursos.length===0){toast.error('Selecciona al menos una equivalencia');return}
    setSaving(true)
    try{
      const {data}=form.id
        ? await api.put(`/equiparaciones/${form.id}`,{id_estudiante:form.id_estudiante,id_sede:form.id_sede,id_pensum_de:form.id_pensum_de,id_pensum_a:form.id_pensum_a,num_expediente:form.num_expediente,observaciones:form.observaciones})
        : await api.post('/equiparaciones',form)
      toast.success(data.cursosReiniciados?'Pensums actualizados. Abre Ver para seleccionar los cursos del nuevo par.':`Equiparacion ${data.codigo} guardada`)
      setForm(null)
      if(returnToDetail){navigate(`/dashboard/equiparacion/${returnToDetail}`);setReturnToDetail(null)}
      else setRevision(x=>x+1)
    }catch(e){toast.error(errorMessage(e))}finally{setSaving(false)}
  }
  async function changeStatus(){
    setSaving(true)
    try{await api.patch(`/equiparaciones/${stateModal.id}/estado`,{estado:stateModal.estado});toast.success('Estado actualizado');setStateModal(null);setRevision(x=>x+1)}
    catch(e){toast.error(errorMessage(e))}finally{setSaving(false)}
  }
  async function preparePrint(row){
    setBusy(row.id)
    try{
      const {data}=await api.post(`/equiparaciones/${row.id}/impresion`)
      setPrintData(data)
      setRevision(x=>x+1)
    }catch(e){toast.error(errorMessage(e))}finally{setBusy(null)}
  }
  async function pdf(row){
    setBusy(row.id)
    try{
      const {data}=await api.get(`/equiparaciones/${row.id}/pdf`,{params:{download:'0'},responseType:'blob',timeout:60000})
      const url=URL.createObjectURL(data)
      if(previewUrl.current)URL.revokeObjectURL(previewUrl.current)
      previewUrl.current=url
      setPreview({...row,url})
    }catch(e){
      let message=errorMessage(e)
      if(e.response?.data instanceof Blob){try{message=JSON.parse(await e.response.data.text()).message}catch{}}
      toast.error(message)
    }finally{setBusy(null)}
  }
  function closePreview(){setPreview(null);if(previewUrl.current){URL.revokeObjectURL(previewUrl.current);previewUrl.current=null}}
  useEffect(()=>{
    const handler=event=>{if(event.key==='Escape'&&!saving){if(studentModal)setStudentModal(false);else if(stateModal)setStateModal(null);else{closeForm();closePreview()}}}
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)
  },[saving,studentModal,stateModal,returnToDetail])

  return <div className="eq-page">
    <div className="eq-heading"><div><span className="eq-eyebrow">GESTION ACADEMICA / DOCUMENTOS</span><h1>Equiparacion</h1><p>Gestiona el traslado de cursos entre pensums y emite el documento academico.</p></div><button className="eq-btn primary" onClick={()=>openForm()} disabled={busy==='new'}>{busy==='new'?'Cargando...':'+ Nueva equiparacion'}</button></div>
    <div className="eq-overview"><div><span className="eq-overview-label">ARCHIVO DE EQUIPARACIONES</span><strong>{rows.total}</strong><span>{search||filter?'resultados encontrados':'documentos registrados'}</span></div><div className="eq-overview-note"><span className="eq-dot"/><div><b>Registro manual</b><p>Selecciona al estudiante y los cursos para preparar cada documento.</p></div></div></div>
    <section className="eq-card">
      <div className="eq-toolbar"><label className="eq-search"><span>Buscar documento</span><input placeholder="Codigo, nombre o carne..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></label><label><span>Estado</span><select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1)}}><option value="">Todos los estados</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><button className="eq-btn" onClick={()=>setRevision(x=>x+1)}>Actualizar</button></div>
      {error&&<div className="eq-error" role="alert">{error}</div>}
      <div className="eq-document-list">
        {loading?<div className="eq-empty">Cargando equiparaciones...</div>:rows.items.length?rows.items.map(row=><article key={row.id} className="eq-document-card" role="link" tabIndex={0} aria-label={`Ver equiparacion ${row.codigo}`} onClick={()=>navigate(`/dashboard/equiparacion/${row.id}`)} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&e.target===e.currentTarget){e.preventDefault();navigate(`/dashboard/equiparacion/${row.id}`)}}}>
          <div className="eq-document-card-main">
            <div className="eq-document-identity"><span className="eq-document-label">DOCUMENTO</span><strong className="eq-code">{row.codigo}</strong><small>Creado {date(row.creado_en)}</small></div>
            <div className="eq-document-student"><span className="eq-document-label">ESTUDIANTE</span><strong>{row.estudiante_nombre}</strong><small>Carne {row.carnet}</small></div>
            <div className="eq-document-route" aria-label="Carrera y pensum de origen y destino">
              <div><span className="eq-document-label">ORIGEN</span><strong>{row.carrera_de || 'Carrera sin registrar'}</strong><small>Pensum {row.pensum_de_anio || '—'}{row.pensum_de_codigo?` · ${row.pensum_de_codigo}`:''}</small></div>
              <span className="eq-document-arrow" aria-hidden="true">→</span>
              <div><span className="eq-document-label">DESTINO</span><strong>{row.carrera_a || 'Carrera sin registrar'}</strong><small>Pensum {row.pensum_a_anio || '—'}{row.pensum_a_codigo?` · ${row.pensum_a_codigo}`:''}</small></div>
            </div>
            <div className="eq-document-count"><span className="eq-document-label">CURSOS</span><strong>{row.total_cursos}</strong></div>
            <div className="eq-document-status"><span className="eq-document-label">ESTADO</span><button className={`eq-badge eq-status-button ${row.estado.toLowerCase()}`} title="Cambiar estado" onClick={e=>{e.stopPropagation();setStateModal({id:row.id,codigo:row.codigo,estado:statuses.includes(row.estado)?row.estado:'PENDIENTE'})}}>{row.estado}</button></div>
          </div>
            <div className="eq-document-card-footer"><span>Haz clic en la tarjeta para ver los cursos</span><div className="eq-actions" onClick={e=>e.stopPropagation()}><button onClick={()=>navigate(`/dashboard/equiparacion/${row.id}`)}>Ver</button><button onClick={()=>openForm(row)} disabled={busy===row.id}>Editar</button><button onClick={()=>pdf(row)} disabled={busy===row.id||!row.total_cursos}>Visualizar</button><button onClick={()=>preparePrint(row)} disabled={busy===row.id||!row.total_cursos}>PDF</button></div></div>
        </article>):<div className="eq-empty"><h3>{search||filter?'Sin coincidencias':'Tu archivo comienza aqui'}</h3><p>{search||filter?'Prueba otro nombre, codigo o estado.':'Crea la primera equiparacion con los cursos del catalogo.'}</p>{!search&&!filter&&<button className="eq-btn" onClick={()=>openForm()}>Crear equiparacion</button>}</div>}
      </div>
      <div className="eq-pagination"><span>Pagina {page} de {Math.max(1,Math.ceil(rows.total/20))}</span><div><button className="eq-btn" disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>Anterior</button><button className="eq-btn" disabled={page*20>=rows.total||loading} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div></div>
    </section>
    {form&&catalogs&&<div className="eq-overlay"><section className="eq-dialog" role="dialog" aria-modal="true" aria-labelledby="form-title"><div className="eq-dialog-heading"><div><span className="eq-eyebrow">DOCUMENTO ACADEMICO</span><h2 id="form-title">{form.id?`Editar equiparacion ${form.codigo}`:'Nueva equiparacion'}</h2></div><button className="eq-btn" onClick={closeForm} disabled={saving}>Cerrar</button></div>
      <form onSubmit={save}><fieldset disabled={saving}>
        <div className="eq-form-section"><h3>01 / Estudiante y expediente</h3><div className="eq-form-grid">
          <div className="eq-span2 eq-student-picker"><label htmlFor="eq-student-search">Estudiante</label><div className="eq-student-search"><input id="eq-student-search" placeholder="Buscar por carnet, registro academico o nombre" value={studentQuery} onChange={e=>{setStudentQuery(e.target.value);update('id_estudiante','');setStudentResults([])}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();searchStudent()}}}/><button type="button" className="eq-btn" onClick={searchStudent} disabled={searchingStudent}>{searchingStudent?'Buscando...':'Buscar'}</button></div>
            {studentResults.length>0&&<div className="eq-student-results">{studentResults.map(student=><button type="button" key={student.id} onClick={()=>{update('id_estudiante',student.id);setStudentQuery(`${student.nombre_completo} | ${student.carnet} | ${student.registro_academico}`);setStudentResults([])}}><strong>{student.nombre_completo}</strong><span>Carnet {student.carnet} · Registro {student.registro_academico}</span></button>)}</div>}
            {form.id_estudiante&&<p className="eq-hint">Estudiante seleccionado para el documento.</p>}
            {studentResults.length===0&&studentQuery&&!form.id_estudiante&&!searchingStudent&&<p className="eq-hint">Si no aparece en la busqueda, puedes registrarlo aqui.</p>}
            <button type="button" className="eq-btn" onClick={()=>setStudentModal(true)}>+ Agregar estudiante nuevo</button>
          </div>
          <label>Sede<select aria-label="Sede" value={form.id_sede || ''} onChange={e=>update('id_sede',e.target.value)}><option value="">Sin sede</option>{catalogs.sedes.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
          <label>No. expediente<input aria-label="No. expediente" maxLength="80" value={form.num_expediente || ''} onChange={e=>update('num_expediente',e.target.value)}/></label>
        </div></div>
        <div className="eq-form-section"><h3>02 / Pensums{form.id?'':' y cursos'}</h3><div className="eq-form-grid halves">
          {[['id_pensum_de','Pensum de origen'],['id_pensum_a','Pensum de destino']].map(([key,label])=><label key={key}>{label}<select aria-label={label} required value={form[key]} onChange={e=>update(key,e.target.value)}><option value="">Seleccionar pensum</option>{catalogs.pensums.filter(p=>key==='id_pensum_de'||Number(p.vigencia)===1&&Number(p.id)!==Number(form.id_pensum_de)).map(p=><option key={p.id} value={p.id}>{p.anio} - {p.carrera} ({p.institucion}) {Number(p.vigencia)?'· Vigente':'· Anterior'}</option>)}</select></label>)}
        </div>
        {!form.id&&<><div className="eq-selection-bar"><input aria-label="Buscar cursos" placeholder="Buscar por codigo o nombre del curso" value={courseSearch} onChange={e=>setCourseSearch(e.target.value)}/><strong>{form.cursos.length} seleccionados</strong><button type="button" className="eq-btn" onClick={()=>setForm(current=>({...current,cursos:available.map(c=>({id_curso_de:c.id_curso_de,id_curso_a:c.id_curso_a}))}))}>Seleccionar todos</button><button type="button" className="eq-btn" onClick={()=>setForm(current=>({...current,cursos:[]}))}>Limpiar</button></div>
          <div className="eq-course-list"><table className="eq-table"><thead><tr><th>Incluir</th><th>Curso de origen</th><th>Curso de destino</th><th>%</th><th>Opinion</th></tr></thead><tbody>{filtered.map(course=><tr key={pair(course)} className={selected.has(pair(course))?'eq-selected':''}><td><input type="checkbox" aria-label={`Seleccionar ${course.curso_de_codigo}`} checked={selected.has(pair(course))} onChange={()=>toggle(course)}/></td><td><small>{course.curso_de_codigo}</small>{course.curso_de_nombre}</td><td><small>{course.curso_a_codigo}</small>{course.curso_a_nombre}</td><td>{Number(course.porcentaje)}</td><td>{course.opinion}</td></tr>)}{!filtered.length&&<tr><td colSpan="5" className="eq-empty">No hay equivalencias para estos pensums.</td></tr>}</tbody></table></div><p className="eq-hint">La busqueda de cursos ignora las tildes.</p></>}
        {form.id&&<p className="eq-notice">Los cursos se cambian desde Ver. Si cambias los pensums, los cursos anteriores se reiniciaran y podras seleccionar los nuevos desde esa pagina.</p>}</div>
        <div className="eq-form-section"><h3>03 / Autoridades y cierre</h3><div className="eq-form-grid halves">{[['id_autoridad_coordinador','Coordinador de la carrera destino'],['id_autoridad_director','Director de division']].map(([key,label])=><label key={key}>{label}<input readOnly value={catalogs.autoridades.find(a=>Number(a.id)===Number(form[key]))?.nombre || 'Sin configurar'}/></label>)}
          <label>Estado<input readOnly value={form.estado || 'PENDIENTE'}/></label><label>Observaciones<textarea maxLength="1000" rows="3" value={form.observaciones || ''} onChange={e=>update('observaciones',e.target.value)}/></label>
        </div>{(!form.id_autoridad_coordinador||!form.id_autoridad_director)&&<p className="eq-notice">Configura el coordinador de la carrera destino y el director con codigo DIRECTOR_ING.</p>}</div>
        <div className="eq-form-footer"><span>{form.id?'El codigo se conserva al editar.':'El codigo anual se asignara al guardar.'}</span><button className="eq-btn" type="button" onClick={closeForm}>Cancelar</button><button className="eq-btn primary" type="submit" disabled={!form.id_estudiante||!form.id_autoridad_coordinador||!form.id_autoridad_director||(!form.id&&!form.cursos.length)}>{saving?'Guardando...':'Guardar equiparacion'}</button></div>
      </fieldset></form>
    </section></div>}
    {studentModal&&<div className="eq-overlay eq-secondary-overlay"><section className="eq-dialog eq-student-dialog" role="dialog" aria-modal="true" aria-labelledby="student-title"><div className="eq-dialog-heading"><h2 id="student-title">Nuevo estudiante</h2><button className="eq-btn" onClick={()=>setStudentModal(false)}>Cerrar</button></div><form className="eq-student-modal-form" onSubmit={createStudent}>{[['nombre_completo','Nombre completo'],['carnet','Carnet'],['registro_academico','Registro academico']].map(([key,label])=><label key={key}>{label}<input required value={newStudent[key]} onChange={e=>setNewStudent(s=>({...s,[key]:e.target.value}))}/></label>)}<div className="eq-form-footer"><button type="button" className="eq-btn" onClick={()=>setStudentModal(false)}>Cancelar</button><button className="eq-btn primary" disabled={searchingStudent}>{searchingStudent?'Guardando...':'Guardar y seleccionar'}</button></div></form></section></div>}
    {stateModal&&<div className="eq-overlay eq-secondary-overlay"><section className="eq-dialog eq-state-dialog" role="dialog" aria-modal="true" aria-labelledby="status-title"><div className="eq-dialog-heading"><h2 id="status-title">Estado de {stateModal.codigo}</h2><button className="eq-btn" onClick={()=>setStateModal(null)}>Cerrar</button></div><div className="eq-state-form"><label>Selecciona el estado<select aria-label="Estado de la equiparacion" value={stateModal.estado} onChange={e=>setStateModal(s=>({...s,estado:e.target.value}))}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><button className="eq-btn primary" onClick={changeStatus} disabled={saving}>Guardar estado</button></div></section></div>}
    {preview&&<div className="eq-overlay"><section className="eq-dialog eq-preview" role="dialog" aria-modal="true" aria-label="Vista previa de equiparacion"><div className="eq-dialog-heading"><h2>Equiparacion {preview.codigo}</h2><div className="eq-actions"><button className="eq-btn primary" disabled={busy===preview.id} onClick={()=>preparePrint(preview)}>Imprimir / Guardar PDF</button><button className="eq-btn" onClick={closePreview}>Cerrar</button></div></div><p className="eq-print-hint">El botón PDF prepara la impresión desde la página.</p><iframe title={`Documento ${preview.codigo}`} src={preview.url}/></section></div>}
    {printData&&<EquiparacionPrint documento={printData} onClose={()=>setPrintData(null)}/>}
  </div>
}
