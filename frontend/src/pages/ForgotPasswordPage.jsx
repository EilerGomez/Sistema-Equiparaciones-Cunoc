import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authApi } from '../api/auth'
import { AuthLayout } from '../components/auth/AuthLayout'

export default function ForgotPasswordPage() {
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email }) => {
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSentEmail(email)
      setSent(true)
    } catch {
      // El backend siempre devuelve 200 para no revelar emails
      setSentEmail(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="fade-up">
          <h2 className="auth-heading">Revisa tu correo</h2>
          <p className="auth-subheading">
            Si <strong>{sentEmail}</strong> está registrado, recibirás
            un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
        </div>

        <div className="alert alert-success fade-up fade-up-1">
          ✓ Correo enviado. Revisa también tu carpeta de spam.
        </div>

        <div className="fade-up fade-up-2" style={{ marginTop: 8 }}>
          <Link to="/login" className="btn btn-primary" style={{ display: 'flex' }}>
            ← Volver al inicio de sesión
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="fade-up">
        <h2 className="auth-heading">Recuperar contraseña</h2>
        <p className="auth-subheading">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-group fade-up fade-up-1">
          <label className="form-label">Correo electrónico</label>
          <input
            type="email"
            placeholder="tucorreo@ejemplo.com"
            className={`form-input ${errors.email ? 'error' : ''}`}
            {...register('email', {
              required: 'El correo es requerido',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Correo inválido' },
            })}
          />
          {errors.email && <p className="form-error">⚠ {errors.email.message}</p>}
        </div>

        <div className="fade-up fade-up-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" />Enviando…</> : 'Enviar enlace'}
          </button>
        </div>
      </form>

      <p className="form-footer fade-up fade-up-3">
        <Link to="/login">← Volver al inicio de sesión</Link>
      </p>
    </AuthLayout>
  )
}
