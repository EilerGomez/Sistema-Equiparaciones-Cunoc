const path = require('path')
const { spawn } = require('child_process')
const { pool } = require('../config/db')
const { fallo } = require('./equiparacion.service')

function readExcel(buffer) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, '../../scripts/equivalencias_excel_reader.py')
    const child = spawn(process.env.PYTHON_BIN || 'python', [script], {
      windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
    let output = '', stderr = ''
    let settled = false
    const timer = setTimeout(() => child.kill(), 30000)
    const finish = (error, result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve(result)
    }
    child.stdout.on('data', chunk => {
      output += chunk.toString('utf8')
      if (output.length > 2_000_000) child.kill()
    })
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8').slice(0, 500) })
    child.on('error', error => finish(fallo(503, `No se pudo iniciar Python: ${error.message}`)))
    child.on('close', code => {
      let parsed
      try { parsed = JSON.parse(output.trim()) } catch {
        finish(fallo(422, `No se pudo leer el Excel. Revisa Python, xlrd y openpyxl. ${stderr.slice(0, 120)}`))
        return
      }
      if (code || !parsed.ok) finish(fallo(422, parsed.error || 'Excel inválido'))
      else finish(null, parsed.data)
    })
    child.stdin.on('error', () => {})
    child.stdin.end(buffer)
  })
}

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
function headingCareer(heading) {
  return normalize(heading.replace(/^.*?pensum\s*\d{4}/i, ''))
}

async function importExcel(parsed, careerId, db = pool) {
  if (!Number.isSafeInteger(Number(careerId)) || Number(careerId) < 1) throw fallo(400, 'Selecciona una carrera')
  if (!parsed?.filas?.length || parsed.filas.length > 2000) throw fallo(422, 'Excel sin equivalencias válidas')
  if (parsed.origen.anio > parsed.destino.anio) throw fallo(422, 'El pensum de origen no puede ser posterior al de destino')
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [[career]] = await conn.query('SELECT id,descripcion FROM carreras WHERE id=?', [careerId])
    if (!career) throw fallo(422, 'La carrera seleccionada no existe')
    for (const side of [parsed.origen, parsed.destino]) {
      const title = headingCareer(side.encabezado || '')
      if (title && title !== normalize(career.descripcion)) throw fallo(422, `El encabezado "${side.encabezado}" no corresponde a ${career.descripcion}`)
    }
    const [pensums] = await conn.query('SELECT id,anio,codigo FROM pensum WHERE id_carrera=? AND anio IN (?,?)', [careerId, parsed.origen.anio, parsed.destino.anio])
    const findPensum = year => {
      const matches = pensums.filter(p => Number(p.anio) === Number(year))
      if (matches.length !== 1) throw fallo(422, `La carrera debe tener un único pensum ${year}; se encontraron ${matches.length}`)
      return matches[0]
    }
    const origin = findPensum(parsed.origen.anio), destination = findPensum(parsed.destino.anio)

    const names = new Map(), seen = new Set()
    for (const row of parsed.filas) {
      for (const [code, name] of [[row.codigo_de, row.nombre_de], [row.codigo_a, row.nombre_a]]) {
        const previous = names.get(code)
        if (previous && previous !== name) throw fallo(422, `El curso ${code} tiene nombres distintos en el Excel (fila ${row.fila})`)
        names.set(code, name)
      }
      const key = `${row.codigo_de}\0${row.codigo_a}`
      if (seen.has(key)) throw fallo(422, `Equivalencia repetida en la fila ${row.fila}`)
      seen.add(key)
      if (!Number.isFinite(row.porcentaje) || row.porcentaje < 0 || row.porcentaje > 100 || !row.opinion || row.opinion.length > 50) throw fallo(422, `Datos inválidos en fila ${row.fila}`)
    }

    const count = { cursos_insertados: 0, cursos_actualizados: 0, cursos_sin_cambios: 0, asociaciones_nuevas: 0, equivalencias_insertadas: 0, equivalencias_actualizadas: 0, equivalencias_sin_cambios: 0 }
    const ids = new Map()
    for (const [code, name] of names) {
      const [matches] = await conn.query(`SELECT id,codigo,nombre FROM curso WHERE codigo=? OR (codigo REGEXP '^[0-9]+$' AND CAST(codigo AS UNSIGNED)=?) ORDER BY id FOR UPDATE`, [code, /^\d+$/.test(code) ? Number(code) : -1])
      if (matches.length > 1) throw fallo(409, `Hay códigos duplicados por ceros a la izquierda: ${code}`)
      if (matches.length) {
        ids.set(code, matches[0].id)
        if (matches[0].nombre !== name) {
          await conn.query('UPDATE curso SET nombre=? WHERE id=?', [name, matches[0].id])
          count.cursos_actualizados++
        } else count.cursos_sin_cambios++
      } else {
        const [result] = await conn.query('INSERT INTO curso(codigo,nombre) VALUES (?,?)', [code, name])
        ids.set(code, result.insertId)
        count.cursos_insertados++
      }
    }
    for (const row of parsed.filas) {
      for (const [id, pensumId] of [[ids.get(row.codigo_de), origin.id], [ids.get(row.codigo_a), destination.id]]) {
        const [result] = await conn.query('INSERT IGNORE INTO pensum_curso(id_curso,id_pensum,semestre) VALUES (?,?,NULL)', [id, pensumId])
        count.asociaciones_nuevas += result.affectedRows
      }
      const source = ids.get(row.codigo_de), target = ids.get(row.codigo_a)
      const [[old]] = await conn.query('SELECT porcentaje,opinion FROM equivalencia_curso WHERE id_curso_de=? AND id_curso_a=? FOR UPDATE', [source, target])
      if (!old) {
        await conn.query('INSERT INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) VALUES (?,?,?,?)', [source, target, row.porcentaje, row.opinion])
        count.equivalencias_insertadas++
      } else if (Number(old.porcentaje) !== row.porcentaje || old.opinion !== row.opinion) {
        await conn.query('UPDATE equivalencia_curso SET porcentaje=?,opinion=? WHERE id_curso_de=? AND id_curso_a=?', [row.porcentaje, row.opinion, source, target])
        count.equivalencias_actualizadas++
      } else count.equivalencias_sin_cambios++
    }
    await conn.commit()
    return { carrera: career.descripcion, origen: origin.anio, destino: destination.anio, filas: parsed.filas.length, ...count }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally { conn.release() }
}

module.exports = { readExcel, importExcel }
