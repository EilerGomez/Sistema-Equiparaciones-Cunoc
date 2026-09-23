const {test}=require('node:test')
const assert=require('node:assert/strict')
const catalog=require('../sql/equivalencias_sistemas.json')
const {generatePdf}=require('../src/services/equiparacion-pdf.service')

test('una equiparación habitual de tres o nueve cursos cabe completa en una hoja',async()=>{
  const base={
    codigo:'56-2026',fecha_impresion:'2026-09-02',sede_nombre:'Quetzaltenango',
    estudiante_nombre:'Jesse Iván López de León',estudiante_carnet:'3191609200911',
    registro_academico:'201931742',carrera_de:'Ingeniería en Ciencias y Sistemas',
    carrera_a:'Ingeniería en Ciencias y Sistemas',carrera_a_subfijo:'Ing. Sistemas',
    pensum_de_anio:2016,pensum_a_anio:2025,institucion_de_codigo:'CUNOC',
    institucion_a_codigo:'CUNOC',coordinador_subfijo:'Ing.',
    coordinador_nombre:'Juan Francisco Rojas Santizo',
    coordinador_cargo:'Coordinador Ingeniería en Ciencias y Sistemas',
    director_subfijo:'Ing.',director_nombre:'Edelman Cándido Monzón López',
    director_cargo:'Director División Ciencias de la Ingeniería',num_expediente:'91-2026'
  }
  for(const count of [3,9]){
    const cursos=catalog.slice(0,count).map((c,i)=>({
      numero:i+1,curso_de_codigo:c.codigo_de,curso_de_nombre:c.nombre_de,
      curso_a_codigo:c.codigo_a,curso_a_nombre:c.nombre_a,
      porcentaje:c.porcentaje,opinion:c.opinion
    }))
    const pdf=await generatePdf({...base,cursos})
    assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,1,`${count} cursos`)
  }
})
