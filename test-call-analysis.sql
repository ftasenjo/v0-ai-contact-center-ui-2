-- Test call analysis setup
-- Run this in Supabase SQL Editor to verify the table exists and test insertion

-- 1. Verify table exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cc_call_analysis'
ORDER BY ordinal_position;

-- 2. Test insert (you'll need a real conversation_id from your database)
-- Replace 'YOUR_CONVERSATION_ID' with an actual conversation ID
/*
INSERT INTO cc_call_analysis (
  conversation_id,
  provider,
  provider_call_id,
  call_summary,
  issue_type,
  issue_severity,
  issue_resolved,
  escalation_required,
  supervisor_review_needed,
  compliance_verified,
  customer_sentiment,
  customer_frustrated,
  quality_score,
  identity_verified,
  step_up_auth_required,
  step_up_auth_completed,
  action_taken,
  next_best_action
) VALUES (
  'YOUR_CONVERSATION_ID',
  'vapi',
  'CA1234567890abcdef',
  'Customer reported suspicious card transactions. Verified identity and froze card. Case created.',
  'fraud',
  'high',
  true,
  false,
  true,
  true,
  'neutral',
  false,
  8,
  true,
  true,
  true,
  'card_frozen',
  'Monitor account for additional suspicious activity'
);

-- 3. Verify the insert worked
SELECT * FROM cc_call_analysis ORDER BY created_at DESC LIMIT 1;

-- 4. Check if inbox items were created automatically
SELECT 
  id,
  type,
  severity,
  title,
  status,
  created_at
FROM cc_admin_inbox_items
WHERE type LIKE 'call_%'
ORDER BY created_at DESC
LIMIT 5;
*/

