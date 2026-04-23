'use strict';

const db = require('../config/database');

class BaseRepository {
  constructor(tableName) {
    this.table = tableName;
  }

  _client(trx) {
    return trx || db;
  }

  async findById(id, organizationId, trx) {
    const client = this._client(trx);
    const { rows } = await client.query(
      `SELECT * FROM ${this.table} WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [id, organizationId]
    );
    return rows[0] || null;
  }

  async findOne(conditions, trx) {
    const client = this._client(trx);
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const where = keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
    const { rows } = await client.query(`SELECT * FROM ${this.table} WHERE ${where} LIMIT 1`, values);
    return rows[0] || null;
  }

  async count(conditions, trx) {
    const client = this._client(trx);
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const where = keys.length
      ? 'WHERE ' + keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')
      : '';
    const { rows } = await client.query(`SELECT COUNT(*) AS count FROM ${this.table} ${where}`, values);
    return parseInt(rows[0].count, 10);
  }

  async deleteById(id, organizationId, trx) {
    const client = this._client(trx);
    const { rowCount } = await client.query(
      `DELETE FROM ${this.table} WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    return rowCount > 0;
  }
}

module.exports = BaseRepository;
