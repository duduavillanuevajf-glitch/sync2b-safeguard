'use strict';

const { v4: uuid } = require('uuid');
const db = require('../config/database');

class RolesRepository {
  async create({ organizationId, name, slug, description, permissions, isSystem = false }, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `INSERT INTO custom_roles (id, organization_id, name, slug, description, permissions, is_system)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [uuid(), organizationId, name, slug, description || null, permissions || [], isSystem]
    );
    return rows[0];
  }

  async list(organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT * FROM custom_roles WHERE organization_id = $1 ORDER BY is_system DESC, name ASC`,
      [organizationId]
    );
    return rows;
  }

  async findById(id, organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT * FROM custom_roles WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [id, organizationId]
    );
    return rows[0] || null;
  }

  async findBySlug(slug, organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT * FROM custom_roles WHERE slug = $1 AND organization_id = $2 LIMIT 1`,
      [slug, organizationId]
    );
    return rows[0] || null;
  }

  async update(id, organizationId, data, trx) {
    const client = trx || db;
    const allowed = ['name', 'slug', 'description', 'permissions', 'is_active'];
    const keys = Object.keys(data).filter(k => allowed.includes(k));
    if (!keys.length) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
    const { rows } = await client.query(
      `UPDATE custom_roles SET ${sets} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, organizationId, ...keys.map(k => data[k])]
    );
    return rows[0] || null;
  }

  async delete(id, organizationId, trx) {
    const client = trx || db;
    const { rowCount } = await client.query(
      `DELETE FROM custom_roles WHERE id = $1 AND organization_id = $2 AND is_system = FALSE`,
      [id, organizationId]
    );
    return rowCount > 0;
  }

  async duplicate(id, organizationId, newName, trx) {
    const client = trx || db;
    const source = await this.findById(id, organizationId, trx);
    if (!source) return null;
    const slug = newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now();
    return this.create({ organizationId, name: newName, slug, description: source.description, permissions: source.permissions }, trx);
  }
}

module.exports = new RolesRepository();
