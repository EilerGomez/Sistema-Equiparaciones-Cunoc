# Equivalencias — Frontend

Cliente React para el sistema de equivalencias de cursos.

## Stack
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **HTTP**: Axios (con interceptor para token refresh automático)
- **Notificaciones**: React Hot Toast
- **Fonts**: DM Serif Display + DM Sans (Google Fonts)

## Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/login` | Público | Inicio de sesión |
| `/register` | Público | Registro de cuenta |
| `/forgot-password` | Público | Solicitar reset de contraseña |
| `/reset-password?token=...` | Público | Nueva contraseña (desde email) |
| `/dashboard` | Privado | Panel principal |

## Estructura

```
src/
├── api/
│   ├── client.js       ← axios + interceptor refresh token
│   └── auth.js         ← llamadas al backend
├── components/
│   ├── auth/
│   │   └── AuthLayout.jsx
│   └── ui/
│       └── PasswordStrength.jsx
├── context/
│   └── AuthContext.jsx ← estado global de sesión
├── hooks/
│   └── usePasswordStrength.js
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── ForgotPasswordPage.jsx
│   ├── ResetPasswordPage.jsx
│   └── DashboardPage.jsx
├── router/
│   └── Guards.jsx      ← PrivateRoute + PublicRoute
├── App.jsx
├── main.jsx
└── index.css
```

## Cómo proteger una ruta nueva

```jsx
// En App.jsx, dentro del bloque <Route element={<PrivateRoute />}>
<Route path="/equivalencias" element={<EquivalenciasPage />} />

// Con restricción de rol (solo admin y coordinador):
<Route element={<PrivateRoute roles={['admin', 'coordinador']} />}>
  <Route path="/admin" element={<AdminPage />} />
</Route>
```
