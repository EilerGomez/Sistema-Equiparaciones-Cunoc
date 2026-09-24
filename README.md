# Sistema de Equiparacion

Aplicacion basada en el backend Express y frontend React originales. Permite crear equiparaciones manualmente o importar un PDF de equivalencias, revisar los datos extraidos antes de guardarlos, visualizar el documento e imprimirlo con las firmas y sellos configurados.

## Requisitos

- Node.js 22 o 24 y npm.
- MySQL 8.0.16 o superior, en ejecucion.
- El usuario de MySQL necesita permisos sobre la nueva base `equiparacion_db`. Para crearla automaticamente tambien necesita `CREATE DATABASE`.
- Puerto 3001 libre.
- Python 3 y PyMuPDF para la importacion de PDF digital con texto seleccionable.

Instala el lector del PDF en Windows desde PowerShell:

```powershell
python -m pip install PyMuPDF==1.24.14
```

Si el ejecutable es `py`, usa `py -m pip install PyMuPDF==1.24.14` y configura `PYTHON_BIN=py` en `backend/.env`.

## 1. Instalar

Abre PowerShell o Git Bash dentro de la carpeta `sistema-equiparacion`:

```bash
npm run instalar
```

## 2. Configurar la nueva base con el mismo usuario MySQL

Si aun tienes la carpeta del backend original, ejecuta desde la raiz:

```bash
npm run configurar --prefix backend -- "C:/ruta/equivalencias-backend/.env"
```

Cambia la ruta por la real. El comando copia los datos de conexion MySQL y correo, configura `equiparacion_db`, puerto `3001` y genera claves JWT independientes. No modifica el archivo original.

Si prefieres configurar manualmente:

```bash
npm run configurar --prefix backend
```

Edita `backend/.env` y completa `DB_HOST`, `DB_PORT`, `DB_USER` y `DB_PASSWORD`. Mantener el mismo usuario de MySQL no concede automaticamente permisos sobre una base nueva. Si aparece un error de acceso, el administrador MySQL debe crear la base o conceder acceso a `equiparacion_db`.

No copies el `.env` del frontend anterior: su URL apunta al puerto 3000. El nuevo frontend usa `/api`, tanto compilado como en desarrollo.

## 3. Crear tablas y cargar las equivalencias

```bash
npm run migrate --prefix backend
```

Este comando crea la base nueva y aplica:

- `backend/sql/001_esquema.sql`: tablas compartidas y tablas de equiparacion.
- `backend/sql/002_sistemas_2016_2025.sql`: 104 cursos y 52 pares del Excel.
- `backend/sql/003_catalogos_equivalencias.sql`: datos originales de las cinco carreras, diez pensums, seis autoridades, instituciones, profesiones, ciclos y catalogos complementarios. Asocia cada carrera a su coordinador y migra el codigo de Sistemas `2016-58` a `2016-56`.
- `backend/sql/004_importacion_pdf.sql`: agrega columnas opcionales para valores propios de un documento.
- `backend/sql/005_valores_catalogo_importados.sql`: hace que los PDF importados anteriormente utilicen porcentaje y opinion del catalogo.
- `backend/sql/006_codigo_dictamen_origen.sql`: guarda el codigo del dictamen original y renumera las equiparaciones importadas con la secuencia propia del sistema.

Tambien se entrega `backend/sql/DDL_EQUIPARACION.sql` para ejecutar todo directamente en MySQL Workbench. Usa el migrador o el SQL completo; no es necesario utilizar ambos. El DDL es para una base nueva, no para modificar la base original. Su bloque final `GRANT` requiere ejecutarlo con una cuenta MySQL administradora y que ya exista `user_project_equivalencias`@`localhost`.

El migrador recuerda los scripts aplicados y permite ejecutar la nueva migracion en una instalacion previa sin borrar documentos. Los inserts del catalogo no reemplazan cursos ya existentes. Si usas un nombre diferente, debe empezar por `equiparacion`; cambia `DB_NAME` y usa el migrador. El SQL completo usa explicitamente `equiparacion_db`.

El DDL original aporta datos de los cinco pensums antiguos y los cinco vigentes. Las 52 equivalencias de cursos iniciales corresponden solo a Ciencias y Sistemas. Al importar un PDF, los cursos y relaciones del documento se agregan a los pensums seleccionados, sin cambiar los porcentajes de otros documentos.

## 4. Conservar las cuentas del sistema anterior

Configura `LEGACY_DB_NAME=equivalencias_db` en `backend/.env`, o el nombre real de tu base anterior. Luego:

```bash
npm run copiar-usuarios --prefix backend
```

Copia nombre, correo, hash de contrasena, rol y estado. Las mismas credenciales siguen funcionando. No copia sesiones y no modifica cuentas que ya existen en la nueva base. La base original solo se consulta. El usuario MySQL necesita lectura de sus tablas `usuarios` y `roles`.

Este comando no copia estudiantes, autoridades ni documentos. Registra estos datos desde los catalogos del nuevo sistema. Las autoridades deben configurarse con sus nombres reales y sus firmas y sellos PNG/JPG; no se insertan autoridades ficticias.

El esquema crea esta cuenta administrativa inicial:

- Nombre: Ana García
- Correo: `anagabriela_garcia@cunoc.edu.gt`
- Contraseña: `Ana.2026`

Cambia esa contraseña después del primer ingreso. Para crear otra cuenta administrativa, ejecuta:

```bash
npm run crear-admin --prefix backend
```

El asistente solicita nombre, correo y una contrasena de al menos 12 caracteres. La contrasena se muestra en tu terminal mientras la escribes.

## 5. Levantar todo en el puerto 3001

El paquete ya incluye el frontend compilado. Si realizaste cambios, compila de nuevo:

```bash
npm run build
npm start
```

Abre `http://localhost:3001`.

La misma direccion sirve la interfaz y `/api`. El backend comprueba MySQL antes de escuchar. El PDF usa `backend/public/images/encabezado-equiparacion.png`, extraido del Word de referencia; puedes sustituir esa imagen por la definitiva con el mismo nombre. El compilador conserva `public/images` al reconstruir el frontend. Para detenerlo: `Ctrl+C`. Al reiniciar la computadora, enciende MySQL y ejecuta `npm start` desde esta carpeta.

## Modo desarrollo

Terminal 1, desde la raiz:

```bash
npm run dev --prefix backend
```

Terminal 2:

```bash
npm run dev --prefix frontend
```

Abre `http://localhost:5174`. Vite envia `/api` y `/uploads` al backend en `3001`. Para regresar a una sola direccion, ejecuta `npm run build` y abre `http://localhost:3001`.

## Primera equiparacion

1. Ingresa con una cuenta `admin` o `coordinador`.
2. En **Nueva equiparacion**, busca al estudiante por carnet, registro academico o nombre. **Agregar estudiante nuevo** abre otro modal y selecciona automaticamente al estudiante registrado.
3. Elige un pensum de origen antiguo o vigente y un destino vigente distinto; el destino puede pertenecer a otra carrera. El sistema propone uno vigente de la misma carrera cuando existe. El coordinador se determina por la carrera destino y el director usa el codigo `DIRECTOR_ING`.
4. Selecciona los cursos del catalogo y guarda. La busqueda de cursos ignora las tildes. El codigo anual se asigna automaticamente y el estado inicial es `PENDIENTE`.
5. Haz clic en cualquier fila o en **Ver** para abrir la pagina de cursos y modificarlos. **Editar** cambia estudiante, pensums, sede, expediente y observaciones sin editar los cursos. Si cambias los pensums, los cursos anteriores se reinician y debes escoger los nuevos desde **Ver**.
6. Haz clic en el estado de una fila para alternar entre `PENDIENTE` y `LISTO`. **Visualizar** abre la vista previa del backend. **PDF** prepara el documento en el frontend con una sola tabla continua y abre la impresion del navegador; alli puedes elegir **Guardar como PDF**. En esa misma vista, **Word editable** descarga un `.docx` con una sola tabla de cursos que continua entre paginas y repite sus encabezados. Las firmas y sellos configurados en **Autoridades** se incorporan a ambos formatos.

## Importar un PDF de equivalencias

1. En el listado, pulsa **Importar PDF**, selecciona el PDF y pulsa **Leer PDF**.
2. Revisa en la vista previa el numero del dictamen de origen, fecha, sede, estudiante, expediente, pensums y todos los cursos. El lector ignora ceros iniciales en codigos numericos: `028` se guarda como `28`.
3. Ajusta el estudiante, sede o pensums si hace falta y pulsa **Confirmar e importar**. Si no existe el estudiante por carnet o registro academico, se crea al confirmar. Si ambos identificadores corresponden a personas distintas, la importacion se detiene para evitar duplicados.
4. La nueva equiparacion usa el siguiente correlativo anual propio del sistema segun la fecha de Guatemala. El numero del PDF se guarda en `codigo_dictamen_origen` solo para trazabilidad, junto a la fecha de su encabezado y al PDF original. El estado inicial siempre es `PENDIENTE`. El coordinador se obtiene de la carrera destino y el director usa `DIRECTOR_ING`.

El PDF debe contener texto seleccionable y una tabla como la del ejemplo. Un PDF escaneado sin texto se rechaza con un mensaje; se puede registrar manualmente. El limite es 12 MB y 30 paginas. La vista previa no guarda datos: estudiante, cursos y equiparacion se insertan juntos al confirmar. El numero del dictamen no bloquea la asignacion del codigo propio. Para una base ya creada, ejecuta `npm run migrate --prefix backend` antes de importar; si administras la base con Workbench, ejecuta el DDL completo actualizado o los scripts `004_importacion_pdf.sql`, `005_valores_catalogo_importados.sql` y `006_codigo_dictamen_origen.sql` en ese orden. La migracion 006 renumera los PDF importados con la version anterior y conserva su codigo original.

Los documentos extensos pueden ocupar varias paginas; la cabecera de la misma tabla se repite al imprimir. El PDF abierto en Word depende de la conversion de Word y puede redistribuir el contenido. Para editar con certeza una sola tabla, usa **Word editable**. Solo se genera el documento de equiparacion, sin cartas individuales de docentes.

## Decisiones de datos

- `equiparacion.id` mantiene su autoincremento global.
- `correlativo_equiparacion` mantiene un contador por anio. La transaccion bloquea el contador y genera `1-2026`, `2-2026`, ..., `1-2027` usando la fecha de Guatemala. No se usa `MAX(id)+1` ni se reinicia la clave primaria.
- `codigo` es una columna calculada, unica; no se puede cambiar desde el formulario.
- `codigo_dictamen_origen` guarda la referencia del PDF y nunca participa en el correlativo anual. Es visible en el listado y en el detalle.
- Al importar, `cursos_equiparacion` usa porcentaje y opinion de `equivalencia_curso`; los valores impresos en el PDF no los reemplazan. Si el par es nuevo, se registra en el catalogo con 100% y EQUIVALENTE. La migracion 005 corrige los PDF importados con la version anterior sin alterar las equivalencias del catalogo.
- El catalogo inicial conserva los codigos, nombres, porcentajes y opiniones del Excel. Los semestres quedan NULL porque no figuran en el archivo.
- Las equivalencias utilizadas no se pueden editar ni eliminar desde la nueva API para evitar cambiar los porcentajes de documentos existentes. Los demas datos de catalogos, estudiantes y autoridades se consultan en vivo: esto aun no es un archivo inmutable de documentos firmados.
- Visualizar genera el PDF del backend sin registrar impresion. El boton PDF compone el HTML en un iframe aislado y usa la impresion del navegador. `url_archivo` conserva el PDF original cuando procede de una importacion.
- En documentos manuales, preparar PDF actualiza `fecha_impresion`. En los importados se conserva la fecha del PDF de origen.
- El estado se selecciona manualmente; no se implementan aprobaciones ni envios por correo.
- No se incluye eliminacion de equiparaciones: asi los numeros emitidos no se reutilizan.

## Rutas nuevas

| Metodo | Ruta | Funcion |
| --- | --- | --- |
| GET | /api/equiparaciones | Listado con busqueda, estado y paginas de 20 |
| GET | /api/equiparaciones/catalogos | Datos del formulario y equivalencias por pensum |
| POST | /api/equiparaciones | Crear con correlativo anual |
| POST | /api/equiparaciones/importar/preview | Extraer y revisar datos del PDF sin guardar |
| POST | /api/equiparaciones/importar | Confirmar el PDF, estudiante, catalogo y equiparacion |
| GET | /api/equiparaciones/:id | Cabecera y cursos |
| PUT | /api/equiparaciones/:id | Editar sin cambiar codigo |
| POST | /api/equiparaciones/:id/impresion | Registrar impresion y obtener datos para la hoja del frontend |
| GET | /api/equiparaciones/:id/pdf | Vista previa del PDF |
| GET | /api/equiparaciones/:id/pdf?download=1 | Descargar y registrar fecha |

Todas requieren token y rol admin/coordinador. Las rutas anteriores de dictamen, docentes y cartas quedan fuera del router activo, pero sus archivos fuente se conservan para la limpieza posterior.

## Pruebas

```bash
npm test
npm run build
```

Por defecto se ejecutan las validaciones y se omite la prueba MySQL. Para ejecutar la integracion real usa una base temporal cuyo nombre comience con `equiparacion_test_`; el test la crea y elimina. No uses una base con datos.

PowerShell, desde la raiz, con los datos de tu MySQL:

```powershell
$env:RUN_DB_TESTS="1"
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_PASSWORD="TU_CLAVE_MYSQL"
$env:DB_NAME="equiparacion_test_manual"
npm test
Remove-Item Env:RUN_DB_TESTS, Env:DB_HOST, Env:DB_PORT, Env:DB_USER, Env:DB_PASSWORD, Env:DB_NAME
```

El test verifica los 52 pares contra la extraccion del Excel, permisos, CRUD, PDF, rollback ante errores, seis creaciones concurrentes y contadores de distintos anios.

## Alcance pendiente

La siguiente etapa puede agregar carga y lectura de PDF para completar automaticamente el formulario. Por ahora los campos se ingresan manualmente. La lectura automatica y el flujo anterior de cartas permanecen desconectados.
