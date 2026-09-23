require('dotenv').config()
const {pool}=require('../src/config/db')
async function main(){
  const source=process.env.LEGACY_DB_NAME
  if(!source||!/^[a-zA-Z0-9_]+$/.test(source)||source===process.env.DB_NAME)throw new Error('Configura LEGACY_DB_NAME con la base de equivalencias anterior')
  const conn=await pool.getConnection()
  try{
    await conn.beginTransaction()
    const [result]=await conn.query(`INSERT INTO usuarios(nombre,email,password_hash,rol_id,activo)
      SELECT u.nombre,u.email,u.password_hash,r.id,u.activo FROM \`${source}\`.usuarios u
      JOIN \`${source}\`.roles oldr ON oldr.id=u.rol_id JOIN roles r ON r.nombre=oldr.nombre
      WHERE NOT EXISTS (SELECT 1 FROM usuarios n WHERE n.email=u.email)`)
    await conn.commit();console.log('Usuarios copiados:',result.affectedRows,'Las contrasenas se conservan. La base original no se modifica.')
  }catch(e){await conn.rollback();throw e}finally{conn.release();await pool.end()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;pool.end()})
