'use strict';

const router     = require('express').Router();
const controller = require('../controllers/teams.controller');
const { authenticate }    = require('../middlewares/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../middlewares/rbac.middleware');

router.use(authenticate);

router.get('/org-users', requirePermission(PERMISSIONS.VAULT_READ), controller.listOrgUsers);

router.get('/',    requirePermission(PERMISSIONS.VAULT_READ), controller.listTeams);
router.post('/',   requirePermission(PERMISSIONS.USERS_CREATE), controller.createTeam);

router.get('/:id',          requirePermission(PERMISSIONS.VAULT_READ),   controller.getTeam);
router.put('/:id',          requirePermission(PERMISSIONS.USERS_UPDATE),  controller.updateTeam);
router.delete('/:id',       requirePermission(PERMISSIONS.USERS_DELETE),  controller.deleteTeam);

router.get('/:id/members',           requirePermission(PERMISSIONS.VAULT_READ),   controller.listMembers);
router.post('/:id/members',          requirePermission(PERMISSIONS.USERS_UPDATE),  controller.addMember);
router.delete('/:id/members/:userId',requirePermission(PERMISSIONS.USERS_UPDATE),  controller.removeMember);

module.exports = router;
