-- ============================================================
-- 003_tags_and_roles.sql
-- Tags gerenciadas por organização + perfis RBAC customizáveis
-- ============================================================

-- ─── TAGS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  color           VARCHAR(20)  DEFAULT '#6366f1',
  category        VARCHAR(100),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT tags_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_org_id ON tags (organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_is_active ON tags (is_active);

CREATE TRIGGER set_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── CUSTOM ROLES (perfis RBAC por organização) ───────────────────────────────
CREATE TABLE IF NOT EXISTS custom_roles (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,
  permissions     TEXT[]       NOT NULL DEFAULT '{}',
  is_system       BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_roles_org_slug_unique UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_org_id ON custom_roles (organization_id);

CREATE TRIGGER set_custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Coluna custom_role_id para usuários (nullable — usa base role se NULL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_custom_role_id ON users (custom_role_id);

-- ─── Seed: perfis padrão do sistema para a org demo ──────────────────────────
-- (Será inserido ao rodar seed.js em seguida)
