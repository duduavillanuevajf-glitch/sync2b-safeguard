'use strict';

const router = require('express').Router();
const controller = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission, requireRole, PERMISSIONS, ROLES } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/admin.validator');

router.use(authenticate);
router.use(requireRole(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN));

// Organization
router.get('/organization', controller.getOrganization);
router.patch('/organization',
  requirePermission(PERMISSIONS.ORG_MANAGE),
  validate(schema.updateOrg),
  controller.updateOrganization
);

// Users
router.get('/users',
  requirePermission(PERMISSIONS.USERS_READ),
  validate(schema.listUsersQuery, 'query'),
  controller.listUsers
);

router.post('/users',
  requirePermission(PERMISSIONS.USERS_CREATE),
  validate(schema.createUser),
  controller.createUser
);

router.get('/users/:id',
  requirePermission(PERMISSIONS.USERS_READ),
  controller.getUser
);

router.patch('/users/:id',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validate(schema.updateUser),
  controller.updateUser
);

router.delete('/users/:id',
  requirePermission(PERMISSIONS.USERS_DELETE),
  controller.deleteUser
);

// Audit
router.get('/audit',
  requirePermission(PERMISSIONS.AUDIT_READ),
  controller.getAuditLogs
);

// Organizations (visible a org_admin/super_admin — scopo já garantido pelo requireRole acima)
router.get('/organizations', controller.listOrganizations);
router.post('/organizations', requireRole(ROLES.SUPER_ADMIN), controller.createOrganization);
router.patch('/organizations/:id/toggle', requireRole(ROLES.SUPER_ADMIN), controller.toggleOrganization);

module.exports = router;
