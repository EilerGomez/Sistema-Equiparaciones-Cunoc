const {test,after}=require('node:test')
const assert=require('node:assert/strict')
const {validate,anioActual}=require('../src/services/equiparacion.service')
const {pool}=require('../src/config/db')
const valid=()=>({id_estudiante:1,id_pensum_de:1,id_pensum_a:2,id_autoridad_coordinador:1,id_autoridad_director:2,cursos:[{id_curso_de:1,id_curso_a:2}]})
test('cambio anual usa la fecha de Guatemala',()=>{
 assert.equal(anioActual(new Date('2027-01-01T05:59:59Z')),2026)
 assert.equal(anioActual(new Date('2027-01-01T06:00:00Z')),2027)
})
test('rechaza documentos sin cursos o con pares duplicados',()=>{
 assert.throws(()=>validate({...valid(),cursos:[]}))
 assert.throws(()=>validate({...valid(),cursos:[...valid().cursos,...valid().cursos]}))
})
test('rechaza fechas inexistentes y estados no permitidos',()=>{
 assert.throws(()=>validate({...valid(),fecha_prov_ryca:'2026-02-30'}))
 assert.throws(()=>validate({...valid(),estado:'OTRO'}))
 assert.throws(()=>validate({...valid(),estado:'ENVIADO'}))
 validate({...valid(),fecha_prov_ryca:'2026-02-28'})
})
test('las autoridades se resuelven desde la carrera y los pensums deben diferir',()=>{
 validate({...valid(),id_autoridad_director:1})
 assert.throws(()=>validate({...valid(),id_pensum_a:1}))
})
after(()=>pool.end())
