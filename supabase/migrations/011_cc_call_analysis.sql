-- Step 12: Post-Call Analysis (banking-grade, cc_* schema)
-- Stores AI-analyzed call insights for WOW demos and operational automation
-- Links to conversations via conversation_id, and to provider calls via provider_call_id

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Post-call analysis table
CREATE TABLE IF NOT EXISTS cc_call_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES cc_conversations(id) ON DELETE CASCADE,
  
  -- Provider metadata (Vapi/Twilio/etc.)
  provider TEXT NOT NULL DEFAULT 'vapi',
  provider_call_id TEXT,         -- e.g. Twilio CallSid or Vapi call.id
  vapi_call_id TEXT,             -- explicit Vapi call ID if different from provider_call_id
  
  -- Core analysis fields (starter 10)
  call_summary TEXT,              -- 2-3 sentence summary
  issue_type TEXT CHECK (issue_type IN ('fraud', 'card', 'login', 'dispute', 'payments', 'general', 'other')),
  issue_severity TEXT CHECK (issue_severity IN ('low', 'medium', 'high')),
  issue_resolved BOOLEAN,
  escalation_required BOOLEAN,
  supervisor_review_needed BOOLEAN,
  compliance_verified BOOLEAN,
  customer_sentiment TEXT,        -- e.g. 'positive', 'neutral', 'negative', 'frustrated'
  customer_frustrated BOOLEAN,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  
  -- Extended fields (next best banking WOW)
  identity_verified BOOLEAN,
  step_up_auth_required BOOLEAN,
  step_up_auth_completed BOOLEAN,
  action_taken TEXT CHECK (action_taken IN ('card_frozen', 'case_created', 'none', 'other')),
  next_best_action TEXT,
  
  -- Raw analysis (redacted, for debugging)
  raw_analysis_json JSONB,
  
  -- Timestamps
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_cc_call_analysis_conversation
ON cc_call_analysis(conversation_id);

CREATE INDEX IF NOT EXISTS idx_cc_call_analysis_provider_call
ON cc_call_analysis(provider, provider_call_id);

CREATE INDEX IF NOT EXISTS idx_cc_call_analysis_vapi_call
ON cc_call_analysis(vapi_call_id)
WHERE vapi_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cc_call_analysis_escalation
ON cc_call_analysis(escalation_required, analyzed_at DESC)
WHERE escalation_required = true;

CREATE INDEX IF NOT EXISTS idx_cc_call_analysis_compliance
ON cc_call_analysis(compliance_verified, analyzed_at DESC)
WHERE compliance_verified = false;

CREATE INDEX IF NOT EXISTS idx_cc_call_analysis_quality
ON cc_call_analysis(quality_score, analyzed_at DESC)
WHERE quality_score IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_cc_call_analysis_updated_at ON cc_call_analysis;
CREATE TRIGGER update_cc_call_analysis_updated_at
BEFORE UPDATE ON cc_call_analysis
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (match cc_* posture; service_role can access)
ALTER TABLE cc_call_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_access_call_analysis" ON cc_call_analysis;
CREATE POLICY "service_role_all_access_call_analysis" ON cc_call_analysis
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

