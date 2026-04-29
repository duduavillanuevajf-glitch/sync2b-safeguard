'use strict';

const router = require('express').Router();
const controller = require('../controllers/roles.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../middlewares/rbac.middleware');

router.use(authenticate);

router.get('/',              requirePermission(PERMISSIONS.ROLES_MANAGE), controller.listRoles);
router.post('/',             requirePermission(PERMISSIONS.ROLES_MANAGE), controller.createRole);
router.put('/:id',           requirePermission(PERMISSIONS.ROLES_MANAGE), controller.updateRole);
router.delete('/:id',        requirePermission(PERMISSIONS.ROLES_MANAGE), controller.deleteRole);
router.post('/:id/duplicate',requirePermission(PERMISSIONS.ROLES_MANAGE), controller.duplicateRole);

module.exports = router;
