import json
import re
import sys
import unicodedata
from datetime import date

import fitz


MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalized(value):
    value = unicodedata.normalize("NFD", clean(value).lower())
    return "".join(char for char in value if unicodedata.category(char) != "Mn")


def code(value):
    value = clean(value)
    return str(int(value)) if re.fullmatch(r"\d+", value) else value.upper()


def required(pattern, text, label, flags=re.IGNORECASE):
    found = re.search(pattern, text, flags)
    if not found:
        raise ValueError(f"No se pudo leer {label} en el PDF")
    return found


def extract_header(document):
    text = clean(" ".join(page.get_text(sort=True) for page in document[:3]))
    if len(text) < 100:
        raise ValueError("El PDF no contiene texto seleccionable; se requiere un PDF digital")
    title = required(r"Dic\.?\s+Equiv\.?\s+(.+?)\s+No\.?\s*(\d{1,9})\s*-\s*(\d{4})", text, "el numero de dictamen")
    if not 2000 <= int(title[3]) <= 9999 or not 1 <= int(title[2]) <= 4294967295:
        raise ValueError("El numero o anio del dictamen no es valido")
    printed = required(r"([A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{3,80}),\s*(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+de\s+(\d{4})", text, "la fecha del documento")
    month = MONTHS.get(normalized(printed[3]))
    if not month:
        raise ValueError("El mes de la fecha del documento no es valido")
    try:
        printed_date = date(int(printed[4]), month, int(printed[2])).isoformat()
    except ValueError as error:
        raise ValueError("La fecha del documento no es valida") from error
    student = required(r"Estudiante\s*:\s*(.+?)\s*,\s*Carn[eé]\s*No\.?\s*(\d+)\s*,?\s*y?\s*Registro\s+Acad[eé]mico\s*No\.?\s*(\d+)", text, "los datos del estudiante")
    paragraph = text[student.end():]
    careers = re.findall(r"((?:Ingenier[ií]a|Licenciatura|Arquitectura|Agronom[ií]a)\b[^,.]{1,100}?)\s+Pensum\s+(\d{4})\s+([A-Z]{2,12})\b", paragraph, re.IGNORECASE)
    if len(careers) < 2:
        raise ValueError("No se pudieron identificar los pensums de origen y destino")
    expediente = re.search(r"Exp\.?\s*No\.?\s*([^\s]+)", text, re.IGNORECASE)
    numero_expediente = clean(expediente[1]) if expediente else ""
    if numero_expediente in ("—", "–", "-", "--", "_"):
        numero_expediente = ""
    return {
        "subfijo": clean(title[1]), "correlativo": int(title[2]), "anio": int(title[3]),
        "codigo": f"{int(title[2])}-{title[3]}", "sede": clean(printed[1]),
        "fecha_impresion": printed_date,
        "num_expediente": numero_expediente,
        "estudiante": {"nombre_completo": clean(student[1]), "carnet": student[2], "registro_academico": student[3]},
        "origen": {"carrera": clean(careers[0][0]), "anio": int(careers[0][1]), "institucion": careers[0][2].upper()},
        "destino": {"carrera": clean(careers[1][0]), "anio": int(careers[1][1]), "institucion": careers[1][2].upper()},
    }


def table_columns(words):
    codes = sorted((word for word in words if normalized(word[4]) == "codigo"), key=lambda word: (word[1], word[0]))
    for first in codes:
        second = next((word for word in codes if word[0] > first[0] + 50 and abs(word[1] - first[1]) < 5), None)
        if not second:
            continue
        same_line = [word for word in words if abs(word[1] - first[1]) < 5]
        names = sorted((word for word in same_line if normalized(word[4]) == "nombre"), key=lambda word: word[0])
        separator = next((word for word in same_line if normalized(word[4]) == "por" and first[0] < word[0] < second[0]), None)
        if len(names) != 2 or not separator:
            continue
        return first[1], first[0], names[0][0], separator[0], second[0], names[1][0]
    return None


def extract_rows(document):
    rows = []
    for page in document:
        words = page.get_text("words", sort=True)
        columns = table_columns(words)
        if not columns:
            continue
        header_y, first_code, first_name, separator, second_code, second_name = columns
        percentages = [word[0] for word in words if normalized(word[4]) == "porcentaje" and abs(word[1] - header_y) < 40]
        opinions = [word[0] for word in words if normalized(word[4]) == "opinion" and abs(word[1] - header_y) < 40]
        if not percentages or not opinions:
            raise ValueError("No se pudieron delimitar las columnas de porcentaje y opinion")
        pct, opinion = percentages[0], opinions[0]
        stops = [word[1] for word in words if word[1] > header_y and normalized(word[4]) == "sin" and any(normalized(other[4]) == "otro" and abs(other[1] - word[1]) < 2 for other in words)]
        end_y = min(stops) if stops else page.rect.height
        starts = sorted((word for word in words if header_y + 7 < word[1] < end_y and word[0] < first_code - 9 and re.fullmatch(r"\d{1,3}", word[4])), key=lambda word: word[1])
        for index, start in enumerate(starts):
            bottom = starts[index + 1][1] - 1 if index + 1 < len(starts) else end_y
            segments = {key: [] for key in ("origen_codigo", "origen_nombre", "destino_codigo", "destino_nombre", "porcentaje", "opinion")}
            for word in words:
                x, y, _, _, value = word[:5]
                if y < start[1] - 1 or y >= bottom:
                    continue
                if first_code - 9 <= x < first_code + 24:
                    key = "origen_codigo"
                elif first_code + 24 <= x < separator - 9:
                    key = "origen_nombre"
                elif second_code - 9 <= x < second_code + 24:
                    key = "destino_codigo"
                elif second_code + 24 <= x < pct - 7:
                    key = "destino_nombre"
                elif pct - 7 <= x < (pct + opinion) / 2:
                    key = "porcentaje"
                elif x >= (pct + opinion) / 2:
                    key = "opinion"
                else:
                    continue
                segments[key].append(word)
            def content(key):
                return clean(" ".join(word[4] for word in sorted(segments[key], key=lambda word: (round(word[1] / 3), word[0]))))
            source, target = content("origen_codigo"), content("destino_codigo")
            percentage = content("porcentaje").replace("%", "")
            if not source or not target or not re.fullmatch(r"\d+(?:[.,]\d+)?", percentage):
                raise ValueError(f"La fila {start[4]} de la tabla no se pudo leer completa")
            rows.append({"numero": int(start[4]), "curso_de_codigo": code(source), "curso_de_nombre": content("origen_nombre"),
                         "curso_a_codigo": code(target), "curso_a_nombre": content("destino_nombre"),
                         "porcentaje": float(percentage.replace(",", ".")), "opinion": content("opinion")})
    if not rows or len(rows) > 200:
        raise ValueError("No se encontraron cursos en la tabla del PDF")
    if [row["numero"] for row in rows] != list(range(1, len(rows) + 1)):
        raise ValueError("La numeracion de los cursos no es continua; revisa el PDF")
    if any(not row["curso_de_nombre"] or not row["curso_a_nombre"] or not row["opinion"] or row["porcentaje"] > 100 for row in rows):
        raise ValueError("Hay datos incompletos o porcentajes invalidos en la tabla")
    return rows


def main():
    if len(sys.argv) != 2:
        raise ValueError("Indica un archivo PDF")
    if sys.argv[1] == "-":
        document = fitz.open(stream=sys.stdin.buffer.read(), filetype="pdf")
    else:
        document = fitz.open(sys.argv[1])
    if document.is_encrypted or document.page_count > 30:
        raise ValueError("El PDF esta protegido o supera el limite de 30 paginas")
    result = extract_header(document)
    result["cursos"] = extract_rows(document)
    print(json.dumps({"ok": True, "data": result}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
        sys.exit(1)
