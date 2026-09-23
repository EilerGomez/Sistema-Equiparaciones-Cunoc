const fs=require('fs')
const path=require('path')
const crypto=require('crypto')
const dotenv=require('dotenv')
const target=path.resolve(__dirname,'../.env')
if(fs.existsSync(target)){console.error('Ya existe backend/.env. Editalo directamente para conservar tu configuracion.');process.exit(1)}
const source=process.argv[2]
let values=dotenv.parse(fs.readFileSync(path.resolve(__dirname,'../.env.example')))
if(source){
  const old=dotenv.parse(fs.readFileSync(path.resolve(source)))
  for(const key of ['DB_HOST','DB_PORT','DB_USER','DB_PASSWORD','MAIL_HOST','MAIL_PORT','MAIL_SECURE','MAIL_USER','MAIL_PASSWORD','MAIL_FROM'])if(old[key]!==undefined)values[key]=old[key]
  if(old.DB_NAME)values.LEGACY_DB_NAME=old.DB_NAME
}
values.DB_NAME='equiparacion_db';values.PORT='3001';values.FRONTEND_URL='http://localhost:3001'
values.JWT_SECRET=crypto.randomBytes(48).toString('hex');values.JWT_REFRESH_SECRET=crypto.randomBytes(48).toString('hex')
fs.writeFileSync(target,Object.entries(values).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{mode:0o600})
console.log('Configuracion creada. Revisa los datos de MySQL en backend/.env.')
