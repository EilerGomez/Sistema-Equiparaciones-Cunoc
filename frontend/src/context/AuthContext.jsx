import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  // Verifica sesión al montar
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { setLoading(false); return }

    authApi.me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // Guarda tokens y usuario en localStorage + estado
  const _persistSession = (data) => {
    localStorage.setItem('accessToken',  data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password })
    _persistSession(data)
    // Retorna el resultado completo para que LoginPage pueda leer
    // requiere_datos_estudiante y redirigir correctamente
    return data
  }, [])

  const register = useCallback(async (nombre, email, password) => {
    const data = await authApi.register({ nombre, email, password })
    _persistSession(data)
    // Retorna el resultado completo para que RegisterPage pueda leer
    // requiere_datos_estudiante y redirigir correctamente
    return data
  }, [])

  // Actualiza el accessToken y el usuario cuando el estudiante
  // completa sus datos en /completar-estudiante
  const actualizarSesion = useCallback((accessToken, nuevoUser) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('user', JSON.stringify(nuevoUser))
    setUser(nuevoUser)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try { await authApi.logout(refreshToken) } catch { /* silent */ }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading,
      isAuth: !!user,
      login,
      register,
      logout,
      actualizarSesion,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}