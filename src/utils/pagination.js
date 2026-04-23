'use strict';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildOrderClause(query, allowedColumns, defaultColumn = 'created_at', defaultDir = 'DESC') {
  const col = allowedColumns.includes(query.sortBy) ? query.sortBy : defaultColumn;
  const dir = query.sortDir?.toUpperCase() === 'ASC' ? 'ASC' : defaultDir;
  return `ORDER BY ${col} ${dir}`;
}

module.exports = { parsePagination, buildOrderClause };
