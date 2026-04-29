'use strict';

const { v4: uuid } = require('uuid');
const db = require('../config/database');
const BaseRepository = require('./base.repository');

class VaultRepository extends BaseRepository {
  constructor() {
    super('vault_items');
  }

  async create(data, trx) {
    const client = trx || db;
    const {
      organizationId, createdBy, name, host, dns, port, service, username,
      encryptedPassword, encryptionIv, encryptionTag, encryptionVersion,
      notes, tags, category, teamId, expiresAt,
    } = data;
    const { rows } = await client.query(
      `INSERT INTO vault_items
         (id, organization_id, created_by, name, host, dns, port, service, username,
          encrypted_password, encryption_iv, encryption_tag, encryption_version,
          notes, tags, category, team_id, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        uuid(), organizationId, createdBy, name, host || null, dns || null,
        port || null, service || null, username || null,
        encryptedPassword, encryptionIv, encryptionTag, encryptionVersion || '1',
        notes || null, tags || [], category || null, teamId || null, expiresAt || null,
      ]
    );
    return rows[0];
  }

  async list(organizationId, { isArchived = false, limit, offset, search, service, category, userId }, trx) {
    const client = trx || db;
    // $1=organizationId, $2=isArchived, $3=userId (visibility rule)
    const params = [organizationId, isArchived, userId];
    const extra = [];

    // Visibility: personal items only visible to creator; shared with team only to members
    extra.push(`(
      v.category IS NULL
      OR v.category NOT IN ('pessoal','compartilhada')
      OR (v.category = 'pessoal' AND v.created_by = $3)
      OR (v.category = 'compartilhada' AND (
        v.team_id IS NULL
        OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = v.team_id AND tm.user_id = $3)
      ))
    )`);

    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      extra.push(`(v.name ILIKE $${i} OR v.host ILIKE $${i} OR v.username ILIKE $${i})`);
    }
    if (service) {
      params.push(service);
      extra.push(`v.service = $${params.length}`);
    }
    if (category) {
      params.push(category);
      extra.push(`v.category ILIKE $${params.length}`);
    }

    const where = 'AND ' + extra.join(' AND ');
    params.push(limit, offset);
    const li = params.length - 1;
    const oi = params.length;

    const { rows } = await client.query(
      `SELECT v.id, v.name, v.host, v.dns, v.port, v.service, v.username,
              v.notes, v.tags, v.category, v.team_id, v.created_at, v.updated_at,
              v.is_archived, v.archived_at, v.expires_at, v.last_accessed_at,
              u.email AS created_by_email,
              EXTRACT(DAY FROM NOW() - v.updated_at)::INTEGER AS days_since_update
       FROM vault_items v
       LEFT JOIN users u ON u.id = v.created_by
       WHERE v.organization_id = $1
         AND v.is_archived = $2
         ${where}
       ORDER BY v.created_at DESC
       LIMIT $${li} OFFSET $${oi}`,
      params
    );
    return rows;
  }

  async countList(organizationId, { isArchived = false, search, service, category, userId }, trx) {
    const client = trx || db;
    const params = [organizationId, isArchived, userId];
    const extra = [];

    extra.push(`(
      v.category IS NULL
      OR v.category NOT IN ('pessoal','compartilhada')
      OR (v.category = 'pessoal' AND v.created_by = $3)
      OR (v.category = 'compartilhada' AND (
        v.team_id IS NULL
        OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = v.team_id AND tm.user_id = $3)
      ))
    )`);

    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      extra.push(`(v.name ILIKE $${i} OR v.host ILIKE $${i} OR v.username ILIKE $${i})`);
    }
    if (service) {
      params.push(service);
      extra.push(`v.service = $${params.length}`);
    }
    if (category) {
      params.push(category);
      extra.push(`v.category ILIKE $${params.length}`);
    }

    const where = 'AND ' + extra.join(' AND ');
    const { rows } = await client.query(
      `SELECT COUNT(*) AS count FROM vault_items v
       WHERE v.organization_id = $1 AND v.is_archived = $2 ${where}`,
      params
    );
    return parseInt(rows[0].count, 10);
  }

  async findById(id, organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT v.*, u.email AS created_by_email
       FROM vault_items v
       LEFT JOIN users u ON u.id = v.created_by
       WHERE v.id = $1 AND v.organization_id = $2 LIMIT 1`,
      [id, organizationId]
    );
    return rows[0] || null;
  }

  async update(id, organizationId, data, trx) {
    const client = trx || db;
    const allowed = [
      'name', 'host', 'dns', 'port', 'service', 'username',
      'encrypted_password', 'encryption_iv', 'encryption_tag',
      'notes', 'tags', 'category', 'team_id', 'expires_at',
    ];
    const keys = Object.keys(data).filter(k => allowed.includes(k));
    if (!keys.length) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
    const { rows } = await client.query(
      `UPDATE vault_items SET ${sets}
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, organizationId, ...keys.map(k => data[k])]
    );
    return rows[0] || null;
  }

  async setArchived(id, organizationId, archived, archivedBy, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `UPDATE vault_items
       SET is_archived = $3, archived_at = $4, archived_by = $5
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, organizationId, archived, archived ? new Date() : null, archived ? archivedBy : null]
    );
    return rows[0] || null;
  }

  async touchAccessed(id, organizationId, trx) {
    const client = trx || db;
    await client.query(
      `UPDATE vault_items SET last_accessed_at = NOW() WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
  }

  async hardDelete(id, organizationId, trx) {
    const client = trx || db;
    const { rowCount } = await client.query(
      `DELETE FROM vault_items WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    return rowCount > 0;
  }

  async countByOrganization(organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT COUNT(*) AS count FROM vault_items
       WHERE organization_id = $1 AND is_archived = FALSE`,
      [organizationId]
    );
    return parseInt(rows[0].count, 10);
  }

  async listStale(organizationId, alertDays, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT id, name, host, service, username, updated_at,
              EXTRACT(DAY FROM NOW() - updated_at)::INTEGER AS days_since_update
       FROM vault_items
       WHERE organization_id = $1
         AND is_archived = FALSE
         AND EXTRACT(DAY FROM NOW() - updated_at) >= $2
       ORDER BY days_since_update DESC`,
      [organizationId, alertDays]
    );
    return rows;
  }

  async listForExport(organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT * FROM vault_items
       WHERE organization_id = $1 AND is_archived = FALSE
       ORDER BY created_at DESC`,
      [organizationId]
    );
    return rows;
  }
}

module.exports = new VaultRepository();
