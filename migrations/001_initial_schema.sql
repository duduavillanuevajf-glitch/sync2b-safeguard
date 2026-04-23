-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 001_initial_schema
-- Sync2B Safeguard — Enterprise schema with multi-tenancy and full audit trail
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── ORGANIZATIONS (tenants) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255)  NOT NULL,
  slug            VARCHAR(100)  UNIQUE NOT NULL,
  plan            VARCHAR(50)   NOT NULL DEFAULT 'starter',
  max_users       INTEGER       NOT NULL DEFAULT 5,
  max_vault_items INTEGER       NOT NULL DEFAULT 500,
  alert_days      INTEGER       NOT NULL DEFAULT 90,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  settings        JSONB         NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email                  VARCHAR(255) NOT NULL,
  password_hash          VARCHAR(255) NOT NULL,
  otp_secret             VARCHAR(255),
  otp_enabled            BOOLEAN      NOT NULL DEFAULT FALSE,
  role                   VARCHAR(50)  NOT NULL DEFAULT 'vault_viewer',
  first_name             VARCHAR(100),
  last_name              VARCHAR(100),
  is_active              BOOLEAN      NOT NULL DEFAULT TRUE,
  failed_login_attempts  INTEGER      NOT NULL DEFAULT 0,
  locked_until           TIMESTAMPTZ,
  last_login_at          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_org_unique UNIQUE (organization_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_email            ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_organization_id  ON users (organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role             ON users (role);

-- ─── REFRESH TOKENS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  family_id   UUID         NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  revoked_at  TIMESTAMPTZ,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id   ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens (family_id);

-- ─── VAULT ITEMS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_items (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by         UUID         NOT NULL REFERENCES users(id),
  name               VARCHAR(255) NOT NULL,
  host               VARCHAR(255),
  dns                VARCHAR(255),
  port               INTEGER      CHECK (port > 0 AND port <= 65535),
  service            VARCHAR(100),
  username           VARCHAR(255),
  encrypted_password TEXT         NOT NULL,
  encryption_iv      TEXT         NOT NULL,
  encryption_tag     TEXT         NOT NULL,
  encryption_version VARCHAR(10)  NOT NULL DEFAULT '1',
  notes              TEXT,
  tags               TEXT[]       NOT NULL DEFAULT '{}',
  category           VARCHAR(100),
  is_archived        BOOLEAN      NOT NULL DEFAULT FALSE,
  archived_at        TIMESTAMPTZ,
  archived_by        UUID         REFERENCES users(id),
  expires_at         TIMESTAMPTZ,
  last_accessed_at   TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vault_items_org_id      ON vault_items (organization_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_created_by  ON vault_items (created_by);
CREATE INDEX IF NOT EXISTS idx_vault_items_is_archived ON vault_items (is_archived);
CREATE INDEX IF NOT EXISTS idx_vault_items_updated_at  ON vault_items (updated_at);
CREATE INDEX IF NOT EXISTS idx_vault_items_name_trgm   ON vault_items USING gin (name gin_trgm_ops);

-- ─── VAULT HISTORY ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_history (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id   UUID         NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES organizations(id),
  user_id         UUID         REFERENCES users(id),
  action          VARCHAR(50)  NOT NULL,
  field_changed   VARCHAR(100),
  old_value       TEXT,
  new_value       TEXT,
  ip_address      INET,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vault_history_item_id    ON vault_history (vault_item_id);
CREATE INDEX IF NOT EXISTS idx_vault_history_org_id     ON vault_history (organization_id);
CREATE INDEX IF NOT EXISTS idx_vault_history_user_id    ON vault_history (user_id);
CREATE INDEX IF NOT EXISTS idx_vault_history_created_at ON vault_history (created_at);

-- ─── AUDIT LOG ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         REFERENCES organizations(id),
  user_id         UUID         REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,
  resource_type   VARCHAR(100),
  resource_id     UUID,
  ip_address      INET,
  user_agent      TEXT,
  request_id      UUID,
  status          VARCHAR(20)  NOT NULL DEFAULT 'success',
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id     ON audit_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource   ON audit_logs (resource_type, resource_id);

-- ─── PASSWORD RESET TOKENS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used_at     TIMESTAMPTZ,
  ip_address  INET,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user_id ON password_reset_tokens (user_id);

-- ─── IMPORT JOBS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_jobs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID         NOT NULL REFERENCES users(id),
  filename        VARCHAR(255),
  status          VARCHAR(50)  NOT NULL DEFAULT 'pending',
  total_rows      INTEGER      NOT NULL DEFAULT 0,
  processed_rows  INTEGER      NOT NULL DEFAULT 0,
  success_rows    INTEGER      NOT NULL DEFAULT 0,
  failed_rows     INTEGER      NOT NULL DEFAULT 0,
  error_details   JSONB        NOT NULL DEFAULT '[]',
  warnings        JSONB        NOT NULL DEFAULT '[]',
  rollback_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_import_jobs_org_id ON import_jobs (organization_id);

-- ─── AUTO-UPDATE updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['organizations', 'users', 'vault_items'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I;
       CREATE TRIGGER set_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();', t, t
    );
  END LOOP;
END $$;
