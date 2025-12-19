# Migration 006: Add Missing CC Step 1 Checklist Items

## Overview

This migration adds all missing columns, indexes, constraints, and RLS policies required by the Step 1 Checklist while preserving existing schema.

## Changes Made

### 1. CC_CONVERSATIONS
✅ Added `provider` column (twilio/sendgrid/vapi/other)  
✅ Added `provider_conversation_id` column  
✅ Updated status constraint to include 'open' and 'pending'  
✅ Added index on (channel, provider_conversation_id)

### 2. CC_MESSAGES
✅ Added `provider` column  
✅ Renamed `provider_msg_id` → `provider_message_id` (if exists)  
✅ Added `from_address` and `to_address` columns  
✅ Renamed `text` → `body_text` (if exists)  
✅ Added `body_json` column (JSONB)  
✅ Added `status` column (received/sent/delivered/failed/read)  
✅ Added unique constraint on (provider, provider_message_id) for idempotency  
✅ Added index on (conversation_id, created_at DESC)  
✅ Added index on from_address

### 3. CC_CASES
✅ Updated type constraint to include: fraud/cards/payments/loans/disputes/complaints/general  
✅ Updated status constraint to include: new/triage/in_progress/waiting_customer/resolved/closed  
✅ Added `summary` column (keeps existing `description`)  
✅ Added `closed_at` column (keeps existing `resolved_at`)  
✅ Added index on (bank_customer_id, created_at DESC)  
✅ Added index on (status, priority)  
✅ Added index on (case_type, created_at DESC)

### 4. CC_AUTH_SESSIONS
✅ Added `channel` column  
✅ Added `destination` column (masked phone/email)  
✅ Added `provider` column (twilio_verify/sendgrid/vapi/other)  
✅ Added `provider_request_id` column  
✅ Updated status constraint to include: created/sent/verified/failed/expired/cancelled  
✅ Added `updated_at` column and trigger  
✅ Added unique index on (provider, provider_request_id)

### 5. CC_AUDIT_LOGS
✅ Added `case_id` column  
✅ Added `bank_customer_id` column  
✅ Renamed `actor` → `actor_type` (if exists)  
✅ Added `actor_id` column  
✅ Renamed `action` → `event_type` (if exists)  
✅ Added `event_version` column  
✅ Renamed `payload_redacted` → `input_redacted` (if exists)  
✅ Added `output_redacted` column  
✅ Added `success` column (boolean)  
✅ Added `error_code` and `error_message` columns  
✅ Added index on (conversation_id, created_at DESC)  
✅ Added index on case_id  
✅ Added index on bank_customer_id  
✅ **Created immutable trigger** - prevents UPDATE/DELETE

### 6. CC_IDENTITY_LINKS (NEW TABLE)
✅ Created new table for identity/address mapping  
✅ Unique constraint on (channel, address)  
✅ Indexes on bank_customer_id and address

### 7. CC_COMM_PREFERENCES
✅ Renamed `cc_preferences` → `cc_comm_preferences` (if exists)  
✅ Added `allowed_channels` column (JSONB)  
✅ Added `timezone` column  
✅ Added index on do_not_contact

### 8. CC_ASSIGNMENTS (NEW TABLE)
✅ Created new table for queue/assignment metadata  
✅ Supports both conversation_id and case_id  
✅ Indexes on queue_name/sla_due_at, assigned_to, conversation_id, case_id

### 9. RLS (Row Level Security)
✅ Enabled RLS on all cc_ tables:
- cc_conversations
- cc_messages
- cc_cases
- cc_auth_sessions
- cc_audit_logs
- cc_identity_links
- cc_comm_preferences
- cc_assignments
- cc_bank_customers

✅ Created basic policies (service role access)
- Note: Service role key bypasses RLS automatically
- Policies are placeholders for future user-based access control

### 10. Constraints & Indexes
✅ Unique constraint on cc_messages (provider, provider_message_id)  
✅ Unique constraint on cc_identity_links (channel, address)  
✅ All required performance indexes added

## Important Notes

### Immutability
- **cc_audit_logs** is now immutable via trigger
- UPDATE and DELETE operations will raise exceptions
- Only INSERT and SELECT are allowed

### RLS Behavior
- **Service role key** (used by backend) bypasses RLS automatically
- Policies created are for future refinement when adding user-based access
- Current setup allows full access via service role

### Data Migration
- Existing data is preserved
- Column renames copy data where applicable
- No data loss during migration

## Testing Checklist

After running this migration, verify:

- [ ] All columns exist in each table
- [ ] Indexes are created and functional
- [ ] Unique constraints work (test duplicate inserts)
- [ ] Audit log immutability works (try UPDATE/DELETE - should fail)
- [ ] RLS is enabled (check with `\d+ table_name` in psql)
- [ ] Service role can still access all tables
- [ ] New tables (cc_identity_links, cc_assignments) are accessible

## Rollback

If needed, you can rollback by:
1. Dropping new tables: `cc_identity_links`, `cc_assignments`
2. Dropping new columns (use `ALTER TABLE ... DROP COLUMN`)
3. Dropping new indexes
4. Disabling RLS: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`

However, **do not rollback** the audit log immutability trigger - it's a security requirement.

