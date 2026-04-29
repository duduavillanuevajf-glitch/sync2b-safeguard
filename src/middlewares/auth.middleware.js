'use strict';

const authService = require('../services/auth.service');
const userRepo = require('../repositories/user.repository');
const { AuthenticationError } = require('../utils/errors');
const context = require('../utils/asyncContext');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AuthenticationError('Token de acesso não enviado');
    }

    const token = header.slice(7);
    const decoded = await authService.verifyAccessToken(token);

    if (decoded.type !== 'access') throw new AuthenticationError('Tipo de token inválido');

    const user = await userRepo.findById(decoded.sub);
    if (!user) throw new AuthenticationError('Usuário não encontrado');
    if (!user.is_active) throw new AuthenticationError('Conta desativada');
    if (!user.org_active) throw new AuthenticationError('Organização inativa');

    // Usa a org do JWT (permite multi-org); fallback para a org primária do usuário
    const effectiveOrgId = decoded.org || user.organization_id;
    let effectiveRole = decoded.role || user.role;

    // Se org selecionada difere da primária, busca papel correto na junction table
    if (effectiveOrgId !== user.organization_id) {
      try {
        const membership = await userRepo.findMembership(user.id, effectiveOrgId);
        if (membership && membership.is_active) effectiveRole = membership.role;
      } catch (_) { /* tabela ainda não criada — usa role do JWT */ }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: effectiveRole,
      organizationId: effectiveOrgId,
      orgName: user.org_name,
      orgAlertDays: user.org_alert_days,
    };

    const store = context.getContext();
    Object.assign(store, {
      userId: user.id,
      organizationId: user.organization_id,
      role: user.role,
    });

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
