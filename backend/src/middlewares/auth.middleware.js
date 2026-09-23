const { verifyAccessToken } = require('../utils/jwt');
const UserModel = require('../models/user.model');

const normalizeRole = (rol) => {
  return String(rol || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await UserModel.findById(payload.id);

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({ message: 'Token inválido' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    if (roles.length === 0) {
      return next()
    }

    const rolUsuario = String(req.user.rol || '')
      .trim()
      .toLowerCase()

    const rolesPermitidos = roles.map(r =>
      String(r || '').trim().toLowerCase()
    )

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        message: 'No tienes permisos para esta acción',
      })
    }

    next()
  }
}

module.exports = { authenticate, authorize };