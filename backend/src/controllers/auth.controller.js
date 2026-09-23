const crypto = require('crypto');
const UserModel      = require('../models/user.model');
const TokenModel     = require('../models/token.model');
const EstudianteModel = require('../models/estudiante.model');
const { hashPassword, verifyPassword }   = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../services/email.service');

// ── Helper: construye payload del estudiante para el JWT ──
const buildEstudiantePayload = (estudiante) => {
  if (!estudiante) return {}
  return {
    estudiante_id:      estudiante.id,
    carnet:             estudiante.carnet,
    registro_academico: estudiante.registro_academico,
  }
}

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const passwordHash = await hashPassword(password);
    const id = await UserModel.create({ nombre, email, passwordHash });
    const user = await UserModel.findById(id);

    const accessToken  = signAccessToken({ id: user.id, rol: user.rol });
    const refreshToken = signRefreshToken({ id: user.id });

    await TokenModel.create({
      usuarioId: user.id,
      token: refreshToken,
      tipo: 'refresh',
      expiresInMinutes: 7 * 24 * 60,
    });

    return res.status(201).json({
      message: 'Registro exitoso',
      accessToken,
      refreshToken,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      // Si es estudiante necesita completar datos
      requiere_datos_estudiante: user.rol === 'estudiante',
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

    await TokenModel.revokeAllForUser({ usuarioId: user.id, tipo: 'refresh' });

    // Si es estudiante, busca si ya tiene datos asociados
    let estudiante = null
    let requiere_datos_estudiante = false

    if (user.rol === 'estudiante') {
      estudiante = await EstudianteModel.findByUsuarioId(user.id)
      if (!estudiante) requiere_datos_estudiante = true
    }

    const accessToken  = signAccessToken({
      id:  user.id,
      rol: user.rol,
      ...buildEstudiantePayload(estudiante),
    });
    const refreshToken = signRefreshToken({ id: user.id });

    await TokenModel.create({
      usuarioId: user.id,
      token: refreshToken,
      tipo: 'refresh',
      expiresInMinutes: 7 * 24 * 60,
    });

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id:    user.id,
        nombre: user.nombre,
        email:  user.email,
        rol:    user.rol,
        ...buildEstudiantePayload(estudiante),
      },
      requiere_datos_estudiante,
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// POST /api/auth/completar-estudiante
// Llamado después de register o login cuando requiere_datos_estudiante = true
// Body: { carnet, registro_academico }
const completarEstudiante = async (req, res) => {
  try {
    const { carnet, registro_academico } = req.body
    const userId   = req.user.id
    const userName = req.user.nombre

    // Verifica que no tenga ya un estudiante
    const yaAsociado = await EstudianteModel.findByUsuarioId(userId)
    if (yaAsociado) {
      return res.status(409).json({ message: 'Ya tienes datos de estudiante registrados' })
    }

    // Busca si ya existe un estudiante con ese carnet y registro
    const existente = await EstudianteModel.findByCarnetYRegistro(carnet, registro_academico)

    let estudiante

    if (existente) {
      // Ya existe — verifica que no esté asociado a otro usuario
      if (existente.usuario_id && existente.usuario_id !== userId) {
        return res.status(409).json({
          message: 'Ese carnet ya está asociado a otra cuenta',
        })
      }
      // Asocia el usuario a ese estudiante
      await EstudianteModel.asociarUsuario(existente.id, userId)
      estudiante = await EstudianteModel.findById(existente.id)
    } else {
      // No existe — crea el estudiante con el nombre del usuario
      const nuevoId = await EstudianteModel.create({
        nombre_completo:    userName,
        carnet:             carnet.trim(),
        registro_academico: registro_academico.trim(),
        usuario_id:         userId,
      })
      estudiante = await EstudianteModel.findById(nuevoId)
    }

    // Genera nuevo access token con datos del estudiante
    const user = await UserModel.findById(userId)
    const newAccessToken = signAccessToken({
      id:  user.id,
      rol: user.rol,
      ...buildEstudiantePayload(estudiante),
    })

    return res.json({
      message: 'Datos de estudiante registrados correctamente',
      accessToken: newAccessToken,
      user: {
        id:    user.id,
        nombre: user.nombre,
        email:  user.email,
        rol:    user.rol,
        ...buildEstudiantePayload(estudiante),
      },
    })
  } catch (err) {
    console.error('completarEstudiante error:', err)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El carnet o registro académico ya está en uso' })
    }
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token requerido' });

    const payload = verifyRefreshToken(refreshToken);
    const stored  = await TokenModel.findValid({ token: refreshToken, tipo: 'refresh' });
    if (!stored) return res.status(401).json({ message: 'Refresh token inválido o expirado' });

    await TokenModel.markUsed(stored.id);

    const user = await UserModel.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });

    // Incluye datos del estudiante en el refresh
    let estudiante = null
    if (user.rol === 'estudiante') {
      estudiante = await EstudianteModel.findByUsuarioId(user.id)
    }

    const newAccessToken  = signAccessToken({
      id:  user.id,
      rol: user.rol,
      ...buildEstudiantePayload(estudiante),
    });
    const newRefreshToken = signRefreshToken({ id: user.id });

    await TokenModel.create({
      usuarioId: user.id,
      token: newRefreshToken,
      tipo: 'refresh',
      expiresInMinutes: 7 * 24 * 60,
    });

    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ message: 'Refresh token inválido' });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findByEmail(email);
    const genericMsg = 'Si el correo existe, recibirás un enlace en breve';
    if (!user) return res.json({ message: genericMsg });

    await TokenModel.revokeAllForUser({ usuarioId: user.id, tipo: 'reset_password' });

    const resetToken = crypto.randomBytes(48).toString('hex');
    const expiresInMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES) || 60;

    await TokenModel.create({ usuarioId: user.id, token: resetToken, tipo: 'reset_password', expiresInMinutes });
    await sendPasswordResetEmail({ to: user.email, nombre: user.nombre, resetToken });

    return res.json({ message: genericMsg });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const stored = await TokenModel.findValid({ token, tipo: 'reset_password' });
    if (!stored) return res.status(400).json({ message: 'El enlace es inválido o ha expirado' });

    const passwordHash = await hashPassword(password);
    await UserModel.updatePassword(stored.usuario_id, passwordHash);
    await TokenModel.markUsed(stored.id);
    await TokenModel.revokeAllForUser({ usuarioId: stored.usuario_id, tipo: 'refresh' });

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  return res.json({
    user: {
      id:                 req.user.id,
      nombre:             req.user.nombre,
      email:              req.user.email,
      rol:                req.user.rol,
      estudiante_id:      req.user.estudiante_id      || null,
      carnet:             req.user.carnet             || null,
      registro_academico: req.user.registro_academico || null,
      creadoEn:           req.user.creado_en,
    },
  });
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const stored = await TokenModel.findValid({ token: refreshToken, tipo: 'refresh' });
      if (stored) await TokenModel.markUsed(stored.id);
    }
    return res.json({ message: 'Sesión cerrada' });
  } catch (err) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { register, login, completarEstudiante, refresh, forgotPassword, resetPassword, me, logout };