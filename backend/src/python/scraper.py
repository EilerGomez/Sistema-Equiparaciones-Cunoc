"""
scraper.py — Scraper de docentes CUNOC
Recibe parametros por stdin JSON y devuelve resultado por stdout JSON
"""

import io
import re
import sys
import json
import time
import unicodedata
import requests
import pdfplumber
from bs4 import BeautifulSoup

sys.stdout = open(sys.stdout.fileno(), mode="w", encoding="utf-8", buffering=1)
sys.stderr = open(sys.stderr.fileno(), mode="w", encoding="utf-8", buffering=1)

POST_URL = "https://administrativo.ingenieria.cunoc.edu.gt/index.php/cursos/buscar"
PRINT_BASE = "https://administrativo.ingenieria.cunoc.edu.gt/index.php/competencias/imprimir/id/"

DELAY = 0.8
DELAY_PDF = 0.4

HEADERS_POST = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://ingenieria.cunoc.usac.edu.gt/portal/index.php/Categoria/programas-de-cursos",
    "Origin": "https://ingenieria.cunoc.usac.edu.gt",
}

HEADERS_GET = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Accept": "application/pdf,*/*",
}


def normalizar(texto):
    nfkd = unicodedata.normalize("NFKD", str(texto or ""))
    sin_tildes = "".join(c for c in nfkd if not unicodedata.combining(c))
    limpio = re.sub(r"\s+", " ", sin_tildes)
    return limpio.upper().strip()


def normalizar_con_interrogante(texto):
    texto = str(texto or "").upper()

    convertido = texto.translate(str.maketrans({
        "Á": "A",
        "É": "E",
        "Í": "I",
        "Ó": "O",
        "Ú": "U",
        "À": "A",
        "È": "E",
        "Ì": "I",
        "Ò": "O",
        "Ù": "U",
        "Ü": "U",
        "Ñ": "?",
    }))

    return re.sub(r"\s+", " ", convertido).strip()


def es_laboratorio(nombre):
    n = str(nombre or "").strip().lower()
    return n.startswith("lab") or "laboratorio" in n


def generar_variantes(nombre):
    norm = normalizar(nombre)
    norm_q = normalizar_con_interrogante(nombre)

    tiene_area = norm.startswith("AREA ")
    tiene_numero = bool(re.search(r"\s+\d+$", norm))
    tiene_enie = "Ñ" in str(nombre or "").upper()

    sin_area = re.sub(r"^AREA\s+", "", norm).strip()
    sin_numero = re.sub(r"\s+\d+$", "", norm).strip()
    sin_ambos = re.sub(r"\s+\d+$", "", sin_area).strip()

    sin_area_q = re.sub(r"^AREA\s+", "", norm_q).strip()
    sin_numero_q = re.sub(r"\s+\d+$", "", norm_q).strip()
    sin_ambos_q = re.sub(r"\s+\d+$", "", sin_area_q).strip()

    variantes = [norm]

    if tiene_area:
        variantes.append(sin_area)

    if tiene_numero:
        variantes.append(sin_numero)

    if tiene_area and tiene_numero:
        variantes.append(sin_ambos)

    if tiene_enie:
        variantes.append(norm_q)

        if tiene_area:
            variantes.append(sin_area_q)

        if tiene_numero:
            variantes.append(sin_numero_q)

        if tiene_area and tiene_numero:
            variantes.append(sin_ambos_q)

    vistos = set()
    resultado = []

    for variante in variantes:
        if variante and variante not in vistos:
            vistos.add(variante)
            resultado.append(variante)

    return resultado


def coincide_ciclo(semestre_web, codigo_ciclo):
    return normalizar(semestre_web) == normalizar(codigo_ciclo)


def coincide_anio(cohorte_web, anio):
    return str(cohorte_web or "").strip() == str(anio).strip()


def buscar_filas(termino, anio, codigo_ciclo):
    try:
        data = {
            "curso": termino,
            "buscar": "1",
        }

        resp = requests.post(
            POST_URL,
            data=data,
            headers=HEADERS_POST,
            timeout=15
        )

        resp.encoding = "utf-8"

        soup = BeautifulSoup(resp.text, "html.parser")
        tabla = soup.find("table", class_="table-bordered")

        if not tabla:
            return []

        resultados = []
        vistos = set()

        for fila in tabla.find_all("tr")[1:]:
            celdas = fila.find_all("td")

            if len(celdas) < 6:
                continue

            nombre_celda = celdas[0].get_text(" ", strip=True)
            docente_celda = celdas[1].get_text(" ", strip=True).upper().strip()
            seccion_celda = celdas[2].get_text(" ", strip=True)
            semestre_celda = celdas[3].get_text(" ", strip=True)
            cohorte_celda = celdas[4].get_text(" ", strip=True)

            if not coincide_anio(cohorte_celda, anio):
                continue

            if not coincide_ciclo(semestre_celda, codigo_ciclo):
                continue

            if es_laboratorio(nombre_celda):
                continue

            if not docente_celda:
                continue

            boton = celdas[5].find("input")
            print_id = None

            if boton:
                onclick = boton.get("onclick", "")
                m = re.search(r"/id/(\d+)", onclick)

                if m:
                    print_id = m.group(1)

            key = (
                docente_celda,
                print_id,
                normalizar(semestre_celda),
                str(cohorte_celda).strip(),
            )

            if key not in vistos:
                vistos.add(key)
                resultados.append({
                    "docente": docente_celda,
                    "print_id": print_id,
                    "seccion": seccion_celda,
                    "semestre_web": semestre_celda,
                    "cohorte_web": cohorte_celda,
                })

        return resultados
    except Exception as e:
        print(f"  Error POST: {e}", file=sys.stderr)
        return []


def get_codigo_from_pdf(print_id):
    try:
        url = PRINT_BASE + str(print_id)

        resp = requests.get(
            url,
            headers=HEADERS_GET,
            timeout=20
        )

        pdf_bytes = io.BytesIO(resp.content)

        with pdfplumber.open(pdf_bytes) as pdf:
            primera = pdf.pages[0]
            texto = primera.extract_text() or ""
            lineas = texto.split("\n")

            for i, linea in enumerate(lineas):
                if "digo" in linea.lower():
                    for parte in linea.split():
                        if parte.isdigit():
                            return parte

                    if i + 1 < len(lineas):
                        siguiente = lineas[i + 1].strip()

                        if siguiente.isdigit():
                            return siguiente
    except Exception:
        pass

    return None


def buscar_con_variantes(nombre, anio, codigo_ciclo):
    variantes = generar_variantes(nombre)

    for variante in variantes:
        print(f"  Probando: '{variante}'", file=sys.stderr)

        resultados = buscar_filas(
            termino=variante,
            anio=anio,
            codigo_ciclo=codigo_ciclo
        )

        if resultados:
            print(f"  Encontrado con: '{variante}'", file=sys.stderr)
            return resultados

    return []


def main():
    params = json.loads(sys.stdin.read())

    cursos = params["cursos"]
    anio = params["anio"]
    id_ciclo = params["id_ciclo"]
    codigo_ciclo = params["codigo_ciclo"]

    docentes_set = set()
    docente_curso = []
    relaciones_vistas = set()

    total = len(cursos)

    for i, curso in enumerate(cursos, 1):
        codigo_bd = str(curso["codigo"]).strip()
        nombre = str(curso["nombre"]).strip()

        print(
            f"[{i}/{total}] {codigo_bd} — {nombre} | {codigo_ciclo} {anio}",
            file=sys.stderr
        )

        resultados = buscar_con_variantes(
            nombre=nombre,
            anio=anio,
            codigo_ciclo=codigo_ciclo
        )

        if not resultados:
            print("  Sin resultados para ninguna variante — omitido", file=sys.stderr)
            time.sleep(DELAY)
            continue

        encontrados = set()

        for r in resultados:
            print_id = r["print_id"]
            docente = r["docente"]

            if not print_id:
                continue

            codigo_pdf = get_codigo_from_pdf(print_id)

            if codigo_pdf and str(codigo_pdf).strip() == codigo_bd:
                encontrados.add(docente)
                docentes_set.add(docente)

            time.sleep(DELAY_PDF)

        for docente in encontrados:
            key = (
                codigo_bd,
                docente,
                int(id_ciclo),
            )

            if key not in relaciones_vistas:
                relaciones_vistas.add(key)
                docente_curso.append({
                    "id_curso": codigo_bd,
                    "nombre_docente": docente,
                    "id_ciclo": int(id_ciclo),
                })

        if encontrados:
            print(
                f"  {len(encontrados)} docente(s): {sorted(encontrados)}",
                file=sys.stderr
            )

        time.sleep(DELAY)

    resultado = {
        "docentes": [
            {"nombre": nombre}
            for nombre in sorted(docentes_set)
        ],
        "docente_curso": docente_curso,
    }

    print(json.dumps(resultado, ensure_ascii=False))


if __name__ == "__main__":
    main()