-- Verify the fraud case event was created
-- Run this in Supabase SQL Editor after creating a fraud case via WhatsApp

-- Check for fraud_case_created events
SELECT 
  id,
  event_type,
  status,
  attempts,
  next_attempt_at,
  last_error,
  dedupe_key,
  created_at,
  updated_at
FROM cc_automation_events
WHERE event_type = 'fraud_case_created'
ORDER BY created_at DESC
LIMIT 5;

-- Check if corresponding inbox item exists
SELECT 
  i.id,
  i.type,
  i.severity,
  i.title,
  i.status,
  i.link_ref,
  i.created_at,
  e.id as event_id,
  e.status as event_status
FROM cc_admin_inbox_items i
LEFT JOIN cc_automation_events e ON i.dedupe_key = e.dedupe_key
WHERE i.type = 'fraud_case_created'
ORDER BY i.created_at DESC
LIMIT 5;

