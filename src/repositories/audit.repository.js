'use strict';

const { v4: uuid } = require('uuid');
const db = require('../config/database');

class AuditRepository {
  async log({ organizationId, userId, action, resourceType, resourceId, ipAddress, userAgent, requestId, status = 'success', metadata = {} }, trx) {
    const client = trx || db;
    try {
      await client.query(
        `INSERT INTO audit_logs
           (id, organization_id, user_id, action, resource_type, resource_id,
            ip_address, user_agent, request_id, status, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          uuid(), organizationId || null, userId || null, action,
          resourceType || null, resourceId || null,
          ipAddress || null, userAgent || null,
          requestId || null, status, metadata,
        ]
      );
    } catch (err) {
      // Audit logging must never break the main flow
      require('../config/logger').error({ err }, 'Failed to write audit log');
    }
  }

  async logVaultHistory({ vaultItemId, organizationId, userId, action, fieldChanged, oldValue, newValue, ipAddress }, trx) {
    const client = trx || db;
    try {
      await client.query(
        `INSERT INTO vault_history
           (id, vault_item_id, organization_id, user_id, action, field_changed, old_value, new_value, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          uuid(), vaultItemId, organizationId, userId || null, action,
          fieldChanged || null, oldValue || null, newValue || null, ipAddress || null,
        ]
      );
    } catch (err) {
      require('../config/logger').error({ err }, 'Failed to write vault history');
    }
  }

  async findByOrganization(organizationId, { limit, offset, action, userId, resourceType, from, to }, trx) {
    const client = trx || db;
    const params = [organizationId];
    const filters = [];

    if (action) { params.push(action); filters.push(`l.action = $${params.length}`); }
    if (userId) { params.push(userId); filters.push(`l.user_id = $${params.length}`); }
    if (resourceType) { params.push(resourceType); filters.push(`l.resource_type = $${params.length}`); }
    if (from) { params.push(from); filters.push(`l.created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`l.created_at <= $${params.length}`); }

    const where = filters.length ? 'AND ' + filters.join(' AND ') : '';
    params.push(limit, offset);

    const { rows } = await client.query(
      `SELECT l.*, u.email AS user_email
       FROM audit_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.organization_id = $1 ${where}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return rows;
  }

  async countByOrganization(organizationId, filters = {}, trx) {
    const client = trx || db;
    const params = [organizationId];
    const conditions = [];

    if (filters.action) { params.push(filters.action); conditions.push(`action = $${params.length}`); }
    if (filters.userId) { params.push(filters.userId); conditions.push(`user_id = $${params.length}`); }

    const where = conditions.length ? 'AND ' + conditions.join(' AND ') : '';
    const { rows } = await client.query(
      `SELECT COUNT(*) AS count FROM audit_logs WHERE organization_id = $1 ${where}`,
      params
    );
    return parseInt(rows[0].count, 10);
  }

  async findVaultHistory(vaultItemId, organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT h.*, u.email AS user_email
       FROM vault_history h
       LEFT JOIN users u ON u.id = h.user_id
       WHERE h.vault_item_id = $1 AND h.organization_id = $2
       ORDER BY h.created_at DESC`,
      [vaultItemId, organizationId]
    );
    return rows;
  }
}

module.exports = new AuditRepository();
