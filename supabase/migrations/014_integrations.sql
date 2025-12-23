-- Step 15: Integrations registry for CRM/ERP connectivity (used by Agent Builder fetch nodes)
-- Stores integration connection metadata and references secrets by env var key (never stores secrets in DB).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS cc_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL, -- e.g. salesforce | hubspot | zendesk | dynamics | sap | netsuite | custom
  base_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),

  auth_type TEXT NOT NULL DEFAULT 'bearer_env' CHECK (auth_type IN ('none', 'bearer_env', 'api_key_env')),
  -- For bearer_env: secret is read from process.env[auth_env_key] and sent as Authorization: Bearer <token>
  -- For api_key_env: secret is read from process.env[auth_env_key] and sent as X-API-Key: <token> (or header in auth_config)
  auth_env_key TEXT NULL,
  auth_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_integrations_status ON cc_integrations(status);
CREATE INDEX IF NOT EXISTS idx_cc_integrations_provider ON cc_integrations(provider);

DROP TRIGGER IF EXISTS update_cc_integrations_updated_at ON cc_integrations;
CREATE TRIGGER update_cc_integrations_updated_at
BEFORE UPDATE ON cc_integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cc_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_access_integrations" ON cc_integrations;
CREATE POLICY "service_role_all_access_integrations" ON cc_integrations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

