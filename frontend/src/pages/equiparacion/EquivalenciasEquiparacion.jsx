import {useEffect,useState} from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import {courseOptions,coursePensums,pensumLabel} from './equivalencias-cursos'

const initialForm={id_curso_de:'',id_curso_a:'',id_pensum_de:'',id_pensum_a:'',porcentaje:100,opinion:'EQUIVALENTE'}
const normalized=value=>String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()

export default function EquivalenciasEquiparacion(){
  const [rows,setRows]=useState([])
  const [courses,setCourses]=useState([])
  const [pensums,setPensums]=useState([])
  const [search,setSearch]=useState('')
  const [form,setForm]=useState(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const message=e=>e.response?.data?.message || e.message || 'No se pudo completar la operacion'

  async function load(){
    setLoading(true)
    setError('')
    try{
      const [equivalencias,cursos,pensumsResponse]=await Promise.all([
        api.get('/catalogs/equivalencias'),
        api.get('/catalogs/cursos'),
        api.get('/catalogs/pensum'),
      ])
      setRows(equivalencias.data)
      setCourses(cursos.data)
      setPensums(pensumsResponse.data)
    }catch(e){setError(message(e))}finally{setLoading(false)}
  }
  useEffect(()=>{load()},[])

  const memberships=coursePensums(courses,pensums)
  const filtered=rows.filter(row=>{
    const origin=(memberships.get(String(row.id_curso_de)) || []).join(' ')
    const destination=(memberships.get(String(row.id_curso_a)) || []).join(' ')
    return normalized(`${row.curso_de_codigo} ${row.curso_de_nombre} ${origin} ${row.curso_a_codigo} ${row.curso_a_nombre} ${destination}`).includes(normalized(search))
  })
  const originOptions=courseOptions(courses,form?.id_pensum_de)
  const destinationOptions=courseOptions(courses,form?.id_pensum_a)

  function changePensum(side,id){
    const key=`id_curso_${side}`
    const options=courseOptions(courses,id)
    setForm(current=>({...current,[`id_pensum_${side}`]:id,[key]:options.some(course=>String(course.id_curso)===String(current[key]))?current[key]:''}))
  }
  async function save(event){
    event.preventDefault()
    setBusy(true)
    try{
      const {id_curso_de,id_curso_a,porcentaje,opinion,old_id_curso_de,old_id_curso_a}=form
      const body={id_curso_de,id_curso_a,porcentaje,opinion,old_id_curso_de,old_id_curso_a}
      await api[old_id_curso_de?'put':'post']('/catalogs/equivalencias',body)
      setForm(null)
      toast.success('Equivalencia guardada')
      await load()
    }catch(e){toast.error(message(e))}finally{setBusy(false)}
  }
  async function remove(row){
    if(!window.confirm(`Eliminar la equivalencia ${row.curso_de_codigo} - ${row.curso_a_codigo}?`))return
    setBusy(true)
    try{await api.delete('/catalogs/equivalencias',{data:row});await load()}
    catch(e){toast.error(message(e))}finally{setBusy(false)}
  }
  function pensumsFor(id){
    const labels=memberships.get(String(id)) || []
    return labels.length ? labels.map(label=><span className="eq-pensum-item" key={label}>{label}</span>) : 'Sin pensum asociado'
  }

  return <div className="eq-page">
    <div className="eq-heading"><div><span className="eq-eyebrow">CATALOGO ACADEMICO</span><h1>Equivalencias de cursos</h1><p>Porcentaje y opinion definidos para cada par de cursos.</p></div><button className="eq-btn primary" onClick={()=>setForm({...initialForm})} disabled={loading}>+ Nueva equivalencia</button></div>
    <div className="eq-card"><div className="eq-toolbar"><label className="eq-search"><span>Buscar entre {rows.length} equivalencias</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Codigo, nombre o pensum"/></label><button className="eq-btn" onClick={load}>Actualizar</button></div>
      {error&&<div className="eq-error">{error}</div>}
      <div className="eq-table-scroll"><table className="eq-table"><thead><tr><th>Curso de origen</th><th>Pensum origen</th><th>Curso de destino</th><th>Pensum destino</th><th>Porcentaje</th><th>Opinion</th><th>Acciones</th></tr></thead><tbody>
        {loading?<tr><td colSpan="7" className="eq-empty">Cargando...</td></tr>:filtered.map(row=><tr key={`${row.id_curso_de}:${row.id_curso_a}`}><td><small>{row.curso_de_codigo}</small>{row.curso_de_nombre}</td><td className="eq-pensum-cell">{pensumsFor(row.id_curso_de)}</td><td><small>{row.curso_a_codigo}</small>{row.curso_a_nombre}</td><td className="eq-pensum-cell">{pensumsFor(row.id_curso_a)}</td><td>{Number(row.porcentaje)}%</td><td><span className="eq-badge">{row.opinion}</span></td><td>{row.utilizada?<small>En uso</small>:<div className="eq-actions"><button disabled={busy} onClick={()=>setForm({...initialForm,...row})}>Editar</button><button disabled={busy} onClick={()=>remove(row)}>Eliminar</button></div>}</td></tr>)}
        {!loading&&!filtered.length&&<tr><td colSpan="7" className="eq-empty">No hay coincidencias.</td></tr>}
      </tbody></table></div>
      <p className="eq-pensum-note">Un curso puede pertenecer a varios pensums; se muestran todos los asociados.</p>
    </div>
    {form&&<div className="eq-overlay"><section className="eq-dialog compact" role="dialog" aria-modal="true" aria-label="Equivalencia de cursos"><div className="eq-dialog-heading"><h2>{form.old_id_curso_de?'Editar':'Nueva'} equivalencia</h2><button className="eq-btn" disabled={busy} onClick={()=>setForm(null)}>Cerrar</button></div><form onSubmit={save}><fieldset disabled={busy}><div className="eq-form-section"><div className="eq-form-grid halves">
      {['de','a'].map(side=>{
        const label=side==='de'?'origen':'destino'
        const options=side==='de'?originOptions:destinationOptions
        return <div className="eq-pensum-selector" key={side}>
          <label>Pensum de {label}<select aria-label={`Pensum de ${label}`} value={form[`id_pensum_${side}`]} onChange={e=>changePensum(side,e.target.value)}><option value="">Todos los pensums</option>{pensums.map(p=><option key={p.id} value={p.id}>{pensumLabel(p)}</option>)}</select></label>
          <label>Curso de {label}<select aria-label={`Curso de ${label}`} required value={form[`id_curso_${side}`]} onChange={e=>setForm(current=>({...current,[`id_curso_${side}`]:e.target.value}))}><option value="">Selecciona un curso</option>{options.map(c=><option key={c.id_curso} value={c.id_curso}>{c.codigo} - {c.nombre}</option>)}</select></label>
        </div>
      })}
      <label>Porcentaje<input type="number" required min="0" max="100" step="0.01" value={form.porcentaje} onChange={e=>setForm(current=>({...current,porcentaje:e.target.value}))}/></label>
      <label>Opinion<input required maxLength="50" value={form.opinion} onChange={e=>setForm(current=>({...current,opinion:e.target.value}))}/></label>
    </div></div><div className="eq-form-footer"><button className="eq-btn primary" type="submit">{busy?'Guardando...':'Guardar'}</button></div></fieldset></form></section></div>}
  </div>
}
