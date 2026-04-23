'use strict';

const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const rateLimiter = require('../middlewares/rateLimiter.middleware');
const schema = require('../validators/auth.validator');

router.post('/register',
  rateLimiter.auth,
  validate(schema.register),
  controller.register
);

router.post('/login',
  rateLimiter.auth,
  validate(schema.login),
  controller.login
);

router.post('/2fa/verify',
  rateLimiter.auth,
  validate(schema.verifyTwoFactor),
  controller.verifyTwoFactor
);

router.post('/token/refresh',
  validate(schema.refreshToken),
  controller.refreshToken
);

router.post('/logout',
  authenticate,
  controller.logout
);

router.post('/forgot-password',
  rateLimiter.auth,
  validate(schema.forgotPassword),
  controller.forgotPassword
);

router.get('/reset-password/validate',
  validate(schema.validateResetToken, 'query'),
  controller.validateResetToken
);

router.post('/reset-password',
  rateLimiter.auth,
  validate(schema.resetPassword),
  controller.resetPassword
);

module.exports = router;
