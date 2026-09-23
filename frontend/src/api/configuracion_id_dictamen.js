import api from './client'

export const configuracionIdDictamenApi = {
  getDictamenId: () =>
    api.get('/configuracion_id_dictamen/dictamen-id').then(r => r.data),

  setDictamenId: (nuevo_id) =>
    api.post('/configuracion_id_dictamen/dictamen-id', { nuevo_id }).then(r => r.data),
}