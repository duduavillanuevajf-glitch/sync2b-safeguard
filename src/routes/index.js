'use strict';

const router = require('express').Router();

router.use('/auth',        require('./auth.routes'));
router.use('/credentials', require('./vault.routes'));
router.use('/profile',     require('./profile.routes'));
router.use('/admin',       require('./admin.routes'));
router.use('/teams',       require('./teams.routes'));

module.exports = router;
