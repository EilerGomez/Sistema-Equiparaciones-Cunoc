"""Lee las columnas del formato de equivalencias (Excel 97-2003 o XLSX) desde stdin."""
import io
import json
import re
import sys


def fail(message):
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    sys.exit(1)


def clean(value):
    if value is None:
        return ""
    if isinstance(value, (float, int)) and not isinstance(value, bool):
        return str(int(value)) if float(value).is_integer() else str(value)
    return str(value).strip()


def code(value, row):
    value = clean(value)
    if re.fullmatch(r"\d+(?:\.0+)?", value):
        value = str(int(float(value)))
    if not value or len(value) > 20:
        fail(f"Fila {row}: código de curso inválido")
    return value.upper()


def read(raw):
    if raw.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
        try:
            import xlrd
        except ImportError:
            fail("Falta xlrd. Instala las dependencias de backend/requirements.txt")
        book = xlrd.open_workbook(file_contents=raw)
        if book.nsheets != 1:
            fail("El archivo debe contener una sola hoja de equivalencias")
        sheet = book.sheet_by_index(0)
        return [sheet.row_values(i) for i in range(sheet.nrows)]
    if raw.startswith(b"PK\x03\x04"):
        try:
            import openpyxl
        except ImportError:
            fail("Falta openpyxl. Instala las dependencias de backend/requirements.txt")
        book = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        try:
            if len(book.worksheets) != 1:
                fail("El archivo debe contener una sola hoja de equivalencias")
            return list(book.worksheets[0].values)
        finally:
            book.close()
    fail("Selecciona un archivo Excel .xls o .xlsx válido")


def parse(raw):
    rows = read(raw)
    if len(rows) < 3 or len(rows) > 2002:
        fail("El archivo debe tener encabezados y entre 1 y 2000 equivalencias")
    header = [clean(v) for v in rows[0]]
    subheader = [clean(v).lower() for v in rows[1]]
    if len(header) < 8 or len(subheader) < 6 or not all(
        re.search(r"c[oó]digo", subheader[j]) for j in (1, 4)
    ) or not all("nombre" in subheader[j] for j in (2, 5)):
        fail("El encabezado no corresponde al formato de equivalencias de cursos")
    years = [re.search(r"pensum\s*(\d{4})", header[j], re.I) for j in (1, 4)]
    if not all(years):
        fail("No se encontraron los años de pensum de origen y destino en el encabezado")
    result = []
    seen = set()
    for n, values in enumerate(rows[2:], 3):
        cells = [clean(values[j]) if j < len(values) else "" for j in range(8)]
        if not any(cells):
            continue
        origin, target = code(cells[1], n), code(cells[4], n)
        name1, name2 = cells[2], cells[5]
        if not name1 or not name2 or len(name1) > 150 or len(name2) > 150:
            fail(f"Fila {n}: revisa los nombres de los cursos (máximo 150 caracteres)")
        try:
            percentage = float(cells[6].replace("%", "").replace(",", "."))
        except ValueError:
            fail(f"Fila {n}: porcentaje inválido")
        if not 0 <= percentage <= 100 or round(percentage, 2) != percentage:
            fail(f"Fila {n}: porcentaje inválido (0 a 100, hasta dos decimales)")
        opinion = cells[7].upper()
        if not opinion or len(opinion) > 50:
            fail(f"Fila {n}: opinión obligatoria (máximo 50 caracteres)")
        pair = (origin, target)
        if pair in seen:
            fail(f"Fila {n}: equivalencia repetida ({origin} → {target})")
        seen.add(pair)
        result.append({"fila": n, "codigo_de": origin, "nombre_de": name1,
                       "codigo_a": target, "nombre_a": name2,
                       "porcentaje": percentage, "opinion": opinion})
    if not result:
        fail("No se encontraron equivalencias en el archivo")
    return {"origen": {"anio": int(years[0].group(1)), "encabezado": header[1]},
            "destino": {"anio": int(years[1].group(1)), "encabezado": header[4]},
            "filas": result}


if __name__ == "__main__":
    try:
        print(json.dumps({"ok": True, "data": parse(sys.stdin.buffer.read())}, ensure_ascii=False))
    except Exception as error:
        fail(f"No se pudo leer el Excel: {error}")
