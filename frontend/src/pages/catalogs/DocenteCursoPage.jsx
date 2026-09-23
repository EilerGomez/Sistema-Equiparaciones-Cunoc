import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import {
  carrerasApi,
  pensumApi,
  ciclosApi,
  cursosApi,
  docentesApi,
  docenteCursoApi,
} from '../../api/catalogs'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'

const normalizarRespuesta = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

const normalizarTexto = (texto) => {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const normalizarBusqueda = (texto) => {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const docenteCursoService = {
  ...docenteCursoApi,
  update: docenteCursoApi.update || ((body) => api.put('/catalogs/docente-curso', body).then(r => r.data)),
  updateActivo: docenteCursoApi.updateActivo || ((body) => api.patch('/catalogs/docente-curso/activo', body).then(r => r.data)),
  updateActivoByCiclo: docenteCursoApi.updateActivoByCiclo || ((idCiclo, body) => api.patch(`/catalogs/docente-curso/ciclo/${idCiclo}/activo`, body).then(r => r.data)),
  removeByCiclo: docenteCursoApi.removeByCiclo || ((idCiclo) => api.delete(`/catalogs/docente-curso/ciclo/${idCiclo}`).then(r => r.data)),
}

const initialForm = {
  id_curso: '',
  id_docente: '',
  id_ciclo: '',
  activo: 1,
}

const initialFilters = {
  q: '',
  carrera: '',
  pensum: '',
  semestre: '',
  curso: '',
  docente: '',
  ciclo: '',
  estado: '',
}

const getCursoCodigo = (row) => String(row.curso_codigo ?? row.codigo_curso ?? row.codigo ?? row.id_curso ?? '').trim()
const getCursoNombre = (row) => String(row.curso_nombre ?? row.nombre_curso ?? row.nombre ?? '').trim()
const getPensumCodigo = (row) => String(row.pensum_codigo ?? row.codigo_pensum ?? row.id_pensum ?? '').trim()
const getPensumDescripcion = (row) => String(row.pensum_descripcion ?? row.pensum_desc ?? row.descripcion_pensum ?? '').trim()
const getCarreraSubfijo = (row) => String(row.carrera_subfijo ?? row.subfijo_carrera ?? row.carrera ?? row.carrera_desc ?? '').trim()
const getSemestre = (row) => String(row.curso_semestre ?? row.semestre ?? '').trim()
const getDocenteId = (row) => String(row.id_docente ?? row.docente_id ?? '').trim()
const getDocenteNombre = (row) => String(row.docente_nombre ?? row.nombre_docente ?? row.nombre ?? '').trim()
const getCicloId = (row) => String(row.id_ciclo ?? row.ciclo_id ?? '').trim()
const getCicloCodigo = (row) => String(row.ciclo_codigo ?? row.codigo_ciclo ?? '').trim()
const getCicloAnio = (row) => String(row.ciclo_anio ?? row.anio_ciclo ?? row.anio ?? '').trim()
const getActivo = (row) => Number(row.activo ?? 0)

const uniqueSorted = (values) => {
  return Array.from(new Set(values.filter(v => String(v || '').trim() !== '')))
    .sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }))
}

const normalizarAsignacion = (row) => {
  const cursoCodigo = getCursoCodigo(row)
  const cursoNombre = getCursoNombre(row)
  const pensumCodigo = getPensumCodigo(row)
  const pensumDescripcion = getPensumDescripcion(row)
  const carreraSubfijo = getCarreraSubfijo(row)
  const semestre = getSemestre(row)
  const docenteId = getDocenteId(row)
  const docenteNombre = getDocenteNombre(row)
  const cicloId = getCicloId(row)
  const cicloCodigo = getCicloCodigo(row)
  const cicloAnio = getCicloAnio(row)
  const activo = getActivo(row)

  return {
    ...row,
    curso_codigo: cursoCodigo,
    curso_nombre: cursoNombre,
    pensum_codigo: pensumCodigo,
    pensum_descripcion: pensumDescripcion,
    carrera_subfijo: carreraSubfijo,
    curso_semestre: semestre,
    id_docente: docenteId,
    docente_nombre: docenteNombre,
    id_ciclo: cicloId,
    ciclo_codigo: cicloCodigo,
    ciclo_anio: cicloAnio,
    activo,
    ciclo_texto: [cicloCodigo, cicloAnio].filter(Boolean).join(' '),
  }
}

const agruparPorCursoDocente = (rows) => {
  const grupos = new Map()

  rows.forEach(row => {
    const key = [
      row.id_curso || row.curso_codigo,
      row.id_docente,
      row.id_ciclo,
      row.activo,
    ].join('|')

    if (!grupos.has(key)) {
      grupos.set(key, {
        ...row,
        __agrupado: true,
        __rows: [],
      })
    }

    grupos.get(key).__rows.push(row)
  })

  return Array.from(grupos.values()).map(group => {
    const rowsGrupo = group.__rows || []
    const pensums = uniqueSorted(rowsGrupo.map(r => r.pensum_codigo))
    const descripciones = uniqueSorted(rowsGrupo.map(r => r.pensum_descripcion))
    const carreras = uniqueSorted(rowsGrupo.map(r => r.carrera_subfijo))
    const semestres = uniqueSorted(rowsGrupo.map(r => r.curso_semestre))

    return {
      ...group,
      pensum_codigo: pensums.join(', '),
      pensum_descripcion: pensums.length > 1
        ? `Registrado en ${pensums.length} pensums`
        : (descripciones[0] || group.pensum_descripcion),
      carrera_subfijo: carreras.join(', '),
      curso_semestre: semestres.join(', '),
      pensum_codigos: pensums,
    }
  })
}

export default function DocenteCursoPage() {
  const { user } = useAuth()
  const canWrite = ['admin', 'coordinador'].includes(user?.rol)

  const [items, setItems] = useState([])
  const [carreras, setCarreras] = useState([])
  const [pensums, setPensums] = useState([])
  const [cursos, setCursos] = useState([])
  const [docentes, setDocentes] = useState([])
  const [ciclos, setCiclos] = useState([])

  const [filters, setFilters] = useState(initialFilters)
  const [bulkCiclo, setBulkCiclo] = useState('')
  const [mostrarAccionesConjunto, setMostrarAccionesConjunto] = useState(false)
  const [bulkActivo, setBulkActivo] = useState('1')
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [toDelete, setToDelete] = useState(null)
  const [cursoModalQuery, setCursoModalQuery] = useState('')
  const [docenteModalQuery, setDocenteModalQuery] = useState('')

  useEffect(() => {
    cargarTodo()
  }, [])

  useEffect(() => {
    if (filters.ciclo) {
      setBulkCiclo(filters.ciclo)
    }
  }, [filters.ciclo])

  const cargarTodo = async () => {
    try {
      setLoading(true)
      setError('')

      const [
        asignacionesData,
        carrerasData,
        pensumsData,
        cursosData,
        docentesData,
        ciclosData,
      ] = await Promise.all([
        docenteCursoService.getAll(),
        carrerasApi.getAll(),
        pensumApi.getAll(),
        cursosApi.getAll(),
        docentesApi.getAll(),
        ciclosApi.getAll(),
      ])

      setItems(normalizarRespuesta(asignacionesData).map(normalizarAsignacion))
      setCarreras(normalizarRespuesta(carrerasData))
      setPensums(normalizarRespuesta(pensumsData))
      setCursos(normalizarRespuesta(cursosData))
      setDocentes(normalizarRespuesta(docentesData))
      setCiclos(normalizarRespuesta(ciclosData))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar asignaciones')
    } finally {
      setLoading(false)
    }
  }

  const cursosUnicos = useMemo(() => {
    const map = new Map()

    const agregarCurso = (row) => {
      const codigo = getCursoCodigo(row)
      if (!codigo) return

      const nombre = getCursoNombre(row)
      const pensum = getPensumCodigo(row)
      const carrera = getCarreraSubfijo(row)
      const semestre = getSemestre(row)

      if (!map.has(codigo)) {
        map.set(codigo, {
          codigo,
          nombre,
          pensums: [],
          carreras: [],
          semestres: [],
        })
      }

      const item = map.get(codigo)
      if (nombre && !item.nombre) item.nombre = nombre
      if (pensum) item.pensums.push(pensum)
      if (carrera) item.carreras.push(carrera)
      if (semestre) item.semestres.push(semestre)
    }

    items.forEach(agregarCurso)
    cursos.forEach(agregarCurso)

    return Array.from(map.values()).map(curso => ({
      ...curso,
      pensums: uniqueSorted(curso.pensums),
      carreras: uniqueSorted(curso.carreras),
      semestres: uniqueSorted(curso.semestres),
      pensum_codigo_texto: uniqueSorted(curso.pensums).join(', '),
      carrera_subfijo: uniqueSorted(curso.carreras).join(', '),
      curso_semestre: uniqueSorted(curso.semestres).join(', '),
    })).sort((a, b) => {
      const aa = `${a.nombre} ${a.codigo}`
      const bb = `${b.nombre} ${b.codigo}`
      return aa.localeCompare(bb, 'es', { numeric: true })
    })
  }, [items, cursos])

  const carreraOptions = useMemo(() => {
    const set = new Set()

    items.forEach(item => {
      if (item.carrera_subfijo) set.add(item.carrera_subfijo)
    })

    carreras.forEach(carrera => {
      if (carrera.subfijo) set.add(carrera.subfijo)
      else if (carrera.descripcion) set.add(carrera.descripcion)
    })

    return Array.from(set)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map(value => ({ value, label: value }))
  }, [items, carreras])

  const itemsParaPensumOptions = useMemo(() => {
    return items.filter(item => {
      if (filters.carrera && item.carrera_subfijo !== filters.carrera) return false
      return true
    })
  }, [items, filters.carrera])

  const pensumOptions = useMemo(() => {
    const map = new Map()

    itemsParaPensumOptions.forEach(item => {
      if (!item.pensum_codigo) return
      if (!map.has(item.pensum_codigo)) {
        map.set(item.pensum_codigo, {
          value: item.pensum_codigo,
          label: item.pensum_descripcion
            ? `${item.pensum_codigo} - ${item.pensum_descripcion}`
            : item.pensum_codigo,
        })
      }
    })

    pensums.forEach(pensum => {
      const carrera = carreras.find(c => String(c.id) === String(pensum.id_carrera))
      const carreraTexto = carrera?.subfijo || carrera?.descripcion || ''

      if (filters.carrera && carreraTexto !== filters.carrera) return
      if (!pensum.codigo) return

      if (!map.has(pensum.codigo)) {
        map.set(pensum.codigo, {
          value: pensum.codigo,
          label: pensum.descripcion
            ? `${pensum.codigo} - ${pensum.descripcion}`
            : pensum.codigo,
        })
      }
    })

    return Array.from(map.values())
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true }))
  }, [itemsParaPensumOptions, pensums, carreras, filters.carrera])

  const itemsParaCursoOptions = useMemo(() => {
    return items.filter(item => {
      if (filters.carrera && item.carrera_subfijo !== filters.carrera) return false
      if (filters.pensum && item.pensum_codigo !== filters.pensum) return false
      if (filters.semestre && String(item.curso_semestre) !== String(filters.semestre)) return false
      return true
    })
  }, [items, filters.carrera, filters.pensum, filters.semestre])

  const cursoOptions = useMemo(() => {
    const map = new Map()

    itemsParaCursoOptions.forEach(item => {
      if (!item.curso_codigo) return
      if (!map.has(item.curso_codigo)) {
        map.set(item.curso_codigo, {
          value: item.curso_codigo,
          label: `${item.curso_codigo} - ${item.curso_nombre}`,
        })
      }
    })

    return Array.from(map.values())
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true }))
  }, [itemsParaCursoOptions])

  const itemsParaDocenteOptions = useMemo(() => {
    return items.filter(item => {
      if (filters.carrera && item.carrera_subfijo !== filters.carrera) return false
      if (filters.pensum && item.pensum_codigo !== filters.pensum) return false
      if (filters.semestre && String(item.curso_semestre) !== String(filters.semestre)) return false
      if (filters.curso && String(item.curso_codigo) !== String(filters.curso)) return false
      return true
    })
  }, [items, filters.carrera, filters.pensum, filters.semestre, filters.curso])

  const docenteOptions = useMemo(() => {
    const map = new Map()

    itemsParaDocenteOptions.forEach(item => {
      if (!item.id_docente) return
      if (!map.has(String(item.id_docente))) {
        map.set(String(item.id_docente), {
          value: String(item.id_docente),
          label: item.docente_nombre,
        })
      }
    })

    docentes.forEach(doc => {
      const id = String(doc.id || '').trim()
      if (!id) return

      const apareceConFiltros = itemsParaDocenteOptions.length === 0
        ? false
        : itemsParaDocenteOptions.some(item => String(item.id_docente) === id)

      if (apareceConFiltros) {
        map.set(id, {
          value: id,
          label: doc.nombre,
        })
      }
    })

    return Array.from(map.values())
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }, [itemsParaDocenteOptions, docentes])

  const cicloOptions = useMemo(() => {
    const map = new Map()

    items.forEach(item => {
      const id = String(item.id_ciclo || '').trim()
      if (!id) return

      if (!map.has(id)) {
        map.set(id, {
          value: id,
          label: item.ciclo_texto || id,
        })
      }
    })

    ciclos.forEach(ciclo => {
      const id = String(ciclo.id || '').trim()
      if (!id) return
      if (!map.has(id)) {
        map.set(id, {
          value: id,
          label: [ciclo.codigo, ciclo.anio].filter(Boolean).join(' '),
        })
      }
    })

    return Array.from(map.values())
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true }))
  }, [items, ciclos])

  const semestreOptions = useMemo(() => {
    return uniqueSorted(items
      .filter(item => {
        if (filters.carrera && item.carrera_subfijo !== filters.carrera) return false
        if (filters.pensum && item.pensum_codigo !== filters.pensum) return false
        return true
      })
      .map(item => String(item.curso_semestre || '').trim()))
  }, [items, filters.carrera, filters.pensum])

  const cursosModalFiltrados = useMemo(() => {
    const q = normalizarBusqueda(cursoModalQuery)

    const resultado = cursosUnicos.filter(curso => {
      const texto = normalizarBusqueda([
        curso.codigo,
        curso.nombre,
        curso.pensum_codigo_texto,
        curso.carrera_subfijo,
        curso.curso_semestre,
      ].join(' '))

      if (!q) return true
      return texto.includes(q)
    })

    return resultado.slice(0, 50)
  }, [cursosUnicos, cursoModalQuery])

  const docentesModalFiltrados = useMemo(() => {
    const q = normalizarBusqueda(docenteModalQuery)

    const normalizados = docentes.map(doc => ({
      ...doc,
      id_texto: String(doc.id || '').trim(),
      codigo_texto: String(doc.codigo || '').trim(),
      nombre_texto: String(doc.nombre || '').trim(),
    }))

    const resultado = normalizados.filter(doc => {
      const texto = normalizarBusqueda([
        doc.id_texto,
        doc.codigo_texto,
        doc.nombre_texto,
      ].join(' '))

      if (!q) return true
      return texto.includes(q)
    })

    return resultado
      .sort((a, b) => a.nombre_texto.localeCompare(b.nombre_texto, 'es'))
      .slice(0, 50)
  }, [docentes, docenteModalQuery])

  const cursoSeleccionadoModal = useMemo(() => {
    if (!form.id_curso) return null
    return cursosUnicos.find(curso => String(curso.codigo) === String(form.id_curso)) || null
  }, [cursosUnicos, form.id_curso])

  const docenteSeleccionadoModal = useMemo(() => {
    if (!form.id_docente) return null
    return docentes.find(doc => String(doc.id) === String(form.id_docente)) || null
  }, [docentes, form.id_docente])

  const getCursoModalLabel = (curso) => {
    if (!curso) return ''
    return `${curso.codigo} - ${curso.nombre}`
  }

  const seleccionarCursoModal = (curso) => {
    setForm(prev => ({
      ...prev,
      id_curso: curso.codigo,
    }))
    setCursoModalQuery(getCursoModalLabel(curso))
  }

  const seleccionarDocenteModal = (docente) => {
    setForm(prev => ({
      ...prev,
      id_docente: String(docente.id),
    }))
    setDocenteModalQuery(docente.nombre || '')
  }

  const handleCursoModalInput = (value) => {
    setCursoModalQuery(value)

    const q = normalizarBusqueda(value)
    const exacto = cursosUnicos.find(curso =>
      normalizarBusqueda(`${curso.codigo} - ${curso.nombre}`) === q ||
      normalizarBusqueda(curso.codigo) === q
    )

    setForm(prev => ({
      ...prev,
      id_curso: exacto ? exacto.codigo : '',
    }))
  }

  const handleDocenteModalInput = (value) => {
    setDocenteModalQuery(value)

    const q = normalizarBusqueda(value)
    const exacto = docentes.find(doc => {
      return normalizarBusqueda(doc.nombre) === q ||
        normalizarBusqueda(doc.codigo) === q ||
        normalizarBusqueda(String(doc.id)) === q
    })

    setForm(prev => ({
      ...prev,
      id_docente: exacto ? String(exacto.id).trim() : '',
    }))
  }

  const itemsFiltrados = useMemo(() => {
    const q = normalizarTexto(filters.q)

    const filtrados = items.filter(item => {
      const textoGeneral = normalizarTexto([
        item.curso_codigo,
        item.curso_nombre,
        item.pensum_codigo,
        item.pensum_descripcion,
        item.carrera_subfijo,
        item.docente_nombre,
        item.ciclo_texto,
      ].join(' '))

      if (q && !textoGeneral.includes(q)) return false

      if (filters.carrera && item.carrera_subfijo !== filters.carrera) return false
      if (filters.pensum && item.pensum_codigo !== filters.pensum) return false
      if (filters.semestre && String(item.curso_semestre) !== String(filters.semestre)) return false
      if (filters.curso && String(item.curso_codigo) !== String(filters.curso)) return false
      if (filters.docente && String(item.id_docente) !== String(filters.docente)) return false
      if (filters.ciclo && String(item.id_ciclo) !== String(filters.ciclo)) return false
      if (filters.estado !== '' && String(item.activo) !== String(filters.estado)) return false

      return true
    })

    const resultado = filters.pensum
      ? filtrados
      : agruparPorCursoDocente(filtrados)

    return resultado.sort((a, b) => {
      const cursoA = `${a.curso_nombre} ${a.curso_codigo}`
      const cursoB = `${b.curso_nombre} ${b.curso_codigo}`
      const cursoCompare = cursoA.localeCompare(cursoB, 'es', { numeric: true })
      if (cursoCompare !== 0) return cursoCompare
      return a.docente_nombre.localeCompare(b.docente_nombre, 'es')
    })
  }, [items, filters])

  const setFilter = (name, value) => {
    setFilters(prev => {
      const next = { ...prev, [name]: value }

      if (name === 'carrera') {
        next.pensum = ''
        next.curso = ''
      }

      if (name === 'pensum') {
        next.curso = ''
      }

      if (name === 'semestre') {
        next.curso = ''
      }

      return next
    })
  }

  const limpiarFiltros = () => {
    setFilters(initialFilters)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(initialForm)
    setCursoModalQuery('')
    setDocenteModalQuery('')
    setModalOpen(true)
    setError('')
    setMensaje('')
  }

  const openEdit = (row) => {
    const idCurso = String(row.id_curso || row.curso_codigo || '').trim()
    const idDocente = String(row.id_docente || '').trim()
    const curso = cursosUnicos.find(c => String(c.codigo) === idCurso)
    const docente = docentes.find(d => String(d.id) === idDocente)

    setEditing(row)
    setForm({
      id_curso: idCurso,
      id_docente: idDocente,
      id_ciclo: row.id_ciclo,
      activo: Number(row.activo),
    })
    setCursoModalQuery(curso ? getCursoModalLabel(curso) : `${row.curso_codigo || idCurso} - ${row.curso_nombre || ''}`.trim())
    setDocenteModalQuery(docente?.nombre || row.docente_nombre || '')
    setModalOpen(true)
    setError('')
    setMensaje('')
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
    setForm(initialForm)
    setCursoModalQuery('')
    setDocenteModalQuery('')
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const validarForm = () => {
    if (!form.id_curso) return 'Seleccione un curso.'
    if (!form.id_docente) return 'Seleccione un docente.'
    if (!form.id_ciclo) return 'Seleccione un ciclo.'
    return ''
  }

  const guardar = async () => {
    const validacion = validarForm()
    if (validacion) {
      setError(validacion)
      return
    }

    try {
      setSaving(true)
      setError('')
      setMensaje('')

      const body = {
        id_curso: String(form.id_curso).trim(),
        id_docente: Number(form.id_docente),
        id_ciclo: Number(form.id_ciclo),
        activo: Number(form.activo),
      }

      if (editing) {
        await docenteCursoService.update({
          old_id_curso: String(editing.id_curso || editing.curso_codigo).trim(),
          old_id_docente: Number(editing.id_docente),
          old_id_ciclo: Number(editing.id_ciclo),
          ...body,
        })
        setMensaje('Asignación actualizada correctamente.')
      } else {
        await docenteCursoService.create(body)
        setMensaje('Asignación creada correctamente.')
      }

      closeModal()
      await cargarTodo()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al guardar asignación')
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async () => {
    if (!toDelete) return

    try {
      setSaving(true)
      setError('')
      setMensaje('')

      await docenteCursoService.remove({
        id_curso: String(toDelete.id_curso || toDelete.curso_codigo).trim(),
        id_docente: Number(toDelete.id_docente),
        id_ciclo: Number(toDelete.id_ciclo),
      })

      setMensaje('Asignación eliminada correctamente.')
      setToDelete(null)
      await cargarTodo()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al eliminar asignación')
    } finally {
      setSaving(false)
    }
  }

  const cambiarEstadoActivo = async (item) => {
    if (!item || saving) return

    const nuevoEstado = Number(item.activo) === 1 ? 0 : 1

    try {
      setSaving(true)
      setError('')
      setMensaje('')

      await docenteCursoService.updateActivo({
        id_curso: String(item.id_curso || item.curso_codigo).trim(),
        id_docente: Number(item.id_docente),
        id_ciclo: Number(item.id_ciclo),
        activo: nuevoEstado,
      })

      setMensaje(
        nuevoEstado === 1
          ? 'Asignación activada correctamente.'
          : 'Asignación desactivada correctamente.'
      )

      await cargarTodo()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cambiar estado de la asignación')
    } finally {
      setSaving(false)
    }
  }

  const actualizarEstadoPorCiclo = async () => {
    if (!bulkCiclo) {
      setError('Seleccione un ciclo para actualizar asignaciones en conjunto.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMensaje('')

      const result = await docenteCursoService.updateActivoByCiclo(bulkCiclo, {
        activo: Number(bulkActivo),
      })

      const affected = Number(result?.affected ?? result?.affectedRows ?? 0)
      const ciclo = ciclos.find(c => String(c.id) === String(bulkCiclo))
      const cicloTexto = ciclo ? [ciclo.codigo, ciclo.anio].filter(Boolean).join(' ') : `ID ${bulkCiclo}`

      setMensaje(
        `${affected} asignación(es) del ciclo ${cicloTexto} fueron ${Number(bulkActivo) === 1 ? 'activadas' : 'desactivadas'}.`
      )

      await cargarTodo()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al actualizar asignaciones por ciclo')
    } finally {
      setSaving(false)
    }
  }

  const confirmarEliminarPorCiclo = () => {
    if (!bulkCiclo) {
      setError('Seleccione un ciclo para eliminar asignaciones en conjunto.')
      return
    }

    const ciclo = ciclos.find(c => String(c.id) === String(bulkCiclo))

    setBulkDeleteConfirm({
      id_ciclo: bulkCiclo,
      ciclo_texto: ciclo ? [ciclo.codigo, ciclo.anio].filter(Boolean).join(' ') : `ID ${bulkCiclo}`,
    })
  }

  const eliminarPorCiclo = async () => {
    if (!bulkDeleteConfirm?.id_ciclo) return

    try {
      setSaving(true)
      setError('')
      setMensaje('')

      const result = await docenteCursoService.removeByCiclo(bulkDeleteConfirm.id_ciclo)
      const affected = Number(result?.affected ?? result?.affectedRows ?? 0)

      setMensaje(`${affected} asignación(es) del ciclo ${bulkDeleteConfirm.ciclo_texto} fueron eliminadas.`)
      setBulkDeleteConfirm(null)
      await cargarTodo()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al eliminar asignaciones por ciclo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <style>
        {`
          .filters-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            padding: 20px;
            margin-bottom: 20px;
          }

          .bulk-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            padding: 18px 20px;
            margin-bottom: 20px;
          }

          .bulk-grid {
            display: grid;
            grid-template-columns: minmax(240px, 1fr) minmax(180px, 220px) auto auto;
            gap: 12px;
            align-items: end;
          }

          .bulk-title {
            margin: 0 0 4px;
            color: var(--text);
            font-size: 1rem;
            font-weight: 900;
          }

          .bulk-subtitle {
            color: var(--text-muted);
            margin: 0 0 14px;
            font-size: .86rem;
          }

          .filters-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(180px, 1fr));
            gap: 16px;
            align-items: end;
          }

          .filters-grid .form-group {
            margin-bottom: 0;
          }

          .asignaciones-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            padding: 20px;
          }

          .table-scroll {
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
          }

          .asignaciones-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 980px;
          }

          .asignaciones-table th {
            background: var(--surface-soft);
            color: var(--text-muted);
            font-size: .75rem;
            text-transform: uppercase;
            letter-spacing: .045em;
            text-align: left;
            padding: 13px 14px;
            border-bottom: 1px solid var(--border);
          }

          .asignaciones-table td {
            padding: 13px 14px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
            color: var(--text);
          }

          .asignaciones-table tr:last-child td {
            border-bottom: 0;
          }

          .course-title,
          .pensum-title {
            font-weight: 800;
            color: var(--text);
          }

          .muted-small {
            display: block;
            color: var(--text-muted);
            font-size: .83rem;
            margin-top: 4px;
            line-height: 1.35;
          }

          .badge-status {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 5px 12px;
            font-size: .78rem;
            font-weight: 800;
            border: 1px solid transparent;
            white-space: nowrap;
          }

          .badge-status.active {
            background: #dcfce7;
            color: #166534;
            border-color: #bbf7d0;
          }

          .badge-status.inactive {
            background: #f3f4f6;
            color: #4b5563;
            border-color: #e5e7eb;
          }

          .btn-status-toggle {
            border: 0;
            cursor: pointer;
            transition: transform .12s ease, box-shadow .16s ease, filter .16s ease;
          }

          .btn-status-toggle:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 10px rgba(15, 23, 42, .12);
            filter: brightness(.98);
          }

          .btn-status-toggle:disabled {
            cursor: not-allowed;
            opacity: .65;
            transform: none;
            box-shadow: none;
          }

          .btn-soft-danger {
            background: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fecaca;
          }

          .btn-soft-danger:hover {
            background: #fecaca;
            border-color: #fca5a5;
          }

          .btn-soft-edit {
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #dbeafe;
          }

          .btn-soft-edit:hover {
            background: #dbeafe;
            border-color: #bfdbfe;
          }

          .modal-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .autocomplete-box {
            position: relative;
          }

          .autocomplete-results {
            margin-top: 8px;
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            background: var(--surface);
            max-height: 260px;
            overflow-y: auto;
            box-shadow: var(--shadow-sm);
          }

          .autocomplete-item {
            width: 100%;
            border: 0;
            border-bottom: 1px solid var(--border);
            background: transparent;
            padding: 10px 12px;
            text-align: left;
            cursor: pointer;
            color: var(--text);
          }

          .autocomplete-item:last-child {
            border-bottom: 0;
          }

          .autocomplete-item:hover {
            background: var(--surface-soft);
          }

          .autocomplete-item.active {
            background: rgba(37, 99, 235, .08);
          }

          .selected-summary {
            margin-top: 8px;
            padding: 9px 11px;
            border-radius: var(--radius-md);
            border: 1px solid #bbf7d0;
            background: #f0fdf4;
            color: #166534;
            font-size: .85rem;
            line-height: 1.35;
          }

          .autocomplete-empty {
            padding: 10px 12px;
            color: var(--text-muted);
            font-size: .85rem;
          }

          @media (max-width: 1100px) {
            .filters-grid,
            .bulk-grid {
              grid-template-columns: repeat(2, minmax(180px, 1fr));
            }
          }

          @media (max-width: 680px) {
            .filters-grid,
            .bulk-grid,
            .modal-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Docente/Curso</h1>
          <p className="page-sub">
            Asignación de docentes a cursos por ciclo académico.
          </p>
        </div>

        {canWrite && (
          <button className="btn-add" onClick={openCreate}>
            + Nueva asignación
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {mensaje && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {mensaje}
        </div>
      )}
       {canWrite && (
  <div className="bulk-card">
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h3 className="bulk-title">Acciones en conjunto por ciclo</h3>
        <p className="bulk-subtitle" style={{ marginBottom: 0 }}>
          Active esta opción solamente si desea modificar varias asignaciones del mismo ciclo.
        </p>
      </div>

      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 800,
          color: 'var(--text)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={mostrarAccionesConjunto}
          onChange={e => {
            setMostrarAccionesConjunto(e.target.checked)

            if (!e.target.checked) {
              setBulkCiclo('')
              setBulkActivo('1')
            }
          }}
        />
        Mostrar acciones
      </label>
    </div>

    {mostrarAccionesConjunto && (
      <>
        <p className="bulk-subtitle" style={{ marginTop: 14 }}>
          Seleccione un ciclo para activar/desactivar o eliminar todas sus asignaciones de docente/curso.
        </p>

        <div className="bulk-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Ciclo</label>
            <select
              className="form-input"
              value={bulkCiclo}
              onChange={e => setBulkCiclo(e.target.value)}
            >
              <option value="">Seleccionar ciclo...</option>
              {ciclos.map(ciclo => (
                <option key={ciclo.id} value={ciclo.id}>
                  {[ciclo.codigo, ciclo.anio].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nuevo estado</label>
            <select
              className="form-input"
              value={bulkActivo}
              onChange={e => setBulkActivo(e.target.value)}
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-table btn-soft-edit"
            disabled={saving || !bulkCiclo}
            onClick={actualizarEstadoPorCiclo}
          >
            {Number(bulkActivo) === 1 ? 'Activar en conjunto' : 'Desactivar en conjunto'}
          </button>

          <button
            type="button"
            className="btn-table btn-soft-danger"
            disabled={saving || !bulkCiclo}
            onClick={confirmarEliminarPorCiclo}
          >
            Eliminar en conjunto
          </button>
        </div>
      </>
    )}
  </div>
)}
      <div className="filters-card">
        <div className="filters-grid">
          <div className="form-group">
            <label className="form-label">Buscar</label>
            <input
              className="form-input"
              value={filters.q}
              onChange={e => setFilter('q', e.target.value)}
              placeholder="Curso, docente, pensum..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Carrera</label>
            <select
              className="form-input"
              value={filters.carrera}
              onChange={e => setFilter('carrera', e.target.value)}
            >
              <option value="">Todos</option>
              {carreraOptions.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Pensum</label>
            <select
              className="form-input"
              value={filters.pensum}
              onChange={e => setFilter('pensum', e.target.value)}
            >
              <option value="">Todos</option>
              {pensumOptions.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Semestre</label>
            <select
              className="form-input"
              value={filters.semestre}
              onChange={e => setFilter('semestre', e.target.value)}
            >
              <option value="">Todos</option>
              {semestreOptions.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Curso</label>
            <select
              className="form-input"
              value={filters.curso}
              onChange={e => setFilter('curso', e.target.value)}
            >
              <option value="">Todos</option>
              {cursoOptions.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Docente</label>
            <select
              className="form-input"
              value={filters.docente}
              onChange={e => setFilter('docente', e.target.value)}
            >
              <option value="">Todos</option>
              {docenteOptions.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ciclo</label>
            <select
              className="form-input"
              value={filters.ciclo}
              onChange={e => setFilter('ciclo', e.target.value)}
            >
              <option value="">Todos</option>
              {cicloOptions.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Estado</label>
            <select
              className="form-input"
              value={filters.estado}
              onChange={e => setFilter('estado', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-table btn-soft-danger"
            onClick={limpiarFiltros}
          >
            × Limpiar
          </button>
        </div>
      </div>

      

      <div className="asignaciones-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: 'var(--text)' }}>Asignaciones</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
            Mostrando {itemsFiltrados.length} de {items.length}
          </span>
        </div>

        <div className="table-scroll">
          <table className="asignaciones-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Curso</th>
                <th>Pensum</th>
                <th>Sem.</th>
                <th>Docente</th>
                <th>Ciclo</th>
                <th>Estado</th>
                {canWrite && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7}>Cargando asignaciones...</td>
                </tr>
              ) : itemsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7}>No hay asignaciones para los filtros seleccionados.</td>
                </tr>
              ) : (
                itemsFiltrados.map((item) => (
                  <tr key={`${item.id_curso}-${item.id_docente}-${item.id_ciclo}-${item.pensum_codigo || 'todos'}`}>
                    <td>{item.curso_codigo}</td>
                    <td>
                      <span className="course-title">{item.curso_nombre}</span>
                      {item.carrera_subfijo && (
                        <span className="muted-small">{item.carrera_subfijo}</span>
                      )}
                    </td>
                    <td>
                      <span className="pensum-title">{item.pensum_codigo || '—'}</span>
                      {item.pensum_descripcion && (
                        <span className="muted-small">{item.pensum_descripcion}</span>
                      )}
                    </td>
                    <td>{item.curso_semestre || '—'}</td>
                    <td>{item.docente_nombre}</td>
                    <td>{item.ciclo_texto || '—'}</td>
                    <td>
                      {canWrite ? (
                        <button
                          type="button"
                          className={`badge-status btn-status-toggle ${Number(item.activo) === 1 ? 'active' : 'inactive'}`}
                          disabled={saving}
                          onClick={() => cambiarEstadoActivo(item)}
                          title={Number(item.activo) === 1 ? 'Desactivar asignación' : 'Activar asignación'}
                        >
                          {Number(item.activo) === 1 ? 'Activo' : 'Inactivo'}
                        </button>
                      ) : (
                        <span className={`badge-status ${Number(item.activo) === 1 ? 'active' : 'inactive'}`}>
                          {Number(item.activo) === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    {canWrite && (
                      <td>
                        <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
                          <button
                            type="button"
                            className="btn-table btn-soft-edit"
                            onClick={() => openEdit(item)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn-table btn-soft-danger"
                            onClick={() => setToDelete(item)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!filters.pensum && itemsFiltrados.length > 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', margin: '12px 0 0' }}>
            Nota: como el filtro de pensum está en “Todos”, las asignaciones se agrupan por curso, docente, ciclo y estado. En la columna Pensum se muestran todos los pensums donde aparece ese curso.
          </p>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar asignación' : 'Nueva asignación'}
        width={720}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="modal-grid">
            <div className="form-group">
              <label className="form-label">Curso</label>

              <div className="autocomplete-box">
                <input
                  className="form-input"
                  value={cursoModalQuery}
                  onChange={e => handleCursoModalInput(e.target.value)}
                  placeholder="Buscar por código o nombre del curso..."
                />

                {cursoSeleccionadoModal && (
                  <div className="selected-summary">
                    Seleccionado: <strong>{cursoSeleccionadoModal.codigo}</strong> - {cursoSeleccionadoModal.nombre}
                    {cursoSeleccionadoModal.pensum_codigo_texto && (
                      <span className="muted-small">Pensum: {cursoSeleccionadoModal.pensum_codigo_texto}</span>
                    )}
                    {cursoSeleccionadoModal.carrera_subfijo && (
                      <span className="muted-small">Carrera: {cursoSeleccionadoModal.carrera_subfijo}</span>
                    )}
                  </div>
                )}

                <div className="autocomplete-results">
                  {cursosModalFiltrados.length === 0 ? (
                    <div className="autocomplete-empty">
                      No se encontraron cursos.
                    </div>
                  ) : (
                    cursosModalFiltrados.map(curso => (
                      <button
                        type="button"
                        key={curso.codigo}
                        className={`autocomplete-item ${String(form.id_curso) === String(curso.codigo) ? 'active' : ''}`}
                        onClick={() => seleccionarCursoModal(curso)}
                      >
                        <strong>{curso.codigo}</strong> - {curso.nombre}
                        {curso.pensum_codigo_texto && (
                          <span className="muted-small">Pensum: {curso.pensum_codigo_texto}</span>
                        )}
                        {curso.carrera_subfijo && (
                          <span className="muted-small">Carrera: {curso.carrera_subfijo}</span>
                        )}
                        {curso.curso_semestre && (
                          <span className="muted-small">Semestre: {curso.curso_semestre}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Docente</label>

              <div className="autocomplete-box">
                <input
                  className="form-input"
                  value={docenteModalQuery}
                  onChange={e => handleDocenteModalInput(e.target.value)}
                  placeholder="Buscar por nombre o código del docente..."
                />

                {docenteSeleccionadoModal && (
                  <div className="selected-summary">
                    Seleccionado: <strong>{docenteSeleccionadoModal.nombre}</strong>
                  </div>
                )}

                <div className="autocomplete-results">
                  {docentesModalFiltrados.length === 0 ? (
                    <div className="autocomplete-empty">
                      No se encontraron docentes.
                    </div>
                  ) : (
                    docentesModalFiltrados.map(doc => (
                      <button
                        type="button"
                        key={doc.id}
                        className={`autocomplete-item ${String(form.id_docente) === String(doc.id) ? 'active' : ''}`}
                        onClick={() => seleccionarDocenteModal(doc)}
                      >
                        <strong>{doc.nombre}</strong>
                        {(doc.codigo || doc.id) && (
                          <span className="muted-small">Código/ID: {doc.codigo || doc.id}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ciclo</label>
              <select
                className="form-input"
                name="id_ciclo"
                value={form.id_ciclo}
                onChange={handleFormChange}
              >
                <option value="">Seleccionar...</option>
                {ciclos.map(ciclo => (
                  <option key={ciclo.id} value={ciclo.id}>
                    {[ciclo.codigo, ciclo.anio].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-input"
                name="activo"
                value={form.activo}
                onChange={handleFormChange}
              >
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-table btn-table-secondary"
              onClick={closeModal}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn-table btn-table-primary"
              disabled={saving}
              onClick={guardar}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar asignación"
        width={460}
      >
        <p style={{ color: 'var(--text-soft)', marginTop: 0 }}>
          ¿Desea eliminar la asignación del curso{' '}
          <strong>{toDelete?.curso_codigo} - {toDelete?.curso_nombre}</strong>{' '}
          con el docente <strong>{toDelete?.docente_nombre}</strong>?
        </p>

        {!filters.pensum && toDelete?.__rows?.length > 1 && (
          <div className="alert alert-warning" style={{ marginBottom: 14 }}>
            Esta fila está agrupada por pensum, pero la asignación docente/curso se elimina una sola vez.
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-table btn-table-secondary"
            onClick={() => setToDelete(null)}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-table btn-soft-danger"
            disabled={saving}
            onClick={eliminar}
          >
            {saving ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </Modal>

      <Modal
        open={!!bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(null)}
        title="Eliminar asignaciones por ciclo"
        width={500}
      >
        <p style={{ color: 'var(--text-soft)', marginTop: 0 }}>
          Esta acción eliminará todas las asignaciones de docente/curso del ciclo{' '}
          <strong>{bulkDeleteConfirm?.ciclo_texto}</strong>.
        </p>

        <div className="alert alert-warning" style={{ marginBottom: 14 }}>
          Esta acción no elimina docentes, cursos ni ciclos; solo elimina registros de docente_curso para ese ciclo.
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-table btn-table-secondary"
            onClick={() => setBulkDeleteConfirm(null)}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-table btn-soft-danger"
            disabled={saving}
            onClick={eliminarPorCiclo}
          >
            {saving ? 'Eliminando...' : 'Eliminar en conjunto'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
