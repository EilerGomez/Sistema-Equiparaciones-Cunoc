import api from './client'

const crud = (base) => ({
  getAll: () =>
    api.get(`/catalogs/${base}`).then(r => r.data),

  getOne: (id) =>
    api.get(`/catalogs/${base}/${id}`).then(r => r.data),

  create: (body) =>
    api.post(`/catalogs/${base}`, body).then(r => r.data),

  update: (id, body) =>
    api.put(`/catalogs/${base}/${id}`, body).then(r => r.data),

  remove: (id) =>
    api.delete(`/catalogs/${base}/${id}`).then(r => r.data),
})

export const getPublicFileUrl = (url) => {
  if (!url) return ''

  const cleanUrl = String(url).trim()

  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl
  }

  const baseURL = api.defaults.baseURL || ''

  const backendOrigin = baseURL
    .replace(/\/api\/?$/, '')
    .replace(/\/api\/v\d+\/?$/, '')
    .replace(/\/$/, '')

  const filePath = cleanUrl.startsWith('/')
    ? cleanUrl
    : `/${cleanUrl}`

  return `${backendOrigin}${filePath}`
}

export const profesionesApi = crud('profesiones')
export const carrerasApi = crud('carreras')
export const pensumApi = crud('pensum')
export const ciclosApi = crud('ciclos')
export const codigoCicloApi = crud('codigo-ciclo')
export const cursosApi = crud('cursos')
export const docentesApi = crud('docentes')
export const institucionesApi = crud('instituciones')
export const sedesApi = crud('sedes')
export const autoridadesApi = crud('autoridades')

export const configuracionCartasDictamenApi = {
  getAll: () =>
    api.get('/catalogs/configuracion-cartas-dictamen').then(r => r.data),

  getOne: (id) =>
    api.get(`/catalogs/configuracion-cartas-dictamen/${id}`).then(r => r.data),

  create: (body) =>
    api.post('/catalogs/configuracion-cartas-dictamen', body).then(r => r.data),

  update: (id, body) =>
    api.put(`/catalogs/configuracion-cartas-dictamen/${id}`, body).then(r => r.data),

  updateOmitirCarta: (id, body) =>
    api.patch(`/catalogs/configuracion-cartas-dictamen/${id}/omite-carta`, body).then(r => r.data),

  remove: (id) =>
    api.delete(`/catalogs/configuracion-cartas-dictamen/${id}`).then(r => r.data),
}

export const equivalenciasApi = {
  getAll: () =>
    api.get('/catalogs/equivalencias').then(r => r.data),

  getOne: (idCursoDe, idCursoA) =>
    api.get(`/catalogs/equivalencias/${idCursoDe}/${idCursoA}`).then(r => r.data),

  create: (body) =>
    api.post('/catalogs/equivalencias', body).then(r => r.data),

  update: (body) =>
    api.put('/catalogs/equivalencias', body).then(r => r.data),

  remove: (body) =>
    api.delete('/catalogs/equivalencias', { data: body }).then(r => r.data),
}

export const docenteCursoApi = {
  getAll: () =>
    api.get('/catalogs/docente-curso').then(r => r.data),

  getByCiclo: (id) =>
    api.get(`/catalogs/docente-curso/ciclo/${id}`).then(r => r.data),

  create: (body) =>
    api.post('/catalogs/docente-curso', body).then(r => r.data),

  update: (body) =>
    api.put('/catalogs/docente-curso', body).then(r => r.data),

  updateActivo: (body) =>
    api.patch('/catalogs/docente-curso/activo', body).then(r => r.data),

  updateActivoByCiclo: (idCiclo, body) =>
    api.patch(`/catalogs/docente-curso/ciclo/${idCiclo}/activo`, body).then(r => r.data),

  remove: (body) =>
    api.delete('/catalogs/docente-curso', { data: body }).then(r => r.data),

  removeByCiclo: (idCiclo) =>
    api.delete(`/catalogs/docente-curso/ciclo/${idCiclo}`).then(r => r.data),
}