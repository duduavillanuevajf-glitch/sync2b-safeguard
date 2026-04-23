'use strict';

const router = require('express').Router();
const controller = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/auth.validator');

router.use(authenticate);

router.get('/', controller.getProfile);

router.post('/change-password',
  validate(schema.changePassword),
  controller.changePassword
);

module.exports = router;
