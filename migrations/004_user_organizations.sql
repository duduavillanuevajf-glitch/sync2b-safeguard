-- ============================================================
-- 004_user_organizations.sql — Multi-org membership + 2FA fields
-- ============================================================

-- Tabela de vínculo usuário ↔ organização (suporta multi-org)
CREATE TABLE IF NOT EXISTS user_organizations (
  user_id         UUID         NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            VARCHAR(50)  NOT NULL DEFAULT 'vault_viewer',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  joined_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

-- Popula a partir dos usuários existentes (migração retroativa)
INSERT INTO user_organizations (user_id, organization_id, role)
SELECT id, organization_id, role
FROM users
ON CONFLICT (user_id, organization_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_orgs_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orgs_org  ON user_organizations(organization_id);
