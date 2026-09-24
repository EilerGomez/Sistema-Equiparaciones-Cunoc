import {useState} from 'react'
import api from '../../api/client'

const message=error=>error.response?.data?.message||'No se pudo procesar el PDF. Verifica que el servidor y Python esten disponibles.'
const blank={nombre_completo:'',carnet:'',registro_academico:''}

export default function ImportarEquiparacion({onClose,onCreated}){
  const [file,setFile]=useState(null)
  const [preview,setPreview]=useState(null)
  const [selection,setSelection]=useState(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  async function analyze(event){
    event.preventDefault()
    if(!file)return
    setBusy(true);setError('');setPreview(null)
    try{
      const payload=new FormData()
      payload.append('archivo',file)
      const {data}=await api.post('/equiparaciones/importar/preview',payload,{timeout:45000})
      setPreview(data)
      setSelection({...data.seleccion,estudiante:{...blank,...data.extraido.estudiante},num_expediente:data.extraido.num_expediente||''})
    }catch(err){setError(message(err))}finally{setBusy(false)}
  }

  async function save(event){
    event.preventDefault()
    setBusy(true);setError('')
    try{
      const payload=new FormData()
      payload.append('archivo',file)
      payload.append('seleccion',JSON.stringify(selection))
      const {data}=await api.post('/equiparaciones/importar',payload,{timeout:60000})
      onCreated(data)
    }catch(err){setError(message(err))}finally{setBusy(false)}
  }

  const extracted=preview?.extraido
  const catalogs=preview?.catalogos
  const destino=catalogs?.pensums.find(p=>Number(p.id)===Number(selection?.id_pensum_a))
  const coordinador=catalogs?.coordinadores.find(row=>Number(row.id_carrera)===Number(destino?.id_carrera))
  const blocked=preview?.advertencias.some(item=>item.includes('ya existe.'))
  return <div className="eq-overlay"><section className="eq-dialog eq-import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
    <div className="eq-dialog-heading"><div><span className="eq-eyebrow">CARGA DE DOCUMENTO</span><h2 id="import-title">Importar equiparacion desde PDF</h2></div><button type="button" className="eq-btn" onClick={onClose} disabled={busy}>Cerrar</button></div>
    <form onSubmit={analyze} className="eq-import-upload"><label htmlFor="eq-import-file">Archivo PDF de equivalencias</label><div><input id="eq-import-file" type="file" accept="application/pdf,.pdf" required onChange={event=>{setFile(event.target.files?.[0]||null);setPreview(null);setSelection(null);setError('')}}/><button className="eq-btn primary" type="submit" disabled={busy||!file}>{busy?'Leyendo...':'Leer PDF'}</button></div><small>Se mostraran los datos y cursos antes de registrarlos. El archivo admite hasta 12 MB.</small></form>
    {error&&<p className="eq-error" role="alert">{error}</p>}
    {preview&&selection&&<form onSubmit={save}>
      <div className="eq-form-section"><h3>01 / Documento extraido</h3><div className="eq-import-summary"><div><small>Dictamen</small><strong>{extracted.codigo}</strong><span>{extracted.subfijo}</span></div><div><small>Fecha del PDF</small><strong>{extracted.fecha_impresion}</strong><span>{extracted.sede}</span></div><div><small>Estado al guardar</small><strong>PENDIENTE</strong><span>{extracted.cursos.length} cursos</span></div></div>
        {preview.advertencias.length>0&&<div className="eq-notice" role="status">{preview.advertencias.map((text,index)=><p key={index}>{text}</p>)}</div>}
      </div>
      <div className="eq-form-section"><h3>02 / Estudiante y expediente</h3><div className="eq-form-grid">{[['nombre_completo','Nombre completo'],['carnet','Carnet'],['registro_academico','Registro academico']].map(([key,label])=><label key={key}>{label}<input required maxLength={key==='nombre_completo'?150:key==='carnet'?30:50} value={selection.estudiante[key]} onChange={event=>setSelection(current=>({...current,estudiante:{...current.estudiante,[key]:event.target.value}}))}/></label>)}
        <label>No. expediente<input maxLength="80" placeholder="Sin numero en el PDF" value={selection.num_expediente} onChange={event=>setSelection(current=>({...current,num_expediente:event.target.value}))}/></label>
        <label>Sede<select required value={selection.id_sede} onChange={event=>setSelection(current=>({...current,id_sede:event.target.value}))}><option value="">Seleccionar sede</option>{catalogs.sedes.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label></div>
        <p className="eq-hint">{preview.estudiante_existente?`Se usara el estudiante existente si coinciden carnet y registro: ${preview.estudiante_existente.nombre_completo}.`:'Si el carnet y registro no existen, se creara el estudiante al confirmar.'}</p>
      </div>
      <div className="eq-form-section"><h3>03 / Pensums y autoridades</h3><div className="eq-form-grid halves">{[['id_pensum_de','Origen',extracted.origen],['id_pensum_a','Destino',extracted.destino]].map(([key,label,source])=><label key={key}>{label} · PDF: {source.carrera} {source.anio} {source.institucion}<select required value={selection[key]} onChange={event=>setSelection(current=>({...current,[key]:event.target.value}))}><option value="">Seleccionar pensum</option>{catalogs.pensums.filter(p=>key==='id_pensum_de'||Number(p.vigencia)===1).map(p=><option key={p.id} value={p.id}>{p.carrera} · {p.anio} · {p.institucion}{Number(p.vigencia)?' · Vigente':''}</option>)}</select></label>)}</div>
        <p className="eq-hint">Coordinador de destino: {coordinador?'Configurado':'Falta configurar'} · Director: {catalogs.director?.nombre||'Falta configurar'}</p>
      </div>
      <div className="eq-form-section"><h3>04 / Cursos leidos del PDF</h3><div className="eq-course-list eq-import-courses"><table className="eq-table"><thead><tr><th>No.</th><th>Origen</th><th>Destino</th><th>%</th><th>Opinion</th></tr></thead><tbody>{extracted.cursos.map(row=><tr key={row.numero}><td>{row.numero}</td><td><small>{row.curso_de_codigo}</small>{row.curso_de_nombre}</td><td><small>{row.curso_a_codigo}</small>{row.curso_a_nombre}</td><td>{row.porcentaje}%</td><td>{row.opinion}</td></tr>)}</tbody></table></div><p className="eq-hint">Los ceros iniciales de los codigos se omiten. Si una fila no corresponde al PDF, cancela la importacion y registrala manualmente.</p></div>
      <div className="eq-form-footer"><span>El numero {extracted.codigo} y la fecha del PDF se conservaran.</span><button type="button" className="eq-btn" onClick={onClose} disabled={busy}>Cancelar</button><button type="submit" className="eq-btn primary" disabled={busy||blocked||!selection.id_sede||!selection.id_pensum_de||!selection.id_pensum_a||!coordinador||!catalogs.director}>{busy?'Guardando...':'Confirmar e importar'}</button></div>
    </form>}
  </section></div>
}
