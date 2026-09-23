"""
constancia_reader.py
Extrae datos del estudiante de una Constancia Digital de Inscripcion CUNOC.
Verifica que el documento sea una constancia valida antes de extraer.

Uso:   python constancia_reader.py <ruta_pdf>
Salida: JSON por stdout
"""

import sys
import json
import re

try:
    import pdfplumber
except ImportError:
    print(json.dumps({"error": "pdfplumber no instalado. Ejecuta: pip install pdfplumber"}))
    sys.exit(1)


def limpiar(texto):
    return " ".join(str(texto or "").split()).strip()


def extraer_datos(ruta_pdf):
    texto_completo = ""

    try:
        with pdfplumber.open(ruta_pdf) as pdf:
            for pagina in pdf.pages:
                texto = pagina.extract_text()
                if texto:
                    texto_completo += texto + "\n"
    except Exception as e:
        return {"error": f"No se pudo leer el PDF: {str(e)}"}

    if not texto_completo.strip():
        return {"error": "El PDF no contiene texto extraible. Debe ser un PDF digital, no escaneado."}

    # Verificacion: debe contener el titulo de la constancia
    if not re.search(r'CONSTANCIA\s+DIGITAL\s+DE\s+INSCRIPCI[OÓ]N', texto_completo, re.IGNORECASE):
        return {"error": "El documento no es una Constancia Digital de Inscripcion valida."}

    registro = None
    carne     = None
    nombre    = None

    for linea in texto_completo.splitlines():
        linea_limpia = limpiar(linea)

        if registro is None:
            m = re.search(r'Registro\s+Acad[eé]mico\s*[:\-]?\s*(\d{5,15})', linea_limpia, re.IGNORECASE)
            if m:
                registro = m.group(1).strip()

        if carne is None:
            m = re.search(r'Carn[eé]\s*[:\-]?\s*(\d{5,20})', linea_limpia, re.IGNORECASE)
            if m:
                carne = m.group(1).strip()

        if nombre is None:
            m = re.search(r'Nombre\s*[:\-]\s*(.+)', linea_limpia, re.IGNORECASE)
            if m:
                candidato = limpiar(m.group(1))
                # Descarta si parece metadata
                if candidato and not re.search(r'carrera|inscripci|ciclo|c[oó]digo', candidato, re.IGNORECASE):
                    nombre = candidato

    errores = []
    if not registro: errores.append("Registro Academico no encontrado")
    if not carne:    errores.append("Carne no encontrado")
    if not nombre:   errores.append("Nombre no encontrado")

    if errores:
        return {
            "error": "No se pudieron extraer todos los datos: " + "; ".join(errores),
            "texto_extraido": texto_completo[:600],
        }

    return {
        "registro_academico": registro,
        "carnet":             carne,
        "nombre":             nombre,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: python constancia_reader.py <ruta_pdf>"}))
        sys.exit(1)

    resultado = extraer_datos(sys.argv[1])
    print(json.dumps(resultado, ensure_ascii=False))