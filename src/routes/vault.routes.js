'use strict';

const router = require('express').Router();
const multer = require('multer');
const path = require('path');

const controller = require('../controllers/vault.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const { validate } = require('../middlewares/validate.middleware');
const rateLimiter = require('../middlewares/rateLimiter.middleware');
const schema = require('../validators/vault.validator');
const { PERMISSIONS } = require('../middlewares/rbac.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) return cb(null, true);
    cb(new Error('Formato inválido. Use CSV ou Excel (.xlsx/.xls)'));
  },
});

router.use(authenticate);

// Vault CRUD
router.post('/',
  requirePermission(PERMISSIONS.VAULT_CREATE),
  validate(schema.vaultItem),
  controller.createItem
);

router.get('/',
  requirePermission(PERMISSIONS.VAULT_READ),
  validate(schema.listQuery, 'query'),
  controller.listItems
);

// Export (before /:id to avoid param collision)
router.get('/export/csv',
  requirePermission(PERMISSIONS.VAULT_EXPORT),
  controller.exportCsv
);

router.get('/export/xlsx',
  requirePermission(PERMISSIONS.VAULT_EXPORT),
  controller.exportXlsx
);

// Import
router.get('/import/template',
  controller.downloadTemplate
);

router.post('/import',
  requirePermission(PERMISSIONS.VAULT_IMPORT),
  rateLimiter.importLimit,
  upload.single('file'),
  controller.importItems
);

// Alerts & History (before /:id)
router.get('/alerts',
  requirePermission(PERMISSIONS.VAULT_READ),
  validate(schema.alertQuery, 'query'),
  controller.getAlerts
);

router.get('/history',
  requirePermission(PERMISSIONS.AUDIT_READ),
  controller.getHistory
);

// Single item routes
router.get('/:id',
  requirePermission(PERMISSIONS.VAULT_READ),
  controller.getItem
);

router.put('/:id',
  requirePermission(PERMISSIONS.VAULT_UPDATE),
  validate(schema.updateVaultItem),
  controller.updateItem
);

router.patch('/:id/toggle',
  requirePermission(PERMISSIONS.VAULT_TOGGLE),
  controller.toggleArchive
);

router.delete('/:id',
  requirePermission(PERMISSIONS.VAULT_DELETE),
  controller.deleteItem
);

router.get('/:id/history',
  requirePermission(PERMISSIONS.AUDIT_READ),
  controller.getItemHistory
);

module.exports = router;
