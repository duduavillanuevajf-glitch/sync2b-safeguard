'use strict';

const { v4: uuid } = require('uuid');
const db = require('../config/database');

class TeamsRepository {
  async create({ organizationId, name, description }, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `INSERT INTO teams (id, organization_id, name, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [uuid(), organizationId, name, description || null]
    );
    return rows[0];
  }

  async list(organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT t.*,
              COUNT(DISTINCT tm.user_id)::INTEGER AS member_count
       FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id
       WHERE t.organization_id = $1
       GROUP BY t.id
       ORDER BY t.name ASC`,
      [organizationId]
    );
    return rows;
  }

  async findById(id, organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT t.*,
              COUNT(DISTINCT tm.user_id)::INTEGER AS member_count
       FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id
       WHERE t.id = $1 AND t.organization_id = $2
       GROUP BY t.id`,
      [id, organizationId]
    );
    return rows[0] || null;
  }

  async update(id, organizationId, data, trx) {
    const client = trx || db;
    const allowed = ['name', 'description', 'is_active'];
    const keys = Object.keys(data).filter(k => allowed.includes(k));
    if (!keys.length) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
    const { rows } = await client.query(
      `UPDATE teams SET ${sets}
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, organizationId, ...keys.map(k => data[k])]
    );
    return rows[0] || null;
  }

  async delete(id, organizationId, trx) {
    const client = trx || db;
    const { rowCount } = await client.query(
      `DELETE FROM teams WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    return rowCount > 0;
  }

  async listMembers(teamId, organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, tm.added_at
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.team_id = $1 AND t.organization_id = $2
       ORDER BY u.first_name, u.email`,
      [teamId, organizationId]
    );
    return rows;
  }

  async addMember(teamId, userId, trx) {
    const client = trx || db;
    await client.query(
      `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [teamId, userId]
    );
  }

  async removeMember(teamId, userId, trx) {
    const client = trx || db;
    const { rowCount } = await client.query(
      `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );
    return rowCount > 0;
  }

  async getUserTeams(userId, organizationId, trx) {
    const client = trx || db;
    const { rows } = await client.query(
      `SELECT t.id, t.name, t.description, t.is_active
       FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.user_id = $1 AND t.organization_id = $2 AND t.is_active = TRUE
       ORDER BY t.name`,
      [userId, organizationId]
    );
    return rows;
  }
}

module.exports = new TeamsRepository();
