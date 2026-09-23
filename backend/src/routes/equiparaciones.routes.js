const router = require('express').Router()
const { pool } = require('../config/db')
const { authorize } = require('../middlewares/auth.middleware')
const service = require('../services/equiparacion.service')
const { generatePdf } = require('../services/equiparacion-pdf.service')
const wrap = fn => async (req,res,next) => {try{await fn(req,res)}catch(e){next(e)}}
router.use(authorize('admin','coordinador'))
router.get('/',wrap(async(req,res)=>{
  const page=Math.max(1,Number.parseInt(req.query.page,10)||1)
  const search=String(req.query.search || '').slice(0,150)
  const estado=String(req.query.estado || '')
  const params=[`%${search}%`,`%${search}%`,`%${search}%`,estado,estado]
  const where='WHERE (e.codigo LIKE ? OR s.nombre_completo LIKE ? OR s.carnet LIKE ?) AND (?="" OR e.estado=?)'
  const [[{total}]]=await pool.query(`SELECT COUNT(*) total FROM equiparacion e JOIN estudiante s ON s.id=e.id_estudiante ${where}`,params)
  const [items]=await pool.query(`SELECT e.id,e.codigo,e.anio,e.correlativo,e.estado,e.creado_en,s.nombre_completo AS estudiante_nombre,s.carnet,
    pd.codigo AS pensum_de_codigo,pd.anio AS pensum_de_anio,cd.descripcion AS carrera_de,
    pa.codigo AS pensum_a_codigo,pa.anio AS pensum_a_anio,ca.descripcion AS carrera_a,
    (SELECT COUNT(*) FROM cursos_equiparacion c WHERE c.id_equiparacion=e.id) AS total_cursos
    FROM equiparacion e JOIN estudiante s ON s.id=e.id_estudiante
    LEFT JOIN pensum pd ON pd.id=e.id_pensum_de LEFT JOIN carreras cd ON cd.id=pd.id_carrera
    LEFT JOIN pensum pa ON pa.id=e.id_pensum_a LEFT JOIN carreras ca ON ca.id=pa.id_carrera
    ${where} ORDER BY e.anio DESC,e.correlativo DESC LIMIT 20 OFFSET ?`,[...params,(page-1)*20])
  res.json({items,total:Number(total),page,pageSize:20})
}))
router.get('/catalogos',wrap(async(_req,res)=>{
  const names=['estudiantes','pensums','autoridades','sedes','equivalencias','coordinadores']
  const queries=[
    'SELECT id,nombre_completo,carnet,registro_academico FROM estudiante ORDER BY nombre_completo',
    'SELECT p.*,c.descripcion AS carrera,i.nombre AS institucion FROM pensum p JOIN carreras c ON c.id=p.id_carrera JOIN instituciones i ON i.id=c.id_institucion ORDER BY p.anio',
    'SELECT a.*,p.subfijo FROM autoridades a JOIN profesiones p ON p.id=a.id_profesion ORDER BY a.nombre',
    'SELECT * FROM cede ORDER BY nombre',
    `SELECT ec.*,d.codigo AS curso_de_codigo,d.nombre AS curso_de_nombre,a.codigo AS curso_a_codigo,a.nombre AS curso_a_nombre,pd.id_pensum AS id_pensum_de,pa.id_pensum AS id_pensum_a
      FROM equivalencia_curso ec JOIN curso d ON d.id=ec.id_curso_de JOIN curso a ON a.id=ec.id_curso_a
      JOIN pensum_curso pd ON pd.id_curso=d.id JOIN pensum_curso pa ON pa.id_curso=a.id ORDER BY CAST(d.codigo AS UNSIGNED),d.codigo`,
    'SELECT id_carrera,id_autoridad_coordinador FROM autoridades_carrera'
  ]
  const results=await Promise.all(queries.map(q=>pool.query(q)))
  res.json(Object.fromEntries(names.map((n,i)=>[n,results[i][0]])))
}))
router.get('/estudiantes/buscar',wrap(async(req,res)=>{
  const buscar=String(req.query.buscar || '').trim().slice(0,100)
  if(buscar.length<2)return res.json([])
  const term=`%${buscar}%`
  const [rows]=await pool.query('SELECT id,nombre_completo,carnet,registro_academico FROM estudiante WHERE carnet LIKE ? OR registro_academico LIKE ? OR nombre_completo LIKE ? ORDER BY nombre_completo LIMIT 20',[term,term,term])
  res.json(rows)
}))
router.param('id',(req,res,next,id)=> /^\d+$/.test(id)&&Number(id)>0 ? next() : res.status(400).json({message:'Identificador invalido'}))
router.get('/:id',wrap(async(req,res)=>res.json(await service.detail(req.params.id))))
router.get('/:id/equivalencias',wrap(async(req,res)=>{
  const [[documento]]=await pool.query('SELECT id_pensum_de,id_pensum_a FROM equiparacion WHERE id=?',[req.params.id])
  if(!documento)throw service.fallo(404,'Equiparacion no encontrada')
  const [rows]=await pool.query(`SELECT ec.*,d.codigo AS curso_de_codigo,d.nombre AS curso_de_nombre,
    a.codigo AS curso_a_codigo,a.nombre AS curso_a_nombre
    FROM equivalencia_curso ec
    JOIN pensum_curso pd ON pd.id_curso=ec.id_curso_de AND pd.id_pensum=?
    JOIN pensum_curso pa ON pa.id_curso=ec.id_curso_a AND pa.id_pensum=?
    JOIN curso d ON d.id=ec.id_curso_de JOIN curso a ON a.id=ec.id_curso_a
    ORDER BY CAST(d.codigo AS UNSIGNED),d.codigo`,[documento.id_pensum_de,documento.id_pensum_a])
  res.json(rows)
}))
router.post('/',wrap(async(req,res)=>{const id=await service.save(req.body);res.status(201).json(await service.detail(id))}))
router.put('/:id',wrap(async(req,res)=>{
  const {cursosReiniciados}=await service.updateMetadata(Number(req.params.id),req.body)
  res.json({...await service.detail(req.params.id),cursosReiniciados})
}))
router.put('/:id/cursos',wrap(async(req,res)=>{
  await service.updateCourses(Number(req.params.id),req.body.cursos)
  res.json(await service.detail(req.params.id))
}))
router.patch('/:id/estado',wrap(async(req,res)=>{
  await service.updateEstado(Number(req.params.id),req.body.estado)
  res.json(await service.detail(req.params.id))
}))
router.post('/:id/impresion',wrap(async(req,res)=>{
  const conn=await pool.getConnection()
  try{
    await conn.beginTransaction()
    const [[row]]=await conn.query('SELECT id FROM equiparacion WHERE id=? FOR UPDATE',[req.params.id])
    if(!row)throw service.fallo(404,'Equiparacion no encontrada')
    const [[{total}]]=await conn.query('SELECT COUNT(*) AS total FROM cursos_equiparacion WHERE id_equiparacion=?',[row.id])
    if(!total)throw service.fallo(400,'Agrega cursos antes de imprimir')
    await conn.query('UPDATE equiparacion SET fecha_impresion=UTC_TIMESTAMP() WHERE id=?',[row.id])
    await conn.query('UPDATE cursos_equiparacion SET fecha_impresion=UTC_TIMESTAMP() WHERE id_equiparacion=?',[row.id])
    const documento=await service.detail(row.id,conn)
    await conn.commit()
    res.json(documento)
  }catch(error){await conn.rollback();throw error}finally{conn.release()}
}))
router.get('/:id/pdf',wrap(async(req,res)=>{
  const conn=await pool.getConnection()
  let buffer,e
  try{
    await conn.beginTransaction()
    const [[locked]]=await conn.query('SELECT id FROM equiparacion WHERE id=? FOR UPDATE',[req.params.id])
    if(!locked)throw service.fallo(404,'Equiparacion no encontrada')
    e=await service.detail(req.params.id,conn)
    if(!e.cursos.length)throw service.fallo(400,'Agrega cursos antes de visualizar o descargar el PDF')
    e.fecha_impresion=new Date()
    buffer=await generatePdf(e)
    if(req.query.download==='1'){
      await conn.query('UPDATE equiparacion SET fecha_impresion=UTC_TIMESTAMP() WHERE id=?',[e.id])
      await conn.query('UPDATE cursos_equiparacion SET fecha_impresion=UTC_TIMESTAMP() WHERE id_equiparacion=?',[e.id])
    }
    await conn.commit()
  }catch(err){await conn.rollback();throw err}finally{conn.release()}
  res.type('pdf').set('Content-Disposition',`${req.query.download==='1'?'attachment':'inline'}; filename="equiparacion-${e.codigo}.pdf"`).send(buffer)
}))
module.exports=router
