const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Datos inválidos',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const loginRules = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  handleValidation,
];

const registerRules = [
  body('nombre').trim().notEmpty().withMessage('Nombre requerido').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos un número')
    .matches(/[^A-Za-z0-9]/).withMessage('Debe contener al menos un carácter especial'),
  handleValidation,
];

const forgotPasswordRules = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  handleValidation,
];

const resetPasswordRules = [
  body('token').notEmpty().withMessage('Token requerido'),
  body('password')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos un número')
    .matches(/[^A-Za-z0-9]/).withMessage('Debe contener al menos un carácter especial'),
  handleValidation,
];

module.exports = {
  handleValidation,
  loginRules,
  registerRules,
  forgotPasswordRules,
  resetPasswordRules,
};
