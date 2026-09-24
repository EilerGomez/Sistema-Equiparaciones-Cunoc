const path = require('path')
const { spawn } = require('child_process')

function readPdf(buffer) {
  return new Promise((resolve,reject)=>{
    const script=path.join(__dirname,'../../scripts/equiparacion_reader.py')
    const child=spawn(process.env.PYTHON_BIN || 'python',[script,'-'],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'}})
    let output='',error=''
    const timeout=setTimeout(()=>child.kill(),30000)
    child.stdout.on('data',chunk=>{output+=chunk.toString('utf8');if(output.length>2_000_000)child.kill()})
    child.stderr.on('data',chunk=>{error+=chunk.toString('utf8').slice(0,1000)})
    child.on('error',err=>{clearTimeout(timeout);reject(Object.assign(new Error(`No se pudo iniciar Python: ${err.message}`),{status:503}))})
    child.on('close',code=>{
      clearTimeout(timeout)
      let parsed
      try{parsed=JSON.parse(output.trim())}catch{reject(Object.assign(new Error(`No se pudo leer el PDF. Verifica Python y PyMuPDF. ${error.slice(0,250)}`),{status:503}));return}
      if(code!==0||!parsed.ok){reject(Object.assign(new Error(parsed.error || 'No se pudo leer el PDF'),{status:422}));return}
      resolve(parsed.data)
    })
    child.stdin.on('error',()=>{})
    child.stdin.end(buffer)
  })
}

module.exports={readPdf}
