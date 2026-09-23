import { useState, useEffect } from 'react'
import { ciclosApi } from '../../api/catalogs'
import api from '../../api/client'

const norm = (data) => {
  if (Array.isArray(data))       return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

export default function ScraperPage() {
  const [instituciones, setInstituciones] = useState([])
  const [pensums,       setPensums]       = useState([])
  const [ciclos,        setCiclos]        = useState([])

  const [idInstitucion, setIdInstitucion] = useState('')
  const [idPensum,      setIdPensum]      = useState('todos')
  const [idCiclo,       setIdCiclo]       = useState('')

  const [loading,   setLoading]   = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error,     setError]     = useState('')

  useEffect(() => {
    api.get('/catalogs/instituciones')
      .then(({ data }) => setInstituciones(norm(data)))
      .catch(() => {})

    ciclosApi.getAll()
      .then(data => setCiclos(norm(data)))
      .catch(() => {})

    checkStatus()

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkStatus()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Carga pensums filtrados por institución
  useEffect(() => {
    if (!idInstitucion) { setPensums([]); setIdPensum('todos'); return }

    api.get(`/catalogs/pensum?id_institucion=${idInstitucion}`)
      .then(({ data }) => { setPensums(norm(data)); setIdPensum('todos') })
      .catch(() => setPensums([]))
  }, [idInstitucion])

  const checkStatus = async () => {
    try {
      const { data } = await api.get('/catalogs/scraper/status')
      setLoading(data.activo)
      if (!data.activo) {
        setResultado(prev => prev ? { ...prev, finalizado: true } : null)
      }
    } catch (_) {}
  }

  const handleRun = async () => {
    if (!idInstitucion) { setError('Selecciona una institución'); return }
    if (!idCiclo)       { setError('Selecciona un ciclo');        return }
    setError(''); setResultado(null); setLoading(true)
    try {
      const { data } = await api.post('/catalogs/scraper/run', {
        id_pensum:      idPensum === 'todos' ? 'todos' : Number(idPensum),
        id_ciclo:       Number(idCiclo),
        id_institucion: Number(idInstitucion),
      })
      setResultado(data)
    } catch (err) {
      setLoading(false)
      setError(err.response?.data?.message || 'Error al iniciar el proceso')
    }
  }

  const institucionSel = instituciones.find(i => String(i.id) === String(idInstitucion))
  const pensumSel      = idPensum !== 'todos' ? pensums.find(p => String(p.id) === String(idPensum)) : null
  const cicloSel       = ciclos.find(c => String(c.id) === String(idCiclo))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Carga de docentes</h1>
          <p className="page-sub">
            Extrae automáticamente los docentes del portal CUNOC por institución, pensum y ciclo.
          </p>
        </div>
      </div>

      <div className="table-wrapper" style={{ padding: 28, maxWidth: 640 }}>

        {/* Institución */}
        <div className="form-group">
          <label className="form-label">Institución</label>
          <select
            className="form-input"
            value={idInstitucion}
            onChange={e => { setIdInstitucion(e.target.value); setIdPensum('todos') }}
            disabled={loading}
          >
            <option value="">Seleccionar institución...</option>
            {instituciones.map(i => (
              <option key={i.id} value={i.id}>{i.codigo} — {i.nombre}</option>
            ))}
          </select>
        </div>

        {/* Pensum — solo si hay institución seleccionada */}
        {idInstitucion && (
          <div className="form-group">
            <label className="form-label">Pensum</label>
            <select
              className="form-input"
              value={idPensum}
              onChange={e => setIdPensum(e.target.value)}
              disabled={loading}
            >
              <option value="todos">
                Todos los pensums de {institucionSel?.codigo || ''}
              </option>
              {pensums.map(p => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.descripcion} ({p.anio}) · {p.carrera_subfijo || ''}
                </option>
              ))}
            </select>

            {pensumSel && (
              <div style={{
                marginTop: 8, padding: '8px 12px',
                background: 'var(--paper-2)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--paper-3)', fontSize: '.82rem',
                color: 'var(--ink-2)', display: 'flex', gap: 16, flexWrap: 'wrap',
              }}>
                <span>
                  <span style={{ color: 'var(--ink-3)', marginRight: 4 }}>Código:</span>
                  <strong>{pensumSel.codigo}</strong>
                </span>
                <span>
                  <span style={{ color: 'var(--ink-3)', marginRight: 4 }}>Carrera:</span>
                  <strong>{pensumSel.carrera_descripcion || pensumSel.carrera_subfijo || '—'}</strong>
                </span>
                <span>
                  <span style={{ color: 'var(--ink-3)', marginRight: 4 }}>Vigente:</span>
                  <strong>{Number(pensumSel.vigencia) === 1 ? 'Sí' : 'No'}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ciclo */}
        <div className="form-group">
          <label className="form-label">Ciclo</label>
          <select
            className="form-input"
            value={idCiclo}
            onChange={e => setIdCiclo(e.target.value)}
            disabled={loading}
          >
            <option value="">Seleccionar ciclo...</option>
            {ciclos.map(c => (
              <option key={c.id} value={c.id}>
                {c.codigo_ciclo || c.codigo} {c.anio}
              </option>
            ))}
          </select>

          {cicloSel && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: 'var(--paper-2)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--paper-3)', fontSize: '.85rem', color: 'var(--ink-2)',
            }}>
              Se buscará en la web:{' '}
              <strong>{cicloSel.codigo_ciclo || cicloSel.codigo} {cicloSel.anio}</strong>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {resultado && !resultado.finalizado && (
          <div className="alert alert-success" style={{
            marginBottom: 16, flexDirection: 'column', alignItems: 'flex-start', gap: 6,
          }}>
            <strong>{resultado.message}</strong>
            <span style={{ fontSize: '.85rem', opacity: .8 }}>Cursos a procesar: {resultado.cursos}</span>
            {resultado.ciclo  && <span style={{ fontSize: '.85rem', opacity: .8 }}>Ciclo: {resultado.ciclo}</span>}
            {resultado.pensum && <span style={{ fontSize: '.85rem', opacity: .8 }}>Pensum: {resultado.pensum}</span>}
            <span style={{ fontSize: '.82rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="spinner" style={{ borderTopColor: 'var(--success)', borderColor: 'rgba(42,122,75,.2)', width: 14, height: 14 }} />
              Procesando en segundo plano...
            </span>
          </div>
        )}

        {resultado?.finalizado && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            Proceso finalizado. Revisa tu correo para ver el resumen.
          </div>
        )}

        <div style={{
          background: 'var(--paper-2)', borderRadius: 'var(--radius-md)',
          padding: 16, marginBottom: 20, fontSize: '.85rem',
          color: 'var(--ink-3)', lineHeight: 1.7,
        }}>
          <strong style={{ color: 'var(--ink-2)' }}>¿Cómo funciona?</strong><br />
          El sistema buscará en el portal de CUNOC{' '}
          <a
            href="http://ingenieria.cunoc.usac.edu.gt/portal/index.php/Categoria/programas-de-cursos"
            target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--primary)', fontWeight: 600 }}
          >
            Programas de Cursos
          </a>{' '}
          los docentes asignados a los cursos de la institución seleccionada.
          Si eliges "Todos los pensums" se procesarán todos los cursos de esa institución.
          Al finalizar recibirás un correo con el resumen.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={handleRun}
            disabled={loading || !idCiclo || !idInstitucion}
            style={{ marginTop: 0 }}
          >
            {loading
              ? <><span className="spinner" /> Procesando...</>
              : 'Iniciar carga de docentes'}
          </button>

          {loading && (
            <button className="btn-table btn-table-secondary" onClick={checkStatus} style={{ marginTop: 0 }}>
              Verificar estado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}