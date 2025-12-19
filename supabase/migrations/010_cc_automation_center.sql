-- Step 11: In-app automation center (Outbox + Admin inbox)
-- Adds:
--  - cc_automation_events (reliable outbox queue)
--  - cc_admin_inbox_items (ops/admin inbox)
--
-- Goals:
--  - Never lose operational events
--  - Dispatcher can retry safely (idempotent via dedupe_key)
--  - Admins can view/ack/resolve items in-app
--  - service_role has full access (matches cc_* posture)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Outbox table (reliability layer)
CREATE TABLE IF NOT EXISTS cc_automation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_automation_events_status_next_attempt
ON cc_automation_events(status, next_attempt_at)
WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_cc_automation_events_event_type
ON cc_automation_events(event_type);

DROP TRIGGER IF EXISTS update_cc_automation_events_updated_at ON cc_automation_events;
CREATE TRIGGER update_cc_automation_events_updated_at
BEFORE UPDATE ON cc_automation_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2) Inbox table (what admins manage in-app)
CREATE TABLE IF NOT EXISTS cc_admin_inbox_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warn', 'error')),
  title TEXT NOT NULL,
  body TEXT,
  link_ref JSONB, -- { kind: 'case'|'outbound_job'|..., id: <uuid> }
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  assigned_to UUID, -- optional (reserved for later)
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_admin_inbox_items_status_created
ON cc_admin_inbox_items(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_admin_inbox_items_type
ON cc_admin_inbox_items(type);

CREATE INDEX IF NOT EXISTS idx_cc_admin_inbox_items_severity
ON cc_admin_inbox_items(severity);

DROP TRIGGER IF EXISTS update_cc_admin_inbox_items_updated_at ON cc_admin_inbox_items;
CREATE TRIGGER update_cc_admin_inbox_items_updated_at
BEFORE UPDATE ON cc_admin_inbox_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3) RLS (match cc_* posture; service_role can access)
ALTER TABLE cc_automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_admin_inbox_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_access_automation_events" ON cc_automation_events;
DROP POLICY IF EXISTS "service_role_all_access_admin_inbox_items" ON cc_admin_inbox_items;

CREATE POLICY "service_role_all_access_automation_events" ON cc_automation_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_admin_inbox_items" ON cc_admin_inbox_items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

