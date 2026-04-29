'use strict';

const router = require('express').Router();
const controller = require('../controllers/tags.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../middlewares/rbac.middleware');

router.use(authenticate);

router.get('/',    requirePermission(PERMISSIONS.VAULT_READ),    controller.listTags);
router.post('/',   requirePermission(PERMISSIONS.TAGS_MANAGE),   controller.createTag);
router.put('/:id', requirePermission(PERMISSIONS.TAGS_MANAGE),   controller.updateTag);
router.delete('/:id', requirePermission(PERMISSIONS.TAGS_MANAGE), controller.deleteTag);

module.exports = router;
