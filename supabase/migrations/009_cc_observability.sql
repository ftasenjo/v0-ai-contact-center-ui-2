-- Observability "crumbs" + webhook receipts (admin-only read)
-- Goal: make webhook/provider debugging trivial with minimal schema.

-- ============================================================================
-- 1) cc_observability_events: curated, high-signal event feed (groupable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cc_observability_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  severity TEXT NOT NULL CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
  source TEXT NOT NULL CHECK (source IN ('twilio', 'vapi', 'sendgrid', 'whatsapp', 'supabase', 'n8n', 'app')),
  event_type TEXT NOT NULL,

  correlation_id TEXT NULL,
  request_id TEXT NULL,
  http_status INT NULL,
  duration_ms INT NULL,

  summary TEXT NOT NULL,
  details_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,

  fingerprint TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_cc_observability_events_created_at
ON cc_observability_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_observability_events_fingerprint_created_at
ON cc_observability_events (fingerprint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_observability_events_source_event_type_created_at
ON cc_observability_events (source, event_type, created_at DESC);

-- ============================================================================
-- 2) cc_webhook_receipts: forensic ground truth for inbound webhooks
-- ============================================================================
CREATE TABLE IF NOT EXISTS cc_webhook_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'sendgrid', 'meta', 'n8n', 'vapi', 'app')),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,

  correlation_id TEXT NULL,
  signature_valid BOOLEAN NULL,
  dedupe_key TEXT NULL,

  request_headers_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_body_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,

  response_status INT NOT NULL,
  response_body_redacted JSONB NULL,
  duration_ms INT NOT NULL,
  error_text TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_cc_webhook_receipts_created_at
ON cc_webhook_receipts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_webhook_receipts_provider_endpoint_created_at
ON cc_webhook_receipts (provider, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_webhook_receipts_response_status_created_at
ON cc_webhook_receipts (response_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_webhook_receipts_correlation_id_created_at
ON cc_webhook_receipts (correlation_id, created_at DESC)
WHERE correlation_id IS NOT NULL;

-- ============================================================================
-- 3) Admin-only access via RLS
--
-- Notes:
-- - Reads are admin-only (via JWT claim `is_admin` OR a cc_admins row).
-- - Writes are intended to be server-only via Supabase service role, which bypasses RLS.
-- ============================================================================

-- Optional admin list (recommended for non-claim setups).
-- If you manage admin via JWT claims only, you can ignore this table.
CREATE TABLE IF NOT EXISTS cc_admins (
  user_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function: "is this user an admin?"
CREATE OR REPLACE FUNCTION cc_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE((auth.jwt() ->> 'is_admin')::boolean, FALSE)
    OR EXISTS (
      SELECT 1
      FROM cc_admins a
      WHERE a.user_id = auth.uid()
    );
$$;

ALTER TABLE cc_observability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_webhook_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_admins ENABLE ROW LEVEL SECURITY;

-- Revoke default access via RLS: no policies => no access for anon/authenticated.
-- Allow SELECT only for admins.
DROP POLICY IF EXISTS "cc_observability_events_admin_select" ON cc_observability_events;
CREATE POLICY "cc_observability_events_admin_select"
  ON cc_observability_events
  FOR SELECT
  USING (cc_is_admin());

DROP POLICY IF EXISTS "cc_webhook_receipts_admin_select" ON cc_webhook_receipts;
CREATE POLICY "cc_webhook_receipts_admin_select"
  ON cc_webhook_receipts
  FOR SELECT
  USING (cc_is_admin());

-- Admins can read the admin list itself (useful for debugging auth).
DROP POLICY IF EXISTS "cc_admins_admin_select" ON cc_admins;
CREATE POLICY "cc_admins_admin_select"
  ON cc_admins
  FOR SELECT
  USING (cc_is_admin());

-- Do NOT add INSERT/UPDATE policies: only service role should write (bypasses RLS).

