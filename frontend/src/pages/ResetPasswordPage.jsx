import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { AuthLayout } from '../components/auth/AuthLayout'
import { PasswordStrength } from '../components/ui/PasswordStrength'

export default function ResetPasswordPage() {
  const [searchParams]        = useSearchParams()
  const token                 = searchParams.get('token')
  const navigate              = useNavigate()
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password', '')

  if (!token) {
    return (
      <AuthLayout>
        <div className="fade-up">
          <h2 className="auth-heading">Enlace inválido</h2>
          <p className="auth-subheading">
            Este enlace no es válido o ya fue utilizado.
          </p>
        </div>
        <div className="fade-up fade-up-1">
          <Link to="/forgot-password" className="btn btn-primary" style={{ display: 'flex' }}>
            Solicitar nuevo enlace
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="fade-up">
          <h2 className="auth-heading">¡Listo!</h2>
          <p className="auth-subheading">Tu contraseña fue actualizada correctamente.</p>
        </div>
        <div className="alert alert-success fade-up fade-up-1">
          ✓ Contraseña actualizada. Ya puedes iniciar sesión.
        </div>
        <div className="fade-up fade-up-2">
          <Link to="/login" className="btn btn-primary" style={{ display: 'flex' }}>
            Ir al inicio de sesión
          </Link>
        </div>
      </AuthLayout>
    )
  }

  const onSubmit = async ({ password }) => {
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      const msg = err.response?.data?.message || 'El enlace es inválido o ha expirado'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="fade-up">
        <h2 className="auth-heading">Nueva contraseña</h2>
        <p className="auth-subheading">Elige una contraseña segura para tu cuenta.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-group fade-up fade-up-1">
          <label className="form-label">Nueva contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            className={`form-input ${errors.password ? 'error' : ''}`}
            {...register('password', {
              required: 'La contraseña es requerida',
              minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              validate: {
                hasUpper:   (v) => /[A-Z]/.test(v)        || 'Debe tener una mayúscula',
                hasNumber:  (v) => /[0-9]/.test(v)        || 'Debe tener un número',
                hasSpecial: (v) => /[^A-Za-z0-9]/.test(v) || 'Debe tener un carácter especial',
              },
            })}
          />
          <PasswordStrength password={password} />
          {errors.password && <p className="form-error">⚠ {errors.password.message}</p>}
        </div>

        <div className="form-group fade-up fade-up-2">
          <label className="form-label">Confirmar contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            className={`form-input ${errors.confirm ? 'error' : ''}`}
            {...register('confirm', {
              required: 'Confirma tu contraseña',
              validate: (v) => v === password || 'Las contraseñas no coinciden',
            })}
          />
          {errors.confirm && <p className="form-error">⚠ {errors.confirm.message}</p>}
        </div>

        <div className="fade-up fade-up-3">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" />Guardando…</> : 'Guardar contraseña'}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
