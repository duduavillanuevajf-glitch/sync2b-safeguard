'use strict';

const vaultRepo = require('../repositories/vault.repository');
const auditRepo = require('../repositories/audit.repository');
const orgRepo = require('../repositories/organization.repository');
const cryptoSvc = require('./crypto.service');
const db = require('../config/database');
const { NotFoundError, ForbiddenError, UnprocessableError } = require('../utils/errors');
const { parsePagination } = require('../utils/pagination');

function _toListItem(r) {
  return {
    id: r.id,
    title: r.name,
    serviceType: r.service || null,
    username: r.username || null,
    host: r.host || null,
    dns: r.dns || null,
    port: r.port || null,
    notes: r.notes || null,
    tags: r.tags || [],
    category: r.category || null,
    isArchived: r.is_archived || false,
    archivedAt: r.archived_at || null,
    expiresAt: r.expires_at || null,
    createdAt: r.created_at || null,
    updatedAt: r.updated_at || null,
    createdByEmail: r.created_by_email || null,
    staleDays: r.days_since_update || 0,
  };
}
const XLSX = require('xlsx');
const { stringify } = require('csv-stringify/sync');

// ── Enforce tenant limits ─────────────────────────────────────────────────────

async function _checkVaultLimit(organizationId, trx) {
  const org = await orgRepo.findById(organizationId, trx);
  const count = await vaultRepo.countByOrganization(organizationId, trx);
  if (count >= org.max_vault_items) {
    throw new ForbiddenError(`Limite de ${org.max_vault_items} credenciais atingido para este plano`);
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

async function createItem({ organizationId, userId, data, ipAddress }) {
  return db.transaction(async (trx) => {
    await _checkVaultLimit(organizationId, trx);

    const enc = await cryptoSvc.encrypt(data.password);
    const item = await vaultRepo.create({
      organizationId,
      createdBy: userId,
      name: data.name,
      host: data.host,
      dns: data.dns,
      port: data.port,
      service: data.service,
      username: data.username,
      encryptedPassword: enc.encryptedPassword,
      encryptionIv: enc.encryptionIv,
      encryptionTag: enc.encryptionTag,
      encryptionVersion: enc.encryptionVersion,
      notes: data.notes,
      tags: data.tags,
      category: data.category,
      teamId: data.teamId,
      expiresAt: data.expiresAt,
    }, trx);

    await auditRepo.logVaultHistory({
      vaultItemId: item.id, organizationId, userId, action: 'CREATED', ipAddress,
    }, trx);

    await auditRepo.log({
      organizationId, userId,
      action: 'CREDENTIAL_CREATED',
      resourceType: 'credential',
      resourceId: item.id,
      ipAddress,
      metadata: { name: item.name, service: item.service, category: item.category },
    });

    return item;
  });
}

// ── List ──────────────────────────────────────────────────────────────────────

async function listItems({ organizationId, userId, query }) {
  const { page, limit, offset } = parsePagination(query);
  const isArchived = query.archived === 'true';
  const search = query.search || null;
  const service = query.service || null;
  const category = query.category || null;

  const [rows, total] = await Promise.all([
    vaultRepo.list(organizationId, { isArchived, limit, offset, search, service, category, userId }),
    vaultRepo.countList(organizationId, { isArchived, search, service, category, userId }),
  ]);

  const org = await orgRepo.findById(organizationId);
  const alertDays = parseInt(query.alertDays, 10) || org?.alert_days || 90;

  const items = rows.map(r => ({
    ..._toListItem(r),
    alert: !isArchived && (r.days_since_update || 0) >= alertDays,
  }));

  return { items, total, page, limit };
}

// ── Visibility check ─────────────────────────────────────────────────────────

async function _assertCanAccess(item, userId) {
  if (item.category === 'pessoal') {
    if (item.created_by !== userId) throw new ForbiddenError('Acesso negado a credencial pessoal');
    return;
  }
  if (item.category === 'compartilhada' && item.team_id) {
    const teamsRepo = require('../repositories/teams.repository');
    const members = await teamsRepo.listMembers(item.team_id, item.organization_id);
    const inTeam = members.some(m => m.id === userId) || item.created_by === userId;
    if (!inTeam) throw new ForbiddenError('Acesso negado: você não pertence à equipe desta credencial');
  }
}

// ── Get by ID (metadata only, no password) ───────────────────────────────────

async function getItem({ id, organizationId, userId, ipAddress }) {
  const item = await vaultRepo.findById(id, organizationId);
  if (!item) throw new NotFoundError('Credencial');

  await _assertCanAccess(item, userId);

  await auditRepo.logVaultHistory({
    vaultItemId: id,
    organizationId,
    userId,
    action: 'ACCESSED',
    ipAddress,
  });

  return {
    id: item.id,
    title: item.name,
    serviceType: item.service,
    host: item.host,
    dns: item.dns,
    port: item.port,
    username: item.username,
    notes: item.notes,
    tags: item.tags,
    category: item.category,
    teamId: item.team_id || null,
    createdBy: item.created_by,
    createdByEmail: item.created_by_email || null,
    expiresAt: item.expires_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    isArchived: item.is_archived,
  };
}

// ── Reveal secret (audited) ───────────────────────────────────────────────────

async function revealSecret({ id, organizationId, userId, ipAddress }) {
  const item = await vaultRepo.findById(id, organizationId);
  if (!item) throw new NotFoundError('Credencial');

  await _assertCanAccess(item, userId);

  if (!item.encrypted_password || !item.encryption_iv || !item.encryption_tag) {
    throw new UnprocessableError('Esta credencial não possui senha armazenada.');
  }

  const password = await cryptoSvc.decrypt(
    item.encrypted_password,
    item.encryption_iv,
    item.encryption_tag,
    item.encryption_version
  );

  await vaultRepo.touchAccessed(id, organizationId);

  await auditRepo.logVaultHistory({
    vaultItemId: id,
    organizationId,
    userId,
    action: 'SECRET_VIEWED',
    ipAddress,
  });

  await auditRepo.log({
    organizationId,
    userId,
    action: 'CREDENTIAL_SECRET_VIEWED',
    resourceType: 'credential',
    resourceId: id,
    ipAddress,
    metadata: { title: item.name },
  });

  return { password };
}

// ── Update ────────────────────────────────────────────────────────────────────

async function updateItem({ id, organizationId, userId, data, ipAddress }) {
  return db.transaction(async (trx) => {
    const current = await vaultRepo.findById(id, organizationId, trx);
    if (!current) throw new NotFoundError('Credencial');

    await _assertCanAccess(current, userId);

    const changes = _detectChanges(current, data);
    const updatePayload = {
      name: data.name,
      host: data.host || null,
      dns: data.dns || null,
      port: data.port || null,
      service: data.service || null,
      username: data.username || null,
      notes: data.notes || null,
      tags: data.tags || [],
      category: data.category || null,
      team_id: data.teamId !== undefined ? (data.teamId || null) : current.team_id,
      expires_at: data.expiresAt || null,
    };

    if (data.password) {
      const enc = await cryptoSvc.encrypt(data.password);
      Object.assign(updatePayload, {
        encrypted_password: enc.encryptedPassword,
        encryption_iv: enc.encryptionIv,
        encryption_tag: enc.encryptionTag,
      });
    }

    const updated = await vaultRepo.update(id, organizationId, updatePayload, trx);

    for (const change of changes) {
      await auditRepo.logVaultHistory({
        vaultItemId: id,
        organizationId,
        userId,
        action: 'UPDATED',
        fieldChanged: change.field,
        oldValue: change.old,
        newValue: change.new,
        ipAddress,
      }, trx);
    }

    if (data.password) {
      await auditRepo.logVaultHistory({
        vaultItemId: id,
        organizationId,
        userId,
        action: 'UPDATED',
        fieldChanged: 'password',
        oldValue: '[REDACTED]',
        newValue: '[REDACTED]',
        ipAddress,
      }, trx);
    }

    await auditRepo.log({
      organizationId,
      userId,
      action: 'CREDENTIAL_UPDATED',
      resourceType: 'credential',
      resourceId: id,
      ipAddress,
      metadata: { fields: changes.map(c => c.field) },
    });

    return updated;
  });
}

function _detectChanges(current, data) {
  const fields = ['name', 'host', 'dns', 'port', 'service', 'username', 'notes'];
  return fields
    .filter(f => {
      const cur = String(current[f] ?? '');
      const next = String(data[f] ?? '');
      return cur !== next;
    })
    .map(f => ({ field: f, old: String(current[f] ?? ''), new: String(data[f] ?? '') }));
}

// ── Toggle archive ────────────────────────────────────────────────────────────

async function toggleArchive({ id, organizationId, userId, ipAddress }) {
  const current = await vaultRepo.findById(id, organizationId);
  if (!current) throw new NotFoundError('Credencial');

  const newState = !current.is_archived;
  await vaultRepo.setArchived(id, organizationId, newState, userId);

  const action = newState ? 'ARCHIVED' : 'UNARCHIVED';
  await auditRepo.logVaultHistory({ vaultItemId: id, organizationId, userId, action, ipAddress });
  await auditRepo.log({
    organizationId, userId,
    action: `CREDENTIAL_${action}`,
    resourceType: 'credential',
    resourceId: id,
    ipAddress,
  });

  return { isArchived: newState };
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteItem({ id, organizationId, userId, ipAddress }) {
  return db.transaction(async (trx) => {
    const item = await vaultRepo.findById(id, organizationId, trx);
    if (!item) throw new NotFoundError('Credencial');
    await _assertCanAccess(item, userId);

    await auditRepo.logVaultHistory({
      vaultItemId: id, organizationId, userId, action: 'DELETED',
      fieldChanged: 'name', oldValue: item.name, ipAddress,
    }, trx);

    await auditRepo.log({
      organizationId, userId,
      action: 'CREDENTIAL_DELETED',
      resourceType: 'credential',
      resourceId: id,
      ipAddress,
      metadata: { name: item.name },
    });

    await vaultRepo.hardDelete(id, organizationId, trx);
  });
}

// ── Stale alerts ──────────────────────────────────────────────────────────────

async function getStaleAlerts({ organizationId, alertDays }) {
  const org = await orgRepo.findById(organizationId);
  const days = alertDays || org?.alert_days || 90;
  const rows = await vaultRepo.listStale(organizationId, days);
  return rows.map(_toListItem);
}

// ── Export CSV ────────────────────────────────────────────────────────────────

async function exportCsv({ organizationId, userId, ipAddress }) {
  const rows = await vaultRepo.listForExport(organizationId);
  const decrypted = await Promise.all(rows.map(async (item) => {
    let password = '';
    try {
      password = await cryptoSvc.decrypt(item.encrypted_password, item.encryption_iv, item.encryption_tag, item.encryption_version);
    } catch {}
    return {
      name: item.name || '',
      host: item.host || '',
      dns: item.dns || '',
      port: item.port || '',
      service: item.service || '',
      username: item.username || '',
      password,
      notes: item.notes || '',
      created_at: item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
    };
  }));

  const csv = stringify(decrypted, {
    header: true,
    delimiter: ';',
    columns: ['name', 'host', 'dns', 'port', 'service', 'username', 'password', 'notes', 'created_at'],
  });

  await auditRepo.log({
    organizationId, userId,
    action: 'CREDENTIAL_EXPORTED',
    metadata: { format: 'csv', count: rows.length },
    ipAddress,
  });

  return '﻿' + csv;
}

// ── Export XLSX ───────────────────────────────────────────────────────────────

async function exportXlsx({ organizationId, userId, ipAddress }) {
  const rows = await vaultRepo.listForExport(organizationId);
  const data = await Promise.all(rows.map(async (item) => {
    let password = '';
    try {
      password = await cryptoSvc.decrypt(item.encrypted_password, item.encryption_iv, item.encryption_tag, item.encryption_version);
    } catch {}
    return {
      Nome: item.name || '',
      Host: item.host || '',
      DNS: item.dns || '',
      Porta: item.port || '',
      Servico: item.service || '',
      Usuario: item.username || '',
      Senha: password,
      Notas: item.notes || '',
      'Criado em': item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '',
    };
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [25, 20, 20, 8, 15, 20, 25, 30, 20].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Credenciais');

  await auditRepo.log({
    organizationId, userId,
    action: 'CREDENTIAL_EXPORTED',
    metadata: { format: 'xlsx', count: rows.length },
    ipAddress,
  });

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  createItem, listItems, getItem, revealSecret, updateItem,
  toggleArchive, deleteItem, getStaleAlerts, exportCsv, exportXlsx,
};
