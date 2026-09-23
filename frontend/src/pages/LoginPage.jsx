import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from '../components/auth/AuthLayout'

const HOME_BY_ROL = {
  admin:       '/dashboard',
  coordinador: '/dashboard',
  estudiante:  '/estudiante',
}

export default function LoginPage() {
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    try {
      const result = await login(email, password)

      // Si es estudiante sin datos completos → completar primero
      if (result?.requiere_datos_estudiante) {
        toast('Completa tus datos de estudiante para continuar', { icon: 'ℹ️' })
        navigate('/completar-estudiante', { replace: true })
        return
      }

      toast.success('Bienvenido de nuevo')

      // Redirige según rol
      const rol  = result?.user?.rol || 'estudiante'
      const from = location.state?.from?.pathname
      // Solo redirige a `from` si corresponde al rol correcto
      const home = HOME_BY_ROL[rol] || '/dashboard'
      const dest = from?.startsWith(home) ? from : home
      navigate(dest, { replace: true })

    } catch (err) {
      const msg = err.response?.data?.message || 'Error al iniciar sesión'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="fade-up">
        <h2 className="auth-heading">Iniciar sesión</h2>
        <p className="auth-subheading">Ingresa tus credenciales para continuar</p>
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

        <div className="form-group fade-up fade-up-2">
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            className={`form-input ${errors.password ? 'error' : ''}`}
            {...register('password', { required: 'La contraseña es requerida' })}
          />
          {errors.password && <p className="form-error">⚠ {errors.password.message}</p>}
        </div>

        <div className="forgot-row fade-up fade-up-3">
          <Link to="/forgot-password" className="form-link" style={{ fontSize: '.83rem' }}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <div className="fade-up fade-up-4">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" />Ingresando…</> : 'Ingresar'}
          </button>
        </div>
      </form>

      <p className="form-footer fade-up fade-up-5">
        ¿No tienes cuenta?{' '}
        <Link to="/register">Regístrate</Link>
      </p>
    </AuthLayout>
  )
}