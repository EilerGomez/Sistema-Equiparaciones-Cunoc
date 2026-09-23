import { useState, useEffect } from 'react'
import { configuracionIdDictamenApi } from '../../api/configuracion_id_dictamen'

export default function ConfiguracionIdDictamenPage() {
  const [info,    setInfo]    = useState(null)
  const [nuevoId, setNuevoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargarInfo() }, [])

  const cargarInfo = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await configuracionIdDictamenApi.getDictamenId()
      setInfo(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleGuardar = async () => {
    const id = Number(nuevoId)
    if (!id || id < 1) { setError('Ingresa un número válido mayor a 0'); return }
    setError(''); setMensaje(''); setSaving(true)
    try {
      const data = await configuracionIdDictamenApi.setDictamenId(id)
      setMensaje(data.message)
      setNuevoId('')
      await cargarInfo()
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración del sistema</h1>
          <p className="page-sub">Ajustes generales del sistema de equivalencias.</p>
        </div>
      </div>

      <div className="table-wrapper" style={{ padding: 28, maxWidth: 560 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
          Numeración de dictámenes
        </h2>
        <p style={{ color: 'var(--text-soft)', fontSize: '.875rem', marginBottom: 20, lineHeight: 1.6 }}>
          Permite establecer el próximo número de dictamen. Útil al migrar o desplegar
          el sistema cuando ya existen dictámenes impresos con IDs anteriores.
        </p>

        {loading && <div className="table-empty">Cargando...</div>}

        {error && !loading && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>
        )}

        {!loading && info && (
          <>
            {/* Cards de estado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
              <div style={{
                background: 'var(--surface-soft)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '14px 16px',
              }}>
                <div style={{ fontSize: '.72rem', fontWeight: 800, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  Último dictamen creado
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
                  {info.ultimo_id === 0 ? '—' : info.ultimo_id}
                </div>
                {info.ultimo_id > 0 && (
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    ID del último registro en BD
                  </div>
                )}
              </div>

              <div style={{
                background: 'rgba(29,78,216,.06)', border: '1px solid rgba(29,78,216,.18)',
                borderRadius: 'var(--radius-md)', padding: '14px 16px',
              }}>
                <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#1d4ed8',
                  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  Próximo ID automático
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>
                  {info.proximo_id}
                </div>
                <div style={{ fontSize: '.75rem', color: '#3b82f6', marginTop: 4 }}>
                  Se asignará al siguiente dictamen
                </div>
              </div>
            </div>

            {/* Advertencia */}
            <div style={{
              background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.25)',
              borderRadius: 'var(--radius-md)', padding: '11px 14px',
              fontSize: '.82rem', color: '#92400e', marginBottom: 20, lineHeight: 1.6,
            }}>
              <strong>⚠ Precaución:</strong> Solo cambia este valor si sabes lo que estás haciendo.
              El sistema verificará que el ID no esté en uso antes de aplicar el cambio.
              El nuevo ID debe ser mayor que el último dictamen registrado
              {info.ultimo_id > 0 ? ` (actualmente ${info.ultimo_id})` : ''}.
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>
            )}
            {mensaje && (
              <div className="alert alert-success" style={{ marginBottom: 14 }}>{mensaje}</div>
            )}

            {/* Input + botón */}
            <div className="form-group">
              <label className="form-label">Establecer próximo ID de dictamen</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                type="number"
                className="form-input"
                min={info.ultimo_id + 1}
                placeholder={`Mínimo ${info.ultimo_id + 1}`}
                value={nuevoId}
                onChange={e => { setNuevoId(e.target.value); setError(''); setMensaje('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleGuardar() }}
                style={{ flex: 1, minWidth: 120, width: 'auto' }}  // ← width: 'auto' es el fix
                />
                <button
                  className="btn btn-primary"
                  onClick={handleGuardar}
                  disabled={saving || !nuevoId}
                  style={{ marginTop: 0, padding: '10px 16px' }}
                >
                  {saving ? <><span className="spinner" /> Guardando…</> : 'Aplicar'}
                </button>
              </div>
              <p className="form-hint">
                El próximo dictamen que se cree tendrá este número como ID.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}