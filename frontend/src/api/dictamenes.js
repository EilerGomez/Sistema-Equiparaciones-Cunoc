import api from './client'

export const dictamenesApi = {
  getAll: (params = {}) =>
    api.get('/dictamenes', { params }).then(r => r.data),

  getOne: (id) =>
    api.get(`/dictamenes/${id}`).then(r => r.data),

  create: (body) =>
    api.post('/dictamenes', body).then(r => r.data),

  update: (id, body) =>
    api.put(`/dictamenes/${id}`, body).then(r => r.data),

  remove: (id) =>
    api.delete(`/dictamenes/${id}`).then(r => r.data),

  marcarImpresionDictamen: (id) =>
    api.patch(`/dictamenes/${id}/imprimir-dictamen`).then(r => r.data),

  marcarImpresionCartas: (id, body = {}) =>
    api.patch(`/dictamenes/${id}/imprimir-cartas`, body).then(r => r.data),

  getCartasPorDocente: (id) =>
    api.get(`/dictamenes/${id}/cartas-por-docente`).then(r => r.data),
}