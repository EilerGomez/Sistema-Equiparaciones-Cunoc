require('dotenv').config()
const readline=require('readline/promises')
const {pool}=require('../src/config/db')
const {hashPassword}=require('../src/utils/password')
async function main(){
  const rl=readline.createInterface({input:process.stdin,output:process.stdout})
  try{
    const nombre=(await rl.question('Nombre: ')).trim()
    const email=(await rl.question('Correo: ')).trim()
    console.log('La contrasena se vera en esta terminal local.')
    const password=await rl.question('Contrasena (minimo 12 caracteres): ')
    if(!nombre||!/^\S+@\S+\.\S+$/.test(email)||password.length<12)throw new Error('Datos invalidos')
    const hash=await hashPassword(password)
    await pool.query("INSERT INTO usuarios(nombre,email,password_hash,rol_id) SELECT ?,?,?,id FROM roles WHERE nombre='admin'",[nombre,email,hash])
    console.log('Administrador creado.')
  }finally{rl.close();await pool.end()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1})
