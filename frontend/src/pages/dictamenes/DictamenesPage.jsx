import { useEffect, useMemo, useState, useRef } from 'react'
import api from '../../api/client'
import {
  carrerasApi, pensumApi, institucionesApi, sedesApi, autoridadesApi,
  docenteCursoApi, equivalenciasApi, profesionesApi, docentesApi, getPublicFileUrl,
} from '../../api/catalogs'
import { estudiantesApi } from '../../api/estudiantes'
import { dictamenesApi } from '../../api/dictamenes'
import { Modal } from '../../components/ui/Modal'

const CURSOS_HOJA1_DICTAMEN = 24
const CURSOS_HOJA_EXTRA_DICTAMEN = 35
const CURSOS_HOJA1_CARTA = 23
const CURSOS_HOJA_EXTRA_CARTA = 35

const today = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
const normalizarRespuesta = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}
const normalizarTexto = (texto) =>
  String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const formatPorcentaje = (valor) => { const n = Number(valor); return !Number.isFinite(n) ? 100 : Math.round(n) }
const fechaInput = (fecha) => { if (!fecha) return ''; return String(fecha).slice(0, 10) }
const fechaParaLetras = (fecha) => { const base = fecha ? String(fecha).slice(0, 10) : today(); return new Date(`${base}T00:00:00`) }
const fechaEnLetras = (fecha) => {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const d = fechaParaLetras(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}
const numeroEnLetras = (numero) => {
  const n = Number(numero)
  const unidades = { 0: 'cero', 1: 'un', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve' }
  const especiales = { 10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte', 21: 'veintiún', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve' }
  const decenas = { 30: 'treinta', 40: 'cuarenta', 50: 'cincuenta', 60: 'sesenta', 70: 'setenta', 80: 'ochenta', 90: 'noventa' }
  if (!Number.isFinite(n)) return String(numero)
  if (n < 0 || n > 120) return String(numero)
  if (n <= 9) return unidades[n]
  if (n <= 29) return especiales[n]
  if (n < 100) { const dec = Math.floor(n / 10) * 10; const uni = n % 10; if (uni === 0) return decenas[dec]; return `${decenas[dec]} y ${unidades[uni]}` }
  if (n === 100) return 'cien'
  if (n < 120) return `ciento ${numeroEnLetras(n - 100)}`
  if (n === 120) return 'ciento veinte'
  return String(numero)
}
const totalCursosTexto = (total) => { const n = Number(total || 0); return `${numeroEnLetras(n)} (${n}) ${n === 1 ? 'curso' : 'cursos'}` }
const getInstitucionTexto = (codigo, nombre) => codigo || nombre || ''
const CUNOC_ID_INSTITUCION = 2
const getCarreraInstitucionCodigo = (carrera) => {
  if (!carrera) return ''
  return carrera.institucion_codigo || carrera.codigo_institucion || carrera.institucionCodigo ||
    (Number(carrera.id_institucion) === 2 ? 'CUNOC' : '') || (Number(carrera.id_institucion) === 1 ? 'USAC' : '')
}
const getCarreraTexto = (carrera) => {
  if (!carrera) return ''
  const cod = getCarreraInstitucionCodigo(carrera)
  const nom = carrera.descripcion || carrera.nombre || carrera.carrera || ''
  return cod ? `${cod}-${nom}` : nom
}
const esCarreraCunoc = (carrera) => {
  const cod = normalizarTexto(getCarreraInstitucionCodigo(carrera))
  return Number(carrera?.id_institucion) === CUNOC_ID_INSTITUCION || cod === 'cunoc'
}
const getInstitucionCodigo = (i) => { if (!i) return ''; return i.codigo || i.institucion_codigo || i.codigo_institucion || '' }
const esInstitucionCunoc = (institucion) => {
  const cod = normalizarTexto(getInstitucionCodigo(institucion))
  return Number(institucion?.id) === CUNOC_ID_INSTITUCION || cod === 'cunoc'
}
const getAutoridadCodigo = (a) => { if (!a) return ''; return a.codigo || a.codigo_autoridad || a.codigoAutoridad || '' }
const getAutoridadTexto = (a) => a?.nombre || ''
const numberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}
const getEstadoDictamen = (estado) => String(estado || 'PENDIENTE').trim().toUpperCase()
const getEstadoClass = (estado) => {
  const v = getEstadoDictamen(estado)
  if (v === 'ACEPTADO' || v === 'LISTO') return 'status-success'
  if (v === 'RECHAZADO') return 'status-danger'
  if (v === 'ENVIADO') return 'status-info'
  return 'status-warning'
}
const dividirObservaciones = (obs) => {
  if (!obs) return []
  return String(obs).split(/\s*,\s*/).map(i => i.trim()).filter(Boolean)
}
const getArchivoDictamenUrl = (url) => { if (!url) return ''; return getPublicFileUrl(url) }
const cargarProvsDictamenes = async (files) => {
  const formData = new FormData()
  Array.from(files || []).forEach(f => formData.append('archivos', f))
  if (typeof dictamenesApi.cargarProvs === 'function') return dictamenesApi.cargarProvs(formData)
  return api.post('/dictamenes/cargar-provs', formData).then(r => r.data)
}
const initialForm = {
  id_carrera_equivalencia: '', id_sede: '', prov_ryca: '', fecha_prov_ryca: '', id_estudiante: '',
  id_carrera_de: '', id_pensum_de: '', id_institucion_de: '', id_carrera_a: '', id_pensum_a: '',
  id_institucion_a: '', id_autoridad_coordinador: '', id_autoridad_director: '', num_expediente: '',
}
const initialNuevoEstudiante = { nombre_completo: '', carnet: '', registro_academico: '' }
const formatoCodigoDictamen = (item) => {
  if (item?.codigo) return item.codigo
  if (!item?.id) return '—'
  return `${String(item.id).padStart(2, '0')}-${new Date().getFullYear()}`
}
const limpiarNombreArchivo = (valor) =>
  String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '')
const nombreDictamenArchivo = (d) => limpiarNombreArchivo(`Dictamen_${d?.codigo || d?.id || 'sin_codigo'}_${d?.estudiante_nombre || 'estudiante'}`)
const nombreCartaArchivo = (d, carta) => {
  const c = carta?.cursos?.[0] || {}
  return limpiarNombreArchivo(`Carta_${String(c.numero || carta?.numero || '00').padStart(2, '0')}_${c.curso_a_nombre || c.curso_de_nombre || 'curso'}_${d?.estudiante_nombre || 'estudiante'}`)
}
const nombreCartasArchivo = (d) => limpiarNombreArchivo(`Cartas_${d?.codigo || d?.id || 'sin_codigo'}_${d?.estudiante_nombre || 'estudiante'}`)
const htmlWord = (valor) => String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const getImageDataUrlFromUrl = async (url) => {
  if (!url) return ''
  const cleanUrl = String(url).trim()
  if (!cleanUrl) return ''
  if (cleanUrl.startsWith('data:image/')) return cleanUrl
  try {
    const r = await fetch(cleanUrl)
    if (!r.ok) return ''
    const blob = await r.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result || '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })
  } catch (_) { return '' }
}
const getLogoDataUrl = async () => getImageDataUrlFromUrl('/assets/usac-logo.png')
const descargarArchivoWord = (nombreBase, contenidoHtml) => {
  const nombre = limpiarNombreArchivo(nombreBase || 'documento')
  const blob = new Blob(['\ufeff', contenidoHtml], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${nombre}.doc`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const ESTADOS_DICTAMEN = ['PENDIENTE', 'LISTO']

export default function DictamenesPage() {
  const [vista, setVista] = useState('lista')
  const [detalleVista, setDetalleVista] = useState('cursos')
  const [dictamenes, setDictamenes] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [estudiantes, setEstudiantes] = useState([])
  const [carreras, setCarreras] = useState([])
  const [pensums, setPensums] = useState([])
  const [instituciones, setInstituciones] = useState([])
  const [sedes, setSedes] = useState([])
  const [autoridades, setAutoridades] = useState([])
  const [profesiones, setProfesiones] = useState([])
  const [docenteCurso, setDocenteCurso] = useState([])
  const [equivalencias, setEquivalencias] = useState([])
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [cartasInfo, setCartasInfo] = useState(null)
  const [mostrarAvisoOmitidos, setMostrarAvisoOmitidos] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [previewDictamenOpen, setPreviewDictamenOpen] = useState(false)
  const [previewCartasOpen, setPreviewCartasOpen] = useState(false)
  const [cartaDocenteId, setCartaDocenteId] = useState(null)
  const [profesionDocenteForm, setProfesionDocenteForm] = useState({})
  const [form, setForm] = useState(initialForm)
  const [busqueda, setBusqueda] = useState('')
  const [tipoFecha, setTipoFecha] = useState('hoy')
  const [fechaDesde, setFechaDesde] = useState(today())
  const [fechaHasta, setFechaHasta] = useState(today())
  const [filtroEstado, setFiltroEstado] = useState('')
  const [page, setPage] = useState(1)
  const [studentQuery, setStudentQuery] = useState('')
  const [crearEstudiante, setCrearEstudiante] = useState(false)
  const [nuevoEstudiante, setNuevoEstudiante] = useState(initialNuevoEstudiante)
  const [codigoCurso, setCodigoCurso] = useState('')
  const [equivalenciasEncontradas, setEquivalenciasEncontradas] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingDictamenes, setLoadingDictamenes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [uploadProvsOpen, setUploadProvsOpen] = useState(false)
  const [provsFiles, setProvsFiles] = useState([])
  const [uploadingProvs, setUploadingProvs] = useState(false)
  const [uploadProvsResult, setUploadProvsResult] = useState(null)
  const [archivoPdfOpen, setArchivoPdfOpen] = useState(false)
  const [archivoPdfUrl, setArchivoPdfUrl] = useState('')
  const [archivoPdfOriginalUrl, setArchivoPdfOriginalUrl] = useState('')
  const [archivoPdfObjectUrl, setArchivoPdfObjectUrl] = useState('')
  const [archivoPdfTitulo, setArchivoPdfTitulo] = useState('')
  const [modalEstadoOpen, setModalEstadoOpen] = useState(false)
  const [dictamenEstadoTarget, setDictamenEstadoTarget] = useState(null)
  const [nuevoEstadoSeleccionado, setNuevoEstadoSeleccionado] = useState('')
  const [modalArchivoOpen, setModalArchivoOpen] = useState(false)
  const [archivoFile, setArchivoFile] = useState(null)
  const archivoInputRef = useRef()

  useEffect(() => {
    if (!error && !mensaje) return undefined
    const timer = setTimeout(() => { setError(''); setMensaje('') }, 10000)
    return () => clearTimeout(timer)
  }, [error, mensaje])

  useEffect(() => {
    return () => { if (archivoPdfObjectUrl) URL.revokeObjectURL(archivoPdfObjectUrl) }
  }, [archivoPdfObjectUrl])

  useEffect(() => {
    const omitidos = cartasInfo?.omitidos || []
    if (omitidos.length === 0) { setMostrarAvisoOmitidos(true); return undefined }
    setMostrarAvisoOmitidos(true)
    const timer = setTimeout(() => setMostrarAvisoOmitidos(false), 10000)
    return () => clearTimeout(timer)
  }, [cartasInfo])

  useEffect(() => {
    cargarCatalogos()
    cargarDictamenes(1, { tipoFecha: 'hoy', fechaDesde: today(), fechaHasta: today() })
  }, [])

  const cargarCatalogos = async () => {
    try {
      setLoading(true); setError('')
      const [estudiantesData, carrerasData, pensumsData, institucionesData, sedesData,
        autoridadesData, docenteCursoData, equivalenciasData, profesionesData] = await Promise.all([
          estudiantesApi.getAll(), carrerasApi.getAll(), pensumApi.getAll(), institucionesApi.getAll(),
          sedesApi.getAll(), autoridadesApi.getAll(), docenteCursoApi.getAll(),
          equivalenciasApi.getAll(), profesionesApi.getAll(),
        ])
      setEstudiantes(normalizarRespuesta(estudiantesData))
      setCarreras(normalizarRespuesta(carrerasData))
      setPensums(normalizarRespuesta(pensumsData))
      setInstituciones(normalizarRespuesta(institucionesData))
      setSedes(normalizarRespuesta(sedesData))
      setAutoridades(normalizarRespuesta(autoridadesData))
      setDocenteCurso(normalizarRespuesta(docenteCursoData))
      setEquivalencias(normalizarRespuesta(equivalenciasData))
      setProfesiones(normalizarRespuesta(profesionesData))
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al cargar catálogos') }
    finally { setLoading(false) }
  }

  const buildQueryParams = (pageToLoad = page, overrides = {}) => {
    const tipo = overrides.tipoFecha ?? tipoFecha
    const desde = overrides.fechaDesde ?? fechaDesde
    const hasta = overrides.fechaHasta ?? fechaHasta
    const q = overrides.busqueda ?? busqueda
    const est = overrides.filtroEstado !== undefined ? overrides.filtroEstado : filtroEstado
    const params = { q: String(q || '').trim(), page: pageToLoad, limit: 20 }
    if (tipo === 'hoy') { params.fecha_desde = today(); params.fecha_hasta = today() }
    if (tipo === 'rango') { if (desde) params.fecha_desde = desde; if (hasta) params.fecha_hasta = hasta }
    if (est) params.estado = est
    return params
  }

  const cargarDictamenes = async (pageToLoad = page, overrides = {}) => {
    try {
      setLoadingDictamenes(true); setError('')
      const data = await dictamenesApi.getAll(buildQueryParams(pageToLoad, overrides))
      const rows = normalizarRespuesta(data)
      setDictamenes(rows)
      setMeta(data.meta || { total: rows.length, page: pageToLoad, limit: 20, totalPages: 1 })
      setPage(pageToLoad)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al cargar dictámenes') }
    finally { setLoadingDictamenes(false) }
  }

  const abrirModalEstado = (dictamen, e) => {
    e?.stopPropagation()
    setDictamenEstadoTarget(dictamen)
    setNuevoEstadoSeleccionado(getEstadoDictamen(dictamen.estado))
    setModalEstadoOpen(true)
  }

  const guardarEstado = async () => {
    if (!dictamenEstadoTarget || !nuevoEstadoSeleccionado) return
    setSaving(true); setError(''); setMensaje('')
    try {
      await api.patch(`/dictamenes/${dictamenEstadoTarget.id}/estado`, { estado: nuevoEstadoSeleccionado })
      setMensaje('Estado actualizado correctamente.')
      setModalEstadoOpen(false)
      if (selected?.id === dictamenEstadoTarget.id) await verDictamen({ id: selected.id }, true)
      await cargarDictamenes(page)
    } catch (err) { setError(err.response?.data?.message || 'Error al cambiar estado') }
    finally { setSaving(false) }
  }

  const abrirModalArchivo = (dictamen, e) => {
    e?.stopPropagation()
    setDictamenEstadoTarget(dictamen)
    setArchivoFile(null)
    setModalArchivoOpen(true)
  }

  const guardarArchivoUrl = async () => {
    if (!dictamenEstadoTarget || !archivoFile) return
    setSaving(true); setError(''); setMensaje('')
    try {
      const formData = new FormData()
      formData.append('archivo', archivoFile)
      await api.patch(`/dictamenes/${dictamenEstadoTarget.id}/archivo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMensaje('Archivo actualizado correctamente.')
      setModalArchivoOpen(false)
      setArchivoFile(null)
      if (selected?.id === dictamenEstadoTarget.id) await verDictamen({ id: selected.id }, true)
      await cargarDictamenes(page)
    } catch (err) { setError(err.response?.data?.message || 'Error al subir archivo') }
    finally { setSaving(false) }
  }

  const abrirModalCargaProvs = () => { setProvsFiles([]); setUploadProvsResult(null); setError(''); setMensaje(''); setUploadProvsOpen(true) }
  const cerrarModalCargaProvs = () => { if (uploadingProvs) return; setUploadProvsOpen(false); setProvsFiles([]); setUploadProvsResult(null) }
  const cargarProvs = async () => {
    if (!provsFiles.length) { setError('Seleccione uno o varios archivos PDF.'); return }
    try {
      setUploadingProvs(true); setError(''); setMensaje(''); setUploadProvsResult(null)
      const result = await cargarProvsDictamenes(provsFiles)
      setUploadProvsResult(result)
      setMensaje(result?.message || 'Carga de Prov. RYCA finalizada.')
      await cargarCatalogos(); await cargarDictamenes(1)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al cargar Prov. RYCA') }
    finally { setUploadingProvs(false) }
  }

  const cerrarArchivoDictamen = () => {
    setArchivoPdfOpen(false); setArchivoPdfUrl(''); setArchivoPdfOriginalUrl(''); setArchivoPdfTitulo('')
    if (archivoPdfObjectUrl) { URL.revokeObjectURL(archivoPdfObjectUrl); setArchivoPdfObjectUrl('') }
  }

  const abrirArchivoDictamen = async (dictamen) => {
    const url = getArchivoDictamenUrl(dictamen?.url_archivo)
    if (!url) { setError('Este dictamen no tiene archivo PDF asociado.'); return }
    if (archivoPdfObjectUrl) { URL.revokeObjectURL(archivoPdfObjectUrl); setArchivoPdfObjectUrl('') }
    setArchivoPdfOriginalUrl(url)
    setArchivoPdfUrl(url)
    setArchivoPdfTitulo(`Archivo ${dictamen?.codigo || ''}`.trim())
    setArchivoPdfOpen(true)
    setError('')
  }

  const refrescarCursosDictamen = async () => {
    if (!selected?.id) return
    try { setError(''); setMensaje(''); await verDictamen({ id: selected.id }, true); setMensaje('Cursos recargados.') }
    catch (err) { setError(err.response?.data?.message || err.message || 'Error al refrescar') }
  }

  const aplicarFiltroHoy = () => {
    const fecha = today(); setTipoFecha('hoy'); setFechaDesde(fecha); setFechaHasta(fecha)
    cargarDictamenes(1, { tipoFecha: 'hoy', fechaDesde: fecha, fechaHasta: fecha })
  }
  const aplicarFiltroTodos = () => { setTipoFecha('todos'); cargarDictamenes(1, { tipoFecha: 'todos' }) }
  const aplicarFiltroRango = () => { setTipoFecha('rango'); cargarDictamenes(1, { tipoFecha: 'rango', fechaDesde, fechaHasta }) }
  const aplicarFiltroEstado = (estado) => { setFiltroEstado(estado); cargarDictamenes(1, { filtroEstado: estado }) }

  const volverListado = () => {
    setVista('lista'); setSelected(null); setCartasInfo(null); setCodigoCurso('')
    setEquivalenciasEncontradas([]); setPreviewDictamenOpen(false); setPreviewCartasOpen(false); setDetalleVista('cursos')
  }

  const institucionCunoc = useMemo(() => instituciones.find(esInstitucionCunoc) || { id: CUNOC_ID_INSTITUCION, codigo: 'CUNOC' }, [instituciones])
  const idInstitucionCunoc = institucionCunoc?.id || CUNOC_ID_INSTITUCION
  const carrerasCunoc = useMemo(() => carreras.filter(esCarreraCunoc), [carreras])
  const carrerasOrigen = useMemo(() => {
    if (!form.id_institucion_de) return carreras
    return carreras.filter(c => String(c.id_institucion) === String(form.id_institucion_de))
  }, [carreras, form.id_institucion_de])

  const getPrimerPensumNoVigente = (idCarrera) => {
    const permitidos = new Set(carrerasOrigen.map(c => String(c.id)))
    const found = pensums.find(p => {
      if (Number(p.vigencia) !== 0) return false
      if (idCarrera) return String(p.id_carrera) === String(idCarrera)
      if (form.id_institucion_de) return permitidos.has(String(p.id_carrera))
      return true
    })
    return found?.id || ''
  }
  const getPrimerPensumVigente = (idCarrera) => {
    const found = pensums.find(p => {
      if (Number(p.vigencia) !== 1) return false
      if (idCarrera) return String(p.id_carrera) === String(idCarrera)
      return true
    })
    return found?.id || ''
  }

  const getAutoridadPorCodigo = (cod) => {
    const buscado = normalizarTexto(cod)
    return autoridades.find(a => normalizarTexto(getAutoridadCodigo(a)) === buscado)
  }

  // ── Coordinadores: todos los que tienen código que empieza con COO ──
  const autoridadesCoordinador = useMemo(
    () => autoridades.filter(a => getAutoridadCodigo(a).toUpperCase().startsWith('COO')),
    [autoridades]
  )

  // ── Mapa carrera.codigo → autoridad coordinadora ──
  const coordinadorPorCarrera = useMemo(() => ({
    '120058': autoridades.find(a => getAutoridadCodigo(a) === 'COO_ING_SISTEMAS'),
    '120034': autoridades.find(a => getAutoridadCodigo(a) === 'COO_ING_MECANICA'),
    '120033': autoridades.find(a => getAutoridadCodigo(a) === 'COO_ING_CIVIL'),
    '120035': autoridades.find(a => getAutoridadCodigo(a) === 'COO_ING_INDUSTRIAL'),
    '120036': autoridades.find(a => getAutoridadCodigo(a) === 'COO_ING_MECANICA_INDUSTRIAL'),
  }), [autoridades])

  // ── Director: fijo por código ──
  const autoridadDirectorFija = getAutoridadPorCodigo('DIRECTOR_ING')
  const autoridadesDirector = autoridadDirectorFija ? [autoridadDirectorFija] : []

  const getDefaultsDictamenForm = () => ({
    id_institucion_a: idInstitucionCunoc ? String(idInstitucionCunoc) : '',
    id_autoridad_coordinador: autoridadesCoordinador[0]?.id || '',
    id_autoridad_director: autoridadDirectorFija?.id || '',
  })

  // Al abrir el modal: pre-seleccionar el primer coordinador COO si el form no trae uno válido
  useEffect(() => {
    if (!modalOpen) return
    setForm(prev => {
      const coordinadorValido = autoridadesCoordinador.some(a => String(a.id) === String(prev.id_autoridad_coordinador))
      const idC = coordinadorValido ? prev.id_autoridad_coordinador : (autoridadesCoordinador[0]?.id || '')
      const idD = autoridadDirectorFija?.id || ''
      if (
        String(prev.id_autoridad_coordinador || '') === String(idC || '') &&
        String(prev.id_autoridad_director || '') === String(idD || '')
      ) return prev
      return { ...prev, id_autoridad_coordinador: idC, id_autoridad_director: idD }
    })
  }, [modalOpen, autoridadesCoordinador, autoridadDirectorFija])

  const estudianteSeleccionado = useMemo(() => estudiantes.find(e => String(e.id) === String(form.id_estudiante)), [estudiantes, form.id_estudiante])
  const estudiantesFiltrados = useMemo(() => {
    const q = normalizarTexto(studentQuery)
    if (!q) return estudiantes.slice(0, 8)
    return estudiantes.filter(e => normalizarTexto([e.nombre_completo, e.carnet, e.registro_academico].join(' ')).includes(q)).slice(0, 8)
  }, [estudiantes, studentQuery])

  const pensumsDe = useMemo(() => {
    const permitidos = new Set(carrerasOrigen.map(c => String(c.id)))
    return pensums.filter(p => {
      if (Number(p.vigencia) !== 0) return false
      if (form.id_carrera_de && String(p.id_carrera) !== String(form.id_carrera_de)) return false
      if (!form.id_carrera_de && form.id_institucion_de) return permitidos.has(String(p.id_carrera))
      return true
    })
  }, [pensums, form.id_carrera_de, form.id_institucion_de, carrerasOrigen])

  const pensumsA = useMemo(() => pensums.filter(p => {
    if (Number(p.vigencia) !== 1) return false
    if (form.id_carrera_a && String(p.id_carrera) !== String(form.id_carrera_a)) return false
    return true
  }), [pensums, form.id_carrera_a])

  useEffect(() => {
    if (!modalOpen) return
    setForm(prev => {
      if (!prev.id_carrera_de) { if (prev.id_pensum_de) return { ...prev, id_pensum_de: '' }; return prev }
      if (pensumsDe.some(p => String(p.id) === String(prev.id_pensum_de))) return prev
      return { ...prev, id_pensum_de: pensumsDe[0]?.id || '' }
    })
  }, [modalOpen, form.id_carrera_de, pensumsDe])

  useEffect(() => {
    if (!modalOpen) return
    setForm(prev => {
      if (!prev.id_carrera_a) { if (prev.id_pensum_a) return { ...prev, id_pensum_a: '' }; return prev }
      if (pensumsA.some(p => String(p.id) === String(prev.id_pensum_a))) return prev
      return { ...prev, id_pensum_a: pensumsA[0]?.id || '' }
    })
  }, [modalOpen, form.id_carrera_a, pensumsA])

  useEffect(() => {
    if (!modalOpen) return
    setForm(prev => {
      if (!prev.id_institucion_de) return prev
      if (carrerasOrigen.some(c => String(c.id) === String(prev.id_carrera_de)) || !prev.id_carrera_de) return prev
      return { ...prev, id_carrera_de: '', id_pensum_de: '' }
    })
  }, [modalOpen, form.id_institucion_de, carrerasOrigen])

  const getDocentesAsignados = (codigoCursoDestino) => {
    const map = new Map()
    docenteCurso.filter(dc => {
      const cod = dc.curso_codigo || dc.codigo_curso || dc.id_curso
      return String(cod).trim() === String(codigoCursoDestino).trim() && Number(dc.activo) === 1
    }).forEach(dc => {
      if (!dc.id_docente) return
      map.set(String(dc.id_docente), { id: Number(dc.id_docente), nombre: dc.docente_nombre || dc.nombre_docente || dc.nombre || `Docente ${dc.id_docente}` })
    })
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'id_institucion_de') { next.id_carrera_de = ''; next.id_pensum_de = '' }
      if (name === 'id_carrera_equivalencia') {
        const car = carreras.find(c => String(c.id) === String(value))
        next.id_carrera_a = value
        next.id_pensum_a = value ? getPrimerPensumVigente(value) : ''
        next.id_institucion_a = value ? String(car?.id_institucion || idInstitucionCunoc || CUNOC_ID_INSTITUCION) : String(idInstitucionCunoc || CUNOC_ID_INSTITUCION)
        // Auto-seleccionar coordinador según carrera de equivalencia
        const codigoCarrera = car?.codigo || ''
        const coordinador = coordinadorPorCarrera[codigoCarrera]
        next.id_autoridad_coordinador = coordinador?.id ? String(coordinador.id) : prev.id_autoridad_coordinador
      }
      if (name === 'id_carrera_de') next.id_pensum_de = value ? getPrimerPensumNoVigente(value) : ''
      if (name === 'id_carrera_a') next.id_pensum_a = value ? getPrimerPensumVigente(value) : ''
      return next
    })
  }

  const openCreate = () => {
    setEditing(null); setForm({ ...initialForm, ...getDefaultsDictamenForm() })
    setStudentQuery(''); setCrearEstudiante(false); setNuevoEstudiante(initialNuevoEstudiante)
    setModalOpen(true); setError(''); setMensaje('')
  }

  const openEdit = async (row) => {
    try {
      setLoading(true); setError('')
      const detalle = await dictamenesApi.getOne(row.id)
      setEditing(detalle)
      const idCarreraDestino = detalle.id_carrera_equivalencia || detalle.id_carrera_a || ''
      const carreraDestino = carreras.find(c => String(c.id) === String(idCarreraDestino))
      const defaults = getDefaultsDictamenForm()
      setForm({
        id_carrera_equivalencia: idCarreraDestino, id_sede: detalle.id_sede || '',
        prov_ryca: detalle.prov_ryca || '', fecha_prov_ryca: fechaInput(detalle.fecha_prov_ryca),
        id_estudiante: detalle.id_estudiante || '', id_carrera_de: detalle.id_carrera_de || '',
        id_pensum_de: detalle.id_pensum_de || '', id_institucion_de: detalle.id_institucion_de || '',
        id_carrera_a: idCarreraDestino, id_pensum_a: detalle.id_pensum_a || '',
        id_institucion_a: detalle.id_institucion_a || carreraDestino?.id_institucion || defaults.id_institucion_a || '',
        id_autoridad_coordinador: detalle.id_autoridad_coordinador || defaults.id_autoridad_coordinador || '',
        id_autoridad_director: detalle.id_autoridad_director || defaults.id_autoridad_director || '',
        num_expediente: detalle.num_expediente || '', estado: detalle.estado || 'PENDIENTE',
        url_archivo: detalle.url_archivo || '', observaciones: detalle.observaciones || '',
      })
      const est = estudiantes.find(e => String(e.id) === String(detalle.id_estudiante))
      setStudentQuery(est ? `${est.nombre_completo} | Carnet: ${est.carnet}` : '')
      setCrearEstudiante(false); setNuevoEstudiante(initialNuevoEstudiante); setModalOpen(true)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al cargar dictamen') }
    finally { setLoading(false) }
  }

  const closeModal = () => { if (saving) return; setModalOpen(false); setEditing(null) }
  const seleccionarEstudiante = (est) => {
    setForm(prev => ({ ...prev, id_estudiante: est.id }))
    setStudentQuery(`${est.nombre_completo} | Carnet: ${est.carnet}`); setCrearEstudiante(false)
  }

  const validarFormulario = () => {
    if (!crearEstudiante && !form.id_estudiante) return 'Seleccione un estudiante o cree uno nuevo.'
    if (crearEstudiante) {
      if (!nuevoEstudiante.nombre_completo.trim()) return 'Ingrese el nombre completo del estudiante.'
      if (!nuevoEstudiante.carnet.trim()) return 'Ingrese el carnet del estudiante.'
      if (!nuevoEstudiante.registro_academico.trim()) return 'Ingrese el registro académico.'
    }
    const req = ['id_carrera_equivalencia', 'id_sede', 'prov_ryca', 'fecha_prov_ryca', 'id_carrera_de', 'id_pensum_de', 'id_institucion_de', 'id_carrera_a', 'id_pensum_a', 'id_institucion_a', 'id_autoridad_coordinador', 'id_autoridad_director']
    for (const campo of req) { if (!form[campo]) return 'Complete todos los datos del dictamen.' }
    return ''
  }

  const payloadFromForm = (idEst, cursos = [], extra = {}) => ({
    id_carrera_equivalencia: Number(form.id_carrera_equivalencia), id_sede: Number(form.id_sede),
    prov_ryca: form.prov_ryca.trim(), fecha_prov_ryca: form.fecha_prov_ryca,
    id_estudiante: Number(idEst), id_carrera_de: Number(form.id_carrera_de),
    id_pensum_de: Number(form.id_pensum_de), id_institucion_de: Number(form.id_institucion_de),
    id_carrera_a: Number(form.id_carrera_a), id_pensum_a: Number(form.id_pensum_a),
    id_institucion_a: Number(form.id_institucion_a),
    id_autoridad_coordinador: Number(form.id_autoridad_coordinador),
    id_autoridad_director: Number(form.id_autoridad_director),
    num_expediente: form.num_expediente?.trim() || null, estado: form.estado || extra.estado || 'PENDIENTE',
    url_archivo: form.url_archivo || extra.url_archivo || null,
    observaciones: form.observaciones || extra.observaciones || null,
    cursos: cursos.map((c, i) => ({
      numero: i + 1, id_curso_de: numberOrNull(c.id_curso_de), id_curso_a: numberOrNull(c.id_curso_a),
      porcentaje: formatPorcentaje(c.porcentaje), opinion: c.opinion || 'EQUIVALENTE',
      id_docente_encargado_curso: c.id_docente_encargado_curso ? Number(c.id_docente_encargado_curso) : null,
    })),
  })

  const guardarDictamenBase = async () => {
    const validacion = validarFormulario()
    if (validacion) { setError(validacion); return }
    try {
      setSaving(true); setError(''); setMensaje('')
      let idEst = form.id_estudiante
      if (crearEstudiante) {
        const creado = await estudiantesApi.create({ nombre_completo: nuevoEstudiante.nombre_completo.trim(), carnet: nuevoEstudiante.carnet.trim(), registro_academico: nuevoEstudiante.registro_academico.trim() })
        idEst = (creado.data || creado).id
        setEstudiantes(normalizarRespuesta(await estudiantesApi.getAll()))
      }
      if (editing) {
        await dictamenesApi.update(editing.id, payloadFromForm(idEst, editing.cursos || [], editing))
        setMensaje('Dictamen actualizado correctamente.')
        if (selected?.id === editing.id) await verDictamen({ id: editing.id }, true)
      } else {
        const creado = await dictamenesApi.create(payloadFromForm(idEst, [], {}))
        const nuevo = creado.data || creado
        setMensaje('Dictamen creado correctamente. Ahora puede agregar cursos.')
        if (nuevo?.id) await verDictamen({ id: nuevo.id }, true)
      }
      closeModal(); await cargarDictamenes(1)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al guardar dictamen') }
    finally { setSaving(false) }
  }

  const verDictamen = async (row, stayInDetail = false) => {
    try {
      setLoading(true); setError(''); setCartasInfo(null); setEquivalenciasEncontradas([])
      const detalle = await dictamenesApi.getOne(row.id); setSelected(detalle)
      try {
        const cartasData = await dictamenesApi.getCartasPorDocente(row.id); setCartasInfo(cartasData)
        const pm = {}; (cartasData.cartas || []).forEach(c => { pm[c.docente_id] = c.docente_id_profesion || '' }); setProfesionDocenteForm(pm)
      } catch (_) { setCartasInfo({ dictamen: detalle, cartas: [], omitidos: [] }); setProfesionDocenteForm({}) }
      if (!stayInDetail) { setDetalleVista('cursos'); setVista('detalle') }
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al cargar dictamen') }
    finally { setLoading(false) }
  }

  const buscarEquivalenciaPorCodigo = () => {
    const codigo = codigoCurso.trim()
    if (!codigo) { setError('Ingrese el código del curso origen.'); return }
    const encontradas = equivalencias.filter(eq => String(eq.curso_de_codigo).trim() === codigo)
    if (!encontradas.length) { setEquivalenciasEncontradas([]); setError(`No se encontró equivalencia para el curso ${codigo}.`); return }
    setError('')
    if (encontradas.length === 1) agregarCursoADictamen(encontradas[0])
    else setEquivalenciasEncontradas(encontradas)
  }

  const agregarCursoADictamen = (equivalencia) => {
    if (!selected) return
    if ((selected.cursos || []).some(c => Number(c.id_curso_de) === Number(equivalencia.id_curso_de) && Number(c.id_curso_a) === Number(equivalencia.id_curso_a))) { setError('Ese curso ya está agregado al dictamen.'); return }
    const asignados = getDocentesAsignados(equivalencia.curso_a_codigo)
    setSelected(prev => ({
      ...prev,
      cursos: [...(prev.cursos || []), {
        numero: (prev.cursos || []).length + 1, id_curso_de: Number(equivalencia.id_curso_de), id_curso_a: Number(equivalencia.id_curso_a),
        curso_de_codigo: equivalencia.curso_de_codigo, curso_de_nombre: equivalencia.curso_de_nombre,
        curso_a_codigo: equivalencia.curso_a_codigo, curso_a_nombre: equivalencia.curso_a_nombre,
        porcentaje: 100, opinion: 'EQUIVALENTE', id_docente_encargado_curso: asignados.length === 1 ? asignados[0].id : '',
      }],
    }))
    setCodigoCurso(''); setEquivalenciasEncontradas([])
    if (!asignados.length) setMensaje(`Curso agregado sin docente activo: ${equivalencia.curso_a_codigo}.`)
  }

  const actualizarCurso = (index, field, value) => {
    setSelected(prev => ({
      ...prev,
      cursos: (prev.cursos || []).map((c, i) => {
        if (i !== index) return c
        if (field === 'porcentaje') return { ...c, porcentaje: value === '' ? '' : Math.round(Number(value)) }
        return { ...c, [field]: value }
      }),
    }))
  }

  const quitarCurso = (index) => {
    setSelected(prev => ({ ...prev, cursos: (prev.cursos || []).filter((_, i) => i !== index).map((c, i) => ({ ...c, numero: i + 1 })) }))
  }

  const guardarCursos = async () => {
    if (!selected) return
    try {
      setSaving(true); setError(''); setMensaje('')
      await dictamenesApi.update(selected.id, {
        id_carrera_equivalencia: Number(selected.id_carrera_equivalencia), id_sede: numberOrNull(selected.id_sede),
        prov_ryca: selected.prov_ryca, fecha_prov_ryca: fechaInput(selected.fecha_prov_ryca),
        id_estudiante: Number(selected.id_estudiante), id_carrera_de: numberOrNull(selected.id_carrera_de),
        id_pensum_de: numberOrNull(selected.id_pensum_de), id_institucion_de: numberOrNull(selected.id_institucion_de),
        id_carrera_a: numberOrNull(selected.id_carrera_a), id_pensum_a: numberOrNull(selected.id_pensum_a),
        id_institucion_a: numberOrNull(selected.id_institucion_a),
        id_autoridad_coordinador: Number(selected.id_autoridad_coordinador), id_autoridad_director: Number(selected.id_autoridad_director),
        num_expediente: selected.num_expediente || null, estado: selected.estado || 'PENDIENTE',
        url_archivo: selected.url_archivo || null, observaciones: selected.observaciones || null,
        cursos: (selected.cursos || []).map((c, i) => ({
          numero: i + 1, id_curso_de: numberOrNull(c.id_curso_de), id_curso_a: numberOrNull(c.id_curso_a),
          porcentaje: formatPorcentaje(c.porcentaje), opinion: c.opinion || 'EQUIVALENTE',
          id_docente_encargado_curso: c.id_docente_encargado_curso ? Number(c.id_docente_encargado_curso) : null,
        })),
      })
      setMensaje('Cursos del dictamen actualizados.')
      await verDictamen({ id: selected.id }, true); await cargarDictamenes(page)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al guardar cursos') }
    finally { setSaving(false) }
  }

  const eliminarDictamen = async (dictamen) => {
    if (!dictamen?.id) return
    if (!window.confirm(`¿Desea eliminar el dictamen ${dictamen.codigo || dictamen.id}?`)) return
    try {
      setSaving(true); setError(''); setMensaje('')
      if (typeof dictamenesApi.remove === 'function') await dictamenesApi.remove(dictamen.id)
      else await api.delete(`/dictamenes/${dictamen.id}`)
      setMensaje('Dictamen eliminado correctamente.')
      if (selected?.id === dictamen.id) volverListado()
      await cargarDictamenes(page)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al eliminar dictamen') }
    finally { setSaving(false) }
  }

  const eliminarArchivoDictamen = async () => {
    if (!selected?.id || !selected?.url_archivo) return
    if (!window.confirm('¿Desea eliminar el archivo PDF asociado?')) return
    try {
      setSaving(true); setError(''); setMensaje('')
      if (typeof dictamenesApi.eliminarArchivo === 'function') await dictamenesApi.eliminarArchivo(selected.id)
      else await api.delete(`/dictamenes/${selected.id}/archivo`)
      setSelected(await dictamenesApi.getOne(selected.id))
      setMensaje('Archivo eliminado correctamente.'); await cargarDictamenes(page)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al eliminar archivo') }
    finally { setSaving(false) }
  }

  const guardarObservacionesDictamen = async (observaciones) => {
    if (!selected?.id) return
    try {
      setSaving(true); setError(''); setMensaje('')
      let data
      if (typeof dictamenesApi.updateObservaciones === 'function') data = await dictamenesApi.updateObservaciones(selected.id, { observaciones })
      else data = await api.patch(`/dictamenes/${selected.id}/observaciones`, { observaciones }).then(r => r.data)
      setSelected(data?.data || { ...selected, observaciones })
      setMensaje('Observaciones actualizadas correctamente.'); await cargarDictamenes(page)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al guardar observaciones') }
    finally { setSaving(false) }
  }

  const cargarCartas = async () => {
    if (!selected) return null
    const data = await dictamenesApi.getCartasPorDocente(selected.id); setCartasInfo(data)
    const pm = {}; (data.cartas || []).forEach(c => { pm[c.docente_id] = c.docente_id_profesion || '' }); setProfesionDocenteForm(pm)
    return data
  }

  const verApartadoCursos = () => setDetalleVista('cursos')
  const verApartadoCartas = async () => {
    try { setError(''); await cargarCartas(); setDetalleVista('cartas') }
    catch (err) { setError(err.response?.data?.message || err.message || 'Error al cargar cartas') }
  }

  const actualizarProfesionDocente = async (docenteId) => {
    const idProfesion = profesionDocenteForm[docenteId]
    if (!idProfesion) { setError('Seleccione una profesión para el docente.'); return }
    try {
      setSaving(true); setError(''); setMensaje('')
      const docenteData = await docentesApi.getOne(docenteId); const docente = docenteData.data || docenteData
      await docentesApi.update(docenteId, { ...docente, id_profesion: Number(idProfesion) })
      setMensaje('Profesión del docente actualizada.'); await cargarCatalogos(); await cargarCartas()
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al actualizar profesión') }
    finally { setSaving(false) }
  }

  const abrirPreviewCartas = async (docenteId = null) => {
    try { setError(''); await cargarCartas(); setCartaDocenteId(docenteId); setPreviewCartasOpen(true) }
    catch (err) { setError(err.response?.data?.message || err.message || 'Error al cargar cartas') }
  }

  const imprimirDictamen = async () => {
    if (!selected) return
    try {
      setError('')
      await dictamenesApi.marcarImpresionDictamen(selected.id)
      const detalle = await dictamenesApi.getOne(selected.id); setSelected(detalle); setPreviewDictamenOpen(true)
      setTimeout(() => imprimirContenido(nombreDictamenArchivo(detalle)), 300)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al imprimir dictamen') }
  }

  const imprimirCartas = async (docenteId = null) => {
    if (!selected) return
    try {
      setError('')
      await dictamenesApi.marcarImpresionCartas(selected.id, docenteId ? { id_docente_encargado_curso: docenteId } : {})
      const data = await dictamenesApi.getCartasPorDocente(selected.id)
      const cartas = data?.cartas || []
      const cartaSel = docenteId ? cartas.find(c => String(c.docente_id) === String(docenteId)) : null
      const nombrePdf = cartaSel ? nombreCartaArchivo(selected, cartaSel) : nombreCartasArchivo(selected)
      setCartasInfo(data); setCartaDocenteId(docenteId); setPreviewCartasOpen(true)
      setTimeout(() => imprimirContenido(nombrePdf), 300)
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al imprimir cartas') }
  }

  const cartasParaPreview = useMemo(() => {
    const cartas = cartasInfo?.cartas || []
    if (!cartaDocenteId) return cartas
    return cartas.filter(c => String(c.docente_id) === String(cartaDocenteId))
  }, [cartasInfo, cartaDocenteId])

  const imprimirContenido = (nombreBase = 'Dictamen') => {
    const nombreSeguro = limpiarNombreArchivo(nombreBase || 'Dictamen')
    const areas = Array.from(document.querySelectorAll('.print-area'))
    const area = areas.find(el => el.offsetWidth > 0 && el.offsetHeight > 0) || areas[0]
    if (!area) { window.print(); return }
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', nombreSeguro)
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow.document
    const css = `@page{size:A4;}*{box-sizing:border-box;}html,body{width:210mm;min-height:297mm;margin:0;padding:0;background:white;color:#111;font-family:"Times New Roman",serif;}.preview-scroll{width:210mm!important;margin:0!important;padding:0!important;background:white!important;border-radius:0!important;overflow:visible!important;}
    .preview-paper{width:210mm;height:297mm;overflow:hidden;box-sizing:border-box;padding:13mm 15mm;background:white;color:#111;font-size:11px;line-height:1.22;font-family:"Times New Roman",serif;display:block;page-break-after:always;break-after:page;}
    .preview-paper:last-child{page-break-after:auto;break-after:auto;}.documento-top{display:grid;grid-template-columns:230px 1fr;gap:20px;align-items:start;margin-bottom:12px;}.doc-header{width:220px;text-align:center;}.doc-header img{width:205px;height:auto;object-fit:contain;display:block;margin:0 auto 3px;}.doc-header-text{font-size:8.5px;line-height:1.05;font-weight:700;text-align:center;}.documento-codigo{text-align:right;font-size:11px;font-weight:700;padding-top:32px;}.preview-table{width:100%;border-collapse:collapse;font-size:9.8px;margin-top:14px;}.preview-table th,.preview-table td{border:1px solid #444;padding:4px;vertical-align:top;}.preview-table th{text-align:center;font-weight:700;}.carta-table{table-layout:fixed;width:100%;}.carta-table th,.carta-table td{word-wrap:break-word;overflow-wrap:anywhere;}.firma-bloque-documento{position:relative;min-height:74px;padding-top:16px;}.firma-img-documento{position:absolute;top:-24px;left:50%;transform:translateX(-50%);width:125px;max-height:58px;object-fit:contain;opacity:.95;z-index:2;}.sello-img-documento{position:absolute;top:18px;right:10px;width:62px;max-height:62px;object-fit:contain;opacity:.72;z-index:3;pointer-events:none;}.firma-texto-documento{position:relative;z-index:4;line-height:1.18;}.firmas-dictamen{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:42px;}.vobo-dictamen{margin-top:28px;display:flex;align-items:flex-start;gap:8px;}.vobo-firma{width:330px;margin-left:80px;text-align:center;}.firma-bloque-coordinador{width:330px;margin:0 auto;}.firma-bloque-director{left:-10%;width:330px;margin-left:58px;text-align:left;}.firma-img-coordinador{top:-42px;left:50%;transform:translateX(-56%);width:200px;max-height:70px;}.firma-img-director{top:-42px;left:50%;transform:translateX(-50%);width:300px;max-height:100px;}.sello-img-coordinador{top:-10px;right:20px;width:88px;max-height:88px;}.sello-img-director{top:-6px;right:12px;width:88px;max-height:88px;}.firma-texto-coordinador{text-align:center;padding-top:8px;}.firma-texto-director{text-align:center;width:260px;position:relative;left:35px;padding-top:8px;}.firmas-dictamen,.vobo-dictamen{break-inside:avoid;page-break-inside:avoid;}.firma-docente{text-align:center;margin-top:62px;}.footer-copy{margin-top:auto;padding-top:4mm;font-size:8.8px;}.text-center{text-align:center;}.text-right{text-align:right;}`
    doc.open()
    doc.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${nombreSeguro}</title><base href="${window.location.origin}/"/><style>${css}</style></head><body>${area.innerHTML}</body></html>`)
    doc.close()
    let yaImprimio = false
    const esperarImagenes = () => {
      const imgs = Array.from(doc.images || [])
      if (!imgs.length) return Promise.resolve()
      return Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => { const t = () => resolve(); img.onload = t; img.onerror = t; setTimeout(t, 1800) })
      }))
    }
    const ejecutar = async () => {
      if (yaImprimio) return; yaImprimio = true
      await esperarImagenes(); iframe.contentWindow.focus(); iframe.contentWindow.print()
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe) }, 800)
    }
    iframe.onload = ejecutar; setTimeout(ejecutar, 500)
  }

  const descargarWordDictamen = async () => {
    if (!selected) return
    try {
      setError('')
      const [logoDataUrl, cFirma, cSello, dFirma, dSello] = await Promise.all([
        getLogoDataUrl(),
        getImageDataUrlFromUrl(getPublicFileUrl(selected.coordinador_url_firma)),
        getImageDataUrlFromUrl(getPublicFileUrl(selected.coordinador_url_sello)),
        getImageDataUrlFromUrl(getPublicFileUrl(selected.director_url_firma)),
        getImageDataUrlFromUrl(getPublicFileUrl(selected.director_url_sello)),
      ])
      const nombre = nombreDictamenArchivo(selected)
      const cuerpo = renderDictamenWord(selected, logoDataUrl, { coordinadorFirmaDataUrl: cFirma, coordinadorSelloDataUrl: cSello, directorFirmaDataUrl: dFirma, directorSelloDataUrl: dSello })
      descargarArchivoWord(nombre, crearDocumentoWord(nombre, cuerpo))
    } catch (err) { setError(err.message || 'Error al generar Word del dictamen') }
  }

  const descargarWordCartas = async (docenteId = null) => {
    if (!selected) return
    try {
      setError('')
      const data = await cargarCartas(); const cartas = data?.cartas || []
      const filtradas = docenteId ? cartas.filter(c => String(c.docente_id) === String(docenteId)) : cartas
      if (!filtradas.length) { setError('No hay cartas disponibles para generar Word.'); return }
      const cuerpo = filtradas.map((carta, i) => renderCartaWord(selected, carta) + (i < filtradas.length - 1 ? '<div class="page-break"></div>' : '')).join('')
      const nombre = docenteId ? nombreCartaArchivo(selected, filtradas[0]) : nombreCartasArchivo(selected)
      descargarArchivoWord(nombre, crearDocumentoWord(nombre, cuerpo))
    } catch (err) { setError(err.response?.data?.message || err.message || 'Error al generar Word') }
  }

  const crearDocumentoWord = (titulo, cuerpoHtml) => {
    const t = htmlWord(titulo || 'documento')
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/><title>${t}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]--><style>@page WordSection1{size:21cm 29.7cm;margin:13mm 15mm 13mm 15mm;}div.WordSection1{page:WordSection1;}body{margin:0;padding:0;background:#fff;color:#111;font-family:"Times New Roman",Times,serif;font-size:12pt;}p{margin:0 0 10pt 0;line-height:1.22;}.text-center{text-align:center;}.text-right{text-align:right;}.text-justify{text-align:justify;}.indent{text-indent:1cm;}.header-table{width:100%;border-collapse:collapse;margin-bottom:12pt;}.header-table td{border:0;vertical-align:top;}.logo-cell{width:170pt;text-align:center;}.logo-img{width:155pt;height:auto;display:block;margin:0 auto 2pt auto;}.header-small{font-size:8pt;line-height:1.05;font-weight:bold;text-align:center;}.codigo-documento{text-align:right;font-size:11pt;font-weight:bold;padding-top:30pt;}.tabla-word{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12pt;margin-bottom:12pt;}.tabla-word th,.tabla-word td{border:1pt solid #000;padding:3pt;vertical-align:top;font-size:9pt;line-height:1.15;}.tabla-word th{font-weight:bold;text-align:center;}.firma-docente-word{text-align:center;margin-top:62pt;}.firmas-word-table{width:100%;border-collapse:collapse;margin-top:34pt;}.firmas-word-table td{border:0;vertical-align:top;}.firma-word-bloque{position:relative;min-height:76pt;padding-top:26pt;line-height:1.18;}.firma-word-texto{position:relative;z-index:4;font-weight:bold;}.firma-word-coordinador{width:248pt;text-align:center;margin-left:auto;}.firma-word-director{width:248pt;text-align:center;margin-left:90pt;}.firma-word-img{position:absolute;object-fit:contain;z-index:2;}.sello-word-img{position:absolute;object-fit:contain;opacity:.76;z-index:3;}.firma-word-img-coordinador{top:-16pt;left:50%;width:116pt;max-height:49pt;margin-left:-62pt;}.sello-word-img-coordinador{top:18pt;right:12pt;width:58pt;max-height:58pt;}.firma-word-img-director{top:-17pt;left:48%;width:122pt;max-height:52pt;margin-left:-70pt;}.sello-word-img-director{top:20pt;right:20pt;width:58pt;max-height:58pt;}.vobo-word{margin-top:20pt;}.footer-word{font-size:8pt;margin-top:24pt;}.page-break{page-break-after:always;}</style></head><body><div class="WordSection1">${cuerpoHtml}</div></body></html>`
  }

  const encabezadoDictamenWord = (dictamen, logoDataUrl) => {
    const fechaImp = dictamen.fecha_impresion || today(); const sede = dictamen.sede_nombre || 'Quetzaltenango'
    const subfijo = dictamen.carrera_a_subfijo || dictamen.carrera_equivalencia_subfijo || 'Carrera'
    const logo = logoDataUrl ? `<img class="logo-img" src="${logoDataUrl}" alt="USAC"/>` : ''
    return `<table class="header-table"><tr><td class="logo-cell">${logo}<div class="header-small">División Ciencias de la Ingeniería<br/>Centro Universitario de Occidente<br/>Quetzaltenango<br/>Telefax: 78730000 Ext. 2255</div></td><td class="codigo-documento">Dic. Equiv. ${htmlWord(subfijo)} No. ${htmlWord(dictamen.codigo)}<br/>${htmlWord(sede)}, ${htmlWord(fechaEnLetras(fechaImp))}</td></tr></table>`
  }

  const renderDictamenWord = (dictamen, logoDataUrl = '', imagenes = {}) => {
    const cursos = dictamen.cursos || []; const totalTexto = totalCursosTexto(cursos.length)
    const pensumDe = dictamen.pensum_de_anio || dictamen.pensum_de_codigo; const pensumA = dictamen.pensum_a_anio || dictamen.pensum_a_codigo
    const instDe = getInstitucionTexto(dictamen.institucion_de_codigo, dictamen.institucion_de)
    const instA = getInstitucionTexto(dictamen.institucion_a_codigo, dictamen.institucion_a)
    const fC = imagenes.coordinadorFirmaDataUrl ? `<img class="firma-word-img firma-word-img-coordinador" src="${imagenes.coordinadorFirmaDataUrl}" alt="Firma coordinador"/>` : ''
    const sC = imagenes.coordinadorSelloDataUrl ? `<img class="sello-word-img sello-word-img-coordinador" src="${imagenes.coordinadorSelloDataUrl}" alt="Sello coordinador"/>` : ''
    const fD = imagenes.directorFirmaDataUrl ? `<img class="firma-word-img firma-word-img-director" src="${imagenes.directorFirmaDataUrl}" alt="Firma director"/>` : ''
    const sD = imagenes.directorSelloDataUrl ? `<img class="sello-word-img sello-word-img-director" src="${imagenes.directorSelloDataUrl}" alt="Sello director"/>` : ''
    const filas = cursos.map((c, i) => `<tr><td class="text-center" style="width:6%;">${i + 1}</td><td class="text-center" style="width:10%;">${htmlWord(c.curso_de_codigo)}</td><td style="width:24%;">${htmlWord(c.curso_de_nombre)}</td><td class="text-center" style="width:6%;">Por</td><td class="text-center" style="width:10%;">${htmlWord(c.curso_a_codigo)}</td><td style="width:24%;">${htmlWord(c.curso_a_nombre)}</td><td class="text-center" style="width:9%;">${htmlWord(formatPorcentaje(c.porcentaje))}%</td><td class="text-center" style="width:11%;">${htmlWord(c.opinion || 'EQUIVALENTE')}</td></tr>`).join('')
    return `${encabezadoDictamenWord(dictamen, logoDataUrl)}<p><strong>Señores:</strong><br/><strong>Comisión Académica</strong><br/><strong>Centro Universitario de Occidente</strong><br/><strong>Edificio.</strong></p><p style="margin-top:14pt;"><strong>Estimados Señores:</strong></p><p class="text-justify indent">En atención a la Prov. RYCA <strong>${htmlWord(dictamen.prov_ryca)}</strong> de fecha <strong>${htmlWord(fechaEnLetras(dictamen.fecha_prov_ryca))}</strong>, envío el expediente de él (la) Estudiante: <strong>${htmlWord(dictamen.estudiante_nombre)}</strong>, Carné No. <strong>${htmlWord(dictamen.estudiante_carnet)}</strong>, y Registro Académico No. <strong>${htmlWord(dictamen.registro_academico)}</strong> quien solicita <strong>EQUIVALENCIA DE LOS CURSOS APROBADOS</strong> en ${htmlWord(dictamen.carrera_de)} Pensum ${htmlWord(pensumDe)} ${htmlWord(instDe)}, para su validez Académica en la Carrera de ${htmlWord(dictamen.carrera_a)} Pensum ${htmlWord(pensumA)} ${htmlWord(instA)}, emitiéndose <strong>DICTAMEN FAVORABLE</strong> a lo solicitado por el estudiante mencionado, determinando como equivalencia ${htmlWord(totalTexto)} que a continuación se detallan:</p><table class="tabla-word"><thead><tr><th rowspan="2" style="width:6%;">No.</th><th colspan="3">Pensum ${htmlWord(pensumDe)}<br/>${htmlWord(String(dictamen.carrera_de || '').toUpperCase())}<br/>${htmlWord(instDe)}</th><th colspan="2">Pensum ${htmlWord(pensumA)}<br/>${htmlWord(String(dictamen.carrera_a || '').toUpperCase())}<br/>${htmlWord(instA)}</th><th rowspan="2" style="width:9%;">Porcentaje</th><th rowspan="2" style="width:11%;">Opinión</th></tr><tr><th style="width:10%;">Código</th><th style="width:24%;">Nombre del curso</th><th style="width:6%;">Por</th><th style="width:10%;">Código</th><th style="width:24%;">Nombre del curso</th></tr></thead><tbody>${filas}</tbody></table><p>Sin otro particular, me es grato suscribirme, atentamente,</p><p class="text-center" style="margin-top:18pt;"><strong>"ID Y ENSEÑAD A TODOS"</strong></p><table class="firmas-word-table"><tr><td style="width:50%;">&nbsp;</td><td style="width:50%;"><div class="firma-word-bloque firma-word-coordinador">${fC}${sC}<div class="firma-word-texto">${htmlWord(dictamen.coordinador_subfijo)} ${htmlWord(dictamen.coordinador_nombre)}<br/>${htmlWord(dictamen.coordinador_cargo)}</div></div></td></tr></table><div class="vobo-word"><strong>Vo. Bo.:</strong><div class="firma-word-bloque firma-word-director">${fD}${sD}<div class="firma-word-texto">${htmlWord(dictamen.director_subfijo)} ${htmlWord(dictamen.director_nombre)}<br/>${htmlWord(dictamen.director_cargo)}</div></div></div><div class="footer-word">cc. Archivo<br/>EAPA/JFRS/agg<br/>Exp. No. ${htmlWord(dictamen.num_expediente || '—')}</div>`
  }

  const renderCartaWord = (dictamen, carta) => {
    const fechaImp = dictamen.fecha_impresion || today(); const sede = dictamen.sede_nombre || 'Quetzaltenango'
    const pensumDe = dictamen.pensum_de_anio || dictamen.pensum_de_codigo; const pensumA = dictamen.pensum_a_anio || dictamen.pensum_a_codigo
    const instDe = getInstitucionTexto(dictamen.institucion_de_codigo, dictamen.institucion_de)
    const instA = getInstitucionTexto(dictamen.institucion_a_codigo, dictamen.institucion_a)
    const docenteFirmaUrl = carta.docente_url_firma ? getPublicFileUrl(carta.docente_url_firma) : null
    const firmaImg = docenteFirmaUrl
      ? `<img style="position:absolute;bottom:25%;left:50%;width:200pt;max-height:90pt;object-fit:contain;opacity:.95;transform:translateX(-50%);" src="${docenteFirmaUrl}" alt="Firma docente"/>`
      : ''
    const filas = (carta.cursos || []).map(c =>
      `<tr><td class="text-center" style="width:10%;">${htmlWord(c.curso_de_codigo)}</td><td style="width:20%;">${htmlWord(c.curso_de_nombre)}</td><td class="text-center" style="width:5%;">Por</td><td class="text-center" style="width:10%;">${htmlWord(c.curso_a_codigo)}</td><td style="width:20%;">${htmlWord(c.curso_a_nombre)}</td><td class="text-center" style="width:10%;height:24pt;">${docenteFirmaUrl ? '100%' : '&nbsp;'}</td><td class="text-center" style="width:25%;height:24pt;">${docenteFirmaUrl ? 'EQUIVALENTE' : '&nbsp;'}</td></tr>`
    ).join('')
    return `<p class="text-right" style="margin-top:20pt;margin-bottom:55pt;">${htmlWord(sede)}, ${htmlWord(fechaEnLetras(fechaImp))}.</p><p><strong>${htmlWord(dictamen.coordinador_subfijo)} ${htmlWord(dictamen.coordinador_nombre)}</strong><br/>${htmlWord(dictamen.coordinador_cargo)}<br/>División de Ciencias de la Ingeniería<br/>Centro Universitario de Occidente<br/>Edificio</p><p style="margin-top:22pt;"><strong>Estimado Ingeniero:</strong></p><p class="text-justify indent" style="margin-top:14pt;">Por este medio me dirijo a usted para informarle que después de haber revisado el expediente de él (la) estudiante: <strong>${htmlWord(dictamen.estudiante_nombre)}</strong>, CARNÉ NO. <strong>${htmlWord(dictamen.estudiante_carnet)}</strong> Y REGISTRO ACADÉMICO NO. <strong>${htmlWord(dictamen.registro_academico)}</strong>, quien solicita EQUIVALENCIA DE LOS CURSOS APROBADOS en ${htmlWord(dictamen.carrera_de)} Pensum ${htmlWord(pensumDe)} ${htmlWord(instDe)}, para su validez Académica en la Carrera de ${htmlWord(dictamen.carrera_a)} Pensum ${htmlWord(pensumA)} ${htmlWord(instA)}, se dictamina lo siguiente:</p><table class="tabla-word"><thead><tr><th colspan="2">Pensum ${htmlWord(pensumDe)}<br/>${htmlWord(String(dictamen.carrera_de || '').toUpperCase())}<br/>${htmlWord(instDe)}</th><th rowspan="2" style="width:5%;">Por</th><th colspan="2">Pensum ${htmlWord(pensumA)}<br/>${htmlWord(String(dictamen.carrera_a || '').toUpperCase())}<br/>${htmlWord(instA)}</th><th rowspan="2" style="width:10%;">Porcentaje</th><th rowspan="2" style="width:25%;">Opinión</th></tr><tr><th style="width:10%;">Código</th><th style="width:20%;">Nombre del curso</th><th style="width:10%;">Código</th><th style="width:20%;">Nombre del curso</th></tr></thead><tbody>${filas}</tbody></table><p class="indent" style="margin-top:22pt;">Sin otro particular, aprovecho para suscribirme de usted.</p><p style="margin-top:36pt;">Atentamente,</p><div class="firma-docente-word" style="position:relative;margin-top:62pt;">${firmaImg}<strong>${htmlWord(carta.docente_subfijo)} ${htmlWord(carta.docente_nombre)}</strong><br/><strong>Docente</strong></div><div class="footer-word">c.c./copia</div>`
  }

  return (
    <div className="page" style={{ maxWidth: 1500 }}>
      <style>{`
        @page{size:A4;}
        @media print{html,body,#root{width:210mm!important;min-height:297mm!important;margin:0!important;padding:0!important;background:white!important;overflow:visible!important;}body *{visibility:hidden!important;}.print-area,.print-area *{visibility:visible!important;}.print-area{position:fixed!important;left:0!important;top:0!important;width:210mm!important;min-height:297mm!important;margin:0!important;background:white!important;color:black!important;padding:0!important;overflow:visible!important;}.preview-scroll{width:210mm!important;margin:0!important;padding:0!important;background:white!important;border-radius:0!important;overflow:visible!important;}.preview-paper{width:210mm!important;min-height:297mm!important;box-sizing:border-box!important;background:white!important;color:#111!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:13mm 15mm!important;line-height:1.25!important;font-size:12px!important;margin:0!important;font-family:"Times New Roman",serif!important;display:block!important;page-break-inside:auto!important;break-inside:auto!important;}.carta-page{break-after:page!important;page-break-after:always!important;}.carta-page:last-child{break-after:auto!important;page-break-after:auto!important;}.no-print{display:none!important;}}
        .dictamen-card{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;box-shadow:var(--shadow-sm);display:grid;grid-template-columns:160px 1fr auto;gap:16px;align-items:center;cursor:pointer;}
        .dictamen-card:hover{box-shadow:var(--shadow-md);border-color:rgba(29,78,216,.35);}
        .btn-action-view,.btn-action-edit,.btn-action-preview,.btn-action-pdf,.btn-action-word{border:1px solid transparent;box-shadow:0 1px 2px rgba(15,23,42,.06);transition:background .18s ease,border-color .18s ease,color .18s ease,transform .12s ease;}
        .btn-action-view{background:#e0f2fe;border-color:#bae6fd;color:#075985;}.btn-action-view:hover{background:#bae6fd;border-color:#7dd3fc;color:#0c4a6e;}
        .btn-action-edit{background:#fef3c7;border-color:#fde68a;color:#92400e;}.btn-action-edit:hover{background:#fde68a;border-color:#fbbf24;color:#78350f;}
        .btn-action-preview{background:#ede9fe;border-color:#ddd6fe;color:#5b21b6;}.btn-action-preview:hover{background:#ddd6fe;border-color:#c4b5fd;color:#4c1d95;}
        .btn-action-pdf{background:#fee2e2;border-color:#fecaca;color:#991b1b;}.btn-action-pdf:hover{background:#fecaca;border-color:#fca5a5;color:#7f1d1d;}
        .btn-action-word{background:#dbeafe;border-color:#bfdbfe;color:#1e40af;}.btn-action-word:hover{background:#bfdbfe;border-color:#93c5fd;color:#1e3a8a;}
        .btn-action-view:hover,.btn-action-edit:hover,.btn-action-preview:hover,.btn-action-pdf:hover,.btn-action-word:hover{transform:translateY(-1px);}
        .status-badge{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:5px 10px;font-size:.75rem;font-weight:900;border:1px solid transparent;white-space:nowrap;cursor:pointer;transition:opacity .2s;}
        .status-badge:hover{opacity:.8;}
        .status-warning{background:#fef3c7;color:#92400e;border-color:#fde68a;}
        .status-success{background:#dcfce7;color:#166534;border-color:#bbf7d0;}
        .status-danger{background:#fee2e2;color:#991b1b;border-color:#fecaca;}
        .status-info{background:#dbeafe;color:#1e40af;border-color:#bfdbfe;}
        .observaciones-box{border:1px solid #fdba74;background:#fff7ed;color:#9a3412;border-radius:var(--radius-md);padding:14px 16px;}
        .observaciones-box ul{margin:8px 0 0 18px;padding:0;}.observaciones-box li{margin:4px 0;}
        .firma-bloque-documento{position:relative;min-height:74px;padding-top:16px;}.firma-img-documento{position:absolute;top:-24px;left:50%;transform:translateX(-50%);width:125px;max-height:58px;object-fit:contain;opacity:.95;z-index:2;}.sello-img-documento{position:absolute;top:18px;right:10px;width:62px;max-height:62px;object-fit:contain;opacity:.72;z-index:3;pointer-events:none;}.firma-texto-documento{position:relative;z-index:4;line-height:1.18;}
        .firmas-dictamen{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:42px;}.vobo-dictamen{margin-top:28px;display:flex;align-items:flex-start;gap:8px;}.vobo-firma{width:330px;margin-left:40px;text-align:center;}.firma-bloque-coordinador{width:330px;margin:0 auto;}.firma-bloque-director{left:-10%;width:330px;margin-left:58px;text-align:left;}.firma-img-coordinador{top:-42px;left:50%;transform:translateX(-56%);width:200px;max-height:70px;}.firma-img-director{top:-42px;left:50%;transform:translateX(-50%);width:300px;max-height:100px;}.sello-img-coordinador{top:-10px;right:20px;width:88px;max-height:88px;}.sello-img-director{top:-6px;right:12px;width:88px;max-height:88px;}.firma-texto-coordinador{text-align:center;padding-top:8px;}.firma-texto-director{text-align:center;width:260px;position:relative;left:35px;padding-top:8px;}.firmas-dictamen,.vobo-dictamen{break-inside:avoid;page-break-inside:avoid;}
        .preview-scroll{width:100%;overflow:auto;background:var(--surface-soft);padding:18px;border-radius:var(--radius-lg);}
        .preview-paper{width:210mm;height:297mm;overflow:hidden;box-sizing:border-box;padding:13mm 15mm;background:white;color:#111;border:1px solid var(--border);border-radius:4px;font-size:12px;line-height:1.22;margin:0 auto 16px;font-family:"Times New Roman",serif;display:block;}
        .carta-page{break-after:page;page-break-after:always;}.carta-page:last-child{break-after:auto;page-break-after:auto;}
        .documento-top{display:grid;grid-template-columns:230px 1fr;gap:20px;align-items:start;margin-bottom:12px;}.doc-header{width:220px;text-align:center;}.doc-header img{width:205px;height:auto;object-fit:contain;display:block;margin:0 auto 3px;}.doc-header-text{font-size:8.5px;line-height:1.05;font-weight:700;text-align:center;}.documento-codigo{text-align:right;font-size:11px;font-weight:700;padding-top:32px;}
        .preview-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:14px;}.preview-table th,.preview-table td{border:1px solid #444;padding:4px;vertical-align:top;}.preview-table th{text-align:center;font-weight:700;}
        .carta-table{table-layout:fixed;width:100%;}.carta-table th,.carta-table td{word-wrap:break-word;overflow-wrap:anywhere;}
        .firma-docente{text-align:center;margin-top:62px;}.footer-copy{margin-top:auto;padding-top:4mm;font-size:8.8px;}.text-center{text-align:center;}.text-right{text-align:right;}
      `}</style>

      {vista === 'lista' && (
        <>
          <div className="page-header no-print">
            <div>
              <h1 className="page-title">Dictámenes</h1>
              <p className="page-sub">Gestión de dictámenes, cursos equivalentes y cartas por docente.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn-table btn-action-preview" onClick={abrirModalCargaProvs}>Cargar Prov. RYCA</button>
              <button className="btn-add" onClick={openCreate}>+ Nuevo dictamen</button>
            </div>
          </div>

          {error && <div className="alert alert-error no-print" style={{ marginBottom: 16 }}>{error}</div>}
          {mensaje && <div className="alert alert-success no-print" style={{ marginBottom: 16 }}>{mensaje}</div>}

          <div className="table-wrapper no-print" style={{ padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto auto', gap: 12, alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Buscar</label>
                <input className="form-input" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Código, estudiante, carnet..." onKeyDown={e => { if (e.key === 'Enter') cargarDictamenes(1) }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Desde</label>
                <input type="date" className="form-input" value={fechaDesde} disabled={tipoFecha !== 'rango'} onChange={e => setFechaDesde(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Hasta</label>
                <input type="date" className="form-input" value={fechaHasta} disabled={tipoFecha !== 'rango'} onChange={e => setFechaHasta(e.target.value)} />
              </div>
              <button className="btn-table btn-table-secondary" onClick={aplicarFiltroHoy}>Hoy</button>
              <button className="btn-table btn-table-secondary" onClick={aplicarFiltroTodos}>Todos</button>
              <button className="btn-table btn-table-primary" onClick={() => { if (tipoFecha === 'rango') aplicarFiltroRango(); else cargarDictamenes(1) }}>Buscar</button>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {['hoy', 'rango', 'todos'].map(t => (
                <label key={t} style={{ color: 'var(--text-soft)', fontSize: '.85rem' }}>
                  <input type="radio" checked={tipoFecha === t}
                    onChange={() => { if (t === 'hoy') aplicarFiltroHoy(); else if (t === 'todos') aplicarFiltroTodos(); else setTipoFecha('rango') }} />
                  {' '}{t.charAt(0).toUpperCase() + t.slice(1)}
                </label>
              ))}
              <div style={{ marginLeft: 16, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '.8rem', fontWeight: 700 }}>Estado:</span>
                <button className={`btn-table ${filtroEstado === '' ? 'btn-table-primary' : 'btn-table-secondary'}`} style={{ padding: '4px 10px', fontSize: '.78rem' }} onClick={() => aplicarFiltroEstado('')}>Todos</button>
                {ESTADOS_DICTAMEN.map(est => (
                  <button key={est} className={`btn-table ${filtroEstado === est ? 'btn-table-primary' : 'btn-table-secondary'}`} style={{ padding: '4px 10px', fontSize: '.78rem' }} onClick={() => aplicarFiltroEstado(est)}>{est}</button>
                ))}
              </div>
            </div>
          </div>

          <section className="no-print" style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
            {loadingDictamenes && <div className="table-empty">Cargando dictámenes...</div>}
            {!loadingDictamenes && dictamenes.length === 0 && <div className="table-empty">No hay dictámenes para los filtros seleccionados.</div>}
            {dictamenes.map(item => (
              <div key={item.id} className="dictamen-card" role="button" tabIndex={0}
                onClick={() => verDictamen(item)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); verDictamen(item) } }}>
                <div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>DICTAMEN</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)' }}>{formatoCodigoDictamen(item)}</div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`status-badge ${getEstadoClass(item.estado)}`} title="Cambiar estado" onClick={e => abrirModalEstado(item, e)}>
                      {getEstadoDictamen(item.estado)} ✎
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 900, color: 'var(--text)', fontSize: '1rem' }}>{item.estudiante_nombre}</div>
                  <div style={{ color: 'var(--text-soft)', marginTop: 4 }}>
                    Carnet: <strong>{item.estudiante_carnet}</strong> | Registro: <strong>{item.registro_academico}</strong>
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '.82rem' }}>
                    {item.pensum_de_codigo} → {item.pensum_a_codigo} | Expediente: {item.num_expediente || '—'} | Creado: {fechaInput(item.creado_en)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <span className="badge badge-muted">{item.total_cursos || 0} cursos</span>
                  <button className="btn-table btn-action-preview" onClick={e => { e.stopPropagation(); abrirArchivoDictamen(item) }}>Ver archivo</button>
                  <button className="btn-table btn-action-view" onClick={e => { e.stopPropagation(); verDictamen(item) }}>Ver</button>
                  <button className="btn-table btn-action-edit" onClick={e => { e.stopPropagation(); openEdit(item) }}>Editar</button>
                  <button className="btn-table btn-table-danger" onClick={e => { e.stopPropagation(); eliminarDictamen(item) }}>Eliminar</button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Total: {meta.total} | Página {meta.page} de {meta.totalPages || 1}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-table btn-table-secondary" disabled={page <= 1} onClick={() => cargarDictamenes(page - 1)}>Anterior</button>
                <button className="btn-table btn-table-secondary" disabled={page >= meta.totalPages} onClick={() => cargarDictamenes(page + 1)}>Siguiente</button>
              </div>
            </div>
          </section>
        </>
      )}

      {vista === 'detalle' && selected && (
        <DetalleDictamen
          selected={selected} detalleVista={detalleVista}
          verApartadoCursos={verApartadoCursos} verApartadoCartas={verApartadoCartas}
          error={error} mensaje={mensaje} saving={saving}
          codigoCurso={codigoCurso} setCodigoCurso={setCodigoCurso}
          equivalenciasEncontradas={equivalenciasEncontradas}
          getDocentesAsignados={getDocentesAsignados}
          actualizarCurso={actualizarCurso} quitarCurso={quitarCurso} guardarCursos={guardarCursos}
          refrescarCursosDictamen={refrescarCursosDictamen}
          buscarEquivalenciaPorCodigo={buscarEquivalenciaPorCodigo} agregarCursoADictamen={agregarCursoADictamen}
          volverListado={volverListado} openEdit={openEdit}
          setPreviewDictamenOpen={setPreviewDictamenOpen} imprimirDictamen={imprimirDictamen}
          cartasInfo={cartasInfo} mostrarAvisoOmitidos={mostrarAvisoOmitidos}
          abrirPreviewCartas={abrirPreviewCartas} imprimirCartas={imprimirCartas}
          descargarWordDictamen={descargarWordDictamen} descargarWordCartas={descargarWordCartas}
          abrirArchivoDictamen={abrirArchivoDictamen}
          profesiones={profesiones} profesionDocenteForm={profesionDocenteForm}
          setProfesionDocenteForm={setProfesionDocenteForm} actualizarProfesionDocente={actualizarProfesionDocente}
          eliminarDictamen={eliminarDictamen} eliminarArchivoDictamen={eliminarArchivoDictamen}
          guardarObservacionesDictamen={guardarObservacionesDictamen}
          abrirModalEstado={abrirModalEstado}
          abrirModalArchivo={abrirModalArchivo}
        />
      )}

      <Modal open={previewDictamenOpen} onClose={() => setPreviewDictamenOpen(false)} title={`Previsualización del dictamen ${selected?.codigo || ''}`} width={1150}>
        {selected && (<>
          <div className="preview-scroll print-area"><DictamenPreview dictamen={selected} /></div>
          <div className="modal-actions no-print">
            <button type="button" className="btn-table btn-table-secondary" onClick={() => setPreviewDictamenOpen(false)}>Cerrar</button>
            <button type="button" className="btn-table btn-action-pdf" onClick={imprimirDictamen}>PDF</button>
          </div>
        </>)}
      </Modal>

      <Modal open={previewCartasOpen} onClose={() => setPreviewCartasOpen(false)} title="Previsualización de cartas" width={1150}>
        <div className="preview-scroll print-area">
          {cartasParaPreview.length === 0 ? <p>No hay cartas para mostrar.</p> : cartasParaPreview.map(carta => (
            <CartaPreview key={carta.docente_id} dictamen={selected} carta={carta} />
          ))}
        </div>
        <div className="modal-actions no-print">
          <button type="button" className="btn-table btn-table-secondary" onClick={() => setPreviewCartasOpen(false)}>Cerrar</button>
          <button type="button" className="btn-table btn-action-pdf" onClick={() => imprimirCartas(cartaDocenteId)}>PDF</button>
        </div>
      </Modal>

      <Modal open={uploadProvsOpen} onClose={cerrarModalCargaProvs} title="Cargar Prov. RYCA" width={760}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="alert alert-warning" style={{ marginBottom: 0 }}>Seleccione uno o varios archivos PDF. Al finalizar la lectura, se recargará el listado de dictámenes.</div>
          <div className="form-group">
            <label className="form-label">Archivos PDF</label>
            <input type="file" className="form-input" accept="application/pdf,.pdf" multiple onChange={e => setProvsFiles(Array.from(e.target.files || []))} />
          </div>
          {provsFiles.length > 0 && (
            <div className="table-wrapper" style={{ padding: 12, boxShadow: 'none' }}>
              <strong style={{ color: 'var(--text)' }}>Archivos seleccionados:</strong>
              <ul style={{ margin: '8px 0 0 18px', color: 'var(--text-soft)' }}>
                {provsFiles.map(f => <li key={`${f.name}-${f.size}`}>{f.name}</li>)}
              </ul>
            </div>
          )}
          {uploadProvsResult && (
            <div className="table-wrapper" style={{ padding: 12, boxShadow: 'none' }}>
              <strong style={{ color: 'var(--text)' }}>Resultado: {uploadProvsResult.exitosos || 0} creado(s), {uploadProvsResult.fallidos || 0} fallido(s)</strong>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {(uploadProvsResult.data || []).map((item, i) => (
                  <div key={`${item.archivo}-${i}`} className={item.ok ? 'alert alert-success' : 'alert alert-error'} style={{ marginBottom: 0 }}>
                    <strong>{item.archivo}</strong><br />
                    {item.ok ? `Dictamen creado: ${item.dictamen?.codigo || item.dictamen?.id || '—'}` : item.error || 'No se pudo procesar'}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-table btn-table-secondary" onClick={cerrarModalCargaProvs} disabled={uploadingProvs}>Cerrar</button>
            <button type="button" className="btn-table btn-action-preview" onClick={cargarProvs} disabled={uploadingProvs || provsFiles.length === 0}>
              {uploadingProvs ? 'Procesando...' : 'Cargar y leer PDFs'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={archivoPdfOpen} onClose={cerrarArchivoDictamen} title={archivoPdfTitulo || 'Archivo del dictamen'} width={1150}>
        {archivoPdfUrl ? (
          <iframe src={archivoPdfUrl + '#toolbar=1&view=FitH'} title="Archivo PDF" style={{ width: '100%', height: '78vh', border: '1px solid var(--border)', borderRadius: 10 }} />
        ) : <div className="table-empty">No hay archivo para mostrar.</div>}
        <div className="modal-actions">
          <button type="button" className="btn-table btn-table-secondary" onClick={cerrarArchivoDictamen}>Cerrar</button>
          {archivoPdfUrl && <a className="btn-table btn-action-view" href={archivoPdfOriginalUrl || archivoPdfUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Abrir en otra pestaña</a>}
        </div>
      </Modal>

      <Modal open={modalEstadoOpen} onClose={() => setModalEstadoOpen(false)} title="Cambiar estado del dictamen" width={480}>
        <div style={{ display: 'grid', gap: 16 }}>
          <p style={{ color: 'var(--text-soft)', margin: 0, fontSize: '.875rem' }}>
            Dictamen: <strong>{formatoCodigoDictamen(dictamenEstadoTarget)}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Nuevo estado</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ESTADOS_DICTAMEN.map(est => (
                <button key={est} type="button" onClick={() => setNuevoEstadoSeleccionado(est)}
                  className={`status-badge ${getEstadoClass(est)}`}
                  style={{ padding: '10px 14px', fontSize: '.85rem', cursor: 'pointer', fontFamily: 'inherit', outline: nuevoEstadoSeleccionado === est ? '3px solid var(--primary)' : 'none', outlineOffset: 2 }}>
                  {est}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-table btn-table-secondary" onClick={() => setModalEstadoOpen(false)} disabled={saving}>Cancelar</button>
            <button type="button" className="btn-table btn-table-primary" onClick={guardarEstado} disabled={saving || !nuevoEstadoSeleccionado}>
              {saving ? 'Guardando...' : 'Aplicar estado'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modalArchivoOpen} onClose={() => { setModalArchivoOpen(false); setArchivoFile(null) }} title="Subir archivo del dictamen" width={800}>
        <div style={{ display: 'grid', gap: 16 }}>
          <p style={{ color: 'var(--text-soft)', margin: 0, fontSize: '.875rem' }}>
            Dictamen: <strong>{formatoCodigoDictamen(dictamenEstadoTarget)}</strong>
          </p>
          {dictamenEstadoTarget?.url_archivo && (
            <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '.82rem', color: 'var(--text-muted)' }}>
              Archivo actual: <strong>{dictamenEstadoTarget.url_archivo.split('/').pop()}</strong><br />
              Al subir uno nuevo el anterior será reemplazado.
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Nuevo archivo PDF</label>
            <input type="file" className="form-input" accept="application/pdf,.pdf" onChange={e => { setArchivoFile(e.target.files[0] || null); setError('') }} />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-table btn-table-secondary" onClick={() => { setModalArchivoOpen(false); setArchivoFile(null) }} disabled={saving}>Cancelar</button>
            <button type="button" className="btn-table btn-table-primary" onClick={guardarArchivoUrl} disabled={saving || !archivoFile}>
              {saving ? 'Subiendo...' : 'Subir archivo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal crear/editar dictamen */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar dictamen' : 'Nuevo dictamen'} width={900}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <h3 style={{ color: 'var(--text)', marginBottom: 10 }}>Estudiante</h3>
            <div className="form-group">
              <label className="form-label">Buscar por carnet, registro o nombre</label>
              <input className="form-input" value={studentQuery} onChange={e => { setStudentQuery(e.target.value); setForm(prev => ({ ...prev, id_estudiante: '' })) }} placeholder="Ej: 202331672, carnet o nombre..." />
            </div>
            {studentQuery && !crearEstudiante && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 12 }}>
                {estudiantesFiltrados.length === 0 ? (
                  <div style={{ padding: 12, color: 'var(--text-muted)' }}>No se encontraron estudiantes.</div>
                ) : estudiantesFiltrados.map(est => (
                  <button type="button" key={est.id} onClick={() => seleccionarEstudiante(est)}
                    style={{ width: '100%', textAlign: 'left', padding: 10, border: 0, borderBottom: '1px solid var(--border)', background: String(form.id_estudiante) === String(est.id) ? 'rgba(29,78,216,.08)' : 'var(--surface)', cursor: 'pointer' }}>
                    <strong>{est.nombre_completo}</strong><br />
                    <span style={{ color: 'var(--text-muted)' }}>Carnet: {est.carnet} | Registro: {est.registro_academico}</span>
                  </button>
                ))}
              </div>
            )}
            {estudianteSeleccionado && !crearEstudiante && (
              <div className="alert alert-success" style={{ marginBottom: 12 }}>Estudiante seleccionado: {estudianteSeleccionado.nombre_completo}</div>
            )}
            <button type="button" className="btn-table btn-table-secondary" onClick={() => { setCrearEstudiante(p => !p); setForm(p => ({ ...p, id_estudiante: '' })) }}>
              {crearEstudiante ? 'Buscar estudiante existente' : 'Crear nuevo estudiante'}
            </button>
            {crearEstudiante && (
              <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-soft)' }}>
                <div className="form-group">
                  <label className="form-label">Nombre completo</label>
                  <input className="form-input" value={nuevoEstudiante.nombre_completo} onChange={e => setNuevoEstudiante(p => ({ ...p, nombre_completo: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Carnet</label>
                    <input className="form-input" value={nuevoEstudiante.carnet} onChange={e => setNuevoEstudiante(p => ({ ...p, carnet: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registro académico</label>
                    <input className="form-input" value={nuevoEstudiante.registro_academico} onChange={e => setNuevoEstudiante(p => ({ ...p, registro_academico: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <SelectField label="Sede" name="id_sede" value={form.id_sede} onChange={handleFormChange} items={sedes} textKey="nombre" />
            <SelectField label="Carrera equivalencia" name="id_carrera_equivalencia" value={form.id_carrera_equivalencia} onChange={handleFormChange} items={carrerasCunoc} renderText={getCarreraTexto} />
            <SelectField label="Institución origen" name="id_institucion_de" value={form.id_institucion_de} onChange={handleFormChange} items={instituciones} renderText={i => `${i.codigo} - ${i.nombre}`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <h3 style={{ color: 'var(--text)', marginBottom: 12 }}>Origen</h3>
              <SelectField label="Carrera origen" name="id_carrera_de" value={form.id_carrera_de} onChange={handleFormChange} items={carrerasOrigen} renderText={getCarreraTexto} />
              <SelectField label="Pensum origen no vigente" name="id_pensum_de" value={form.id_pensum_de} onChange={handleFormChange} items={pensumsDe} renderText={p => `${p.codigo} - ${p.descripcion}`} />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <h3 style={{ color: 'var(--text)', marginBottom: 12 }}>Destino</h3>
              <SelectField label="Carrera destino" name="id_carrera_a" value={form.id_carrera_a} onChange={handleFormChange} items={carreras} renderText={getCarreraTexto} disabled />
              <SelectField label="Pensum destino vigente" name="id_pensum_a" value={form.id_pensum_a} onChange={handleFormChange} items={pensumsA} renderText={p => `${p.codigo} - ${p.descripcion}`} />
              <SelectField label="Institución destino" name="id_institucion_a" value={form.id_institucion_a} onChange={handleFormChange} items={instituciones} renderText={i => `${i.codigo} - ${i.nombre}`} disabled />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <InputField label="Prov. RYCA" name="prov_ryca" value={form.prov_ryca} onChange={handleFormChange} placeholder="53-02-2026" />
            <InputField label="Fecha Prov. RYCA" name="fecha_prov_ryca" value={form.fecha_prov_ryca} onChange={handleFormChange} type="date" />
            <InputField label="Expediente" name="num_expediente" value={form.num_expediente} onChange={handleFormChange} placeholder="35-2026" />
            {/* Coordinador: muestra todas las autoridades con código que empieza con COO */}
            <SelectField label="Coordinador" name="id_autoridad_coordinador" value={form.id_autoridad_coordinador} onChange={handleFormChange} items={autoridadesCoordinador} renderText={getAutoridadTexto} />
            <SelectField label="Director" name="id_autoridad_director" value={form.id_autoridad_director} onChange={handleFormChange} items={autoridadesDirector} renderText={getAutoridadTexto} />
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-table btn-table-secondary" onClick={closeModal}>Cancelar</button>
            <button type="button" className="btn-table btn-table-primary" onClick={guardarDictamenBase} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Actualizar dictamen' : 'Crear dictamen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DetalleDictamen({
  selected, detalleVista, verApartadoCursos, verApartadoCartas,
  error, mensaje, saving, codigoCurso, setCodigoCurso, equivalenciasEncontradas,
  getDocentesAsignados, actualizarCurso, quitarCurso, guardarCursos, refrescarCursosDictamen,
  buscarEquivalenciaPorCodigo, agregarCursoADictamen, volverListado, openEdit,
  setPreviewDictamenOpen, imprimirDictamen, cartasInfo, mostrarAvisoOmitidos,
  abrirPreviewCartas, imprimirCartas, descargarWordDictamen, descargarWordCartas,
  abrirArchivoDictamen, profesiones, profesionDocenteForm, setProfesionDocenteForm,
  actualizarProfesionDocente, eliminarDictamen, eliminarArchivoDictamen,
  guardarObservacionesDictamen, abrirModalEstado, abrirModalArchivo,
}) {
  const totalCartas = cartasInfo?.cartas?.length || 0
  return (
    <section className="no-print" style={{ display: 'grid', gap: 20 }}>
      <div className="page-header">
        <div>
          <button type="button" className="btn-table btn-table-secondary" onClick={volverListado} style={{ marginBottom: 12 }}>← Volver al listado</button>
          <h1 className="page-title">Dictamen {selected.codigo}</h1>
          <p className="page-sub">{selected.estudiante_nombre} | Carnet {selected.estudiante_carnet} | Registro {selected.registro_academico}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn-table btn-action-edit" onClick={() => openEdit(selected)}>Editar Dictamen</button>
          <button className="btn-table btn-action-word" onClick={e => abrirModalArchivo(selected, e)}>Editar archivo</button>
          {selected.url_archivo && (<>
            <button className="btn-table btn-action-view" onClick={() => abrirArchivoDictamen(selected)}>Ver Archivo</button>
            <button className="btn-table btn-table-danger" onClick={eliminarArchivoDictamen}>Eliminar Archivo</button>
          </>)}
          <button className="btn-table btn-action-preview" onClick={() => setPreviewDictamenOpen(true)}>Previsualizar Dictamen</button>
          <button className="btn-table btn-action-pdf" onClick={imprimirDictamen}>PDF Dictamen</button>
          <button className="btn-table btn-action-word" onClick={descargarWordDictamen}>Word Dictamen</button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 0 }}>{error}</div>}
      {mensaje && <div className="alert alert-success" style={{ marginBottom: 0 }}>{mensaje}</div>}

      <div className="table-wrapper" style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <div className="badge badge-muted">Prov. RYCA: {selected.prov_ryca}</div>
          <div className="badge badge-muted">Expediente: {selected.num_expediente || '—'}</div>
          <div className="badge badge-muted">Origen: {selected.pensum_de_codigo}</div>
          <div className="badge badge-muted">Destino: {selected.pensum_a_codigo}</div>
          <span className={`status-badge ${getEstadoClass(selected.estado)}`} title="Cambiar estado" onClick={e => abrirModalEstado(selected, e)}>
            Estado: {getEstadoDictamen(selected.estado)} ✎
          </span>
        </div>
      </div>

      <ObservacionesDictamen observaciones={selected.observaciones} saving={saving} onGuardar={guardarObservacionesDictamen} />

      <div className="table-wrapper" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: 'var(--text)', margin: 0 }}>Vista del dictamen</h3>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '.86rem' }}>Puede alternar entre cursos/equivalencias y cartas.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className={`btn-table ${detalleVista === 'cursos' ? 'btn-action-view' : 'btn-table-secondary'}`} onClick={verApartadoCursos}>Ver cursos y equivalencias</button>
            <button type="button" className={`btn-table ${detalleVista === 'cartas' ? 'btn-action-view' : 'btn-table-secondary'}`} onClick={verApartadoCartas}>Ver cartas de docentes {totalCartas ? `(${totalCartas})` : ''}</button>
          </div>
        </div>
      </div>

      {detalleVista === 'cursos' && (<>
        <div className="table-wrapper" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) auto', gap: 12, alignItems: 'end' }}>
            <div>
              <h3 style={{ color: 'var(--text)', marginTop: 0, marginBottom: 8 }}>Agregar curso por equivalencia</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', margin: '0 0 10px' }}>Ingrese el código del curso del pensum origen.</p>
              <input className="form-input" value={codigoCurso} onChange={e => setCodigoCurso(e.target.value)}
                placeholder="Ej: 2795" onKeyDown={e => { if (e.key === 'Enter') buscarEquivalenciaPorCodigo() }} />
            </div>
            <button className="btn-add" onClick={buscarEquivalenciaPorCodigo}>Buscar equivalencia</button>
          </div>
          {equivalenciasEncontradas.length > 1 && (
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              <p style={{ color: 'var(--text-soft)', margin: 0 }}>Se encontraron varias equivalencias. Seleccione una:</p>
              {equivalenciasEncontradas.map(eq => (
                <button key={`${eq.id_curso_de}-${eq.id_curso_a}`} className="btn-table btn-table-secondary"
                  onClick={() => agregarCursoADictamen(eq)} style={{ textAlign: 'left', whiteSpace: 'normal', lineHeight: 1.35 }}>
                  {eq.curso_de_codigo} - {eq.curso_de_nombre} → {eq.curso_a_codigo} - {eq.curso_a_nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="table-wrapper" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <h3 style={{ color: 'var(--text)', margin: 0 }}>Cursos del dictamen</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn-table btn-table-secondary" onClick={refrescarCursosDictamen} disabled={saving}>Refrescar cursos</button>
              <button className="btn-table btn-table-primary" onClick={guardarCursos} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cursos'}</button>
            </div>
          </div>
          <div className="table-wrapper" style={{ boxShadow: 'none', overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>No.</th><th>Curso de</th><th>Curso a</th><th>Porcentaje</th><th>Opinión</th><th>Docente asignado</th><th>Carta</th><th></th></tr></thead>
              <tbody>
                {(selected.cursos || []).length === 0 ? (
                  <tr><td colSpan="8">No hay cursos agregados.</td></tr>
                ) : selected.cursos.map((curso, i) => {
                  const asignados = getDocentesAsignados(curso.curso_a_codigo)
                  return (
                    <tr key={`${curso.id_curso_de}-${curso.id_curso_a}-${i}`}>
                      <td>{i + 1}</td>
                      <td><strong>{curso.curso_de_codigo}</strong><br />{curso.curso_de_nombre}</td>
                      <td><strong>{curso.curso_a_codigo}</strong><br />{curso.curso_a_nombre}</td>
                      <td><input className="form-input" type="number" min="0" max="100" step="1" value={formatPorcentaje(curso.porcentaje)} onChange={e => actualizarCurso(i, 'porcentaje', e.target.value)} /></td>
                      <td><input className="form-input" value={curso.opinion || 'EQUIVALENTE'} onChange={e => actualizarCurso(i, 'opinion', e.target.value)} /></td>
                      <td>{asignados.length === 0 ? <span className="badge badge-muted">Sin docente activo</span> : (
                        <select className="form-input" value={curso.id_docente_encargado_curso || ''} onChange={e => actualizarCurso(i, 'id_docente_encargado_curso', e.target.value)}>
                          <option value="">Seleccionar...</option>
                          {asignados.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                      )}</td>
                      <td>{Number(curso.omite_carta) === 1 ? <span className="badge badge-muted">Omitida</span> : <span className="badge badge-success">Imprimible</span>}</td>
                      <td><button className="btn-table btn-table-danger" onClick={() => quitarCurso(i)}>Quitar</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {detalleVista === 'cartas' && (
        <div className="table-wrapper" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ color: 'var(--text)', margin: 0 }}>Cartas de docentes</h3>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '.86rem' }}>Revise las cartas agrupadas por docente.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-table btn-table-secondary" onClick={verApartadoCursos}>Volver a cursos</button>
              <button className="btn-table btn-action-preview" onClick={() => abrirPreviewCartas()}>Previsualizar cartas</button>
              <button className="btn-table btn-action-pdf" onClick={() => imprimirCartas()}>PDF todas</button>
              <button className="btn-table btn-action-word" onClick={() => descargarWordCartas()}>Word cartas</button>
            </div>
          </div>
          {!cartasInfo && <p style={{ color: 'var(--text-muted)' }}>Cargando cartas de docentes...</p>}
          {cartasInfo && (cartasInfo.cartas || []).length === 0 && <div className="table-empty">No hay cartas para mostrar.</div>}
          {cartasInfo && (cartasInfo.cartas || []).length > 0 && (
            <div style={{ display: 'grid', gap: 12 }}>
              {(cartasInfo.cartas || []).map(carta => (
                <div key={carta.docente_id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, background: 'var(--surface-soft)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) minmax(240px,340px) auto', gap: 12, alignItems: 'end' }}>
                    <div>
                      <strong style={{ color: 'var(--text)' }}>{carta.docente_subfijo} {carta.docente_nombre}</strong>
                      <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{carta.cursos.length} curso(s)</div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Prefijo/profesión</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                        <select className="form-input" value={profesionDocenteForm[carta.docente_id] || ''} onChange={e => setProfesionDocenteForm(p => ({ ...p, [carta.docente_id]: e.target.value }))}>
                          <option value="">Seleccionar...</option>
                          {profesiones.map(p => <option key={p.id} value={p.id}>{p.subfijo} - {p.nombre || p.descripcion}</option>)}
                        </select>
                        <button type="button" className="btn-table btn-action-edit" onClick={() => actualizarProfesionDocente(carta.docente_id)}>Actualizar</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button className="btn-table btn-action-preview" onClick={() => abrirPreviewCartas(carta.docente_id)}>Previsualizar</button>
                      <button className="btn-table btn-action-pdf" onClick={() => imprimirCartas(carta.docente_id)}>PDF</button>
                      <button className="btn-table btn-action-word" onClick={() => descargarWordCartas(carta.docente_id)}>Word</button>
                    </div>
                  </div>
                  <ul style={{ color: 'var(--text-soft)' }}>
                    {carta.cursos.map(c => <li key={`${c.id_curso_de}-${c.id_curso_a}`}>{c.curso_de_codigo} - {c.curso_de_nombre} → {c.curso_a_codigo} - {c.curso_a_nombre}</li>)}
                  </ul>
                </div>
              ))}
              {mostrarAvisoOmitidos && (cartasInfo.omitidos || []).length > 0 && (
                <div className="alert alert-warning" style={{ marginTop: 12 }}>
                  <strong>Advertencia:</strong> Hay {cartasInfo.omitidos.length} curso(s) omitidos por configuración de semestre.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function ObservacionesDictamen({ observaciones, saving = false, onGuardar }) {
  const [mostrar, setMostrar] = useState(false)
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(observaciones || '')
  useEffect(() => { setTexto(observaciones || ''); setEditando(false) }, [observaciones])
  const items = dividirObservaciones(observaciones)
  const guardar = async () => { if (typeof onGuardar !== 'function') return; await onGuardar(texto); setEditando(false); setMostrar(true) }
  return (
    <div className="table-wrapper" style={{ padding: 16 }}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontWeight: 800, cursor: 'pointer' }}>
        <input type="checkbox" checked={mostrar} onChange={e => setMostrar(e.target.checked)} />
        Ver observaciones
      </label>
      {mostrar && (
        <div style={{ marginTop: 12 }}>
          {!editando ? (<>
            {items.length === 0 ? <div className="table-empty" style={{ padding: 14 }}>No hay observaciones registradas.</div> : (
              <div className="observaciones-box">
                <strong>Observaciones del dictamen</strong>
                <ul>{items.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}</ul>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="btn-table btn-action-edit" onClick={() => { setTexto(observaciones || ''); setEditando(true) }}>Editar observaciones</button>
            </div>
          </>) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Observaciones</label>
                <textarea className="form-input" rows={7} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Observaciones separadas por coma..." />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button type="button" className="btn-table btn-table-secondary" onClick={() => { setTexto(observaciones || ''); setEditando(false) }} disabled={saving}>Cancelar</button>
                <button type="button" className="btn-table btn-table-danger" onClick={() => setTexto('')} disabled={saving}>Limpiar</button>
                <button type="button" className="btn-table btn-table-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar observaciones'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SelectField({ label, name, value, onChange, items, textKey, renderText, disabled = false }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-input" name={name} value={value} onChange={onChange} disabled={disabled}>
        <option value="">Seleccionar...</option>
        {items.map(item => <option key={item.id} value={item.id}>{renderText ? renderText(item) : item[textKey]}</option>)}
      </select>
    </div>
  )
}

function InputField({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input type={type} className="form-input" name={name} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

function HeaderDocumento() {
  return (
    <div className="doc-header">
      <img src="/assets/usac-logo.png" alt="USAC" />
      <div className="doc-header-text">División Ciencias de la Ingeniería<br />Centro Universitario de Occidente<br />Quetzaltenango<br />Telefax: 78730000 Ext. 2255</div>
    </div>
  )
}

function DictamenPreview({ dictamen }) {
  const cursos = dictamen.cursos || []
  const fechaImp = dictamen.fecha_impresion || today()
  const sede = dictamen.sede_nombre || 'Quetzaltenango'
  const totalTexto = totalCursosTexto(cursos.length)
  const subfijo = dictamen.carrera_equivalencia_subfijo || dictamen.carrera_a_subfijo || 'Carrera'
  const cFirma = getPublicFileUrl(dictamen.coordinador_url_firma)
  const cSello = getPublicFileUrl(dictamen.coordinador_url_sello)
  const dFirma = getPublicFileUrl(dictamen.director_url_firma)
  const dSello = getPublicFileUrl(dictamen.director_url_sello)
  const pensumDe = dictamen.pensum_de_anio || dictamen.pensum_de_codigo
  const pensumA = dictamen.pensum_a_anio || dictamen.pensum_a_codigo
  const instDe = getInstitucionTexto(dictamen.institucion_de_codigo, dictamen.institucion_de)
  const instA = getInstitucionTexto(dictamen.institucion_a_codigo, dictamen.institucion_a)

  const cursosPag1 = cursos.slice(0, CURSOS_HOJA1_DICTAMEN)
  const cursosResto = cursos.slice(CURSOS_HOJA1_DICTAMEN)
  const paginasExtra = []
  for (let i = 0; i < cursosResto.length; i += CURSOS_HOJA_EXTRA_DICTAMEN) paginasExtra.push(cursosResto.slice(i, i + CURSOS_HOJA_EXTRA_DICTAMEN))
  const hayPaginasExtra = paginasExtra.length > 0

  const TablaCabecera = () => (
    <thead>
      <tr>
        <th rowSpan="2" style={{ width: '5%' }}>No.</th>
        <th colSpan="3">Pensum {pensumDe}<br />{String(dictamen.carrera_de || '').toUpperCase()}<br />{instDe}</th>
        <th colSpan="2">Pensum {pensumA}<br />{String(dictamen.carrera_a || '').toUpperCase()}<br />{instA}</th>
        <th rowSpan="2" style={{ fontSize: '12px' }}>Porcentaje</th>
        <th rowSpan="2" style={{ width: '10%' }}>Opinión</th>
      </tr>
      <tr>
        <th style={{ width: '8%' }}>Código</th>
        <th>Nombre del curso</th>
        <th style={{ width: '4%' }}>Por</th>
        <th style={{ width: '8%' }}>Código</th>
        <th>Nombre del curso</th>
      </tr>
    </thead>
  )

  const FilasCursos = ({ lista, offset = 0 }) => (
    <>{lista.map((c, i) => (
      <tr key={`${c.id_curso_de}-${c.id_curso_a}-${offset + i}`}>
        <td className="text-center">{offset + i + 1}</td>
        <td className="text-center">{c.curso_de_codigo}</td>
        <td style={{ fontSize: '12px' }}>{c.curso_de_nombre}</td>
        <td className="text-center">Por</td>
        <td className="text-center">{c.curso_a_codigo}</td>
        <td style={{ fontSize: '12px' }}>{c.curso_a_nombre}</td>
        <td className="text-center">{formatPorcentaje(c.porcentaje)}%</td>
        <td className="text-center" style={{ fontSize: '12px' }}>{c.opinion || 'EQUIVALENTE'}</td>
      </tr>
    ))}</>
  )

  const BloqueFiremas = () => (
    <>
      <p style={{ marginTop: 8 }}>Sin otro particular, me es grato suscribirme, atentamente,</p>
      <p className="text-center" style={{ marginTop: 10 }}><strong>"ID Y ENSEÑAD A TODOS"</strong></p>
      <div className="firmas-dictamen">
        <div />
        <div className="firma-bloque-documento firma-bloque-coordinador text-center">
          {cFirma && <img className="firma-img-documento firma-img-coordinador" src={cFirma} alt="Firma coordinador" onError={e => { e.currentTarget.style.display = 'none' }} />}
          {cSello && <img className="sello-img-documento sello-img-coordinador" src={cSello} alt="Sello coordinador" onError={e => { e.currentTarget.style.display = 'none' }} />}
          <div className="firma-texto-documento firma-texto-coordinador">
            <strong>{dictamen.coordinador_subfijo} {dictamen.coordinador_nombre}</strong><br />
            <strong>{dictamen.coordinador_cargo}</strong>
          </div>
        </div>
      </div>
      <div className="vobo-dictamen">
        <strong>Vo. Bo.:</strong>
        <div className="firma-bloque-documento vobo-firma">
          {dFirma && <img className="firma-img-documento firma-img-director" src={dFirma} alt="Firma director" onError={e => { e.currentTarget.style.display = 'none' }} />}
          {dSello && <img className="sello-img-documento sello-img-director" src={dSello} alt="Sello director" onError={e => { e.currentTarget.style.display = 'none' }} />}
          <div className="firma-texto-documento firma-texto-director">
            <strong>{dictamen.director_subfijo} {dictamen.director_nombre}</strong><br />
            <strong>{dictamen.director_cargo}</strong>
          </div>
        </div>
      </div>
      <div className="footer-copy">cc. Archivo<br />EAPA/JFRS/agg<br />Exp. No. {dictamen.num_expediente || '—'}</div>
    </>
  )

  return (
    <>
      <div className="preview-paper">
        <div className="documento-top">
          <HeaderDocumento />
          <div className="documento-codigo">Dic. Equiv. {subfijo} No. {dictamen.codigo}<br />{sede}, {fechaEnLetras(fechaImp)}</div>
        </div>
        <p><strong>Señores:</strong><br /><strong>Comisión Académica</strong><br /><strong>Centro Universitario de Occidente</strong><br /><strong>Edificio.</strong></p>
        <p style={{ marginTop: 4 }}><strong>Estimados Señores:</strong></p>
        <p style={{ textAlign: 'justify', textIndent: '1cm', marginTop: 4, fontSize: '12px' }}>
          En atención a la Prov. RYCA <strong>{dictamen.prov_ryca}</strong> de fecha <strong>{fechaEnLetras(dictamen.fecha_prov_ryca)}</strong>, envío el expediente de él (la) Estudiante: <strong>{dictamen.estudiante_nombre}</strong>, Carné No. <strong>{dictamen.estudiante_carnet}</strong>, y Registro Académico No. <strong>{dictamen.registro_academico}</strong> quien solicita <strong>EQUIVALENCIA DE LOS CURSOS APROBADOS</strong> en {dictamen.carrera_de} Pensum {pensumDe} {instDe}, para su validez Académica en la Carrera de {dictamen.carrera_a} Pensum {pensumA} {instA}, emitiéndose <strong>DICTAMEN FAVORABLE</strong> a lo solicitado por el estudiante mencionado, determinando como equivalencia {totalTexto} que a continuación se detallan:
        </p>
        <table className="preview-table">
          <TablaCabecera />
          <tbody><FilasCursos lista={cursosPag1} offset={0} /></tbody>
        </table>
        {!hayPaginasExtra && <BloqueFiremas />}
      </div>
      {paginasExtra.map((grupo, pageIdx) => {
        const esUltima = pageIdx === paginasExtra.length - 1
        const offsetFila = CURSOS_HOJA1_DICTAMEN + pageIdx * CURSOS_HOJA_EXTRA_DICTAMEN
        return (
          <div key={`extra-${pageIdx}`} className="preview-paper">
            <table className="preview-table">
              <TablaCabecera />
              <tbody><FilasCursos lista={grupo} offset={offsetFila} /></tbody>
            </table>
            {esUltima && <BloqueFiremas />}
          </div>
        )
      })}
    </>
  )
}

function CartaPreview({ dictamen, carta }) {
  const fechaImp = dictamen.fecha_impresion || today()
  const sede = dictamen.sede_nombre || 'Quetzaltenango'
  const pensumDe = dictamen.pensum_de_anio || dictamen.pensum_de_codigo
  const pensumA = dictamen.pensum_a_anio || dictamen.pensum_a_codigo
  const instDe = getInstitucionTexto(dictamen.institucion_de_codigo, dictamen.institucion_de)
  const instA = getInstitucionTexto(dictamen.institucion_a_codigo, dictamen.institucion_a)
  const cursos = carta.cursos || []

  const cursosPag1 = cursos.slice(0, CURSOS_HOJA1_CARTA)
  const cursosResto = cursos.slice(CURSOS_HOJA1_CARTA)
  const paginasExtra = []
  for (let i = 0; i < cursosResto.length; i += CURSOS_HOJA_EXTRA_CARTA) paginasExtra.push(cursosResto.slice(i, i + CURSOS_HOJA_EXTRA_CARTA))
  const hayPaginasExtra = paginasExtra.length > 0

  const TablaCabeceraCarta = () => (
    <thead>
      <tr>
        <th colSpan="2">Pensum {pensumDe}<br />{String(dictamen.carrera_de || '').toUpperCase()}<br />{instDe}</th>
        <th rowSpan="2" style={{ width: '5%' }}>Por</th>
        <th colSpan="2">Pensum {pensumA}<br />{String(dictamen.carrera_a || '').toUpperCase()}<br />{instA}</th>
        <th rowSpan="2" style={{ width: '10%' }}>Porcentaje</th>
        <th rowSpan="2" style={{ width: '25%' }}>Opinión</th>
      </tr>
      <tr>
        <th style={{ width: '10%' }}>Código</th>
        <th style={{ width: '20%' }}>Nombre del curso</th>
        <th style={{ width: '10%' }}>Código</th>
        <th style={{ width: '20%' }}>Nombre del curso</th>
      </tr>
    </thead>
  )

  // Si el docente tiene url_firma, se muestra la imagen, el porcentaje y la opinión
  const docenteFirmaUrl = carta.docente_url_firma ? getPublicFileUrl(carta.docente_url_firma) : null

  const FilasCarta = ({ lista }) => (
    <>{lista.map(c => (
      <tr key={`${c.id_curso_de}-${c.id_curso_a}`}>
        <td className="text-center">{c.curso_de_codigo}</td>
        <td style={{ fontSize: '12px' }}>{c.curso_de_nombre}</td>
        <td className="text-center">Por</td>
        <td className="text-center">{c.curso_a_codigo}</td>
        <td style={{ fontSize: '12px' }}>{c.curso_a_nombre}</td>
        <td className="text-center" style={{ height: 24 }}>{docenteFirmaUrl ? '100%' : ''}</td>
        <td className="text-center" style={{ height: 24 }}>{docenteFirmaUrl ? 'EQUIVALENTE' : ''}</td>
      </tr>
    ))}</>
  )

  const BloqueFirmaDocente = () => (
    <>
      <p style={{ marginTop: 10, textIndent: '1cm' }}>Sin otro particular, aprovecho para suscribirme de usted.</p>
      <p style={{ marginTop: 18 }}>Atentamente,</p>
      <div className="firma-docente" style={{ position: 'relative', marginTop: 62 }}>
        {docenteFirmaUrl && (
          <img
            src={docenteFirmaUrl}
            alt="Firma docente"
            style={{
              position: 'absolute',
              bottom: '25%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 200,
              maxHeight: 100,
              objectFit: 'contain',
              opacity: 0.95,
            }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <strong>{carta.docente_subfijo} {carta.docente_nombre}</strong><br />
        <strong>Docente</strong>
      </div>
      <div className="footer-copy">c.c./copia</div>
    </>
  )

  return (
    <>
      <div className="preview-paper">
        <p className="text-right" style={{ marginBottom: 36 }}>{sede}, {fechaEnLetras(fechaImp)}.</p>
        <p>
          <strong>{dictamen.coordinador_subfijo} {dictamen.coordinador_nombre}</strong><br />
          {dictamen.coordinador_cargo}<br />
          División de Ciencias de la Ingeniería<br />
          Centro Universitario de Occidente<br />
          Edificio
        </p>
        <p style={{ marginTop: 10 }}><strong>Estimado Ingeniero:</strong></p>
        <p style={{ textAlign: 'justify', textIndent: '1cm', marginTop: 6, fontSize: '12px' }}>
          Por este medio me dirijo a usted para informarle que después de haber revisado el expediente de él (la) estudiante: <strong>{dictamen.estudiante_nombre}</strong>, CARNÉ NO. <strong>{dictamen.estudiante_carnet}</strong> Y REGISTRO ACADÉMICO NO. <strong>{dictamen.registro_academico}</strong>, quien solicita EQUIVALENCIA DE LOS CURSOS APROBADOS en {dictamen.carrera_de} Pensum {pensumDe} {instDe}, para su validez Académica en la Carrera de {dictamen.carrera_a} Pensum {pensumA} {instA}, se dictamina lo siguiente:
        </p>
        <table className="preview-table carta-table">
          <colgroup>
            <col style={{ width: '8%' }} /><col style={{ width: '27%' }} /><col style={{ width: '5%' }} />
            <col style={{ width: '8%' }} /><col style={{ width: '27%' }} /><col style={{ width: '12%' }} /><col style={{ width: '23%' }} />
          </colgroup>
          <TablaCabeceraCarta />
          <tbody><FilasCarta lista={cursosPag1} /></tbody>
        </table>
        {!hayPaginasExtra && <BloqueFirmaDocente />}
      </div>
      {paginasExtra.map((grupo, pageIdx) => {
        const esUltima = pageIdx === paginasExtra.length - 1
        return (
          <div key={`carta-extra-${pageIdx}`} className="preview-paper">
            <table className="preview-table carta-table">
              <colgroup>
                <col style={{ width: '8%' }} /><col style={{ width: '27%' }} /><col style={{ width: '5%' }} />
                <col style={{ width: '8%' }} /><col style={{ width: '27%' }} /><col style={{ width: '12%' }} /><col style={{ width: '23%' }} />
              </colgroup>
              <TablaCabeceraCarta />
              <tbody><FilasCarta lista={grupo} /></tbody>
            </table>
            {esUltima && <BloqueFirmaDocente />}
          </div>
        )
      })}
    </>
  )
}