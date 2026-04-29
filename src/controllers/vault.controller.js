'use strict';

const vaultService = require('../services/vault.service');
const importService = require('../services/import.service');
const auditService = require('../services/audit.service');
const { success, created, paginated, noContent } = require('../utils/response');

function _ip(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

async function createItem(req, res, next) {
  try {
    const item = await vaultService.createItem({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      data: req.body,
      ipAddress: _ip(req),
    });
    created(res, { id: item.id }, 'Credencial salva com sucesso');
  } catch (err) { next(err); }
}

async function listItems(req, res, next) {
  try {
    const { items, total, page, limit } = await vaultService.listItems({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      query: req.query,
    });
    paginated(res, items, { total, page, limit });
  } catch (err) { next(err); }
}

async function getItem(req, res, next) {
  try {
    const item = await vaultService.getItem({
      id: req.params.id,
      organizationId: req.user.organizationId,
      userId: req.user.id,
      ipAddress: _ip(req),
    });
    success(res, item);
  } catch (err) { next(err); }
}

async function revealSecret(req, res, next) {
  try {
    const result = await vaultService.revealSecret({
      id: req.params.id,
      organizationId: req.user.organizationId,
      userId: req.user.id,
      ipAddress: _ip(req),
    });
    success(res, result);
  } catch (err) { next(err); }
}

async function updateItem(req, res, next) {
  try {
    await vaultService.updateItem({
      id: req.params.id,
      organizationId: req.user.organizationId,
      userId: req.user.id,
      data: req.body,
      ipAddress: _ip(req),
    });
    success(res, null, { message: 'Credencial atualizada com sucesso' });
  } catch (err) { next(err); }
}

async function toggleArchive(req, res, next) {
  try {
    const result = await vaultService.toggleArchive({
      id: req.params.id,
      organizationId: req.user.organizationId,
      userId: req.user.id,
      ipAddress: _ip(req),
    });
    success(res, result, { message: result.isArchived ? 'Credencial desativada' : 'Credencial reativada' });
  } catch (err) { next(err); }
}

async function deleteItem(req, res, next) {
  try {
    await vaultService.deleteItem({
      id: req.params.id,
      organizationId: req.user.organizationId,
      userId: req.user.id,
      ipAddress: _ip(req),
    });
    noContent(res);
  } catch (err) { next(err); }
}

async function getAlerts(req, res, next) {
  try {
    const items = await vaultService.getStaleAlerts({
      organizationId: req.user.organizationId,
      alertDays: parseInt(req.query.alertDays, 10) || req.user.orgAlertDays,
    });
    success(res, items);
  } catch (err) { next(err); }
}

async function getHistory(req, res, next) {
  try {
    const { rows, total, page, limit } = await auditService.getOrganizationLogs({
      organizationId: req.user.organizationId,
      query: req.query,
    });
    paginated(res, rows, { total, page, limit });
  } catch (err) { next(err); }
}

async function getItemHistory(req, res, next) {
  try {
    const rows = await auditService.getVaultItemHistory({
      vaultItemId: req.params.id,
      organizationId: req.user.organizationId,
    });
    success(res, rows);
  } catch (err) { next(err); }
}

async function exportCsv(req, res, next) {
  try {
    const csv = await vaultService.exportCsv({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      ipAddress: _ip(req),
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="safeguard-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
}

async function exportXlsx(req, res, next) {
  try {
    const buffer = await vaultService.exportXlsx({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      ipAddress: _ip(req),
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="safeguard-${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err) { next(err); }
}

async function downloadTemplate(req, res, next) {
  try {
    const csv = importService.buildCsvTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="modelo-importacao.csv"');
    res.send(csv);
  } catch (err) { next(err); }
}

async function importItems(req, res, next) {
  try {
    if (!req.file) {
      return next(new (require('../utils/errors').ValidationError)('Nenhum arquivo enviado'));
    }
    const strict = req.query.strict === 'true';
    const result = await importService.processImport({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      buffer: req.file.buffer,
      filename: req.file.originalname,
      strict,
      ipAddress: _ip(req),
    });
    success(res, result, { message: `${result.success} de ${result.total} credenciais importadas` });
  } catch (err) { next(err); }
}

module.exports = {
  createItem, listItems, getItem, revealSecret, updateItem, toggleArchive, deleteItem,
  getAlerts, getHistory, getItemHistory,
  exportCsv, exportXlsx, downloadTemplate, importItems,
};
