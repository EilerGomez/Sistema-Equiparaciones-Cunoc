import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'
import '../../components/layout/EstudianteLayout.css'

// ── helpers ──────────────────────────────────────────────
const norm = (data) => {
  if (Array.isArray(data))       return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

const normTexto = (t) =>
  String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const CUNOC_ID = 2

// ── PDF print ────────────────────────────────────────────
const imprimirTabla = (html, titulo) => {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
    <style>
      @page { size: A4; margin: 15mm 18mm; }
      body { font-family: "Times New Roman", serif; font-size: 12px; color: #111; margin:0; padding:0; }
      h2 { text-align:center; font-size:13px; margin:0 0 4px; font-weight:bold; }
      h3 { text-align:center; font-size:11px; font-weight:normal; margin:0 0 14px; }
      table { width:100%; border-collapse:collapse; font-size:10px; }
      th, td { border:1px solid #444; padding:4px 6px; vertical-align:top; }
      th { text-align:center; font-weight:700; }
      .tc { text-align:center; }
      .header-info { text-align:center; margin-bottom:18px; font-size:10px; line-height:1.7; }
    </style>
  </head><body>${html}</body></html>`)
  doc.close()
  let done = false
  const run = () => {
    if (done) return; done = true
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe) }, 800)
  }
  iframe.onload = run
  setTimeout(run, 500)
}

// ── Component ─────────────────────────────────────────────
export default function SolicitudEquivalenciasPage() {
  const { user } = useAuth()

  // Catálogos base
  const [instituciones, setInstituciones] = useState([])
  const [carreras,      setCarreras]      = useState([])
  const [pensums,       setPensums]       = useState([])
  const [sedes,         setSedes]         = useState([])
  const [equivalencias, setEquivalencias] = useState([])

  // Cursos del pensum de origen (cargados al seleccionar pensum)
  const [cursosOrigen, setCursosOrigen] = useState([])

  // Formulario — mismo esquema que DictamenesPage
  const [form, setForm] = useState({
    id_sede:               '',
    id_carrera_equivalencia: '',   // carrera CUNOC destino
    id_institucion_de:     '',
    id_carrera_de:         '',
    id_pensum_de:          '',
    id_carrera_a:          '',     // se sincroniza con id_carrera_equivalencia
    id_pensum_a:           '',
    id_institucion_a:      String(CUNOC_ID),  // bloqueado = CUNOC
  })

  // Búsqueda de curso
  const [codigoBusqueda,    setCodigoBusqueda]    = useState('')
  const [resultados,        setResultados]        = useState([])
  const [cursosSeleccionados, setCursosSeleccionados] = useState([])

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // ── Carga inicial ──────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/catalogs/instituciones').then(r => norm(r.data)),
      api.get('/catalogs/carreras').then(r => norm(r.data)),
      api.get('/catalogs/pensum').then(r => norm(r.data)),
      api.get('/catalogs/sedes').then(r => norm(r.data)),
      api.get('/catalogs/equivalencias').then(r => norm(r.data)),
    ]).then(([inst, carr, pens, sed, equiv]) => {
      setInstituciones(inst)
      setCarreras(carr)
      setPensums(pens)
      setSedes(sed)
      setEquivalencias(equiv)
    })
    .catch(() => setError('Error al cargar datos. Recarga la página.'))
    .finally(() => setLoading(false))
  }, [])

  // ── Cuando cambia pensum_de, carga los cursos de ese pensum ──
  useEffect(() => {
    if (!form.id_pensum_de) { setCursosOrigen([]); return }
    api.get(`/catalogs/cursos?id_pensum=${form.id_pensum_de}`)
      .then(r => setCursosOrigen(norm(r.data)))
      .catch(() => setCursosOrigen([]))
  }, [form.id_pensum_de])

  // ── Derivados ─────────────────────────────────────────
  const institucionCunoc = useMemo(() =>
    instituciones.find(i => Number(i.id) === CUNOC_ID) || { id: CUNOC_ID, codigo: 'CUNOC', nombre: 'Centro Universitario de Occidente' }
  , [instituciones])

  // Carreras CUNOC para destino/equivalencia
  const carrerasCunoc = useMemo(() =>
    carreras.filter(c => Number(c.id_institucion) === CUNOC_ID)
  , [carreras])

  // Carreras de la institución origen seleccionada
  const carrerasOrigen = useMemo(() => {
    if (!form.id_institucion_de) return carreras
    return carreras.filter(c => String(c.id_institucion) === String(form.id_institucion_de))
  }, [carreras, form.id_institucion_de])

  // Pensums NO vigentes de la carrera origen
  const pensumsDe = useMemo(() => {
    return pensums.filter(p => {
      if (Number(p.vigencia) !== 0) return false
      if (form.id_carrera_de) return String(p.id_carrera) === String(form.id_carrera_de)
      if (form.id_institucion_de) {
        const ids = carrerasOrigen.map(c => String(c.id))
        return ids.includes(String(p.id_carrera))
      }
      return true
    })
  }, [pensums, form.id_carrera_de, form.id_institucion_de, carrerasOrigen])

  // Pensums VIGENTES de la carrera destino (misma carrera que equivalencia)
  const pensumsA = useMemo(() => {
    return pensums.filter(p => {
      if (Number(p.vigencia) !== 1) return false
      if (form.id_carrera_a) return String(p.id_carrera) === String(form.id_carrera_a)
      return true
    })
  }, [pensums, form.id_carrera_a])

  // Pensum seleccionado para mostrar info
  const pensumDeObj = pensumsDe.find(p => String(p.id) === String(form.id_pensum_de))
  const pensumAObj  = pensumsA.find(p => String(p.id) === String(form.id_pensum_a))
  const carreraDeObj = carrerasOrigen.find(c => String(c.id) === String(form.id_carrera_de))
  const carreraAObj  = carrerasCunoc.find(c => String(c.id) === String(form.id_carrera_a))
  const institucionDeObj = instituciones.find(i => String(i.id) === String(form.id_institucion_de))

  // ── Handler de formulario ─────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setResultados([])
    setCursosSeleccionados([])   // ← agrega esta línea
    setError('')    
    setForm(prev => {
      const next = { ...prev, [name]: value }

      // Al cambiar institución origen → reset carrera y pensum
      if (name === 'id_institucion_de') {
        next.id_carrera_de = ''
        next.id_pensum_de  = ''
      }

      // Al cambiar carrera origen → auto-selecciona primer pensum no vigente
      if (name === 'id_carrera_de') {
        const primerPensumDe = pensums.find(p =>
          Number(p.vigencia) === 0 && String(p.id_carrera) === String(value)
        )
        next.id_pensum_de = primerPensumDe?.id ? String(primerPensumDe.id) : ''
      }

      // Al cambiar carrera equivalencia → sincroniza carrera_a + auto pensum vigente
      if (name === 'id_carrera_equivalencia') {
        next.id_carrera_a = value
        const primerPensumA = pensums.find(p =>
          Number(p.vigencia) === 1 && String(p.id_carrera) === String(value)
        )
        next.id_pensum_a = primerPensumA?.id ? String(primerPensumA.id) : ''
        next.id_institucion_a = String(CUNOC_ID)
      }

      return next
    })
  }

  // ── Buscar equivalencia por código ───────────────────
  const buscar = () => {
    const q = codigoBusqueda.trim()
    setError('')
    if (!q)               { setError('Ingresa el código del curso.'); return }
    if (!form.id_pensum_de) { setError('Selecciona el pensum de origen primero.'); return }

    const qNorm = normTexto(q)

    // 1. Verifica que el curso esté en el pensum origen seleccionado
    const cursoEnPensum = cursosOrigen.find(c =>
      normTexto(c.codigo).includes(qNorm) || normTexto(c.nombre).includes(qNorm)
    )

    if (!cursoEnPensum) {
      setError(`El curso "${q}" no está registrado en el pensum de origen seleccionado.`)
      setResultados([])
      return
    }

    // 2. Busca equivalencias para ese código exacto
    const encontradas = equivalencias.filter(eq =>
      normTexto(eq.curso_de_codigo).includes(qNorm) ||
      normTexto(eq.curso_de_nombre).includes(qNorm)
    )

    if (!encontradas.length) {
      setError(`No hay equivalencias registradas para "${q}".`)
      setResultados([])
      return
    }

    if (encontradas.length === 1) {
      agregarCurso(encontradas[0])
    } else {
      setResultados(encontradas)
    }
  }

  const agregarCurso = (eq) => {
    const yaExiste = cursosSeleccionados.some(c =>
      Number(c.id_curso_de) === Number(eq.id_curso_de) &&
      Number(c.id_curso_a)  === Number(eq.id_curso_a)
    )
    if (yaExiste) { setError('Ese curso ya está en tu lista.'); return }
    setError('')
    setCursosSeleccionados(prev => [...prev, {
      numero:          prev.length + 1,
      id_curso_de:     eq.id_curso_de,
      id_curso_a:      eq.id_curso_a,
      curso_de_codigo: eq.curso_de_codigo,
      curso_de_nombre: eq.curso_de_nombre,
      curso_a_codigo:  eq.curso_a_codigo,
      curso_a_nombre:  eq.curso_a_nombre,
    }])
    setResultados([])
    setCodigoBusqueda('')
  }

  const quitarCurso = (index) => {
    setCursosSeleccionados(prev =>
      prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, numero: i + 1 }))
    )
  }

  const limpiarLista = () => {
    if (!cursosSeleccionados.length) return
    if (!window.confirm('¿Deseas limpiar toda la lista?')) return
    setCursosSeleccionados([])
  }

  // ── Generar PDF ───────────────────────────────────────
const generarPDF = () => {
  if (!cursosSeleccionados.length) { setError('Agrega al menos un curso.'); return }
  setError('')

  const carreraNombre = carreraDeObj?.descripcion || carreraAObj?.descripcion || ''
  const instCodigo    = institucionDeObj?.codigo || ''
  const pensumDeAnio  = pensumDeObj?.anio || pensumDeObj?.codigo || ''
  const pensumAAnio   = pensumAObj?.anio  || pensumAObj?.codigo  || ''

  const filas = cursosSeleccionados.map(c => `
    <tr>
      <td class="tc">${c.numero}</td>
      <td class="tc">${c.curso_de_codigo}</td>
      <td>${c.curso_de_nombre}</td>
      <td class="tc">Por</td>
      <td class="tc">${c.curso_a_codigo}</td>
      <td>${c.curso_a_nombre}</td>
    </tr>
  `).join('')

  const html = `
    <h2>CURSOS SOLICITADOS PARA EQUIVALENCIA DE CURSOS</h2>
    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width:5%">No.</th>
          <th colspan="3">Pensum ${pensumDeAnio}<br/>${String(carreraNombre).toUpperCase()}<br/>${instCodigo}</th>
          <th colspan="2">Pensum ${pensumAAnio}<br/>${String(carreraAObj?.descripcion || carreraNombre).toUpperCase()}<br/>CUNOC</th>
        </tr>
        <tr>
          <th style="width:9%">Código</th><th>Nombre del curso</th>
          <th style="width:4%">Por</th>
          <th style="width:9%">Código</th><th>Nombre del curso</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `
  imprimirTabla(html, `Equivalencias`)
}

  // ── Render ────────────────────────────────────────────
  const formularioCompleto = form.id_pensum_de && form.id_pensum_a

  return (
    <div className="est-page">
      <div className="est-page-header">
        <div>
          <h1 className="est-page-title">Solicitud de Equivalencias</h1>
          <p className="est-page-sub">Selecciona tu carrera, busca tus cursos y genera la tabla para tu expediente.</p>
        </div>
      </div>

      {error && <div className="est-alert-error">{error}</div>}
      {loading && <div className="est-alert-info">Cargando datos...</div>}

      {/* ── Paso 1: Sede + Carrera equivalencia + Institución origen ── */}
      <div className="est-card">
        <p className="est-card-title">1. Datos generales</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div className="est-form-group">
            <label className="est-label">Sede</label>
            <select className="est-select" name="id_sede" value={form.id_sede} onChange={handleFormChange}>
              <option value="">Seleccionar...</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div className="est-form-group">
            <label className="est-label">Carrera equivalencia (CUNOC)</label>
            <select className="est-select" name="id_carrera_equivalencia" value={form.id_carrera_equivalencia} onChange={handleFormChange}>
              <option value="">Seleccionar...</option>
              {carrerasCunoc.map(c => (
                <option key={c.id} value={c.id}>CUNOC — {c.descripcion}</option>
              ))}
            </select>
          </div>

          <div className="est-form-group">
            <label className="est-label">Institución origen</label>
            <select className="est-select" name="id_institucion_de" value={form.id_institucion_de} onChange={handleFormChange}>
              <option value="">Seleccionar...</option>
              {instituciones.map(i => (
                <option key={i.id} value={i.id}>{i.codigo} — {i.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Origen / Destino — igual que DictamenesPage */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Origen */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 12px', fontSize: '.95rem' }}>Origen</p>

            <div className="est-form-group" style={{ marginBottom: 14 }}>
              <label className="est-label">Carrera origen</label>
              <select className="est-select" name="id_carrera_de" value={form.id_carrera_de} onChange={handleFormChange}
                disabled={!form.id_institucion_de}>
                <option value="">Seleccionar...</option>
                {carrerasOrigen.map(c => (
                  <option key={c.id} value={c.id}>{c.subfijo ? `${c.subfijo} — ` : ''}{c.descripcion}</option>
                ))}
              </select>
            </div>

            <div className="est-form-group">
              <label className="est-label">Pensum origen (no vigente)</label>
              <select className="est-select" name="id_pensum_de" value={form.id_pensum_de} onChange={handleFormChange}
                disabled={!form.id_carrera_de}>
                <option value="">Seleccionar...</option>
                {pensumsDe.map(p => (
                  <option key={p.id} value={p.id}>{p.codigo} — {p.descripcion}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Destino */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 12px', fontSize: '.95rem' }}>Destino</p>

            <div className="est-form-group" style={{ marginBottom: 14 }}>
              <label className="est-label">Carrera destino</label>
              <select className="est-select" value={form.id_carrera_a} disabled>
                <option value="">{carreraAObj ? `CUNOC — ${carreraAObj.descripcion}` : 'Seleccionar...'}</option>
              </select>
            </div>

            <div className="est-form-group" style={{ marginBottom: 14 }}>
              <label className="est-label">Pensum destino (vigente)</label>
              <select className="est-select" name="id_pensum_a" value={form.id_pensum_a} onChange={handleFormChange}
                disabled={!form.id_carrera_a}>
                <option value="">Seleccionar...</option>
                {pensumsA.map(p => (
                  <option key={p.id} value={p.id}>{p.codigo} — {p.descripcion}</option>
                ))}
              </select>
            </div>

            <div className="est-form-group">
              <label className="est-label">Institución destino</label>
              <select className="est-select" disabled>
                <option>{institucionCunoc.codigo} — {institucionCunoc.nombre}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resumen selección */}
        {pensumDeObj && pensumAObj && (
          <div className="est-alert-info" style={{ marginTop: 14, marginBottom: 0 }}>
            <strong>Origen:</strong> {carreraDeObj?.descripcion} · Pensum {pensumDeObj.anio || pensumDeObj.codigo}
            &nbsp;→&nbsp;
            <strong>Destino:</strong> {carreraAObj?.descripcion} · Pensum {pensumAObj.anio || pensumAObj.codigo} (CUNOC)
          </div>
        )}
      </div>

      {/* ── Paso 2: Buscar cursos ── */}
      {formularioCompleto && (
        <div className="est-card">
          <p className="est-card-title">2. Busca cursos del pensum de origen</p>
          <p style={{ color: '#64748b', fontSize: '.875rem', marginTop: -8, marginBottom: 14 }}>
            Ingresa el código del curso del pensum origen. Si no aparece el curso, puede ser por los digitos, agregale 0 al inicio si es de dos digitos (Ej: 28 → 028)
          </p>

          <div className="est-search-bar">
            <input
              className="est-input"
              placeholder="Ej: 2795 o Matemática..."
              value={codigoBusqueda}
              onChange={e => setCodigoBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') buscar() }}
            />
            <button className="est-btn-primary" onClick={buscar}>Buscar equivalencia</button>
          </div>

          {resultados.length > 1 && (
            <div style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#f8fafc', fontSize: '.8rem', color: '#64748b', fontWeight: 700 }}>
                Se encontraron {resultados.length} equivalencias — selecciona una:
              </div>
              {resultados.map(eq => (
                <div key={`${eq.id_curso_de}-${eq.id_curso_a}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderBottom: '1px solid #f1f5f9', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{eq.curso_de_codigo}</span>
                    <span style={{ color: '#64748b', marginLeft: 6 }}>{eq.curso_de_nombre}</span>
                    <span style={{ color: '#94a3b8', margin: '0 8px' }}>→</span>
                    <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{eq.curso_a_codigo}</span>
                    <span style={{ color: '#64748b', marginLeft: 6 }}>{eq.curso_a_nombre}</span>
                  </div>
                  <button className="est-btn-primary" style={{ padding: '6px 14px', fontSize: '.8rem' }}
                    onClick={() => agregarCurso(eq)}>
                    + Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Paso 3: Tabla de cursos seleccionados ── */}
      <div className="est-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <p className="est-card-title" style={{ margin: 0 }}>
            3. Cursos seleccionados
            {cursosSeleccionados.length > 0 && (
              <span className="est-badge" style={{ marginLeft: 10 }}>{cursosSeleccionados.length}</span>
            )}
          </p>
          {cursosSeleccionados.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="est-btn-secondary" onClick={limpiarLista}>Limpiar</button>
              <button className="est-btn-pdf" onClick={generarPDF}>📄 Descargar PDF</button>
            </div>
          )}
        </div>

        {cursosSeleccionados.length === 0 ? (
          <div className="est-empty">
            Aún no has agregado cursos. Completa el formulario y usa el buscador.
          </div>
        ) : (
          <>
            {/* Encabezado visible en pantalla */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                CURSOS SOLICITADOS PARA EQUIVALENCIA DE CURSOS
              </div>
             
              {user?.nombre && (
                <div style={{ color: '#94a3b8', fontSize: '.8rem', marginTop: 2 }}>
                  {user.nombre}
                  {user.carnet && ` · Carnet: ${user.carnet}`}
                  {user.registro_academico && ` · Registro: ${user.registro_academico}`}
                </div>
              )}
            </div>

            <div className="est-table-wrapper">
              <table className="est-table">
                <thead>
                  <tr>
                    <th rowSpan="2" style={{ textAlign: 'center', width: '5%' }}>No.</th>
                    <th colSpan="2" style={{ textAlign: 'center' }}>
                      Pensum {pensumDeObj?.anio || pensumDeObj?.codigo}<br />
                      {String(carreraDeObj?.descripcion || '').toUpperCase()}<br />
                      {institucionDeObj?.codigo}
                    </th>
                    <th rowSpan="2" style={{ textAlign: 'center', width: '5%' }}>Por</th>
                    <th colSpan="2" style={{ textAlign: 'center' }}>
                      Pensum {pensumAObj?.anio || pensumAObj?.codigo}<br />
                      {String(carreraAObj?.descripcion || '').toUpperCase()}<br />
                      CUNOC
                    </th>
                    <th rowSpan="2" style={{ width: '6%' }} />
                  </tr>
                  <tr>
                    <th style={{ width: '9%' }}>Código</th>
                    <th>Nombre del curso</th>
                    <th style={{ width: '9%' }}>Código</th>
                    <th>Nombre del curso</th>
                  </tr>
                </thead>
                <tbody>
                  {cursosSeleccionados.map((c, index) => (
                    <tr key={`${c.id_curso_de}-${c.id_curso_a}-${index}`}>
                      <td style={{ textAlign: 'center' }}>{c.numero}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.curso_de_codigo}</td>
                      <td>{c.curso_de_nombre}</td>
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>Por</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{c.curso_a_codigo}</td>
                      <td>{c.curso_a_nombre}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="est-btn-danger-sm" onClick={() => quitarCurso(index)}>Quitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="est-btn-secondary" onClick={limpiarLista}>Limpiar lista</button>
              <button className="est-btn-pdf" onClick={generarPDF}>📄 Descargar PDF</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}