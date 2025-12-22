-- Drill A Verification: Fraud Case via WhatsApp
-- Run this after creating a fraud case to verify the full flow

-- 1. Check if fraud case exists
SELECT 
  id,
  case_number,
  type,
  status,
  priority,
  created_at
FROM cc_cases
WHERE type = 'fraud'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if automation event was emitted
SELECT 
  id,
  event_type,
  status,
  attempts,
  dedupe_key,
  created_at,
  updated_at
FROM cc_automation_events
WHERE event_type = 'fraud_case_created'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if inbox item was created
SELECT 
  id,
  type,
  severity,
  title,
  status,
  link_ref,
  dedupe_key,
  created_at
FROM cc_admin_inbox_items
WHERE type = 'fraud_case_created'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Match event to inbox item (should have same dedupe_key)
SELECT 
  e.id as event_id,
  e.event_type,
  e.status as event_status,
  e.dedupe_key,
  e.created_at as event_created,
  i.id as inbox_id,
  i.title,
  i.status as inbox_status,
  i.created_at as inbox_created,
  CASE 
    WHEN e.status = 'sent' AND i.id IS NOT NULL THEN '✅ Complete'
    WHEN e.status = 'pending' THEN '⏳ Pending dispatcher'
    WHEN e.status = 'failed' THEN '❌ Failed'
    ELSE '⚠️ Unknown'
  END as flow_status
FROM cc_automation_events e
LEFT JOIN cc_admin_inbox_items i ON e.dedupe_key = i.dedupe_key
WHERE e.event_type = 'fraud_case_created'
ORDER BY e.created_at DESC
LIMIT 5;

