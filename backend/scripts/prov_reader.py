import io
import json
import os
import re
import sys
from datetime import date
from difflib import SequenceMatcher

try:
    import fitz
except Exception as exc:
    print(json.dumps({"ok": False, "error": f"No se pudo importar PyMuPDF/fitz: {str(exc)}"}, ensure_ascii=False))
    sys.exit(1)

try:
    from PIL import Image
    import pytesseract
except Exception:
    Image = None
    pytesseract = None

MESES = {
    "enero":1,"febrero":2,"marzo":3,"abril":4,"mayo":5,"junio":6,
    "julio":7,"agosto":8,"septiembre":9,"setiembre":9,"octubre":10,
    "noviembre":11,"diciembre":12,
}
DIAS_TEXTO = {
    "uno":1,"un":1,"primero":1,"dos":2,"tres":3,"cuatro":4,"cinco":5,
    "seis":6,"siete":7,"ocho":8,"nueve":9,"diez":10,"once":11,"doce":12,
    "trece":13,"catorce":14,"quince":15,"dieciseis":16,"dieciséis":16,
    "diecisiete":17,"dieciocho":18,"diecinueve":19,"veinte":20,
    "veintiuno":21,"veintiun":21,"veintiún":21,"veintidos":22,"veintidós":22,
    "veintitres":23,"veintitrés":23,"veinticuatro":24,"veinticinco":25,
    "veintiseis":26,"veintiséis":26,"veintisiete":27,"veintiocho":28,
    "veintinueve":29,"treinta":30,"treinta y uno":31,
}

def quitar_tildes(texto):
    reemplazos = {
        "á":"a","é":"e","í":"i","ó":"o","ú":"u","ü":"u","ñ":"n",
        "Á":"A","É":"E","Í":"I","Ó":"O","Ú":"U","Ü":"U","Ñ":"N",
    }
    texto = str(texto or "")
    for o, n in reemplazos.items():
        texto = texto.replace(o, n)
    return texto

def normalizar(texto):
    texto = quitar_tildes(texto)
    texto = texto.lower()
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip()

def normalizar_busqueda(texto):
    texto = quitar_tildes(texto)
    texto = texto.lower()
    texto = re.sub(r"[^a-z0-9]+", " ", texto)
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip()

def limpiar_linea(texto):
    texto = str(texto or "")
    texto = texto.replace("\u00a0", " ")
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\s+\n", "\n", texto)
    texto = re.sub(r"\n\s+", "\n", texto)
    return texto.strip()

def limpiar_nombre(texto):
    texto = limpiar_linea(texto)
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip(" :-|")

def limpiar_nombre_curso(texto):
    texto = limpiar_nombre(texto)
    for pat in [
        r"\bPorcentaje\b.*$", r"\bOpini[oó]n\b.*$", r"\bPensum\b.*$",
        r"\bSolicitado\b.*$", r"\bEquivalencia\b.*$",
        r"\bC[oó]digo\b.*$", r"\bNombre del curso\b.*$",
    ]:
        texto = re.sub(pat, "", texto, flags=re.IGNORECASE)
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip(" :-|")

def normalizar_nombre_curso(texto):
    texto = normalizar_busqueda(texto)
    palabras_ruido = {
        "curso","codigo","nombre","del","de","la","el","los","las",
        "por","area","pensum","solicitado","equivalencia","cursos",
    }
    partes = [p for p in texto.split() if p not in palabras_ruido]
    return " ".join(partes).strip()

def similitud_texto(a, b):
    a_norm = normalizar_nombre_curso(a)
    b_norm = normalizar_nombre_curso(b)
    if not a_norm or not b_norm: return 0
    if a_norm == b_norm: return 1
    if a_norm in b_norm or b_norm in a_norm: return 0.94
    return SequenceMatcher(None, a_norm, b_norm).ratio()

def normalizar_codigo_curso(codigo):
    numeros = re.sub(r"\D", "", str(codigo or ""))
    if not numeros: return ""
    if len(numeros) < 3: return numeros.zfill(3)
    return numeros

def dia_texto_a_numero(valor):
    valor = normalizar(valor)
    if valor.isdigit(): return int(valor)
    return DIAS_TEXTO.get(valor)

def convertir_fecha_letras_a_iso(texto):
    if not texto: return None
    texto_normal = normalizar(texto)
    patron = re.compile(
        r"(\d{1,2}|[a-zñáéíóúü ]{2,35})\s+de\s+"
        r"(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)"
        r"\s+(?:de|del)\s+(\d{4})", re.IGNORECASE
    )
    m = patron.search(texto_normal)
    if not m: return None
    dia = dia_texto_a_numero(m.group(1).strip())
    mes = MESES.get(m.group(2).strip())
    anio = int(m.group(3).strip())
    if not dia or not mes: return None
    try:
        return date(anio, mes, dia).isoformat()
    except Exception:
        return None

def extraer_texto_ocr(page, zoom=2):
    if Image is None or pytesseract is None: return ""
    try:
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        lang = os.environ.get("TESSERACT_LANG", "spa+eng")
        return pytesseract.image_to_string(img, lang=lang)
    except Exception:
        return ""

def texto_parece_codificado_mal(texto):
    """Detecta texto extraído con codificación dañada para forzar OCR.
    Ejemplo: letras cirílicas, símbolos raros o secuencias ilegibles en constancias PDF.
    """
    texto = str(texto or "")
    if not texto.strip():
        return False

    raros = 0
    total_util = 0
    permitido = set(' áéíóúüñÁÉÍÓÚÜÑ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,;:()[]{}-/\\_\'"°%#&+*=<>@|¿?¡!$\n\r\t')

    for ch in texto:
        if ch.isspace():
            continue
        total_util += 1
        if ch in permitido:
            continue
        nombre = ""
        try:
            import unicodedata
            nombre = unicodedata.name(ch, "")
        except Exception:
            nombre = ""
        if "LATIN" in nombre:
            continue
        raros += 1

    if total_util == 0:
        return False

    proporcion = raros / total_util
    return raros >= 12 and proporcion >= 0.025

def es_pagina_constancia(texto_norm):
    """Detecta si una página es algún tipo de constancia de inscripción."""
    texto_norm = normalizar(texto_norm)
    if "constancia digital de inscripcion" in texto_norm:
        return True
    if "constancia de inscripcion" in texto_norm:
        return True
    if ("departamento de registro y estadistica" in texto_norm and
            "constancia" in texto_norm):
        return True
    return False

def es_pagina_certificacion_cursos(texto_norm):
    """Detecta la certificación/certificado de cursos aprobados para detener la lectura de equivalencias."""
    texto_norm = normalizar(texto_norm)
    if "certifica" in texto_norm and (
        "cursos aprobados" in texto_norm or
        "ha cursado y aprobado" in texto_norm or
        "registro academico" in texto_norm
    ):
        return True
    if "certificacion de cursos aprobados" in texto_norm:
        return True
    if "certificado de cursos aprobados" in texto_norm:
        return True
    if "ha cursado y aprobado los siguientes cursos" in texto_norm:
        return True
    return False

def es_pagina_fin_cursos_solicitados(texto_norm):
    """Indica si ya terminó la sección de cuadros comparativos/equivalencias."""
    texto_norm = normalizar(texto_norm)
    return es_pagina_constancia(texto_norm) or es_pagina_certificacion_cursos(texto_norm)

def leer_paginas_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    paginas = []
    max_ocr_pages = int(os.environ.get("MAX_OCR_PAGES", "7"))

    for index in range(len(doc)):
        page = doc[index]
        texto_digital = ""
        try:
            texto_digital = page.get_text("text") or ""
        except Exception:
            texto_digital = ""

        texto_final = texto_digital.strip()
        texto_norm = normalizar(texto_final)

        claves = [
            "prov. ryca", "constancia digital de inscripcion",
            "constancia de inscripcion", "certifica",
            "cursos solicitados para equivalencia", "cursos solicitados",
            "cuadro comparativo para equivalencia de cursos",
            "cuadro comparativo", "solicitud de equivalencias",
        ]

        debe_ocr = len(texto_final) < 80
        texto_mal_codificado = texto_parece_codificado_mal(texto_final)
        if index < max_ocr_pages:
            if texto_mal_codificado:
                debe_ocr = True
            elif not any(clave in texto_norm for clave in claves) and len(texto_final) < 500:
                debe_ocr = True

        if debe_ocr and index < max_ocr_pages:
            texto_ocr = extraer_texto_ocr(page)
            if len(texto_ocr.strip()) > len(texto_final):
                texto_final = texto_ocr.strip()
            elif texto_ocr.strip():
                texto_final = f"{texto_final}\n{texto_ocr.strip()}"

        paginas.append({
            "numero": index + 1,
            "texto": limpiar_linea(texto_final),
        })

    return paginas

def buscar_pagina(paginas, claves_obligatorias, claves_opcionales=None):
    claves_obligatorias = claves_obligatorias or []
    claves_opcionales = claves_opcionales or []
    mejor = None
    mejor_score = -1
    for pagina in paginas:
        texto_norm = normalizar(pagina["texto"])
        if not all(normalizar(clave) in texto_norm for clave in claves_obligatorias):
            continue
        score = sum(1 for clave in claves_opcionales if normalizar(clave) in texto_norm)
        if score > mejor_score:
            mejor = pagina
            mejor_score = score
    return mejor

def extraer_prov(texto):
    texto = texto or ""
    m = re.search(r"Prov\.?\s*RYCA\s*([A-Za-z0-9ÁÉÍÓÚáéíóúÑñ./\- ]{3,40})", texto, re.IGNORECASE)
    if not m: return None
    valor = m.group(1)
    valor = valor.replace("Equivalencia Registro","").replace("Equivalencia","").replace("Registro","")
    return valor.strip(" .,\n\t") or None

def extraer_sede(texto):
    texto_norm = normalizar(texto)
    if "quetzaltenango" in texto_norm: return "Quetzaltenango"
    if "centro universitario de occidente" in texto_norm: return "Centro Universitario de Occidente"
    if "cunoc" in texto_norm: return "CUNOC"
    return None

def extraer_fecha_prov(texto):
    if not texto: return None
    fecha = convertir_fecha_letras_a_iso(texto)
    if fecha: return fecha
    m = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", texto)
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
        except Exception:
            return None
    return None

def limpiar_nombre_carrera(texto):
    texto = limpiar_nombre(texto)
    texto = re.sub(r"\bDEL\s+CUNOC\b.*$", "", texto, flags=re.IGNORECASE)
    texto = re.sub(r"\bCUNOC\b.*$", "", texto, flags=re.IGNORECASE)
    texto = re.sub(r"\bSOLICITA\b.*$", "", texto, flags=re.IGNORECASE)
    texto = re.sub(r"\bPENSUM\b.*$", "", texto, flags=re.IGNORECASE)
    texto = re.sub(r"\s+", " ", texto)
    texto = texto.strip(" .,:;-|()")
    return texto or None

def formatear_nombre_carrera(texto):
    texto = limpiar_nombre_carrera(texto)
    if not texto:
        return None

    norm = normalizar_busqueda(texto)
    carreras_conocidas = {
        "ingenieria mecanica industrial": "Ingeniería Mecánica Industrial",
        "ingenieria civil": "Ingeniería Civil",
        "ingenieria en ciencias y sistemas": "Ingeniería en Ciencias y Sistemas",
        "ingenieria mecanica": "Ingeniería Mecánica",
        "ingenieria industrial": "Ingeniería Industrial",
        "ingenieria electrica": "Ingeniería Eléctrica",
        "ingenieria electronica": "Ingeniería Electrónica",
        "ingenieria quimica": "Ingeniería Química",
    }
    if norm in carreras_conocidas:
        return carreras_conocidas[norm]

    if texto.upper() == texto:
        texto = texto.title()
        reemplazos = {
            " De ": " de ",
            " Del ": " del ",
            " La ": " la ",
            " Las ": " las ",
            " Los ": " los ",
            " Y ": " y ",
            " En ": " en ",
        }
        for original, nuevo in reemplazos.items():
            texto = texto.replace(original, nuevo)

    return texto.strip() or None

def extraer_carrera_origen_desde_prov(texto):
    """
    Extrae la carrera origen desde la primera carta PROV/RYCA.
    Prioridad: "Carrera de {nombre} DEL CUNOC".
    Ejemplo: "estudiante de la Carrera de INGENIERIA EN CIENCIAS Y SISTEMAS DEL CUNOC, SOLICITA..."
    """
    if not texto:
        return None

    texto_lineal = limpiar_linea(texto)
    texto_lineal = re.sub(r"\s+", " ", texto_lineal).strip()

    patrones = [
        r"Carrera\s+de\s+(.+?)\s+DEL\s+CUNOC\b",
        r"Carrera\s+de\s+(.+?)\s+del\s+CUNOC\b",
        r"estudiante\s+de\s+la\s+Carrera\s+de\s+(.+?)\s*,\s*SOLICITA",
        r"estudiante\s+de\s+la\s+Carrera\s+de\s+(.+?)\s+SOLICITA",
    ]

    for patron in patrones:
        m = re.search(patron, texto_lineal, re.IGNORECASE)
        if m:
            carrera = formatear_nombre_carrera(m.group(1))
            if carrera:
                return carrera

    return None

# ─────────────────────────────────────────────────────────────────────────────
# EXTRACCIÓN DE DATOS DEL ESTUDIANTE
# Capa 1: Página PROV/carta (texto digital, líneas limpias)
# Capa 2: Constancia de inscripción (digital CUNOC o USAC/DIGA)
# Capa 3: Certificado de cursos aprobados
# ─────────────────────────────────────────────────────────────────────────────

def extraer_datos_estudiante_desde_prov(texto):
    """
    Capa 1: extrae registro, carné y nombre desde la carta PROV (página 2).
    Busca patrones como:
      - Registro: 8-10 dígitos solos en una línea
      - Carné: 10-15 dígitos solos en una línea
      - Nombre: línea de letras/espacios cercana al registro
    También busca el patrón explícito en el ASUNTO de la PROV:
      "ASUNTO: NOMBRE APELLIDO  CARNÉ No 12345..."
    """
    resultado = {"registro_academico": None, "carnet": None, "nombre_completo": None}
    if not texto: return resultado

    # Patrón: "ASUNTO: NOMBRE APELLIDO  CARNÉ No 2566098020406 y con Registro Académico No. 201430825"
    m = re.search(
        r"ASUNTO\s*:\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü ]{4,70}?)\s+"
        r"CARN[EÉ]\s+No\s+(\d{10,15})\s+y\s+con\s+Registro\s+Acad[eé]mico\s+No\.?\s+(\d{6,10})",
        texto, re.IGNORECASE
    )
    if m:
        resultado["nombre_completo"] = limpiar_nombre(m.group(1))
        resultado["carnet"] = m.group(2).strip()
        resultado["registro_academico"] = m.group(3).strip()
        return resultado

    # Patrón alternativo: "estudiante: NOMBRE APELLIDO, CARNÉ No..." (carta PROV distinto formato)
    m = re.search(
        r"Estudiante\s*:\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü ]{4,70}?),?\s+"
        r"Carn[eé]\s+No\.?\s*(\d{10,15})",
        texto, re.IGNORECASE
    )
    if m:
        resultado["nombre_completo"] = limpiar_nombre(m.group(1))
        resultado["carnet"] = m.group(2).strip()

    lineas = [l.strip() for l in texto.splitlines() if l.strip()]

    # Registro: 8-10 dígitos solos en una línea
    indice_registro = None
    for i, linea in enumerate(lineas):
        if re.fullmatch(r"\d{8,10}", linea):
            resultado["registro_academico"] = linea
            indice_registro = i
            break

    # Nombre: línea de solo letras/espacios inmediatamente después del registro
    if indice_registro is not None and not resultado["nombre_completo"]:
        for j in range(indice_registro + 1, min(indice_registro + 4, len(lineas))):
            candidato = lineas[j]
            if re.match(r"^[A-Za-záéíóúÁÉÍÓÚñÑüÜ ]{5,70}$", candidato):
                resultado["nombre_completo"] = candidato
                break

    # Carné: 10-15 dígitos solos en una línea
    if not resultado["carnet"]:
        for linea in lineas:
            if re.fullmatch(r"\d{10,15}", linea) and linea != resultado["registro_academico"]:
                resultado["carnet"] = linea
                break

    return resultado

def extraer_datos_desde_certificado(texto):
    """
    Capa 3: extrae registro, carné, nombre y nombre de carrera desde el certificado
    de cursos aprobados.
    Formato típico:
      "CARNÉ NO. 3149819690901   REGISTRO ACADÉMICO 202231688"
      Línea anterior: nombre del estudiante
      Línea posterior a "CARRERA": nombre de la carrera
    """
    resultado = {
        "registro_academico": None,
        "carnet": None,
        "nombre_completo": None,
        "nombre_carrera": None,
    }
    if not texto: return resultado

    # CARNÉ NO y REGISTRO ACADÉMICO en la misma línea (formato certificado CUNOC)
    m = re.search(
        r"CARN[EÉ]\s+NO\.?\s*(\d{10,15})\s+REGISTRO\s+ACAD[EÉ]MICO\s+(\d{6,10})",
        texto, re.IGNORECASE
    )
    if m:
        resultado["carnet"] = m.group(1).strip()
        resultado["registro_academico"] = m.group(2).strip()

    # Nombre: línea justo antes de "CARNÉ NO" o "REGISTRO ACADÉMICO"
    if resultado["carnet"] or resultado["registro_academico"]:
        lineas = [l.strip() for l in texto.splitlines() if l.strip()]
        for i, linea in enumerate(lineas):
            linea_norm = normalizar(linea)
            if "carne no" in linea_norm or "registro academico" in linea_norm:
                # Buscar hacia atrás una línea con nombre
                for j in range(i - 1, max(i - 4, -1), -1):
                    candidato = lineas[j]
                    # Nombre: letras, tildes, espacios, sin números, longitud razonable
                    if (re.match(r"^[A-Za-záéíóúÁÉÍÓÚñÑüÜ ]{6,80}$", candidato) and
                            len(candidato.split()) >= 2):
                        resultado["nombre_completo"] = candidato
                        break
                break

    # Nombre de carrera: línea después de "CURSOS DE LA CARRERA No."
    m = re.search(
        r"(?:CURSOS\s+DE\s+LA\s+CARRERA\s+No\.[^\n]*\n|"
        r"HA\s+CURSADO\s+Y\s+APROBADO\s+LOS\s+SIGUIENTES\s+CURSOS\s+DE\s+LA\s+CARRERA[^\n]*\n)"
        r"([^\n]+)",
        texto, re.IGNORECASE
    )
    if m:
        resultado["nombre_carrera"] = limpiar_nombre(m.group(1))

    return resultado

def extraer_estudiante_constancia(texto):
    """
    Capa 2: extrae datos del estudiante desde la constancia de inscripción.
    Soporta:
      - Constancia Digital CUNOC: "Registro Académico : 202231688"
      - Constancia USAC (DIGA):   "REGISTRO ACADÉMICO:  201830487  CUI: ..."
    También extrae código/nombre de carrera y fecha de inscripción.
    """
    estudiante = {"registro_academico": None, "carnet": None, "nombre_completo": None}
    codigo_carrera = None
    nombre_carrera = None
    fecha_inscripcion = None

    if not texto:
        return {"estudiante": estudiante, "codigo_carrera": codigo_carrera,
                "nombre_carrera": nombre_carrera, "fecha_inscripcion": fecha_inscripcion}

    # ── Formato A: Constancia Digital CUNOC ──────────────────────────────────
    m = re.search(r"Registro\s+Acad[eé]mico\s*:\s*([0-9]+)", texto, re.IGNORECASE)
    if m:
        estudiante["registro_academico"] = m.group(1).strip()

    m = re.search(r"Carn[eé]\s*:\s*([0-9]+)", texto, re.IGNORECASE)
    if m:
        estudiante["carnet"] = m.group(1).strip()

    m = re.search(r"Nombre\s*:\s*([^\n\r]+)", texto, re.IGNORECASE)
    if m:
        estudiante["nombre_completo"] = limpiar_nombre(m.group(1))

    # ── Formato B: Constancia USAC/DIGA ──────────────────────────────────────
    if not estudiante["registro_academico"]:
        m = re.search(r"REGISTRO\s+ACAD[EÉ]MICO\s*[:\.]?\s*([0-9]{6,10})", texto, re.IGNORECASE)
        if m:
            estudiante["registro_academico"] = m.group(1).strip()

    if not estudiante["carnet"]:
        m = re.search(r"CUI\s*[:\.]?\s*([0-9]{10,15})", texto, re.IGNORECASE)
        if m:
            estudiante["carnet"] = m.group(1).strip()

    if not estudiante["nombre_completo"]:
        m = re.search(r"ESTUDIANTE\s*:\s*([^\n\r]+)", texto, re.IGNORECASE)
        if m:
            estudiante["nombre_completo"] = limpiar_nombre(m.group(1))

    # Fallback: "Se hace constar que el estudiante Nombre Apellido, realizó..."
    if not estudiante["nombre_completo"]:
        m = re.search(
            r"(?:estudiante\s+)((?:[A-ZÁÉÍÓÚÑÜ][a-záéíóúüñ]+\s+){2,5})",
            texto, re.IGNORECASE
        )
        if m:
            candidato = limpiar_nombre(m.group(1))
            if len(candidato) > 8:
                estudiante["nombre_completo"] = candidato

    # ── Datos de carrera ──────────────────────────────────────────────────────
    m = re.search(r"C[oó]digo\s+de\s+Carrera\s*[:\.]?\s*([0-9]+)", texto, re.IGNORECASE)
    if m:
        codigo_carrera = m.group(1).strip()

    m = re.search(r"Nombre\s+de\s+Carrera\s*:\s*([^\n\r]+)", texto, re.IGNORECASE)
    if m:
        nombre_carrera = limpiar_nombre(m.group(1))

    m = re.search(r"Fecha\s+de\s+Inscripci[oó]n\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{1,2})", texto, re.IGNORECASE)
    if m:
        fecha_inscripcion = m.group(1).strip()

    return {
        "estudiante": estudiante,
        "codigo_carrera": codigo_carrera,
        "nombre_carrera": nombre_carrera,
        "fecha_inscripcion": fecha_inscripcion,
    }

def extraer_carrera_certificado(texto):
    """Extrae el nombre de la carrera origen desde el certificado de cursos aprobados."""
    if not texto: return None
    m = re.search(
        r"CURSOS\s+DE\s+LA\s+CARRERA\s+No\.[^\n\r]*[\n\r]+([^\n\r]+)",
        texto, re.IGNORECASE
    )
    if m: return limpiar_nombre(m.group(1))
    lineas = [limpiar_nombre(x) for x in texto.splitlines() if limpiar_nombre(x)]
    for i, linea in enumerate(lineas):
        if "CURSOS DE LA CARRERA" in linea.upper() and i + 1 < len(lineas):
            return limpiar_nombre(lineas[i + 1])
    return None

def extraer_cursos_aprobados(texto):
    if not texto: return []
    texto = texto.replace("–","-").replace("—","-").replace("\u00a0"," ")
    cursos = []
    vistos = set()
    texto_tabla = texto

    m_inicio = re.search(r"C[OÓ]DIGO\s+NOMBRE\s+DEL\s+CURSO\s+CALIFICACI[OÓ]N\s+FECHA", texto, re.IGNORECASE)
    if m_inicio:
        texto_tabla = texto[m_inicio.start():]

    m_fin = re.search(r"ULTIMA\s+LINEA|ÚLTIMA\s+LINEA|HABIENDO\s+APROBADO|FIRMA|Powered\s+by", texto_tabla, re.IGNORECASE)
    if m_fin:
        texto_tabla = texto_tabla[:m_fin.start()]

    for linea in texto_tabla.splitlines():
        linea = limpiar_linea(linea)
        if not linea: continue
        linea_norm = normalizar(linea)
        if "codigo nombre del curso" in linea_norm: continue
        m = re.match(r"^\s*(\d{1,4})\s+(.+?)\s+([0-9]{1,3}|EQ)\s+([0-9]{4}[-/][0-9]{2}[-/][0-9]{2})\s*$", linea)
        if not m: continue
        codigo = normalizar_codigo_curso(m.group(1))
        nombre = limpiar_nombre(m.group(2))
        calificacion = m.group(3)
        fecha = m.group(4).replace("/","-")
        if not codigo: continue
        calificacion = calificacion.upper()
        if calificacion != "EQ":
            if not calificacion.isdigit(): continue
            if not (0 <= int(calificacion) <= 100): continue
        if codigo not in vistos:
            vistos.add(codigo)
            cursos.append({"codigo":codigo,"nombre":nombre,"calificacion":calificacion,"fecha":fecha})

    if cursos: return cursos

    compacto = re.sub(r"\s+"," ", limpiar_linea(texto_tabla))
    patron = re.compile(
        r"(?<!\d)(\d{1,4})\s+([A-ZÁÉÍÓÚÑÜ0-9 .,/()]+?)\s+([0-9]{1,3}|EQ)\s+([0-9]{4}[-/][0-9]{2}[-/][0-9]{2})",
        re.IGNORECASE
    )
    for m in patron.finditer(compacto):
        codigo = normalizar_codigo_curso(m.group(1))
        nombre = limpiar_nombre(m.group(2))
        calificacion = m.group(3)
        fecha = m.group(4).replace("/","-")
        if not codigo: continue
        calificacion = calificacion.upper()
        if calificacion != "EQ":
            if not calificacion.isdigit(): continue
            if not (0 <= int(calificacion) <= 100): continue
        nombre_norm = normalizar(nombre)
        if "codigo" in nombre_norm or "nombre del curso" in nombre_norm: continue
        if codigo not in vistos:
            vistos.add(codigo)
            cursos.append({"codigo":codigo,"nombre":nombre,"calificacion":calificacion,"fecha":fecha})

    return cursos

def inferir_codigo_por_nombre(nombre, cursos_aprobados):
    nombre = limpiar_nombre_curso(nombre)
    if not nombre: return None, 0
    mejor = None
    mejor_score = 0
    for curso in cursos_aprobados or []:
        score = similitud_texto(nombre, curso.get("nombre"))
        if score > mejor_score:
            mejor_score = score
            mejor = curso
    if mejor and mejor_score >= 0.84:
        return mejor.get("codigo"), mejor_score
    return None, mejor_score

def agregar_curso_solicitado(cursos, vistos, numero, codigo_de=None, nombre_de=None,
                              codigo_a_pdf=None, nombre_a_pdf=None, cursos_aprobados=None,
                              origen_lectura="desconocido"):
    codigo_de = normalizar_codigo_curso(codigo_de)
    nombre_de = limpiar_nombre_curso(nombre_de)
    codigo_a_pdf = normalizar_codigo_curso(codigo_a_pdf)
    nombre_a_pdf = limpiar_nombre_curso(nombre_a_pdf)
    codigo_de_inferido = False
    codigo_de_confianza = None

    if not codigo_de and nombre_de:
        codigo_inferido, confianza = inferir_codigo_por_nombre(nombre_de, cursos_aprobados)
        codigo_de_confianza = round(confianza, 4)
        if codigo_inferido:
            codigo_de = normalizar_codigo_curso(codigo_inferido)
            codigo_de_inferido = True

    if not codigo_de and not nombre_de: return
    key = codigo_de or normalizar_nombre_curso(nombre_de)
    if not key or key in vistos: return
    vistos.add(key)
    cursos.append({
        "numero": int(numero) if str(numero).isdigit() else len(cursos) + 1,
        "codigo_de": codigo_de or None,
        "nombre_de": nombre_de or None,
        "codigo_de_inferido": codigo_de_inferido,
        "codigo_de_confianza": codigo_de_confianza,
        "codigo_a_pdf": codigo_a_pdf or None,
        "nombre_a_pdf": nombre_a_pdf or None,
        "origen_lectura": origen_lectura,
    })

def linea_es_codigo_curso(linea):
    linea = limpiar_nombre(linea)
    if not re.fullmatch(r"\d{2,4}", linea):
        return False
    return True

def linea_es_ruido_tabla(linea):
    linea_norm = normalizar(linea)
    if not linea_norm:
        return True

    ruidos_exactos = {
        "codigo del", "codigo", "curso", "nombre del curso",
        "universidad", "carrera", "codigo del curso",
    }

    if linea_norm in ruidos_exactos:
        return True

    # Encabezados de las columnas, no son cursos.
    if "cuadro comparativo" in linea_norm:
        return True
    if "equivalencia" in linea_norm and "curso" in linea_norm and len(linea_norm) > 20:
        return True
    if "semestre" in linea_norm:
        return True
    if "pensum" in linea_norm:
        return True
    if linea_norm in {"ingenieria", "ingenieria mecanica", "ingenieria mecanica industrial"}:
        return True
    if linea_norm.startswith("industrial pensum"):
        return True
    if re.fullmatch(r"20\d{2}-\d{2}", linea_norm):
        return True

    # El separador Por sí puede servir para reconstruir algunas tablas.
    if linea_norm in {"por"}:
        return False

    # Un numero de un solo digito puede ser parte del nombre del curso
    # (ej. "Matematica para computacion 1"). Los numeros de pagina
    # se limpian al acumular cada pagina, no aqui.
    return False

def hay_por_en_siguientes_lineas(lineas, indice, limite=6):
    fin = min(len(lineas), indice + limite + 1)
    for j in range(indice + 1, fin):
        if re.match(r"^por\b", normalizar(lineas[j]), re.IGNORECASE):
            return True
    return False

def preparar_lineas_tabla_cursos(texto):
    texto = texto.replace("–", "-").replace("—", "-").replace("\u00a0", " ")
    lineas_originales = [limpiar_linea(x) for x in texto.splitlines() if limpiar_linea(x)]
    lineas = []

    for linea in lineas_originales:
        if linea_es_ruido_tabla(linea):
            continue
        lineas.append(linea)

    return lineas

def extraer_cursos_solicitados_doble_codigo_sin_por(texto, cursos_aprobados=None):
    """
    Lee cuadros donde no aparece POR en cada fila, sino solo en el encabezado
    o en una columna central. Cubre filas separadas por celdas:

      169
      Matematica Basica 1
      3000
      Area Matematica Basica 1

    y, como respaldo, filas en una sola linea:

      85 Logica 3089 Logica

    Esta variante evita tomar el encabezado CUNOC/Pensum como si fuera curso.
    """
    if not texto:
        return []

    cursos = []
    vistos = set()

    def es_ruido_bloque(linea):
        n = normalizar(linea)
        n_simple = n.strip(" -:|")
        if not n_simple:
            return True
        if linea_es_ruido_tabla(linea):
            return True
        if n_simple in {
            "cunoc", "usac", "por", "pol", "universidad", "unidad academica",
            "codigo del", "codigo", "curso", "codigo del curso",
            "ingenieria", "ingenieria mecanica", "ingenieria mecanica industrial",
            "ingenieria civil", "ingenieria en ciencias y sistemas",
        }:
            return True
        if "cuadro comparativo" in n:
            return True
        if "cunoc" in n and (n.count("cunoc") >= 2 or " pol " in f" {n} "):
            return True
        if "codigo del ingenieria" in n:
            return True
        if "codigo y nombre del curso" in n:
            return True
        if "solicitado" in n and "equivalencia" in n:
            return True
        if "pensum" in n and ("ingenieria" in n or "curso" in n or re.search(r"\d{4}", n)):
            return True
        if "emerson" in n and "ruiz" in n:
            return True
        if re.fullmatch(r"20\d{6,}", n):  # registro academico, no codigo de curso
            return True
        return False

    def limpiar_nombre_bloque(nombre):
        nombre = limpiar_nombre_curso(nombre)
        nombre = re.sub(r"\s+", " ", nombre)
        return nombre.strip(" -:|")

    def es_fila_compacta(linea):
        return bool(re.match(r"^\s*\d{2,4}\s+.+?\s+\d{2,4}\s+.+$", limpiar_linea(linea), re.IGNORECASE))

    def agregar(numero, codigo_de, nombre_de, codigo_a, nombre_a, origen):
        nombre_de = limpiar_nombre_bloque(nombre_de)
        nombre_a = limpiar_nombre_bloque(nombre_a)
        if not codigo_de or not nombre_de:
            return
        if not codigo_a or not nombre_a:
            return
        if es_ruido_bloque(nombre_de) or es_ruido_bloque(nombre_a):
            return
        agregar_curso_solicitado(
            cursos,
            vistos,
            numero=numero,
            codigo_de=codigo_de,
            nombre_de=nombre_de,
            codigo_a_pdf=codigo_a,
            nombre_a_pdf=nombre_a,
            cursos_aprobados=cursos_aprobados,
            origen_lectura=origen
        )

    # 1) Reconstruccion por celdas/bloques. Se intenta primero para conservar
    # el orden real de la tabla cuando hay texto OCR duplicado al final.
    lineas = []
    for linea in preparar_lineas_tabla_cursos(texto):
        if es_ruido_bloque(linea):
            continue
        lineas.append(linea)

    i = 0
    while i < len(lineas):
        if not linea_es_codigo_curso(lineas[i]):
            i += 1
            continue

        codigo_de = normalizar_codigo_curso(lineas[i])
        i += 1
        nombre_de_partes = []

        while i < len(lineas) and not linea_es_codigo_curso(lineas[i]):
            if es_fila_compacta(lineas[i]):
                break
            if not es_ruido_bloque(lineas[i]):
                nombre_de_partes.append(lineas[i])
            i += 1

        if i >= len(lineas) or not linea_es_codigo_curso(lineas[i]):
            continue

        codigo_a = normalizar_codigo_curso(lineas[i])
        i += 1
        nombre_a_partes = []

        while i < len(lineas) and not linea_es_codigo_curso(lineas[i]):
            if es_fila_compacta(lineas[i]):
                break
            if not es_ruido_bloque(lineas[i]):
                nombre_a_partes.append(lineas[i])
            i += 1

        agregar(
            len(cursos) + 1,
            codigo_de,
            " ".join(nombre_de_partes),
            codigo_a,
            " ".join(nombre_a_partes),
            "doble_codigo_sin_por_bloques"
        )

    if cursos:
        cursos.sort(key=lambda c: c.get("numero") or 9999)
        return cursos

    # 2) Respaldo: filas completas en una sola linea.
    lineas_originales = [limpiar_linea(x) for x in texto.splitlines() if limpiar_linea(x)]
    for linea in lineas_originales:
        linea_norm = normalizar(linea)
        if es_ruido_bloque(linea):
            continue
        if " por " in f" {linea_norm} ":
            continue
        if re.search(r"\d{4}[-/]\d{2}[-/]\d{2}", linea):
            continue

        m = re.match(
            r"^\s*(\d{2,4})\s+(.+?)\s+(\d{2,4})\s+(.+?)\s*$",
            linea,
            re.IGNORECASE
        )
        if not m:
            continue

        codigo_de = normalizar_codigo_curso(m.group(1))
        nombre_de = m.group(2)
        codigo_a = normalizar_codigo_curso(m.group(3))
        nombre_a = m.group(4)

        if codigo_a.isdigit() and int(codigo_a) <= 100:
            continue

        agregar(
            len(cursos) + 1,
            codigo_de,
            nombre_de,
            codigo_a,
            nombre_a,
            "doble_codigo_sin_por_linea"
        )

    cursos.sort(key=lambda c: c.get("numero") or 9999)
    return cursos

def extraer_cursos_solicitados_por_bloques(texto, cursos_aprobados=None):
    """
    Lee cuadros comparativos donde PyMuPDF separa cada celda en líneas distintas:
      119
      TECNICA COMPLEMENTARIA 1
      Por
      3004
      AREA TECNICA COMPLEMENTARIA 1

    También soporta:
      2394
      PRACTICAS INICIALES
      Por 3020
      PRACTICAS INICIALES
    """
    if not texto:
        return []

    lineas = preparar_lineas_tabla_cursos(texto)

    cursos = []
    vistos = set()
    i = 0

    while i < len(lineas):
        linea = lineas[i]

        if not linea_es_codigo_curso(linea) or not hay_por_en_siguientes_lineas(lineas, i, limite=6):
            i += 1
            continue

        codigo_de = linea
        i += 1
        nombre_de_partes = []

        while i < len(lineas) and not re.match(r"^por\b", normalizar(lineas[i]), re.IGNORECASE):
            if linea_es_codigo_curso(lineas[i]) and hay_por_en_siguientes_lineas(lineas, i, limite=6):
                break
            nombre_de_partes.append(lineas[i])
            i += 1

        if i >= len(lineas) or not re.match(r"^por\b", normalizar(lineas[i]), re.IGNORECASE):
            continue

        linea_por = lineas[i]
        i += 1
        codigo_a_pdf = None
        nombre_a_partes = []

        m_por = re.match(r"^por\s+(\d{2,4})(?:\s+(.+))?$", linea_por, re.IGNORECASE)
        if m_por:
            codigo_a_pdf = m_por.group(1)
            if m_por.group(2):
                nombre_a_partes.append(m_por.group(2))
        else:
            if i < len(lineas) and linea_es_codigo_curso(lineas[i]):
                codigo_a_pdf = lineas[i]
                i += 1

        while i < len(lineas):
            if linea_es_codigo_curso(lineas[i]) and hay_por_en_siguientes_lineas(lineas, i, limite=6):
                break
            if re.match(r"^por\b", normalizar(lineas[i]), re.IGNORECASE):
                break
            nombre_a_partes.append(lineas[i])
            i += 1

        nombre_de = limpiar_nombre_curso(" ".join(nombre_de_partes))
        nombre_a_pdf = limpiar_nombre_curso(" ".join(nombre_a_partes))

        if codigo_de and nombre_de:
            agregar_curso_solicitado(
                cursos,
                vistos,
                numero=len(cursos) + 1,
                codigo_de=codigo_de,
                nombre_de=nombre_de,
                codigo_a_pdf=codigo_a_pdf,
                nombre_a_pdf=nombre_a_pdf,
                cursos_aprobados=cursos_aprobados,
                origen_lectura="bloques_tabla_multilinea"
            )

    cursos.sort(key=lambda c: c.get("numero") or 9999)
    return cursos


def extraer_cursos_solicitados_tabla_numerada(texto, cursos_aprobados=None):
    """
    Lee tablas donde el No. de fila queda en una línea separada y cada curso queda
    en bloques de varias líneas:
      1
      028 - Social Humanística 1
      por
      3003 - Área Social humanística 1

    También cubre cuando el destino queda partido:
      2
      169 - Matemática Básica 1
      Por
      3000
      - Área matemática básica 1
    """
    if not texto:
        return []

    texto = texto.replace("–", "-").replace("—", "-").replace("\u00a0", " ")
    lineas = [limpiar_linea(x) for x in texto.splitlines() if limpiar_linea(x)]

    texto_norm = normalizar(texto)
    # Esta estrategia solo debe activarse cuando la tabla realmente trae columna No.
    # Si se activa solo por la frase "solicitado para equivalencia", algunos cuadros
    # sin numeracion real confunden el numero final del nombre del curso o el numero
    # de pagina con una fila y terminan devolviendo un solo curso incorrecto.
    tiene_columna_no = bool(re.search(r"(^|\s)no\.?($|\s)", texto_norm))
    if not tiene_columna_no:
        return []

    if not (
        "solicitado" in texto_norm or
        "equivalencia" in texto_norm or
        "codigo y nombre" in texto_norm or
        "pensum" in texto_norm
    ):
        return []

    def es_numero_fila(linea):
        linea = limpiar_linea(linea)
        return bool(re.fullmatch(r"\d{1,2}", linea))

    def es_linea_por(linea):
        return bool(re.match(r"^por\b", normalizar(linea), re.IGNORECASE))

    def es_header_o_ruido(linea):
        n = normalizar(linea)
        if not n:
            return True
        if n in {
            "no", "no.", "codigo y nombre del curso", "del pensum 2012 33",
            "del pensum 2025 33", "solicitado", "para", "equivalencia", "por:",
            "codigo del curso", "curso", "codigo", "nombre del curso"
        }:
            return True
        if "cuadro comparativo" in n:
            return True
        if "codigo y nombre del curso" in n:
            return True
        return False

    def parse_codigo_nombre(bloque):
        bloque = limpiar_nombre_curso(bloque)
        bloque = bloque.replace("–", "-").replace("—", "-")
        bloque = re.sub(r"\s+", " ", bloque).strip()
        bloque = bloque.strip(" -")
        if not bloque:
            return None, None

        # Formato: 028 - Social Humanística 1 / 028 Social Humanística 1
        m = re.match(r"^\s*(\d{2,4})\s*(?:[-:]\s*)?(.+?)\s*$", bloque, re.IGNORECASE)
        if not m:
            return None, None

        codigo = normalizar_codigo_curso(m.group(1))
        nombre = limpiar_nombre_curso(m.group(2))
        nombre = nombre.strip(" -")
        if not codigo or not nombre:
            return None, None
        if re.fullmatch(r"\d+", nombre):
            return None, None
        return codigo, nombre

    cursos = []
    vistos = set()
    i = 0

    while i < len(lineas):
        if not es_numero_fila(lineas[i]):
            i += 1
            continue

        numero = lineas[i]
        j = i + 1

        # Ignorar encabezados entre el No. y el primer código.
        while j < len(lineas) and es_header_o_ruido(lineas[j]) and not es_linea_por(lineas[j]):
            j += 1

        origen_partes = []
        while j < len(lineas) and not es_linea_por(lineas[j]):
            if es_numero_fila(lineas[j]) and origen_partes:
                break
            if not es_header_o_ruido(lineas[j]):
                origen_partes.append(lineas[j])
            j += 1

        if j >= len(lineas) or not es_linea_por(lineas[j]):
            i += 1
            continue

        codigo_de, nombre_de = parse_codigo_nombre(" ".join(origen_partes))
        if not codigo_de or not nombre_de:
            i += 1
            continue

        linea_por = lineas[j]
        j += 1

        destino_partes = []
        # Si viene como "Por 3014 - Física 1", se aprovecha lo que sigue de Por.
        m_por = re.match(r"^por\s+(.+)$", linea_por, re.IGNORECASE)
        if m_por:
            resto_por = limpiar_linea(m_por.group(1))
            if resto_por and resto_por != ":":
                destino_partes.append(resto_por)

        while j < len(lineas):
            if es_numero_fila(lineas[j]):
                break
            if es_linea_por(lineas[j]):
                break
            if not es_header_o_ruido(lineas[j]):
                destino_partes.append(lineas[j])
            j += 1

        codigo_a_pdf, nombre_a_pdf = parse_codigo_nombre(" ".join(destino_partes))
        if codigo_a_pdf and nombre_a_pdf:
            agregar_curso_solicitado(
                cursos,
                vistos,
                numero=numero,
                codigo_de=codigo_de,
                nombre_de=nombre_de,
                codigo_a_pdf=codigo_a_pdf,
                nombre_a_pdf=nombre_a_pdf,
                cursos_aprobados=cursos_aprobados,
                origen_lectura="tabla_numerada_multilinea"
            )

        i = max(j, i + 1)

    cursos.sort(key=lambda c: c.get("numero") or 9999)
    return cursos

def limpiar_prefijo_nombre_curso_solicitado(texto):
    texto = limpiar_nombre_curso(texto)

    # Si antes del nombre viene texto de la solicitud, se corta desde el encabezado real.
    texto = re.sub(
        r"^.*?nombre\s+de\s+los\s+cursos\s+aprobados\s*",
        "",
        texto,
        flags=re.IGNORECASE
    )

    patrones = [
        r"^solicitud\s+equivalencia\s+de\s+cursos\s+en\s*",
        r"^apruebe\s+los\s+cursos\s+en\s*",
        r"^observaciones\s*",
        r"^pensum\s+\d{4}[- ]?\d{2}\s*",
        r"^\d{4}[- ]?\d{2}\s*",
        r"^\d{1,2}\s+(?=[A-Za-zÁÉÍÓÚáéíóúÑñ])",
    ]
    for pat in patrones:
        texto = re.sub(pat, "", texto, flags=re.IGNORECASE)
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip(" :-|")



def extraer_cursos_solicitados_por_codigos_aprobados(texto, cursos_aprobados=None):
    """
    Estrategia para tablas OCR donde el nombre del curso origen queda perdido o
    desordenado, pero los codigos origen si aparecen. Usa el certificado de cursos
    aprobados como respaldo para reconstruir el nombre del curso origen.

    Cubre casos como:
      119
      por
      3004
      Area Tecnica
      Complementaria 1

    y casos donde entre "por" y el codigo destino aparecen restos de otras celdas:
      170
      Matematica Basica 2
      por
      Tecnica Complementaria1
      Social Humanistica 1
      Quimica 1
      3006
      Area Matematica Basica 2
    """
    if not texto or not cursos_aprobados:
        return []

    aprobados_por_codigo = {}
    for curso in cursos_aprobados or []:
        codigo = normalizar_codigo_curso(curso.get("codigo"))
        nombre = limpiar_nombre_curso(curso.get("nombre"))
        if codigo and nombre:
            aprobados_por_codigo[codigo] = nombre

    if not aprobados_por_codigo:
        return []

    lineas = preparar_lineas_tabla_cursos(texto)
    cursos = []
    vistos = set()

    def es_por(linea):
        return bool(re.match(r"^por\b", normalizar(linea), re.IGNORECASE))

    def codigo_linea(linea):
        if not linea_es_codigo_curso(linea):
            return ""
        return normalizar_codigo_curso(linea)

    def es_codigo_origen(linea):
        codigo = codigo_linea(linea)
        return bool(codigo and codigo in aprobados_por_codigo)

    def es_codigo_destino(linea):
        codigo = codigo_linea(linea)
        if not codigo:
            return False
        if codigo in aprobados_por_codigo:
            return False
        try:
            n = int(codigo)
        except Exception:
            return False
        # En estos expedientes los codigos destino pertenecen al pensum nuevo y
        # normalmente son 3000+. Esta condicion evita confundir numeros sueltos
        # del nombre del curso con codigos destino.
        return n >= 1000

    def limpiar_nombre_destino(nombre):
        nombre = limpiar_nombre_curso(nombre)
        nombre = re.sub(r"\s+", " ", nombre).strip(" -:|")
        return nombre

    i = 0
    while i < len(lineas):
        if not es_codigo_origen(lineas[i]):
            i += 1
            continue

        codigo_de = normalizar_codigo_curso(lineas[i])
        nombre_de_partes = []
        j = i + 1

        while j < len(lineas) and not es_por(lineas[j]):
            if es_codigo_origen(lineas[j]):
                break
            # Guardar posibles partes del nombre origen, pero luego se valida
            # contra el certificado para evitar basura de OCR.
            if not linea_es_codigo_curso(lineas[j]) and not linea_es_ruido_tabla(lineas[j]):
                nombre_de_partes.append(lineas[j])
            j += 1

        if j >= len(lineas) or not es_por(lineas[j]):
            i += 1
            continue

        # Buscar el primer codigo destino despues de "por". Se permite saltar
        # texto intermedio porque algunos OCR mezclan celdas de filas anteriores.
        k = j + 1
        while k < len(lineas) and not es_codigo_destino(lineas[k]):
            if es_codigo_origen(lineas[k]):
                break
            k += 1

        if k >= len(lineas) or not es_codigo_destino(lineas[k]):
            i += 1
            continue

        codigo_a = normalizar_codigo_curso(lineas[k])
        l = k + 1
        nombre_a_partes = []

        while l < len(lineas):
            if es_codigo_origen(lineas[l]):
                break
            if es_por(lineas[l]):
                break
            if es_codigo_destino(lineas[l]):
                break
            if not linea_es_ruido_tabla(lineas[l]):
                nombre_a_partes.append(lineas[l])
            l += 1

        nombre_de_detectado = limpiar_nombre_curso(" ".join(nombre_de_partes))
        nombre_de_cert = aprobados_por_codigo.get(codigo_de)

        # Si el OCR no trae nombre origen o trae algo muy corto/contaminado, usar
        # el nombre del certificado. Esto es intencional para el formato con celdas
        # desordenadas.
        if not nombre_de_detectado or len(normalizar_nombre_curso(nombre_de_detectado)) < 4:
            nombre_de = nombre_de_cert
        else:
            nombre_de = nombre_de_detectado

        nombre_a = limpiar_nombre_destino(" ".join(nombre_a_partes))

        if not nombre_de or not nombre_a:
            i = max(l, i + 1)
            continue

        agregar_curso_solicitado(
            cursos,
            vistos,
            numero=len(cursos) + 1,
            codigo_de=codigo_de,
            nombre_de=nombre_de,
            codigo_a_pdf=codigo_a,
            nombre_a_pdf=nombre_a,
            cursos_aprobados=cursos_aprobados,
            origen_lectura="codigos_aprobados_certificado"
        )

        i = max(l, i + 1)

    cursos.sort(key=lambda c: c.get("numero") or 9999)
    return cursos

def extraer_cursos_solicitados_con_codigo_parentesis(texto, cursos_aprobados=None):
    """Extrae equivalencias sin tabla: Curso (con código 0781) por Curso (con código 2810)."""
    if not texto:
        return []

    base = texto.replace("–", "-").replace("—", "-").replace("\u00a0", " ")
    base = re.sub(r"[ \t]+", " ", base)
    compacto = re.sub(r"\s+", " ", limpiar_linea(base))

    cursos = []
    vistos = set()

    patron = re.compile(
        r"(?:nombre\s+de\s+los\s+cursos\s+aprobados\s*)?"
        r"([A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9 .,/()]+?)\s*"
        r"\(\s*con\s+c[oó]digo\s*(\d{1,4})\s*\)\s*"
        r"por\s+"
        r"([A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9 .,/()]+?)\s*"
        r"\(\s*con\s+c[oó]digo\s*(\d{1,4})\s*\)",
        re.IGNORECASE
    )

    for idx, m in enumerate(patron.finditer(compacto), start=1):
        nombre_de = limpiar_prefijo_nombre_curso_solicitado(m.group(1))
        codigo_de = m.group(2)
        nombre_a = limpiar_prefijo_nombre_curso_solicitado(m.group(3))
        codigo_a = m.group(4)

        if not nombre_de or not codigo_de:
            continue

        agregar_curso_solicitado(
            cursos, vistos, idx, codigo_de, nombre_de, codigo_a, nombre_a,
            cursos_aprobados, "sin_tabla_codigo_parentesis"
        )

    return cursos


def extraer_cursos_solicitados_tabla_numerada_secuencia(texto, cursos_aprobados=None):
    """
    Lee tablas donde no existe encabezado No., pero cada fila inicia con un numero
    de orden en una linea separada:

      1
      216 - Quimica 1
      Por
      3001- Quimica General 1

    Soporta guiones pegados al codigo:
      28-Social Humanistica 1
      146- Fisica 1
      3162-Dibujo Constructivo para Ingenieria
    """
    if not texto:
        return []

    texto = texto.replace("–", "-").replace("—", "-").replace("\u00a0", " ")
    lineas = [limpiar_linea(x) for x in texto.splitlines() if limpiar_linea(x)]

    def es_numero_fila(linea):
        linea = limpiar_linea(linea)
        if not re.fullmatch(r"\d{1,2}", linea):
            return False
        try:
            n = int(linea)
            return 1 <= n <= 80
        except Exception:
            return False

    def es_linea_por(linea):
        return bool(re.match(r"^por\b", normalizar(linea), re.IGNORECASE))

    def es_header_o_ruido(linea):
        n = normalizar(linea)
        if not n:
            return True
        if linea_es_ruido_tabla(linea):
            return True
        if n in {
            "codigo", "codigo de", "codigo del", "codigo del curso", "curso",
            "nombre del curso", "solicitado", "para", "equivalencia", "por:",
            "ingenieria civil", "ingenieria mecanica", "ingenieria mecanica industrial",
            "ingenieria en ciencias y sistemas"
        }:
            return True
        if "cuadro comparativo" in n:
            return True
        if "pensum" in n and not re.match(r"^\d{2,4}", n):
            return True
        if n.startswith("del pensum"):
            return True
        return False

    def parse_codigo_nombre(bloque):
        bloque = limpiar_nombre_curso(bloque)
        bloque = bloque.replace("–", "-").replace("—", "-")
        bloque = re.sub(r"\s+", " ", bloque).strip(" -:|")
        if not bloque:
            return None, None

        # Codigos con o sin espacios alrededor del guion:
        # 28-Social Humanistica 1
        # 216 - Quimica 1
        # 3001- Quimica General 1
        m = re.match(r"^\s*(\d{2,4})\s*(?:[-:]\s*)?(.+?)\s*$", bloque, re.IGNORECASE)
        if not m:
            return None, None

        codigo = normalizar_codigo_curso(m.group(1))
        nombre = limpiar_nombre_curso(m.group(2)).strip(" -:|")
        if not codigo or not nombre:
            return None, None
        if re.fullmatch(r"\d+", nombre):
            return None, None
        return codigo, nombre

    cursos = []
    vistos = set()
    i = 0

    while i < len(lineas):
        if not es_numero_fila(lineas[i]):
            i += 1
            continue

        numero = int(lineas[i])
        j = i + 1

        # Evitar que numeros de pagina aislados activen la estrategia.
        if j >= len(lineas):
            i += 1
            continue

        while j < len(lineas) and es_header_o_ruido(lineas[j]) and not es_linea_por(lineas[j]):
            j += 1

        origen_partes = []
        while j < len(lineas) and not es_linea_por(lineas[j]):
            # Si aparece otro numero de fila antes de encontrar Por, esta fila no sirve.
            if es_numero_fila(lineas[j]) and origen_partes:
                break
            if not es_header_o_ruido(lineas[j]):
                origen_partes.append(lineas[j])
            j += 1

        if j >= len(lineas) or not es_linea_por(lineas[j]):
            i += 1
            continue

        codigo_de, nombre_de = parse_codigo_nombre(" ".join(origen_partes))
        if not codigo_de or not nombre_de:
            i += 1
            continue

        linea_por = lineas[j]
        j += 1

        destino_partes = []
        m_por = re.match(r"^por\s+(.+)$", linea_por, re.IGNORECASE)
        if m_por:
            resto = limpiar_linea(m_por.group(1))
            if resto and resto != ":":
                destino_partes.append(resto)

        while j < len(lineas):
            if es_numero_fila(lineas[j]):
                break
            if es_linea_por(lineas[j]):
                break
            if not es_header_o_ruido(lineas[j]):
                destino_partes.append(lineas[j])
            j += 1

        codigo_a_pdf, nombre_a_pdf = parse_codigo_nombre(" ".join(destino_partes))
        if codigo_a_pdf and nombre_a_pdf:
            # Los codigos destino del pensum nuevo suelen ser 3000+; se permite 1000+
            # para no descartar formatos especiales, pero evita confundir notas o paginas.
            try:
                if int(codigo_a_pdf) < 1000:
                    i = max(j, i + 1)
                    continue
            except Exception:
                pass

            agregar_curso_solicitado(
                cursos,
                vistos,
                numero=numero,
                codigo_de=codigo_de,
                nombre_de=nombre_de,
                codigo_a_pdf=codigo_a_pdf,
                nombre_a_pdf=nombre_a_pdf,
                cursos_aprobados=cursos_aprobados,
                origen_lectura="tabla_numerada_secuencia_guion_flexible"
            )

        i = max(j, i + 1)

    cursos.sort(key=lambda c: c.get("numero") or 9999)

    # Para no activar falsos positivos por numeros de pagina, esta estrategia se
    # acepta solo si reconstruye varias filas reales.
    if len(cursos) < 2:
        return []

    return cursos

def extraer_cursos_solicitados_linea_simple_con_por(texto, cursos_aprobados=None):
    """Extrae equivalencias sin número inicial, usando 'curso por curso'.
    Sirve cuando el formato no trae cuadro comparativo y los datos están en la solicitud.
    """
    if not texto:
        return []

    base = texto.replace("–", "-").replace("—", "-").replace("\u00a0", " ")
    compacto = re.sub(r"\s+", " ", limpiar_linea(base))

    # Limitar preferentemente al bloque de nombres de cursos aprobados para no agarrar textos del encabezado.
    m_bloque = re.search(
        r"nombre\s+de\s+los\s+cursos\s+aprobados\s*(.+?)(?:observaciones|firma\s+del\s+estudiante|nota:|$)",
        compacto,
        re.IGNORECASE
    )
    if m_bloque:
        compacto = m_bloque.group(1).strip()

    cursos = []
    vistos = set()

    # Caso sin códigos: Nombre origen por Nombre destino
    # Se deja como último recurso porque puede ser ambiguo.
    patron = re.compile(
        r"^(.{6,160}?)\s+por\s+(.{6,160}?)(?:$|\s{2,})",
        re.IGNORECASE
    )
    m = patron.search(compacto)
    if not m:
        return []

    nombre_de = limpiar_prefijo_nombre_curso_solicitado(m.group(1))
    nombre_a = limpiar_prefijo_nombre_curso_solicitado(m.group(2))

    if not nombre_de or not nombre_a:
        return []

    agregar_curso_solicitado(
        cursos, vistos, 1, None, nombre_de, None, nombre_a,
        cursos_aprobados, "sin_tabla_por_nombre"
    )

    return cursos

def extraer_cursos_solicitados(texto, cursos_aprobados=None):
    if not texto:
        return []

    texto = texto.replace("–", "-").replace("—", "-").replace("\u00a0", " ")
    texto = re.sub(r"[ \t]+", " ", texto)

    def deduplicar(lista):
        resultado = []
        vistos = set()
        for c in lista or []:
            key = c.get("codigo_de") or normalizar_nombre_curso(c.get("nombre_de"))
            if not key or key in vistos:
                continue
            vistos.add(key)
            nuevo = dict(c)
            nuevo["numero"] = len(resultado) + 1
            resultado.append(nuevo)
        return resultado

    def score_candidato(lista):
        if not lista:
            return 0
        score = len(lista) * 100
        for c in lista:
            if c.get("codigo_de"):
                score += 8
            if c.get("codigo_a_pdf"):
                score += 5
            if c.get("nombre_de"):
                score += 2
            if c.get("nombre_a_pdf"):
                score += 2
        return score

    candidatos = []

    # Caso especial sin tabla formal: Curso (con codigo 0781) por Curso (con codigo 2810).
    cursos_codigo_parentesis = deduplicar(
        extraer_cursos_solicitados_con_codigo_parentesis(texto, cursos_aprobados)
    )
    if cursos_codigo_parentesis:
        candidatos.append(("sin_tabla_codigo_parentesis", cursos_codigo_parentesis))

    # Filas completas en una sola linea con Por.
    cursos_linea = []
    vistos_linea = set()
    lineas = [limpiar_linea(l) for l in texto.splitlines() if limpiar_linea(l)]

    for linea in lineas:
        linea_norm = normalizar(linea)
        if "codigo" in linea_norm and "nombre del curso" in linea_norm:
            continue
        if "pensum" in linea_norm and "ingenieria" in linea_norm:
            continue
        if " por " not in f" {linea.lower()} ":
            continue

        m = re.match(
            r"^\s*(\d{1,2})\s+(\d{2,4})\s*-?\s+(.+?)\s+por\s+(\d{2,4})\s*-?\s+(.+?)\s*$",
            linea,
            re.IGNORECASE
        )
        if m:
            agregar_curso_solicitado(
                cursos_linea, vistos_linea, m.group(1), m.group(2), m.group(3),
                m.group(4), m.group(5), cursos_aprobados, "ideal_columnas_codigo_nombre"
            )
            continue

        m = re.match(
            r"^\s*(\d{1,2})\s+(\d{2,4})\s*-\s*(.+?)\s+por\s+(?:(\d{2,4})\s*-\s*)?(.+?)\s*$",
            linea,
            re.IGNORECASE
        )
        if m:
            agregar_curso_solicitado(
                cursos_linea, vistos_linea, m.group(1), m.group(2), m.group(3),
                m.group(4), m.group(5), cursos_aprobados, "codigo_nombre_con_guion"
            )
            continue

        m = re.match(
            r"^\s*(\d{1,2})\s+(.+?)\s+por\s+(?:(\d{2,4})\s*-?\s+)?(.+?)\s*$",
            linea,
            re.IGNORECASE
        )
        if m:
            posible_nombre = limpiar_nombre_curso(m.group(2))
            if not re.fullmatch(r"\d{1,4}", posible_nombre):
                agregar_curso_solicitado(
                    cursos_linea, vistos_linea, m.group(1), None, posible_nombre,
                    m.group(3), m.group(4), cursos_aprobados,
                    "sin_codigo_busqueda_por_nombre"
                )

    cursos_linea = deduplicar(cursos_linea)
    if cursos_linea:
        candidatos.append(("lineas_con_por", cursos_linea))

    # Tabla con filas numeradas aunque no tenga encabezado No. Esta cubre formatos
    # con codigos pegados al guion, por ejemplo: 28-Social Humanistica 1.
    cursos_tabla_secuencia = deduplicar(
        extraer_cursos_solicitados_tabla_numerada_secuencia(texto, cursos_aprobados)
    )
    if cursos_tabla_secuencia:
        candidatos.append(("tabla_numerada_secuencia", cursos_tabla_secuencia))

    # Tabla con columna No. real.
    cursos_tabla_numerada = deduplicar(
        extraer_cursos_solicitados_tabla_numerada(texto, cursos_aprobados)
    )
    if cursos_tabla_numerada:
        candidatos.append(("tabla_numerada", cursos_tabla_numerada))

    # Lectura apoyada en certificado: útil cuando el OCR separa/desordena
    # los nombres origen, pero los codigos origen y destino sí aparecen.
    cursos_codigos_aprobados = deduplicar(
        extraer_cursos_solicitados_por_codigos_aprobados(texto, cursos_aprobados)
    )
    if cursos_codigos_aprobados:
        candidatos.append(("codigos_aprobados", cursos_codigos_aprobados))

    # Lectura general por pares codigo origen -> codigo destino.
    cursos_doble_codigo = deduplicar(
        extraer_cursos_solicitados_doble_codigo_sin_por(texto, cursos_aprobados)
    )
    if cursos_doble_codigo:
        candidatos.append(("doble_codigo", cursos_doble_codigo))

    # Lectura por bloques donde aparece Por como columna separada.
    cursos_bloques = deduplicar(
        extraer_cursos_solicitados_por_bloques(texto, cursos_aprobados)
    )
    if cursos_bloques:
        candidatos.append(("bloques_por", cursos_bloques))

    cursos_linea_simple = deduplicar(
        extraer_cursos_solicitados_linea_simple_con_por(texto, cursos_aprobados)
    )
    if cursos_linea_simple:
        candidatos.append(("sin_tabla_por_nombre", cursos_linea_simple))

    # Patrones compactos como ultimo recurso.
    cursos_compactos = []
    vistos_compactos = set()
    compacto = re.sub(r"\s+", " ", limpiar_linea(texto))

    patron1 = re.compile(
        r"(?<!\d)(\d{1,2})\s+(\d{2,4})\s*-?\s+(.+?)\s+por\s+(\d{2,4})\s*-?\s+(.+?)(?=\s+\d{1,2}\s+\d{2,4}\s|$)",
        re.IGNORECASE
    )
    for m in patron1.finditer(compacto):
        agregar_curso_solicitado(
            cursos_compactos, vistos_compactos, m.group(1), m.group(2), m.group(3),
            m.group(4), m.group(5), cursos_aprobados, "compacto_ideal_codigo_nombre"
        )

    patron2 = re.compile(
        r"(?<!\d)(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóúÑñ0-9 .,/()]+?)\s+por\s+(?:(\d{2,4})\s*-?\s+)?(.+?)(?=\s+\d{1,2}\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]|\s+\d{1,2}\s+\d{2,4}\s|$)",
        re.IGNORECASE
    )
    for m in patron2.finditer(compacto):
        nombre_de = limpiar_nombre_curso(m.group(2))
        if len(normalizar_nombre_curso(nombre_de)) < 4:
            continue
        agregar_curso_solicitado(
            cursos_compactos, vistos_compactos, m.group(1), None, nombre_de,
            m.group(3), m.group(4), cursos_aprobados,
            "compacto_sin_codigo_busqueda_por_nombre"
        )

    cursos_compactos = deduplicar(cursos_compactos)
    if cursos_compactos:
        candidatos.append(("compacto", cursos_compactos))

    if not candidatos:
        return []

    # En vez de devolver la primera estrategia que encontró algo, se elige la
    # que reconstruye más cursos válidos. Esto evita casos donde una estrategia
    # parcial lee solo 1 curso y bloquea una estrategia posterior que lee toda la tabla.
    _, mejor = max(candidatos, key=lambda item: score_candidato(item[1]))
    mejor.sort(key=lambda c: c.get("numero") or 9999)
    return mejor

def parece_pagina_cursos_solicitados(texto, cursos_aprobados=None):
    texto_norm = normalizar(texto)
    if es_pagina_fin_cursos_solicitados(texto_norm): return False
    if "cuadro comparativo para equivalencia de cursos" in texto_norm: return True
    if "cuadro comparativo" in texto_norm and "equivalencia de cursos" in texto_norm: return True
    if "cursos solicitados" in texto_norm: return True
    if "nombre de los cursos aprobados" in texto_norm and " por " in f" {texto_norm} ": return True
    if "con codigo" in texto_norm and " por " in f" {texto_norm} ": return True
    cursos_detectados = extraer_cursos_solicitados(texto, cursos_aprobados)
    if len(cursos_detectados) > 0: return True
    señales = 0
    if "pensum" in texto_norm: señales += 1
    if "equivalencia" in texto_norm: señales += 1
    if "codigo" in texto_norm and "nombre del curso" in texto_norm: señales += 1
    if " por " in f" {texto_norm} ": señales += 1
    return señales >= 3

def limpiar_texto_pagina_cursos_para_acumular(texto):
    """Quita el numero de pagina al final sin borrar numeros que son parte del nombre del curso."""
    lineas = [x for x in str(texto or "").splitlines()]
    while lineas and not limpiar_linea(lineas[-1]):
        lineas.pop()
    if lineas and re.fullmatch(r"\d{1,3}", limpiar_linea(lineas[-1])):
        lineas.pop()
    return limpiar_linea("\n".join(lineas))

def extraer_texto_cursos_solicitados_multpagina(paginas, cursos_aprobados=None):
    """
    Acumula páginas de cursos solicitados.
    Se detiene inmediatamente al encontrar cualquier constancia de inscripción.
    Continúa aunque una página no traiga título, mientras detecte filas con 'por'.
    """
    textos = []
    leyendo = False
    pagina_inicio = None
    paginas_sin_coincidencias = 0

    for pagina in paginas:
        texto = pagina.get("texto") or ""
        texto_norm = normalizar(texto)

        # Detener inmediatamente al encontrar constancia, constancia digital
        # o certificación/certificado de cursos aprobados.
        if es_pagina_fin_cursos_solicitados(texto_norm):
            if leyendo:
                break
            continue

        if not leyendo and parece_pagina_cursos_solicitados(texto, cursos_aprobados):
            leyendo = True
            pagina_inicio = pagina

        if leyendo:
            cursos_detectados = extraer_cursos_solicitados(texto, cursos_aprobados)
            if cursos_detectados or parece_pagina_cursos_solicitados(texto, cursos_aprobados):
                textos.append(limpiar_texto_pagina_cursos_para_acumular(texto))
                paginas_sin_coincidencias = 0
            else:
                paginas_sin_coincidencias += 1
            if paginas_sin_coincidencias >= 2:
                break

    return "\n".join(textos), pagina_inicio

def normalizar_fecha_mes_anio(fecha):
    fecha = str(fecha or "").strip()
    m = re.match(r"^(\d{1,2})[/-](\d{4})$", fecha)
    if not m:
        return fecha or None
    mes = int(m.group(1))
    anio = int(m.group(2))
    if not (1 <= mes <= 12):
        return fecha
    return f"{anio:04d}-{mes:02d}-01"

def extraer_cursos_aprobados_externos(texto):
    """Extrae cursos aprobados desde constancias externas sin columna de código.
    Ejemplo: Facultad de Ingeniería, USAC: Nombre del curso / Fecha de aprobación / Nota.
    """
    if not texto:
        return []

    texto = texto.replace("–", "-").replace("—", "-").replace("\u00a0", " ")
    cursos = []
    vistos = set()
    lineas = [limpiar_linea(x) for x in texto.splitlines() if limpiar_linea(x)]

    def agregar_externo(nombre, fecha_raw, calificacion_raw):
        nombre = limpiar_nombre_curso(nombre)
        fecha = normalizar_fecha_mes_anio(fecha_raw)
        calificacion = str(calificacion_raw or "").strip().upper()

        if not nombre or len(normalizar_nombre_curso(nombre)) < 4:
            return
        if calificacion != "EQ":
            if not calificacion.isdigit():
                return
            if not (0 <= int(calificacion) <= 100):
                return

        nombre_norm = normalizar(nombre)
        if any(p in nombre_norm for p in ["nombre del curso", "fecha de aprobacion", "nota"]):
            return

        key = normalizar_nombre_curso(nombre)
        if key in vistos:
            return
        vistos.add(key)
        cursos.append({
            "codigo": None,
            "nombre": nombre,
            "calificacion": calificacion,
            "fecha": fecha,
            "origen_lectura": "certificacion_externa_sin_codigo",
        })

    for linea in lineas:
        linea_norm = normalizar(linea)
        if "nombre del curso" in linea_norm and "fecha" in linea_norm and "nota" in linea_norm:
            continue

        m = re.match(
            r"^([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9 .,/()]+?)\s+(\d{1,2}[/-]\d{4})\s+([0-9]{1,3}|EQ)\s*$",
            linea,
            re.IGNORECASE
        )
        if m:
            agregar_externo(m.group(1), m.group(2), m.group(3))

    # Variante OCR/PyMuPDF: encabezados en líneas separadas y luego:
    # NOMBRE DEL CURSO / 06/2025 / 75.
    for i in range(0, max(len(lineas) - 2, 0)):
        nombre = lineas[i]
        fecha = lineas[i + 1]
        nota = lineas[i + 2]
        if re.fullmatch(r"\d{1,2}[/-]\d{4}", fecha) and re.fullmatch(r"[0-9]{1,3}|EQ", nota, re.IGNORECASE):
            agregar_externo(nombre, fecha, nota)

    return cursos

def combinar_cursos_aprobados(*listas):
    combinados = []
    vistos = set()
    for lista in listas:
        for curso in lista or []:
            codigo = normalizar_codigo_curso(curso.get("codigo")) if curso.get("codigo") else ""
            nombre_key = normalizar_nombre_curso(curso.get("nombre"))
            key = codigo or nombre_key
            if not key or key in vistos:
                continue
            vistos.add(key)
            combinados.append(curso)
    return combinados

def validar_cursos(solicitados, aprobados):
    aprobados_codigos = {curso["codigo"] for curso in aprobados if curso.get("codigo")}
    aprobados_nombres = [curso.get("nombre") for curso in aprobados if curso.get("nombre")]
    faltantes = []
    for curso in solicitados:
        codigo = curso.get("codigo_de")
        nombre = curso.get("nombre_de")
        if codigo:
            if codigo in aprobados_codigos:
                continue
            if nombre and any(similitud_texto(nombre, ap) >= 0.84 for ap in aprobados_nombres):
                continue
            faltantes.append(codigo)
            continue
        if nombre:
            if not any(similitud_texto(nombre, ap) >= 0.84 for ap in aprobados_nombres):
                faltantes.append(nombre)
    return {
        "todos_solicitados_estan_aprobados": len(faltantes) == 0,
        "faltantes_en_certificado": faltantes,
    }

def construir_advertencias_parser(pagina_constancia, pagina_certificado, pagina_solicitados,
                                   constancia, cursos_solicitados, cursos_aprobados,
                                   resultado_validacion):
    advertencias = []
    if not pagina_constancia:
        advertencias.append("No se detectó la página de constancia digital de inscripción")
    if not pagina_certificado:
        advertencias.append("No se detectó la página de certificado de cursos aprobados")
    if not pagina_solicitados:
        advertencias.append("No se detectó la página de cursos solicitados para equivalencia")
    estudiante = constancia.get("estudiante") or {}
    if not estudiante.get("carnet"):
        advertencias.append("No se pudo leer el carné del estudiante")
    if not estudiante.get("registro_academico"):
        advertencias.append("No se pudo leer el registro académico del estudiante")
    if not constancia.get("codigo_carrera"):
        advertencias.append("No se pudo leer el código de carrera destino desde la constancia")
    if not cursos_solicitados:
        advertencias.append("No se pudieron leer cursos solicitados para equivalencia")
    if not cursos_aprobados:
        advertencias.append("No se pudieron leer cursos aprobados del certificado")
    for curso in cursos_solicitados:
        if curso.get("codigo_de_inferido"):
            advertencias.append(f"El código {curso.get('codigo_de')} fue inferido por nombre para el curso \"{curso.get('nombre_de')}\"")
        if not curso.get("codigo_de") and curso.get("nombre_de"):
            advertencias.append(f"El curso solicitado \"{curso.get('nombre_de')}\" no trae código; Node debe buscarlo por nombre")
    for valor in resultado_validacion.get("faltantes_en_certificado", []):
        advertencias.append(f"El curso solicitado {valor} no aparece en el certificado de cursos aprobados")
    return advertencias

def procesar_pdf(pdf_path):
    paginas = leer_paginas_pdf(pdf_path)

    pagina_prov = buscar_pagina(
        paginas, ["prov","ryca"],
        ["equivalencia registro","asunto","para que se sirva"]
    ) or paginas[0]

    # Constancia Digital CUNOC primero, luego USAC/DIGA
    pagina_constancia = buscar_pagina(
        paginas,
        ["constancia digital"],
        ["datos del estudiante","codigo de carrera","fecha de inscripcion"]
    )
    if not pagina_constancia:
        pagina_constancia = buscar_pagina(
            paginas,
            ["constancia de inscripcion"],
            ["registro academico","estudiante","unidad academica"]
        )

    pagina_certificado = buscar_pagina(
        paginas,
        ["certifica"],
        ["cursos aprobados","codigo nombre del curso","registro academico"]
    )

    texto_prov = pagina_prov["texto"] if pagina_prov else ""
    texto_constancia = pagina_constancia["texto"] if pagina_constancia else ""
    texto_certificado = pagina_certificado["texto"] if pagina_certificado else ""

    texto_solicitados, pagina_solicitados = extraer_texto_cursos_solicitados_multpagina(paginas)

    # ── Datos del estudiante (3 capas) ────────────────────────────────────────
    # Capa 1: carta PROV (más confiable: texto digital limpio)
    datos_prov = extraer_datos_estudiante_desde_prov(texto_prov)
    # Capa 2: constancia de inscripción
    constancia = extraer_estudiante_constancia(texto_constancia)
    # Capa 3: certificado de cursos aprobados
    datos_cert = extraer_datos_desde_certificado(texto_certificado)

    estudiante = {
        "registro_academico": (
            datos_prov.get("registro_academico") or
            constancia["estudiante"].get("registro_academico") or
            datos_cert.get("registro_academico")
        ),
        "carnet": (
            datos_prov.get("carnet") or
            constancia["estudiante"].get("carnet") or
            datos_cert.get("carnet")
        ),
        "nombre_completo": (
            datos_prov.get("nombre_completo") or
            constancia["estudiante"].get("nombre_completo") or
            datos_cert.get("nombre_completo")
        ),
    }

    # Código de carrera destino: siempre desde la constancia cuando exista.
    codigo_carrera = constancia["codigo_carrera"]

    # Carrera origen: primero desde la carta PROV/RYCA, luego como respaldo desde el certificado.
    carrera_origen_prov = extraer_carrera_origen_desde_prov(texto_prov)
    carrera_origen_certificado = extraer_carrera_certificado(texto_certificado) or datos_cert.get("nombre_carrera")
    carrera_origen = carrera_origen_prov or carrera_origen_certificado

    cursos_aprobados_certificado = extraer_cursos_aprobados(texto_certificado)
    cursos_aprobados_externos = []
    for pagina in paginas:
        cursos_aprobados_externos.extend(extraer_cursos_aprobados_externos(pagina.get("texto") or ""))
    cursos_aprobados = combinar_cursos_aprobados(cursos_aprobados_certificado, cursos_aprobados_externos)

    cursos_solicitados = extraer_cursos_solicitados(texto_solicitados, cursos_aprobados)
    resultado_validacion = validar_cursos(cursos_solicitados, cursos_aprobados)

    return {
        "ok": True,
        "archivo": os.path.basename(pdf_path),
        "paginas_detectadas": {
            "prov": pagina_prov["numero"] if pagina_prov else None,
            "constancia_inscripcion": pagina_constancia["numero"] if pagina_constancia else None,
            "certificado_cursos": pagina_certificado["numero"] if pagina_certificado else None,
            "cursos_solicitados": pagina_solicitados["numero"] if pagina_solicitados else None,
        },
        "prov_ryca": extraer_prov(texto_prov),
        "fecha_prov_ryca": extraer_fecha_prov(texto_prov),
        "sede_nombre": extraer_sede(texto_prov),
        "estudiante": estudiante,
        "carrera_equivalencia_codigo": codigo_carrera,
        "carrera_equivalencia_nombre": constancia["nombre_carrera"],
        "fecha_inscripcion": constancia["fecha_inscripcion"],
        "carrera_de_nombre": carrera_origen,
        "carrera_de_nombre_prov": carrera_origen_prov,
        "carrera_de_nombre_certificado": carrera_origen_certificado,
        "cursos_solicitados": cursos_solicitados,
        "cursos_aprobados": cursos_aprobados,
        "validacion_cursos": resultado_validacion,
        "advertencias_parser": construir_advertencias_parser(
            pagina_constancia, pagina_certificado, pagina_solicitados,
            {"estudiante": estudiante, "codigo_carrera": codigo_carrera},
            cursos_solicitados, cursos_aprobados, resultado_validacion
        ),
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Debe enviar la ruta del PDF"}, ensure_ascii=False))
        sys.exit(1)
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(json.dumps({"ok": False, "error": f"No existe el archivo: {pdf_path}"}, ensure_ascii=False))
        sys.exit(1)
    stdout_original = sys.stdout
    fd_stdout_original = None
    try:
        # Redirige tambien el file descriptor 1, porque algunas advertencias
        # nativas de MuPDF se imprimen directo a stdout y pueden contaminar el JSON.
        sys.stdout = sys.stderr
        try:
            fd_stdout_original = os.dup(1)
            os.dup2(2, 1)
        except Exception:
            fd_stdout_original = None

        resultado = procesar_pdf(pdf_path)

        if fd_stdout_original is not None:
            os.dup2(fd_stdout_original, 1)
            os.close(fd_stdout_original)
            fd_stdout_original = None
        sys.stdout = stdout_original
        print(json.dumps(resultado, ensure_ascii=False))
    except Exception as exc:
        if fd_stdout_original is not None:
            try:
                os.dup2(fd_stdout_original, 1)
                os.close(fd_stdout_original)
            except Exception:
                pass
        sys.stdout = stdout_original
        print(json.dumps({"ok": False, "error": str(exc), "archivo": os.path.basename(pdf_path)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
