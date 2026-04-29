'use strict';

const { v4: uuid } = require('uuid');
const db = require('../config/database');

class TagsRepository {
  async create({ organizationId, name, color, category }, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `INSERT INTO tags (id, organization_id, name, color, category)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [uuid(), organizationId, name, color || '#6366f1', category || null]
    );
    return rows[0];
  }

  async list(organizationId, { includeInactive = false } = {}, trx) {
    const client = trx || db;
    const where = includeInactive ? '' : 'AND is_active = TRUE';
    const { rows } = await client.query(
      `SELECT * FROM tags WHERE organization_id = $1 ${where} ORDER BY name ASC`,
      [organizationId]
    );
    return rows;
  }

  async findById(id, organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT * FROM tags WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [id, organizationId]
    );
    return rows[0] || null;
  }

  async update(id, organizationId, data, trx) {
    const client = trx || db;
    const allowed = ['name', 'color', 'category', 'is_active'];
    const keys = Object.keys(data).filter(k => allowed.includes(k));
    if (!keys.length) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
    const { rows } = await client.query(
      `UPDATE tags SET ${sets} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, organizationId, ...keys.map(k => data[k])]
    );
    return rows[0] || null;
  }

  async delete(id, organizationId, trx) {
    const client = trx || db;
    const { rowCount } = await client.query(
      `DELETE FROM tags WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    return rowCount > 0;
  }
}

module.exports = new TagsRepository();
