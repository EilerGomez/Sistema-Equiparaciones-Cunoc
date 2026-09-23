# Sistema de Equiparacion - primera etapa

Aplicacion basada en el backend Express y frontend React originales. Esta etapa permite crear manualmente equiparaciones, editar sus datos, seleccionar equivalencias del catalogo, visualizar el documento y descargar un PDF con las firmas y sellos configurados.

## Requisitos

- Node.js 22 o 24 y npm.
- MySQL 8.0.16 o superior, en ejecucion.
- El usuario de MySQL necesita permisos sobre la nueva base `equiparacion_db`. Para crearla automaticamente tambien necesita `CREATE DATABASE`.
- Puerto 3001 libre.

No se necesita Python para este flujo. Los lectores PDF y modulos anteriores se conservan como codigo, sin estar conectados al nuevo menu ni a las rutas de equiparacion.

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

Tambien se entrega `backend/sql/DDL_EQUIPARACION.sql` para ejecutar todo directamente en MySQL Workbench. Usa el migrador o el SQL completo; no es necesario utilizar ambos. El DDL es para una base nueva, no para modificar la base original. Su bloque final `GRANT` requiere ejecutarlo con una cuenta MySQL administradora y que ya exista `user_project_equivalencias`@`localhost`.

El migrador recuerda los scripts aplicados y permite ejecutar la nueva migracion en una instalacion previa sin borrar documentos. Los inserts del catalogo no reemplazan cursos ya existentes. Si usas un nombre diferente, debe empezar por `equiparacion`; cambia `DB_NAME` y usa el migrador. El SQL completo usa explicitamente `equiparacion_db`.

El DDL original aporta datos de los cinco pensums antiguos y los cinco vigentes. Las 52 equivalencias de cursos suministradas corresponden solo a Ciencias y Sistemas; para generar documentos de las otras carreras debes cargar sus cursos y equivalencias propios.

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
6. Haz clic en el estado de una fila para alternar entre `PENDIENTE` y `LISTO`. **Visualizar** y **PDF** usan el mismo documento; las firmas y sellos que se cargan o actualizan en **Autoridades** se leen al generarlo.

Los documentos extensos pueden ocupar varias paginas; la cabecera de la tabla y la numeracion se repiten. Solo se genera el documento de equiparacion, sin cartas individuales de docentes.

## Decisiones de datos

- `equiparacion.id` mantiene su autoincremento global.
- `correlativo_equiparacion` mantiene un contador por anio. La transaccion bloquea el contador y genera `1-2026`, `2-2026`, ..., `1-2027` usando la fecha de Guatemala. No se usa `MAX(id)+1` ni se reinicia la clave primaria.
- `codigo` es una columna calculada, unica; no se puede cambiar desde el formulario.
- `cursos_equiparacion` contiene numero, equiparacion, ambos cursos y fechas. No contiene docente, porcentaje ni opinion.
- `porcentaje` y `opinion` pertenecen a `equivalencia_curso`.
- El catalogo inicial conserva los codigos, nombres, porcentajes y opiniones del Excel. Los semestres quedan NULL porque no figuran en el archivo.
- Las equivalencias utilizadas no se pueden editar ni eliminar desde la nueva API para evitar cambiar los porcentajes de documentos existentes. Los demas datos de catalogos, estudiantes y autoridades se consultan en vivo: esto aun no es un archivo inmutable de documentos firmados.
- El PDF se genera al solicitarlo. `url_archivo` queda reservado; no se guardan PDFs generados en disco en esta etapa.
- Visualizar no marca una descarga. Descargar actualiza `fecha_impresion` en cabecera y cursos. Editar limpia la fecha para indicar que la nueva version aun no fue descargada.
- El estado se selecciona manualmente; no se implementan aprobaciones, envios por correo ni lectura automatica de PDF.
- No se incluye eliminacion de equiparaciones: asi los numeros emitidos no se reutilizan.

## Rutas nuevas

| Metodo | Ruta | Funcion |
| --- | --- | --- |
| GET | /api/equiparaciones | Listado con busqueda, estado y paginas de 20 |
| GET | /api/equiparaciones/catalogos | Datos del formulario y equivalencias por pensum |
| POST | /api/equiparaciones | Crear con correlativo anual |
| GET | /api/equiparaciones/:id | Cabecera y cursos |
| PUT | /api/equiparaciones/:id | Editar sin cambiar codigo |
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
