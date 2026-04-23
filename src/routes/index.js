'use strict';

const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/vault', require('./vault.routes'));
router.use('/profile', require('./profile.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
