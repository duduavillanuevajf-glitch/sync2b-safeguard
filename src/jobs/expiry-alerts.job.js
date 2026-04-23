'use strict';

const cron = require('node-cron');
const db = require('../config/database');
const emailSvc = require('../services/email.service');
const logger = require('../config/logger');

async function runExpiryAlerts() {
  const start = Date.now();
  logger.info('Running expiry alerts job');
  let processed = 0;

  try {
    const { rows: orgs } = await db.query(
      `SELECT o.id, o.name, o.alert_days,
              array_agg(DISTINCT u.email) FILTER (WHERE u.role IN ('org_admin','super_admin') AND u.is_active = TRUE) AS admin_emails
       FROM organizations o
       JOIN users u ON u.organization_id = o.id
       WHERE o.is_active = TRUE
       GROUP BY o.id`
    );

    for (const org of orgs) {
      if (!org.admin_emails?.length) continue;

      const { rows: staleItems } = await db.query(
        `SELECT id, name, host, service, username,
                EXTRACT(DAY FROM NOW() - updated_at)::INTEGER AS days_since_update
         FROM vault_items
         WHERE organization_id = $1
           AND is_archived = FALSE
           AND EXTRACT(DAY FROM NOW() - updated_at) >= $2
         ORDER BY days_since_update DESC`,
        [org.id, org.alert_days]
      );

      if (!staleItems.length) continue;

      for (const email of org.admin_emails) {
        try {
          await emailSvc.sendExpiryAlert({ to: email, orgName: org.name, items: staleItems });
        } catch (err) {
          logger.error({ err, email, orgId: org.id }, 'Failed to send expiry alert email');
        }
      }
      processed++;
      logger.info({ orgId: org.id, staleCount: staleItems.length }, 'Expiry alert sent');
    }
  } catch (err) {
    logger.error({ err }, 'Expiry alerts job failed');
  }

  logger.info({ processed, durationMs: Date.now() - start }, 'Expiry alerts job complete');
}

function schedule() {
  const expression = process.env.EXPIRY_ALERT_CRON || '0 8 * * *';
  cron.schedule(expression, runExpiryAlerts, { timezone: 'America/Sao_Paulo' });
  logger.info({ expression }, 'Expiry alerts job scheduled');
}

module.exports = { schedule, runExpiryAlerts };
