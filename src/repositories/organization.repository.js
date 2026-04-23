'use strict';

const { v4: uuid } = require('uuid');
const db = require('../config/database');
const BaseRepository = require('./base.repository');

class OrganizationRepository extends BaseRepository {
  constructor() {
    super('organizations');
  }

  async create({ name, slug, plan = 'starter', maxUsers = 5, maxVaultItems = 500 }, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `INSERT INTO organizations (id, name, slug, plan, max_users, max_vault_items)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuid(), name, slug, plan, maxUsers, maxVaultItems]
    );
    return rows[0];
  }

  async findBySlug(slug, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT * FROM organizations WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  }

  async findById(id, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT * FROM organizations WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async update(id, fields, trx) {
    const client = trx || db;
    const allowed = ['name', 'plan', 'max_users', 'max_vault_items', 'alert_days', 'is_active', 'settings'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await client.query(
      `UPDATE organizations SET ${sets} WHERE id = $1 RETURNING *`,
      [id, ...keys.map(k => fields[k])]
    );
    return rows[0] || null;
  }

  async listAll(trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT o.*, COUNT(u.id) AS user_count
       FROM organizations o
       LEFT JOIN users u ON u.organization_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    return rows;
  }
}

module.exports = new OrganizationRepository();
