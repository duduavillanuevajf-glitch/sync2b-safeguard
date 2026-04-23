'use strict';

const { v4: uuid } = require('uuid');
const path = require('path');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

const vaultRepo = require('../repositories/vault.repository');
const auditRepo = require('../repositories/audit.repository');
const orgRepo = require('../repositories/organization.repository');
const cryptoSvc = require('./crypto.service');
const db = require('../config/database');
const logger = require('../config/logger');
const { ValidationError, ForbiddenError } = require('../utils/errors');

const REQUIRED_FIELDS = ['name', 'host', 'username', 'password'];
const MAX_ROWS = 1000;

function _normalizeRow(raw) {
  const normalized = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.toLowerCase().trim().replace(/[^a-z]/g, '');
    normalized[key] = String(v ?? '').trim();
  }
  return {
    name: normalized.name || normalized.nome || '',
    host: normalized.host || normalized.ip || normalized.servidor || '',
    dns: normalized.dns || '',
    port: normalized.port || normalized.porta || '',
    service: normalized.service || normalized.servico || normalized.tipo || '',
    username: normalized.username || normalized.usuario || normalized.login || '',
    password: normalized.password || normalized.senha || '',
    notes: normalized.notes || normalized.notas || normalized.observacoes || '',
  };
}

function _parseFile(buffer, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  if (ext === '.csv') {
    const text = buffer.toString('utf-8').replace(/^﻿/, '');
    const sep = text.split('\n')[0].includes(';') ? ';' : ',';
    return parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      delimiter: sep,
    }).map(_normalizeRow);
  }
  if (['.xlsx', '.xls'].includes(ext)) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' }).map(_normalizeRow);
  }
  throw new ValidationError(`Formato não suportado: ${ext}. Use CSV ou Excel (.xlsx/.xls)`);
}

function _validateRow(row, lineNumber) {
  const missing = REQUIRED_FIELDS.filter(f => !row[f]);
  if (missing.length) {
    return { valid: false, error: `Linha ${lineNumber}: campos obrigatórios ausentes → ${missing.join(', ')}` };
  }
  let port = null;
  if (row.port) {
    port = parseInt(row.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return { valid: false, error: `Linha ${lineNumber}: porta inválida (${row.port})` };
    }
  }
  if (row.password.length > 1000) {
    return { valid: false, error: `Linha ${lineNumber}: senha muito longa` };
  }
  return { valid: true, port };
}

async function processImport({ organizationId, userId, buffer, filename, strict = false, ipAddress }) {
  const org = await orgRepo.findById(organizationId);
  const currentCount = await vaultRepo.countByOrganization(organizationId);
  const availableSlots = org.max_vault_items - currentCount;

  let rows;
  try {
    rows = _parseFile(buffer, filename);
  } catch (err) {
    throw new ValidationError(err.message);
  }

  if (!rows.length) throw new ValidationError('Arquivo vazio ou sem dados válidos');
  if (rows.length > MAX_ROWS) throw new ValidationError(`Máximo de ${MAX_ROWS} linhas por importação`);
  if (rows.length > availableSlots) {
    throw new ForbiddenError(`Apenas ${availableSlots} slots disponíveis. Arquivo contém ${rows.length} linhas.`);
  }

  const jobId = uuid();
  const result = {
    jobId,
    total: rows.length,
    success: 0,
    failed: 0,
    warnings: [],
    errors: [],
    createdIds: [],
  };

  if (strict) {
    await _importStrict(rows, result, { organizationId, userId, jobId, ipAddress });
  } else {
    await _importBestEffort(rows, result, { organizationId, userId, ipAddress });
  }

  await auditRepo.log({
    organizationId,
    userId,
    action: 'VAULT_IMPORTED',
    metadata: {
      filename,
      total: result.total,
      success: result.success,
      failed: result.failed,
      strict,
    },
    ipAddress,
  });

  return result;
}

async function _importStrict(rows, result, { organizationId, userId, ipAddress }) {
  const validated = [];
  for (let i = 0; i < rows.length; i++) {
    const { valid, error, port } = _validateRow(rows[i], i + 2);
    if (!valid) {
      result.errors.push(error);
      result.failed++;
    } else {
      validated.push({ ...rows[i], _port: port, _line: i + 2 });
    }
  }
  if (result.errors.length) {
    result.rolledBack = true;
    return;
  }

  await db.transaction(async (trx) => {
    for (const row of validated) {
      const enc = await cryptoSvc.encrypt(row.password);
      const item = await vaultRepo.create({
        organizationId,
        createdBy: userId,
        name: row.name,
        host: row.host,
        dns: row.dns || null,
        port: row._port,
        service: row.service || 'Outro',
        username: row.username,
        encryptedPassword: enc.encryptedPassword,
        encryptionIv: enc.encryptionIv,
        encryptionTag: enc.encryptionTag,
        encryptionVersion: enc.encryptionVersion,
        notes: row.notes || null,
      }, trx);

      await auditRepo.logVaultHistory({
        vaultItemId: item.id,
        organizationId,
        userId,
        action: 'IMPORTED',
        ipAddress,
      }, trx);

      result.createdIds.push(item.id);
      result.success++;
    }
  });
}

async function _importBestEffort(rows, result, { organizationId, userId, ipAddress }) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { valid, error, port } = _validateRow(row, i + 2);
    if (!valid) {
      result.errors.push(error);
      result.failed++;
      continue;
    }
    try {
      const enc = await cryptoSvc.encrypt(row.password);
      const item = await vaultRepo.create({
        organizationId,
        createdBy: userId,
        name: row.name,
        host: row.host,
        dns: row.dns || null,
        port,
        service: row.service || 'Outro',
        username: row.username,
        encryptedPassword: enc.encryptedPassword,
        encryptionIv: enc.encryptionIv,
        encryptionTag: enc.encryptionTag,
        encryptionVersion: enc.encryptionVersion,
        notes: row.notes || null,
      });

      await auditRepo.logVaultHistory({
        vaultItemId: item.id,
        organizationId,
        userId,
        action: 'IMPORTED',
        ipAddress,
      });

      result.createdIds.push(item.id);
      result.success++;
    } catch (err) {
      logger.warn({ err, row: i + 2 }, 'Import row failed');
      result.errors.push(`Linha ${i + 2}: ${err.message}`);
      result.failed++;
    }
  }
}

function buildCsvTemplate() {
  return '﻿name;host;dns;port;service;username;password;notes\n' +
    '"ASTERISK PROD";"sip.empresa.com";"sip.empresa.com";"5060";"SIP";"1001";"senha123";"Tronco principal"\n' +
    '"SERVIDOR SSH";"192.168.1.10";"linux.empresa.com";"22";"SSH";"root";"senha456";"Servidor principal"';
}

module.exports = { processImport, buildCsvTemplate };
