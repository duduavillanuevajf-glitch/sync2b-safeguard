'use strict';

const { Resend } = require('resend');
const logger = require('../config/logger');
const secrets = require('../config/secrets');

let _client = null;

async function _getClient() {
  if (_client) return _client;
  const apiKey = await secrets.getSecret('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  _client = new Resend(apiKey);
  return _client;
}

const FROM = process.env.EMAIL_FROM || 'Sync2B Safeguard <noreply@yourdomain.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

async function sendPasswordReset({ to, resetToken, ipAddress }) {
  const link = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  const client = await _getClient();
  await client.emails.send({
    from: FROM,
    to,
    subject: 'Redefinição de senha — Sync2B Safeguard',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:40px 32px;background:#f8fafc;border-radius:16px">
        <div style="margin-bottom:24px">
          <span style="font-size:22px;font-weight:700;color:#0f172a">🔐 Sync2B Safeguard</span>
        </div>
        <h2 style="font-size:20px;font-weight:600;color:#0f172a;margin:0 0 12px">Redefinição de senha</h2>
        <p style="color:#475569;line-height:1.6">
          Recebemos uma solicitação para redefinir a senha da sua conta.
          Você precisará do código do <strong>Google Authenticator</strong> para confirmar.
        </p>
        <p style="color:#475569;line-height:1.6">
          O link expira em <strong>15 minutos</strong>.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}"
             style="display:inline-block;padding:14px 32px;background:#00C47D;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">
            Redefinir senha
          </a>
        </div>
        <p style="color:#94a3b8;font-size:12px;line-height:1.6">
          Se não solicitou esta redefinição, ignore este email. Sua senha permanece segura.
          ${ipAddress ? `<br>IP da solicitação: ${ipAddress}` : ''}
        </p>
      </div>
    `,
  });
  logger.info({ to }, 'Password reset email sent');
}

async function sendExpiryAlert({ to, orgName, items }) {
  const client = await _getClient();
  const rows = items.slice(0, 20).map(i =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${i.service || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#ef4444">${i.days_since_update} dias</td>
    </tr>`
  ).join('');

  await client.emails.send({
    from: FROM,
    to,
    subject: `⚠️ ${items.length} credenciais expiradas — ${orgName}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;background:#f8fafc;border-radius:16px">
        <h2 style="color:#0f172a">⚠️ Credenciais com senha vencida</h2>
        <p style="color:#475569">${items.length} credencial(is) da organização <strong>${orgName}</strong> não são atualizadas há mais de ${items[0]?.days_since_update} dias.</p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:10px 12px;text-align:left;color:#64748b;font-weight:600">Nome</th>
              <th style="padding:10px 12px;text-align:left;color:#64748b;font-weight:600">Serviço</th>
              <th style="padding:10px 12px;text-align:left;color:#64748b;font-weight:600">Última atualização</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">Acesse o painel para atualizar as senhas.</p>
      </div>
    `,
  });
  logger.info({ to, count: items.length }, 'Expiry alert email sent');
}

module.exports = { sendPasswordReset, sendExpiryAlert };
