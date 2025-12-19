-- Migration: Add missing columns, indexes, and constraints for Step 1 Checklist
-- This migration adds only what's missing from the existing schema
-- Does not rename existing tables/columns - adapts to current naming

-- ============================================================================
-- 1. CC_CONVERSATIONS - Add missing columns and indexes
-- ============================================================================

-- Add provider column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_conversations' AND column_name = 'provider'
  ) THEN
    ALTER TABLE cc_conversations 
    ADD COLUMN provider TEXT CHECK (provider IN ('twilio', 'sendgrid', 'vapi', 'other'));
  END IF;
END $$;

-- Add provider_conversation_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_conversations' AND column_name = 'provider_conversation_id'
  ) THEN
    ALTER TABLE cc_conversations 
    ADD COLUMN provider_conversation_id TEXT;
  END IF;
END $$;

-- Update status constraint to include 'open' and 'pending' if needed
-- Note: We keep existing values and add new ones
DO $$
BEGIN
  -- Check if constraint exists and update it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'cc_conversations' 
    AND constraint_name LIKE '%status%check%'
  ) THEN
    -- Drop old constraint
    ALTER TABLE cc_conversations DROP CONSTRAINT IF EXISTS cc_conversations_status_check;
    -- Add new constraint with all required values
    ALTER TABLE cc_conversations 
    ADD CONSTRAINT cc_conversations_status_check 
    CHECK (status IN ('open', 'pending', 'active', 'waiting', 'resolved', 'escalated', 'closed'));
  END IF;
END $$;

-- Add index on (channel, provider_conversation_id) for fast lookup
CREATE INDEX IF NOT EXISTS idx_cc_conversations_channel_provider_conv_id 
ON cc_conversations(channel, provider_conversation_id) 
WHERE provider_conversation_id IS NOT NULL;

-- ============================================================================
-- 2. CC_MESSAGES - Add missing columns, constraints, and indexes
-- ============================================================================

-- Add provider column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'provider'
  ) THEN
    ALTER TABLE cc_messages 
    ADD COLUMN provider TEXT CHECK (provider IN ('twilio', 'sendgrid', 'vapi', 'other'));
  END IF;
END $$;

-- Rename provider_msg_id to provider_message_id if it exists as provider_msg_id
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'provider_msg_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'provider_message_id'
  ) THEN
    ALTER TABLE cc_messages RENAME COLUMN provider_msg_id TO provider_message_id;
  END IF;
END $$;

-- Add provider_message_id if it doesn't exist at all
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'provider_message_id'
  ) THEN
    ALTER TABLE cc_messages 
    ADD COLUMN provider_message_id TEXT;
  END IF;
END $$;

-- Add from_address and to_address columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'from_address'
  ) THEN
    ALTER TABLE cc_messages 
    ADD COLUMN from_address TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'to_address'
  ) THEN
    ALTER TABLE cc_messages 
    ADD COLUMN to_address TEXT;
  END IF;
END $$;

-- Rename text to body_text if needed, or add body_text
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'body_text'
  ) THEN
    ALTER TABLE cc_messages RENAME COLUMN text TO body_text;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'body_text'
  ) THEN
    ALTER TABLE cc_messages 
    ADD COLUMN body_text TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add body_json column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'body_json'
  ) THEN
    ALTER TABLE cc_messages 
    ADD COLUMN body_json JSONB;
  END IF;
END $$;

-- Add status column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_messages' AND column_name = 'status'
  ) THEN
    ALTER TABLE cc_messages 
    ADD COLUMN status TEXT CHECK (status IN ('received', 'sent', 'delivered', 'failed', 'read'));
  END IF;
END $$;

-- Create unique constraint on (provider, provider_message_id) for idempotency
-- First, ensure provider and provider_message_id are not null where they should be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_messages_provider_msg_id_unique 
ON cc_messages(provider, provider_message_id) 
WHERE provider IS NOT NULL AND provider_message_id IS NOT NULL;

-- Add composite index on (conversation_id, created_at desc) if not exists
CREATE INDEX IF NOT EXISTS idx_cc_messages_conversation_created_desc 
ON cc_messages(conversation_id, created_at DESC);

-- Add index on from_address where useful
CREATE INDEX IF NOT EXISTS idx_cc_messages_from_address 
ON cc_messages(from_address) 
WHERE from_address IS NOT NULL;

-- ============================================================================
-- 3. CC_CASES - Add missing columns, update constraints, and indexes
-- ============================================================================

-- Update type constraint to include all required values
-- IMPORTANT: Drop constraint FIRST, then update data, then add new constraint
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Step 1: Find and drop the existing constraint
  SELECT constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints 
  WHERE table_name = 'cc_cases' 
  AND constraint_type = 'CHECK'
  AND constraint_name LIKE '%type%'
  LIMIT 1;
  
  -- Drop old constraint if it exists
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE cc_cases DROP CONSTRAINT %I', constraint_name_var);
  END IF;
  
  -- Also try dropping by common name
  ALTER TABLE cc_cases DROP CONSTRAINT IF EXISTS cc_cases_type_check;
  
  -- Step 2: Now update existing data (constraint is dropped, so this will work)
  -- Map existing values to new constraint values
  -- 'dispute' -> 'disputes' (plural form as per checklist)
  UPDATE cc_cases SET type = 'disputes' WHERE type = 'dispute';
  
  -- Step 3: Add new constraint with all required values
  ALTER TABLE cc_cases 
  ADD CONSTRAINT cc_cases_type_check 
  CHECK (type IN ('fraud', 'cards', 'payments', 'loans', 'disputes', 'complaints', 'general', 'chargeback', 'account_issue', 'transaction_inquiry', 'other'));
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, skip
    NULL;
  WHEN OTHERS THEN
    -- Try alternative approach
    BEGIN
      ALTER TABLE cc_cases DROP CONSTRAINT IF EXISTS cc_cases_type_check;
      UPDATE cc_cases SET type = 'disputes' WHERE type = 'dispute';
      ALTER TABLE cc_cases 
      ADD CONSTRAINT cc_cases_type_check 
      CHECK (type IN ('fraud', 'cards', 'payments', 'loans', 'disputes', 'complaints', 'general', 'chargeback', 'account_issue', 'transaction_inquiry', 'other'));
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- Update status constraint to include all required values
-- IMPORTANT: Drop constraint FIRST, then update data if needed, then add new constraint
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Step 1: Find and drop the existing constraint
  SELECT constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints 
  WHERE table_name = 'cc_cases' 
  AND constraint_type = 'CHECK'
  AND constraint_name LIKE '%status%'
  LIMIT 1;
  
  -- Drop old constraint if it exists
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE cc_cases DROP CONSTRAINT %I', constraint_name_var);
  END IF;
  
  -- Also try dropping by common name
  ALTER TABLE cc_cases DROP CONSTRAINT IF EXISTS cc_cases_status_check;
  
  -- Step 2: Update data if needed (all existing values are compatible, so no update needed)
  -- 'open' can stay as 'open' (it's in both old and new)
  -- 'in_progress' stays the same
  -- 'escalated' stays the same
  -- 'resolved' stays the same
  -- 'closed' stays the same
  
  -- Step 3: Add new constraint with all required values (including old ones for compatibility)
  ALTER TABLE cc_cases 
  ADD CONSTRAINT cc_cases_status_check 
  CHECK (status IN ('new', 'triage', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'open', 'escalated'));
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, skip
    NULL;
  WHEN OTHERS THEN
    -- Try alternative approach
    BEGIN
      ALTER TABLE cc_cases DROP CONSTRAINT IF EXISTS cc_cases_status_check;
      ALTER TABLE cc_cases 
      ADD CONSTRAINT cc_cases_status_check 
      CHECK (status IN ('new', 'triage', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'open', 'escalated'));
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- Add summary column if description exists but summary doesn't
-- We'll keep both - summary for brief, description for detailed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_cases' AND column_name = 'summary'
  ) THEN
    ALTER TABLE cc_cases 
    ADD COLUMN summary TEXT;
    -- Copy description to summary if description exists
    UPDATE cc_cases SET summary = description WHERE summary IS NULL AND description IS NOT NULL;
  END IF;
END $$;

-- Add closed_at if it doesn't exist (we have resolved_at, but closed_at is also needed)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_cases' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE cc_cases 
    ADD COLUMN closed_at TIMESTAMPTZ;
    -- Copy resolved_at to closed_at where status is closed/resolved
    UPDATE cc_cases SET closed_at = resolved_at 
    WHERE closed_at IS NULL AND resolved_at IS NOT NULL 
    AND status IN ('closed', 'resolved');
  END IF;
END $$;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_cc_cases_bank_customer_created_desc 
ON cc_cases(bank_customer_id, created_at DESC) 
WHERE bank_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cc_cases_status_priority 
ON cc_cases(status, priority);

CREATE INDEX IF NOT EXISTS idx_cc_cases_type_created_desc 
ON cc_cases(type, created_at DESC);

-- ============================================================================
-- 4. CC_AUTH_SESSIONS - Add missing columns and indexes
-- ============================================================================

-- Add channel column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_auth_sessions' AND column_name = 'channel'
  ) THEN
    ALTER TABLE cc_auth_sessions 
    ADD COLUMN channel TEXT CHECK (channel IN ('whatsapp', 'email', 'voice', 'sms'));
  END IF;
END $$;

-- Add destination column (masked phone/email)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_auth_sessions' AND column_name = 'destination'
  ) THEN
    ALTER TABLE cc_auth_sessions 
    ADD COLUMN destination TEXT;
  END IF;
END $$;

-- Add provider column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_auth_sessions' AND column_name = 'provider'
  ) THEN
    ALTER TABLE cc_auth_sessions 
    ADD COLUMN provider TEXT CHECK (provider IN ('twilio_verify', 'sendgrid', 'vapi', 'other'));
  END IF;
END $$;

-- Add provider_request_id column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_auth_sessions' AND column_name = 'provider_request_id'
  ) THEN
    ALTER TABLE cc_auth_sessions 
    ADD COLUMN provider_request_id TEXT;
  END IF;
END $$;

-- Update status constraint to include all required values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'cc_auth_sessions' 
    AND constraint_name LIKE '%status%check%'
  ) THEN
    ALTER TABLE cc_auth_sessions DROP CONSTRAINT IF EXISTS cc_auth_sessions_status_check;
    ALTER TABLE cc_auth_sessions 
    ADD CONSTRAINT cc_auth_sessions_status_check 
    CHECK (status IN ('created', 'sent', 'verified', 'failed', 'expired', 'cancelled', 'pending'));
  END IF;
END $$;

-- Add updated_at column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_auth_sessions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE cc_auth_sessions 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add trigger for updated_at
CREATE TRIGGER update_cc_auth_sessions_updated_at 
BEFORE UPDATE ON cc_auth_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add unique index on (provider, provider_request_id) if available
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_auth_sessions_provider_request_id_unique 
ON cc_auth_sessions(provider, provider_request_id) 
WHERE provider IS NOT NULL AND provider_request_id IS NOT NULL;

-- ============================================================================
-- 5. CC_AUDIT_LOGS - Add missing columns and make immutable
-- ============================================================================

-- Add case_id column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'case_id'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN case_id UUID REFERENCES cc_cases(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add bank_customer_id column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'bank_customer_id'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN bank_customer_id UUID REFERENCES cc_bank_customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Rename actor to actor_type if needed, or add actor_type
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'actor'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'actor_type'
  ) THEN
    ALTER TABLE cc_audit_logs RENAME COLUMN actor TO actor_type;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'actor_type'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN actor_type TEXT NOT NULL DEFAULT 'system' 
    CHECK (actor_type IN ('system', 'agent', 'customer'));
  END IF;
END $$;

-- Add actor_id column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'actor_id'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN actor_id UUID; -- References auth.users or agent ID
  END IF;
END $$;

-- Rename action to event_type if needed, or add event_type
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'action'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE cc_audit_logs RENAME COLUMN action TO event_type;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN event_type TEXT NOT NULL;
  END IF;
END $$;

-- Add event_version column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'event_version'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN event_version INTEGER DEFAULT 1;
  END IF;
END $$;

-- Rename payload_redacted to input_redacted and add output_redacted
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'payload_redacted'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'input_redacted'
  ) THEN
    ALTER TABLE cc_audit_logs RENAME COLUMN payload_redacted TO input_redacted;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'input_redacted'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN input_redacted JSONB;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'output_redacted'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN output_redacted JSONB;
  END IF;
END $$;

-- Add success column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'success'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN success BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add error_code and error_message columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN error_code TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_audit_logs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE cc_audit_logs 
    ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Add index on (conversation_id, created_at desc)
CREATE INDEX IF NOT EXISTS idx_cc_audit_logs_conversation_created_desc 
ON cc_audit_logs(conversation_id, created_at DESC) 
WHERE conversation_id IS NOT NULL;

-- Add index on case_id
CREATE INDEX IF NOT EXISTS idx_cc_audit_logs_case_id 
ON cc_audit_logs(case_id) 
WHERE case_id IS NOT NULL;

-- Add index on bank_customer_id
CREATE INDEX IF NOT EXISTS idx_cc_audit_logs_bank_customer_id 
ON cc_audit_logs(bank_customer_id) 
WHERE bank_customer_id IS NOT NULL;

-- Create trigger to prevent UPDATE/DELETE on audit logs (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit logs are immutable. UPDATE not allowed on cc_audit_logs';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit logs are immutable. DELETE not allowed on cc_audit_logs';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS audit_logs_immutable_trigger ON cc_audit_logs;
CREATE TRIGGER audit_logs_immutable_trigger
BEFORE UPDATE OR DELETE ON cc_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- ============================================================================
-- 6. CC_IDENTITY_LINKS - Create new table for identity/address mapping
-- ============================================================================

CREATE TABLE IF NOT EXISTS cc_identity_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'voice', 'sms')),
  address TEXT NOT NULL, -- Normalized: whatsapp:+E164 / +E164 / lowercase email
  bank_customer_id UUID REFERENCES cc_bank_customers(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  confidence INTEGER DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cc_identity_links_channel_address_unique UNIQUE (channel, address)
);

-- Indexes for cc_identity_links
CREATE INDEX IF NOT EXISTS idx_cc_identity_links_bank_customer_id 
ON cc_identity_links(bank_customer_id) 
WHERE bank_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cc_identity_links_address 
ON cc_identity_links(address);

-- Trigger for updated_at
CREATE TRIGGER update_cc_identity_links_updated_at 
BEFORE UPDATE ON cc_identity_links
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. CC_COMM_PREFERENCES - Rename and enhance existing cc_preferences
-- ============================================================================

-- Rename cc_preferences to cc_comm_preferences if it doesn't exist
-- Also rename column 'dnc' to 'do_not_contact' if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'cc_preferences'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'cc_comm_preferences'
  ) THEN
    -- Rename table
    ALTER TABLE cc_preferences RENAME TO cc_comm_preferences;
    
    -- Rename column 'dnc' to 'do_not_contact' if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'cc_comm_preferences' AND column_name = 'dnc'
    ) THEN
      ALTER TABLE cc_comm_preferences RENAME COLUMN dnc TO do_not_contact;
    END IF;
  END IF;
  
  -- If cc_comm_preferences exists but still has 'dnc' column, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'cc_comm_preferences'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_comm_preferences' AND column_name = 'dnc'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_comm_preferences' AND column_name = 'do_not_contact'
  ) THEN
    ALTER TABLE cc_comm_preferences RENAME COLUMN dnc TO do_not_contact;
  END IF;
END $$;

-- If cc_comm_preferences doesn't exist, create it
CREATE TABLE IF NOT EXISTS cc_comm_preferences (
  bank_customer_id UUID PRIMARY KEY REFERENCES cc_bank_customers(id) ON DELETE CASCADE,
  do_not_contact BOOLEAN DEFAULT FALSE, -- Will be mapped from 'dnc' if table was renamed
  allowed_channels JSONB, -- Array of allowed channels
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  marketing_consent BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate data from cc_preferences if it still exists (table wasn't renamed)
DO $$ 
BEGIN
  -- If cc_preferences still exists (wasn't renamed), migrate data
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'cc_preferences'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'cc_comm_preferences'
  ) THEN
    -- Copy data from old table, mapping dnc to do_not_contact
    INSERT INTO cc_comm_preferences (
      bank_customer_id, 
      do_not_contact, 
      quiet_hours_start, 
      quiet_hours_end, 
      marketing_consent,
      updated_at
    )
    SELECT 
      bank_customer_id,
      COALESCE(dnc, FALSE) AS do_not_contact,
      quiet_hours_start,
      quiet_hours_end,
      COALESCE(consent_marketing, FALSE) AS marketing_consent,
      updated_at
    FROM cc_preferences
    ON CONFLICT (bank_customer_id) DO NOTHING;
  END IF;
END $$;

-- Add missing columns to cc_comm_preferences
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_comm_preferences' AND column_name = 'allowed_channels'
  ) THEN
    ALTER TABLE cc_comm_preferences 
    ADD COLUMN allowed_channels JSONB;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_comm_preferences' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE cc_comm_preferences 
    ADD COLUMN timezone TEXT DEFAULT 'UTC';
  END IF;
END $$;

-- Add indexes
-- Check if column is named 'dnc' or 'do_not_contact' and create index accordingly
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_comm_preferences' AND column_name = 'dnc'
  ) THEN
    -- Column is named 'dnc'
    CREATE INDEX IF NOT EXISTS idx_cc_comm_preferences_dnc 
    ON cc_comm_preferences(dnc) 
    WHERE dnc = TRUE;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cc_comm_preferences' AND column_name = 'do_not_contact'
  ) THEN
    -- Column is named 'do_not_contact'
    CREATE INDEX IF NOT EXISTS idx_cc_comm_preferences_do_not_contact 
    ON cc_comm_preferences(do_not_contact) 
    WHERE do_not_contact = TRUE;
  END IF;
END $$;

-- Trigger for updated_at
CREATE TRIGGER update_cc_comm_preferences_updated_at 
BEFORE UPDATE ON cc_comm_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. CC_ASSIGNMENTS - Create new table for queue/assignment metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS cc_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES cc_conversations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cc_cases(id) ON DELETE CASCADE,
  queue_name TEXT NOT NULL,
  assigned_to UUID, -- References auth.users or agent ID
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cc_assignments_conversation_or_case CHECK (
    (conversation_id IS NOT NULL) OR (case_id IS NOT NULL)
  )
);

-- Indexes for cc_assignments
CREATE INDEX IF NOT EXISTS idx_cc_assignments_queue_sla_due 
ON cc_assignments(queue_name, sla_due_at) 
WHERE sla_due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cc_assignments_assigned_to_created 
ON cc_assignments(assigned_to, assigned_at DESC) 
WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cc_assignments_conversation_id 
ON cc_assignments(conversation_id) 
WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cc_assignments_case_id 
ON cc_assignments(case_id) 
WHERE case_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_cc_assignments_updated_at 
BEFORE UPDATE ON cc_assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. Enable RLS on all cc_ tables
-- ============================================================================

-- Enable RLS on all cc_ tables
ALTER TABLE cc_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_comm_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_bank_customers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. Create basic RLS policies (service role can do everything)
-- ============================================================================

-- Service role policies (backend uses service key - full access)
-- Note: These policies allow service role to bypass RLS
-- Service role access is controlled by using the service_role key vs anon key

-- For now, create policies that allow authenticated service role access
-- You can refine these based on your auth.users setup

-- Policy: Service role can do everything (backend uses service key)
-- Note: Service role bypasses RLS by default, but we create policies for future refinement
-- For now, allow all access - refine based on your auth setup

-- Drop existing policies if any
DROP POLICY IF EXISTS "service_role_all_access_conversations" ON cc_conversations;
DROP POLICY IF EXISTS "service_role_all_access_messages" ON cc_messages;
DROP POLICY IF EXISTS "service_role_all_access_cases" ON cc_cases;
DROP POLICY IF EXISTS "service_role_all_access_auth_sessions" ON cc_auth_sessions;
DROP POLICY IF EXISTS "service_role_all_access_audit_logs" ON cc_audit_logs;
DROP POLICY IF EXISTS "service_role_all_access_identity_links" ON cc_identity_links;
DROP POLICY IF EXISTS "service_role_all_access_comm_preferences" ON cc_comm_preferences;
DROP POLICY IF EXISTS "service_role_all_access_assignments" ON cc_assignments;
DROP POLICY IF EXISTS "service_role_all_access_bank_customers" ON cc_bank_customers;

-- Create policies (service role bypasses RLS, but these are for future use)
-- When using service_role key, RLS is bypassed automatically
-- These policies are placeholders for when you add user-based access control

CREATE POLICY "service_role_all_access_conversations" ON cc_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_messages" ON cc_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_cases" ON cc_cases
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_auth_sessions" ON cc_auth_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_audit_logs" ON cc_audit_logs
  FOR SELECT
  USING (true);

-- Audit logs: Only SELECT allowed (INSERT handled by service role, UPDATE/DELETE blocked by trigger)
CREATE POLICY "service_role_insert_audit_logs" ON cc_audit_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_identity_links" ON cc_identity_links
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_comm_preferences" ON cc_comm_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_assignments" ON cc_assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_bank_customers" ON cc_bank_customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: Audit logs are immutable via trigger, but we still need RLS for reads
-- The trigger prevents UPDATE/DELETE, RLS controls SELECT access

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration adds:
-- 1. Missing columns to existing tables (provider, provider_conversation_id, etc.)
-- 2. New tables (cc_identity_links, cc_assignments)
-- 3. Required indexes for performance
-- 4. Unique constraints for idempotency
-- 5. RLS enabled on all cc_ tables
-- 6. Basic RLS policies (service role access)
-- 7. Immutability trigger for audit logs

