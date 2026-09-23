import api from './client'

export const estudiantesApi = {
  getAll: () =>
    api.get('/estudiantes').then(r => r.data),

  getOne: (id) =>
    api.get(`/estudiantes/${id}`).then(r => r.data),

  create: (body) =>
    api.post('/estudiantes', body).then(r => r.data),

  update: (id, body) =>
    api.put(`/estudiantes/${id}`, body).then(r => r.data),

  remove: (id) =>
    api.delete(`/estudiantes/${id}`).then(r => r.data),
}