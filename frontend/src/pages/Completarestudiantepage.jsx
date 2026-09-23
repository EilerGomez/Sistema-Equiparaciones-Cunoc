import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from '../components/auth/AuthLayout'
import api from '../api/client'

export default function CompletarEstudiantePage() {
  const { user, actualizarSesion } = useAuth()
  const navigate = useNavigate()

  const [modo,     setModo]     = useState('pdf')   // 'pdf' | 'manual'
  const [archivo,  setArchivo]  = useState(null)
  const [preview,  setPreview]  = useState(null)    // datos extraídos antes de confirmar
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Manual
  const [carnet,    setCarnet]    = useState('')
  const [registro,  setRegistro]  = useState('')

  const inputRef = useRef()

  // ── PDF: sube y extrae datos ───────────────────────────
  const handleSubirPDF = async () => {
    if (!archivo) { setError('Selecciona un PDF primero.'); return }
    setError(''); setLoading(true); setPreview(null)
    try {
      const form = new FormData()
      form.append('constancia', archivo)
      const { data } = await api.post('/auth/constancia', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      // Muestra preview para que el estudiante confirme antes de guardar
      setPreview(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al leer el PDF')
    } finally {
      setLoading(false)
    }
  }

  // ── PDF: confirma los datos extraídos ─────────────────
  const handleConfirmar = () => {
    if (!preview) return
    actualizarSesion(preview.accessToken, preview.user)
    toast.success(`Bienvenido, ${preview.user.nombre.split(' ')[0]}`)
    navigate('/estudiante', { replace: true })
  }

  // ── Manual: ingresa carnet y registro ─────────────────
  const handleManual = async () => {
    if (!carnet.trim() || !registro.trim()) {
      setError('Completa carnet y registro académico.'); return
    }
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/completar-estudiante', {
        carnet:             carnet.trim(),
        registro_academico: registro.trim(),
      })
      actualizarSesion(data.accessToken, data.user)
      toast.success('Datos registrados correctamente')
      navigate('/estudiante', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar datos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="fade-up">
        <h2 className="auth-heading">Completa tu registro</h2>
        <p className="auth-subheading">
          Hola <strong>{user?.nombre}</strong>, necesitamos verificar tu identidad
          como estudiante de CUNOC.
        </p>
      </div>

      {/* Selector de modo */}
      <div className="fade-up fade-up-1" style={{
        display: 'flex', gap: 8, marginBottom: 20,
        background: 'var(--surface-soft)',
        borderRadius: 10, padding: 4,
      }}>
        {/*[
          { key: 'pdf',    label: '📄 Subir constancia PDF' },
          { key: 'manual', label: '✏️ Ingresar manualmente' },
        ].map(({ key, label }) => (
          <button key={key} type="button"
            onClick={() => { setModo(key); setError(''); setPreview(null) }}
            style={{
              flex: 1, padding: '9px 0', border: 'none', borderRadius: 8,
              fontFamily: 'inherit', fontWeight: 700, fontSize: '.84rem',
              cursor: 'pointer', transition: 'all .2s',
              background: modo === key ? 'var(--primary)' : 'transparent',
              color:      modo === key ? '#fff' : 'var(--text-soft)',
            }}
          >
            {label}
          </button>
        ))*/}
      </div>

      {error && (
        <div className="fade-up" style={{
          background: 'var(--error-bg)', color: 'var(--error)',
          border: '1px solid rgba(185,28,28,.2)', borderRadius: 10,
          padding: '10px 14px', fontSize: '.84rem', marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* ── Modo PDF ── */}
      {modo === 'pdf' && !preview && (
        <div className="fade-up fade-up-2">
          <div style={{
            background: 'rgba(29,78,216,.06)', border: '1px solid rgba(29,78,216,.15)',
            borderRadius: 10, padding: '12px 14px', fontSize: '.83rem',
            color: '#1d4ed8', marginBottom: 16, lineHeight: 1.6,
          }}>
            Sube tu <strong>Constancia Digital de Inscripción</strong> descargada del portal
            <a href="https://sireca.cunoc.edu.gt/index.php?&cmp=cominscripciones"> SIRECA</a> - Formularios - Constancia de inscripción.
            El PDF debe ser digital (no foto/escáner).
          </div>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f?.type === 'application/pdf') { setArchivo(f); setError('') }
              else setError('Solo se aceptan archivos PDF')
            }}
            style={{
              border: `2px dashed ${archivo ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 12, padding: '28px 20px', textAlign: 'center',
              cursor: 'pointer', transition: 'border-color .2s',
              background: archivo ? 'rgba(29,78,216,.04)' : 'var(--surface-soft)',
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>
              {archivo ? '✅' : '📂'}
            </div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '.9rem' }}>
              {archivo ? archivo.name : 'Haz clic o arrastra el PDF aquí'}
            </div>
            {!archivo && (
              <div style={{ color: 'var(--text-muted)', fontSize: '.78rem', marginTop: 4 }}>
                Máximo 10 MB
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files[0]
                if (f) { setArchivo(f); setError('') }
              }}
            />
          </div>

          {archivo && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { setArchivo(null); setError('') }}
                style={{
                  padding: '9px 14px', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: 10,
                  fontFamily: 'inherit', fontSize: '.84rem', cursor: 'pointer',
                  color: 'var(--text-soft)',
                }}>
                Cambiar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSubirPDF}
                disabled={loading} style={{ flex: 1 }}>
                {loading ? <><span className="spinner" /> Leyendo PDF…</> : 'Extraer datos'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Preview: muestra datos extraídos ── */}
      {modo === 'pdf' && preview && (
        <div className="fade-up">
          <div style={{
            background: 'rgba(21,128,61,.07)', border: '1px solid rgba(21,128,61,.2)',
            borderRadius: 12, padding: 18, marginBottom: 16,
          }}>
            <div style={{ fontWeight: 800, color: '#15803d', marginBottom: 12, fontSize: '.95rem' }}>
              ✅ Datos extraídos correctamente
            </div>
            {[
              { label: 'Nombre',              value: preview.extraido.nombre },
              { label: 'Carnet',              value: preview.extraido.carnet },
              { label: 'Registro académico',  value: preview.extraido.registro_academico },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '7px 0', borderBottom: '1px solid rgba(21,128,61,.15)',
                fontSize: '.88rem',
              }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>{label}</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{value}</span>
              </div>
            ))}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', marginBottom: 14 }}>
            ¿Los datos son correctos? Al confirmar se vincularán a tu cuenta.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button"
              onClick={() => { setPreview(null); setArchivo(null) }}
              style={{
                padding: '10px 16px', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 10,
                fontFamily: 'inherit', fontSize: '.86rem', cursor: 'pointer',
                color: 'var(--text-soft)',
              }}>
              Subir otro
            </button>
            <button type="button" className="btn btn-primary"
              onClick={handleConfirmar} style={{ flex: 1 }}>
              Confirmar y continuar
            </button>
          </div>
        </div>
      )}

      {/* ── Modo Manual ── */}
      {modo === 'manual' && (
        <div className="fade-up fade-up-2">
          <div style={{
            background: 'rgba(29,78,216,.06)', border: '1px solid rgba(29,78,216,.15)',
            borderRadius: 10, padding: '12px 14px', fontSize: '.83rem',
            color: '#1d4ed8', marginBottom: 16, lineHeight: 1.6,
          }}>
            Si ya fuiste registrado por un coordinador, ingresa el carnet y registro
            que te asignaron y tu cuenta quedará vinculada automáticamente.
          </div>

          <div className="form-group">
            <label className="form-label">Carnet</label>
            <input className="form-input" placeholder="202031693"
              value={carnet} onChange={e => setCarnet(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleManual() }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Registro académico</label>
            <input className="form-input" placeholder="20203169301"
              value={registro} onChange={e => setRegistro(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleManual() }}
            />
          </div>

          <button type="button" className="btn btn-primary"
            onClick={handleManual} disabled={loading}>
            {loading ? <><span className="spinner" /> Verificando…</> : 'Continuar'}
          </button>
        </div>
      )}

      <p style={{
        marginTop: 20, textAlign: 'center', fontSize: '.78rem',
        color: 'var(--text-muted)',
      }}>
        ¿Tienes problemas? Contacta a tu coordinador de carrera.
      </p>
    </AuthLayout>
  )
}