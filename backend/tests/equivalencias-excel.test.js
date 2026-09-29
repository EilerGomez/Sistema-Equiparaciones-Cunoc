const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { readExcel, importExcel } = require('../src/services/equivalencias-excel.service')

function example() {
  return { origen: { anio: 2016, encabezado: 'Pensum 2016\nINGENIERÍA EN CIENCIAS Y SISTEMAS' }, destino: { anio: 2025, encabezado: 'Pensum 2025\nINGENIERÍA EN CIENCIAS Y SISTEMAS' }, filas: [
    { fila: 3, codigo_de: '28', nombre_de: 'Social Humanística 1', codigo_a: '3003', nombre_a: 'Área Social Humanística 1', porcentaje: 90, opinion: 'EQUIVALENTE' },
    { fila: 4, codigo_de: '72', nombre_de: 'Física Básica', codigo_a: '3007', nombre_a: 'Física Básica', porcentaje: 100, opinion: 'EQUIVALENTE' }
  ] }
}

test('lee el formato Excel y sus años, cursos, porcentajes y opiniones', async () => {
  const python = spawnSync(process.env.PYTHON_BIN || 'python', ['-c', `import openpyxl,io,sys
w=openpyxl.Workbook();s=w.active
s.append(['No.','Pensum 2016\\nINGENIERÍA EN CIENCIAS Y SISTEMAS',None,'por','Pensum 2025\\nINGENIERÍA EN CIENCIAS Y SISTEMAS',None,'Porcentaje %','Opinión'])
s.append([None,'Código','Nombre del curso',None,'Código','Nombre del curso',None,None])
s.append([1,28,'Social Humanística 1',None,3003,'Área Social Humanística 1',90,'Equivalente'])
b=io.BytesIO();w.save(b);sys.stdout.buffer.write(b.getvalue())`])
  assert.equal(python.status, 0, python.stderr.toString())
  const parsed = await readExcel(python.stdout)
  assert.equal(parsed.origen.anio, 2016)
  assert.equal(parsed.destino.anio, 2025)
  assert.deepEqual(parsed.filas.map(r => [r.codigo_de, r.codigo_a, r.porcentaje, r.opinion]), [['28', '3003', 90, 'EQUIVALENTE']])
})

test('la carga repetida actualiza sólo los datos cambiados y evita duplicados', async () => {
  const courses = new Map(), pairs = new Map(), members = new Set()
  let nextId = 1, commits = 0, rollbacks = 0
  const conn = {
    beginTransaction: async () => {}, commit: async () => { commits++ }, rollback: async () => { rollbacks++ }, release: () => {},
    query: async (sql, args = []) => {
      if (sql.startsWith('SELECT id,descripcion FROM carreras')) return [[{ id: 1, descripcion: 'Ingeniería en Ciencias y Sistemas' }]]
      if (sql.startsWith('SELECT id,anio,codigo FROM pensum')) return [[{ id: 16, anio: 2016, codigo: '2016-56' }, { id: 25, anio: 2025, codigo: '2025-58' }]]
      if (sql.startsWith('SELECT id,codigo,nombre FROM curso')) return [[...courses.values()].filter(c => c.codigo === args[0])]
      if (sql.startsWith('INSERT INTO curso(')) { const id = nextId++; courses.set(args[0], { id, codigo: args[0], nombre: args[1] }); return [{ insertId: id }] }
      if (sql.startsWith('UPDATE curso SET')) { for (const c of courses.values()) if (c.id === args[1]) c.nombre = args[0]; return [{}] }
      if (sql.startsWith('INSERT IGNORE INTO pensum_curso')) { const key = `${args[0]}:${args[1]}`, added = !members.has(key); members.add(key); return [{ affectedRows: added ? 1 : 0 }] }
      if (sql.startsWith('SELECT porcentaje,opinion FROM equivalencia_curso')) return [[pairs.get(`${args[0]}:${args[1]}`)]]
      if (sql.startsWith('INSERT INTO equivalencia_curso')) { pairs.set(`${args[0]}:${args[1]}`, { porcentaje: args[2], opinion: args[3] }); return [{}] }
      if (sql.startsWith('UPDATE equivalencia_curso')) { pairs.set(`${args[2]}:${args[3]}`, { porcentaje: args[0], opinion: args[1] }); return [{}] }
      throw new Error(`Consulta inesperada: ${sql}`)
    }
  }
  const db = { getConnection: async () => conn }
  const first = await importExcel(example(), 1, db)
  assert.deepEqual([first.cursos_insertados, first.equivalencias_insertadas, first.asociaciones_nuevas], [4, 2, 4])
  const repeated = await importExcel(example(), 1, db)
  assert.deepEqual([repeated.cursos_insertados, repeated.cursos_actualizados, repeated.cursos_sin_cambios, repeated.equivalencias_sin_cambios], [0, 0, 4, 2])
  const changed = example()
  changed.filas[0].nombre_de = 'Social Humanística I'
  changed.filas[0].porcentaje = 95
  changed.filas[0].opinion = 'APROBADO'
  const updated = await importExcel(changed, 1, db)
  assert.equal(updated.cursos_actualizados, 1)
  assert.equal(updated.equivalencias_actualizadas, 1)
  assert.equal(courses.get('28').nombre, 'Social Humanística I')
  assert.deepEqual(pairs.get('1:2'), { porcentaje: 95, opinion: 'APROBADO' })
  const invalid = example()
  invalid.destino.encabezado = 'Pensum 2025\nINGENIERÍA MECÁNICA'
  await assert.rejects(importExcel(invalid, 1, db), /no corresponde/)
  assert.equal(courses.size, 4)
  assert.equal(commits, 3)
  assert.equal(rollbacks, 1)
})
