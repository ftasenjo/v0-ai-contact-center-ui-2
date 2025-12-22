-- Check current automation status
-- Run this in Supabase SQL Editor to see what's in the system

-- Check outbox events
SELECT 
  id,
  event_type,
  status,
  attempts,
  next_attempt_at,
  last_error,
  created_at
FROM cc_automation_events
ORDER BY created_at DESC
LIMIT 10;

-- Check inbox items
SELECT 
  id,
  type,
  severity,
  title,
  status,
  created_at
FROM cc_admin_inbox_items
ORDER BY created_at DESC
LIMIT 10;

-- Count summary
SELECT 
  'Events (pending)' as type,
  COUNT(*) as count
FROM cc_automation_events
WHERE status = 'pending'
UNION ALL
SELECT 
  'Events (sent)' as type,
  COUNT(*) as count
FROM cc_automation_events
WHERE status = 'sent'
UNION ALL
SELECT 
  'Events (failed)' as type,
  COUNT(*) as count
FROM cc_automation_events
WHERE status = 'failed'
UNION ALL
SELECT 
  'Inbox (open)' as type,
  COUNT(*) as count
FROM cc_admin_inbox_items
WHERE status = 'open';

