import api from './client'

export const authApi = {
  login: (data) =>
    api.post('/auth/login', data).then((r) => r.data),

  register: (data) =>
    api.post('/auth/register', data).then((r) => r.data),

  me: () =>
    api.get('/auth/me').then((r) => r.data),

  logout: (refreshToken) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }).then((r) => r.data),
}
