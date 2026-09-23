const path = require('path')
const { spawn } = require('child_process')

const extraerJsonDesdeSalida = (stdout) => {
  const texto = String(stdout || '').trim()

  if (!texto) {
    throw new Error('Python no devolvió ninguna salida')
  }

  try {
    return JSON.parse(texto)
  } catch (_) {
    // A veces PyMuPDF imprime warnings antes del JSON:
    // MuPDF error: format error: No default Layer config
    // {"ok": true, ...}
    const inicio = texto.indexOf('{')
    const fin = texto.lastIndexOf('}')

    if (inicio === -1 || fin === -1 || fin <= inicio) {
      throw new Error(`No se encontró JSON válido en la salida de Python: ${texto}`)
    }

    const posibleJson = texto.slice(inicio, fin + 1)

    return JSON.parse(posibleJson)
  }
}

const leerProvPdf = (pdfPath) => {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env.PYTHON_BIN || 'python'
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'prov_reader.py')

    const child = spawn(pythonBin, [scriptPath, pdfPath], {
      cwd: path.join(__dirname, '..', '..'),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8')
    })

    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', err => {
      reject(err)
    })

    child.on('close', code => {
      let parsed = null

      try {
        parsed = extraerJsonDesdeSalida(stdout)
      } catch (err) {
        return reject(new Error(
          `Python no devolvió JSON válido. Código ${code}. STDERR: ${stderr || 'sin stderr'} STDOUT: ${stdout || 'sin stdout'}`
        ))
      }

      if (code !== 0 || parsed.ok === false) {
        return resolve({
          ok: false,
          error: parsed.error || stderr || 'Error al leer PDF con Python',
          raw: parsed,
        })
      }

      resolve(parsed)
    })
  })
}

module.exports = {
  leerProvPdf,
}