-- Step 9: Voice transcripts (banking-grade, cc_* schema)
-- Canonical storage for voice turns (authoritative), optionally mirrored into cc_messages for UI.

-- 1) Transcript turns per conversation
CREATE TABLE IF NOT EXISTS cc_call_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES cc_conversations(id) ON DELETE CASCADE,

  -- Provider metadata (Vapi/Twilio/etc.)
  provider TEXT NOT NULL DEFAULT 'vapi',
  provider_call_id TEXT,         -- e.g. Twilio CallSid or Vapi call.id
  provider_turn_id TEXT,         -- optional stable turn id (dedupe key)

  -- Turn content
  speaker TEXT NOT NULL CHECK (speaker IN ('customer', 'ai', 'agent', 'system')),
  text TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,

  -- Optional voice timing/scoring scaffolding
  is_final BOOLEAN DEFAULT TRUE,
  confidence DECIMAL(4, 3),
  start_ms INTEGER,
  end_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Query indexes
CREATE INDEX IF NOT EXISTS idx_cc_call_transcripts_conversation_occurred
ON cc_call_transcripts(conversation_id, occurred_at ASC);

CREATE INDEX IF NOT EXISTS idx_cc_call_transcripts_provider_call
ON cc_call_transcripts(provider, provider_call_id);

-- 3) Dedupe (best-effort): only if provider_turn_id present
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_call_transcripts_provider_turn_unique
ON cc_call_transcripts(provider, provider_call_id, provider_turn_id)
WHERE provider_turn_id IS NOT NULL;

-- 4) Make transcripts append-only (immutable)
CREATE OR REPLACE FUNCTION prevent_update_delete_cc_call_transcripts()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Call transcripts are append-only. UPDATE/DELETE not allowed on cc_call_transcripts';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cc_call_transcripts_immutable_trigger ON cc_call_transcripts;
CREATE TRIGGER cc_call_transcripts_immutable_trigger
BEFORE UPDATE OR DELETE ON cc_call_transcripts
FOR EACH ROW EXECUTE FUNCTION prevent_update_delete_cc_call_transcripts();

-- 5) RLS (match cc_* posture; service role can access)
ALTER TABLE cc_call_transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_access_call_transcripts" ON cc_call_transcripts;
CREATE POLICY "service_role_all_access_call_transcripts" ON cc_call_transcripts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

