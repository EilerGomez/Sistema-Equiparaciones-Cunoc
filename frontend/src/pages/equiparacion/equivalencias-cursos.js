export function pensumLabel(pensum) {
  return [pensum.codigo, pensum.carrera].filter(Boolean).join(' · ')
}

export function courseOptions(courses, pensumId = '') {
  const items = pensumId
    ? courses.filter(course => String(course.id_pensum) === String(pensumId))
    : courses
  return [...new Map(items.map(course => [String(course.id_curso), course])).values()]
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true }))
}

export function coursePensums(courses, pensums) {
  const byId = new Map(pensums.map(pensum => [String(pensum.id), pensum]))
  const result = new Map()
  for (const course of courses) {
    const pensum = byId.get(String(course.id_pensum))
    if (!pensum) continue
    const key = String(course.id_curso)
    if (!result.has(key)) result.set(key, new Map())
    result.get(key).set(String(pensum.id), pensumLabel(pensum))
  }
  return new Map([...result].map(([id, values]) => [id, [...values.values()]]))
}
