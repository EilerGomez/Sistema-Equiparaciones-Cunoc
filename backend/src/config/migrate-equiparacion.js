require('dotenv').config()
const mysql=require('mysql2/promise')
const fs=require('fs/promises')
const path=require('path')
async function main(){
  const name=process.env.DB_NAME || 'equiparacion_db'
  if(!/^[a-zA-Z0-9_]+$/.test(name)||!name.startsWith('equiparacion'))throw new Error('DB_NAME debe comenzar con equiparacion. No ejecutar en la base anterior.')
  const conn=await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,multipleStatements:true,charset:'utf8mb4'})
  try{
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await conn.query(`USE \`${name}\``)
    await conn.query('CREATE TABLE IF NOT EXISTS schema_migrations (nombre VARCHAR(100) PRIMARY KEY, aplicado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    for(const file of ['001_esquema.sql','002_sistemas_2016_2025.sql','003_catalogos_equivalencias.sql']){
      const [[done]]=await conn.query('SELECT nombre FROM schema_migrations WHERE nombre=?',[file])
      if(done){console.log('Ya aplicado:',file);continue}
      await conn.query(await fs.readFile(path.join(__dirname,'../../sql',file),'utf8'))
      await conn.query('INSERT INTO schema_migrations(nombre) VALUES (?)',[file])
      console.log('Aplicado:',file)
    }
  }finally{await conn.end()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1})
