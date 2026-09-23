# Equivalencias — Backend

API REST en Node.js + Express para el sistema de equivalencias de cursos.

## Stack
- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Base de datos**: MySQL 8
- **Autenticación**: JWT (access 1h + refresh 7d)
- **Hashing**: Argon2id (recomendado por OWASP)
- **Correo**: Nodemailer (Gmail / SMTP)

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# → Edita .env con tus datos reales

# 3. Crear tablas en MySQL
npm run migrate

# 4. Iniciar en desarrollo
npm run dev

# 5. Iniciar en producción
npm start
```
## Instalación de dependencias Python

El backend ejecuta algunos scripts en Python, por lo que es necesario crear un entorno virtual e instalar sus librerías.

Desde la raíz del backend:

```bash
rm -rf venv

sudo apt install python3.12-venv python3-full python3-pip

python3 -m venv venv

./venv/bin/python --version

./venv/bin/pip install -r requirements.txt
```
## Luego, en el archivo .env, configurar la ruta del Python del entorno virtual:
PYTHON_BIN=./venv/bin/python
## Si la ruta relativa no funciona, usar la ruta absoluta:
PYTHON_BIN=/ruta/completa/del/proyecto/venv/bin/python
## En windows:
.\venv\Scripts\python.exe -m pip install -r requirements.txt
ruta:
PYTHON_BIN=.\\venv\\Scripts\\python.exe
verificacion:
.\venv\Scripts\python.exe -c "import fitz; print('fitz OK')"
## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `DB_*` | Credenciales de MySQL |
| `JWT_SECRET` | String aleatorio largo (mín. 64 chars) |
| `JWT_REFRESH_SECRET` | Otro string aleatorio |
| `MAIL_USER` | Tu correo Gmail |
| `MAIL_PASSWORD` | App Password de Gmail (no tu contraseña normal) |
| `FRONTEND_URL` | URL del frontend (para CORS y links en emails) |

> **Gmail**: activa verificación en 2 pasos y genera un **App Password** en
> https://myaccount.google.com/apppasswords

## Endpoints

### Auth — `/api/auth`

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/register` | Registro de usuario | No |
| POST | `/login` | Inicio de sesión | No |
| POST | `/refresh` | Renovar access token | No |
| POST | `/logout` | Cerrar sesión | No |
| GET  | `/me` | Datos del usuario actual | Bearer |
| POST | `/forgot-password` | Solicitar reset por email | No |
| POST | `/reset-password` | Cambiar contraseña con token | No |

### Uso del token en rutas protegidas

```http
Authorization: Bearer <accessToken>
```

## Estructura

```
src/
├── app.js                  ← entrada principal
├── config/
│   ├── db.js               ← pool MySQL
│   └── migrate.js          ← crea las tablas
├── controllers/
│   └── auth.controller.js
├── middlewares/
│   ├── auth.middleware.js  ← authenticate + authorize
│   └── validate.middleware.js
├── models/
│   ├── user.model.js
│   └── token.model.js
├── routes/
│   └── auth.routes.js
├── services/
│   └── email.service.js
└── utils/
    ├── jwt.js
    └── password.js         ← Argon2id
```
