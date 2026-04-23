'use strict';

const auditRepo = require('../repositories/audit.repository');
const { parsePagination } = require('../utils/pagination');

async function getOrganizationLogs({ organizationId, query }) {
  const { page, limit, offset } = parsePagination(query);
  const filters = {
    action: query.action || null,
    userId: query.userId || null,
    resourceType: query.resourceType || null,
    from: query.from ? new Date(query.from) : null,
    to: query.to ? new Date(query.to) : null,
  };

  const [rows, total] = await Promise.all([
    auditRepo.findByOrganization(organizationId, { limit, offset, ...filters }),
    auditRepo.countByOrganization(organizationId, filters),
  ]);

  return { rows, total, page, limit };
}

async function getVaultItemHistory({ vaultItemId, organizationId }) {
  return auditRepo.findVaultHistory(vaultItemId, organizationId);
}

module.exports = { getOrganizationLogs, getVaultItemHistory };
