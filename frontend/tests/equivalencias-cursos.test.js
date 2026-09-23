import {test} from 'node:test'
import assert from 'node:assert/strict'
import {courseOptions,coursePensums} from '../src/pages/equiparacion/equivalencias-cursos.js'

const pensums=[
  {id:1,codigo:'2016-58',carrera:'Ingenieria en Ciencias y Sistemas'},
  {id:2,codigo:'2025-58',carrera:'Ingenieria en Ciencias y Sistemas'},
  {id:3,codigo:'2025-34',carrera:'Ingenieria Industrial'},
]
const courses=[
  {id_curso:10,id_pensum:1,codigo:'100',nombre:'Matematica'},
  {id_curso:10,id_pensum:2,codigo:'100',nombre:'Matematica'},
  {id_curso:11,id_pensum:2,codigo:'200',nombre:'Fisica'},
  {id_curso:12,id_pensum:3,codigo:'300',nombre:'Dibujo'},
]

test('cada selector usa los cursos de su propio pensum',()=>{
  assert.deepEqual(courseOptions(courses,1).map(c=>c.id_curso),[10])
  assert.deepEqual(courseOptions(courses,2).map(c=>c.id_curso),[10,11])
  assert.deepEqual(courseOptions(courses,3).map(c=>c.id_curso),[12])
  assert.deepEqual(courseOptions(courses).map(c=>c.id_curso),[10,11,12])
})

test('el listado muestra todos los pensums cuando un curso pertenece a varios',()=>{
  const result=coursePensums(courses,pensums)
  assert.deepEqual(result.get('10'),[
    '2016-58 · Ingenieria en Ciencias y Sistemas',
    '2025-58 · Ingenieria en Ciencias y Sistemas',
  ])
  assert.deepEqual(result.get('12'),['2025-34 · Ingenieria Industrial'])
})
