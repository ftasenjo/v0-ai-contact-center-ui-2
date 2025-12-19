-- Step 10: Outbound workflows + compliance + retry policies
-- Adds: cc_outbound_campaigns, cc_outbound_jobs, cc_outbound_attempts
-- Notes:
-- - Jobs are mutable (status/next_attempt_at/outcome)
-- - Attempts are append-only (immutable via trigger)
-- - RLS matches cc_* posture: service_role has full access

-- 0) Ensure uuid extension exists (usually already present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Campaigns
CREATE TABLE IF NOT EXISTS cc_outbound_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('fraud_alert', 'kyc_update', 'collections', 'case_followup', 'service_notice')),
  allowed_channels JSONB, -- array of allowed channels (whatsapp/email/voice)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_outbound_campaigns_status
ON cc_outbound_campaigns(status);

-- Trigger for updated_at (reuses shared function from prior migrations)
DROP TRIGGER IF EXISTS update_cc_outbound_campaigns_updated_at ON cc_outbound_campaigns;
CREATE TRIGGER update_cc_outbound_campaigns_updated_at
BEFORE UPDATE ON cc_outbound_campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2) Jobs (mutable)
CREATE TABLE IF NOT EXISTS cc_outbound_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES cc_outbound_campaigns(id) ON DELETE CASCADE,
  bank_customer_id UUID REFERENCES cc_bank_customers(id) ON DELETE SET NULL,
  target_address TEXT NOT NULL, -- normalized address (e.g., whatsapp:+E164, lowercase email, +E164)
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'voice', 'sms')),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'cancelled', 'awaiting_verification')),

  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  next_attempt_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,

  outcome_code TEXT CHECK (outcome_code IN (
    'success_verified',
    'success_unverified_info_only',
    'no_answer',
    'busy',
    'failed_delivery',
    'opt_out',
    'wrong_party',
    'callback_scheduled',
    'escalated_to_human'
  )),

  cancel_reason_code TEXT,
  cancel_reason_message TEXT,

  last_error_code TEXT,
  last_error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_outbound_jobs_status_next_attempt
ON cc_outbound_jobs(status, next_attempt_at)
WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_cc_outbound_jobs_bank_customer
ON cc_outbound_jobs(bank_customer_id)
WHERE bank_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cc_outbound_jobs_campaign
ON cc_outbound_jobs(campaign_id);

DROP TRIGGER IF EXISTS update_cc_outbound_jobs_updated_at ON cc_outbound_jobs;
CREATE TRIGGER update_cc_outbound_jobs_updated_at
BEFORE UPDATE ON cc_outbound_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3) Attempts (append-only)
CREATE TABLE IF NOT EXISTS cc_outbound_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outbound_job_id UUID NOT NULL REFERENCES cc_outbound_jobs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'voice', 'sms')),
  provider TEXT NOT NULL DEFAULT 'other' CHECK (provider IN ('twilio', 'sendgrid', 'vapi', 'other')),

  provider_message_id TEXT,
  provider_call_sid TEXT,

  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'no_answer', 'busy')),

  outcome_code TEXT CHECK (outcome_code IN (
    'success_verified',
    'success_unverified_info_only',
    'no_answer',
    'busy',
    'failed_delivery',
    'opt_out',
    'wrong_party',
    'callback_scheduled',
    'escalated_to_human'
  )),

  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  error_code TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT cc_outbound_attempts_unique_attempt_per_job UNIQUE (outbound_job_id, attempt_number)
);

-- Indexes for lookups + provider uniqueness
CREATE INDEX IF NOT EXISTS idx_cc_outbound_attempts_job_created
ON cc_outbound_attempts(outbound_job_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_outbound_attempts_provider_message_unique
ON cc_outbound_attempts(provider, provider_message_id)
WHERE provider_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_outbound_attempts_provider_call_unique
ON cc_outbound_attempts(provider, provider_call_sid)
WHERE provider_call_sid IS NOT NULL;

-- 4) Make attempts append-only (immutable)
CREATE OR REPLACE FUNCTION prevent_update_delete_cc_outbound_attempts()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Outbound attempts are append-only. UPDATE/DELETE not allowed on cc_outbound_attempts';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cc_outbound_attempts_immutable_trigger ON cc_outbound_attempts;
CREATE TRIGGER cc_outbound_attempts_immutable_trigger
BEFORE UPDATE OR DELETE ON cc_outbound_attempts
FOR EACH ROW EXECUTE FUNCTION prevent_update_delete_cc_outbound_attempts();

-- 5) RLS (match cc_* posture; service_role can access)
ALTER TABLE cc_outbound_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_outbound_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_outbound_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_access_outbound_campaigns" ON cc_outbound_campaigns;
DROP POLICY IF EXISTS "service_role_all_access_outbound_jobs" ON cc_outbound_jobs;
DROP POLICY IF EXISTS "service_role_all_access_outbound_attempts" ON cc_outbound_attempts;

CREATE POLICY "service_role_all_access_outbound_campaigns" ON cc_outbound_campaigns
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_outbound_jobs" ON cc_outbound_jobs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_outbound_attempts" ON cc_outbound_attempts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

