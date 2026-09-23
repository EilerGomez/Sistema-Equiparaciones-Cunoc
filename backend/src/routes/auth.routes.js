const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const {
  loginRules,
  registerRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const { handleValidation } = require('../middlewares/validate.middleware');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados intentos, espera 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register',        authLimiter, registerRules,       ctrl.register);
router.post('/login',           authLimiter, loginRules,          ctrl.login);
router.post('/refresh',         ctrl.refresh);
router.post('/forgot-password', authLimiter, forgotPasswordRules, ctrl.forgotPassword);
router.post('/reset-password',  authLimiter, resetPasswordRules,  ctrl.resetPassword);
router.get ('/me',              authenticate,                      ctrl.me);
router.post('/logout',          ctrl.logout);

// Nuevo — completa datos de estudiante tras register o login
router.post('/completar-estudiante',
  authenticate,
  [
    body('carnet').trim().notEmpty().withMessage('Carnet requerido'),
    body('registro_academico').trim().notEmpty().withMessage('Registro académico requerido'),
    handleValidation,
  ],
  ctrl.completarEstudiante
);

module.exports = router;