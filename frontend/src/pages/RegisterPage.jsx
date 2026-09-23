import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from '../components/auth/AuthLayout'
import { PasswordStrength } from '../components/ui/PasswordStrength'

const HOME_BY_ROL = {
  admin:       '/dashboard',
  coordinador: '/dashboard',
  estudiante:  '/estudiante',
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate  = useNavigate()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const password = watch('password', '')

  const onSubmit = async ({ nombre, email, password }) => {
    setLoading(true)
    try {
      const result = await registerUser(nombre, email, password)

      toast.success('Cuenta creada correctamente')

      // Si es estudiante y no tiene carnet/registro aún → completar datos
      if (result?.requiere_datos_estudiante) {
        toast('Ingresa tu carnet y registro académico para continuar', { icon: 'ℹ️' })
        navigate('/completar-estudiante', { replace: true })
        return
      }

      // Redirige según rol
      const home = HOME_BY_ROL[result?.user?.rol] || '/dashboard'
      navigate(home, { replace: true })

    } catch (err) {
      const msg = err.response?.data?.message || 'Error al registrarse'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="fade-up">
        <h2 className="auth-heading">Crear cuenta</h2>
        <p className="auth-subheading">Completa los datos para registrarte</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-group fade-up fade-up-1">
          <label className="form-label">Nombre completo (Como aparece en su documento de identificación personal (DPI))</label>
          <input
            type="text"
            placeholder="Juan García"
            className={`form-input ${errors.nombre ? 'error' : ''}`}
            {...register('nombre', {
              required: 'El nombre es requerido',
              minLength: { value: 2, message: 'Mínimo 2 caracteres' },
            })}
          />
          {errors.nombre && <p className="form-error">⚠ {errors.nombre.message}</p>}
        </div>

        <div className="form-group fade-up fade-up-2">
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

        <div className="form-group fade-up fade-up-3">
          <label className="form-label">Contraseña</label>
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

        <div className="form-group fade-up fade-up-4">
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

        <div className="fade-up fade-up-5">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" />Creando cuenta…</> : 'Crear cuenta'}
          </button>
        </div>
      </form>

      <p className="form-footer fade-up fade-up-5" style={{ marginTop: 20 }}>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>
  )
}