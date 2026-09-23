const router=require('express').Router()
const {pool}=require('../../config/db')
const {authorize}=require('../../middlewares/auth.middleware')
const {fallo}=require('../../services/equiparacion.service')
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(e){next(e)}}
router.use(authorize('admin','coordinador'))
router.get('/',wrap(async(_req,res)=>{
  const [rows]=await pool.query(`SELECT ec.*,d.codigo AS curso_de_codigo,d.nombre AS curso_de_nombre,a.codigo AS curso_a_codigo,a.nombre AS curso_a_nombre,
    EXISTS(SELECT 1 FROM cursos_equiparacion ce WHERE ce.id_curso_de=ec.id_curso_de AND ce.id_curso_a=ec.id_curso_a) AS utilizada
    FROM equivalencia_curso ec JOIN curso d ON d.id=ec.id_curso_de JOIN curso a ON a.id=ec.id_curso_a ORDER BY CAST(d.codigo AS UNSIGNED),d.codigo`)
  res.json(rows)
}))
function validate(b){
  for(const key of ['id_curso_de','id_curso_a'])if(!Number.isSafeInteger(Number(b[key]))||Number(b[key])<1)throw fallo(400,'Selecciona ambos cursos')
  if(b.porcentaje===''||b.porcentaje==null||!Number.isFinite(Number(b.porcentaje))||Number(b.porcentaje)<0||Number(b.porcentaje)>100)throw fallo(400,'Porcentaje invalido (0 a 100)')
  if(typeof b.opinion!=='string'||!b.opinion.trim()||b.opinion.length>50)throw fallo(400,'Opinion requerida, maximo 50 caracteres')
}
router.post('/',wrap(async(req,res)=>{
  validate(req.body)
  const b=req.body
  await pool.query('INSERT INTO equivalencia_curso(id_curso_de,id_curso_a,porcentaje,opinion) VALUES (?,?,?,?)',[b.id_curso_de,b.id_curso_a,Number(b.porcentaje),b.opinion.trim().toUpperCase()])
  res.status(201).json({message:'Equivalencia creada'})
}))
router.put('/',wrap(async(req,res)=>{
  validate(req.body)
  const b=req.body,conn=await pool.getConnection()
  try{
    await conn.beginTransaction()
    const [[row]]=await conn.query('SELECT * FROM equivalencia_curso WHERE id_curso_de=? AND id_curso_a=? FOR UPDATE',[b.old_id_curso_de,b.old_id_curso_a])
    if(!row)throw fallo(404,'Equivalencia no encontrada')
    const [[used]]=await conn.query('SELECT 1 FROM cursos_equiparacion WHERE id_curso_de=? AND id_curso_a=? LIMIT 1',[b.old_id_curso_de,b.old_id_curso_a])
    if(used)throw fallo(409,'Esta equivalencia ya esta en una equiparacion. No se modifica para conservar el documento emitido.')
    await conn.query('UPDATE equivalencia_curso SET id_curso_de=?,id_curso_a=?,porcentaje=?,opinion=? WHERE id_curso_de=? AND id_curso_a=?',[b.id_curso_de,b.id_curso_a,Number(b.porcentaje),b.opinion.trim().toUpperCase(),b.old_id_curso_de,b.old_id_curso_a])
    await conn.commit();res.json({message:'Equivalencia actualizada'})
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
}))
router.delete('/',wrap(async(req,res)=>{
  const [r]=await pool.query('DELETE FROM equivalencia_curso WHERE id_curso_de=? AND id_curso_a=?',[req.body.id_curso_de,req.body.id_curso_a])
  if(!r.affectedRows)throw fallo(404,'Equivalencia no encontrada')
  res.json({message:'Equivalencia eliminada'})
}))
module.exports=router
