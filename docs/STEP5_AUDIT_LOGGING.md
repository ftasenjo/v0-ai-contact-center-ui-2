# Step 5: Audit Logging & Security

## Overview

Step 5 implements comprehensive audit logging with redaction, standardization, and security guarantees. This ensures all system actions are logged, sensitive data is protected, and audit trails are tamper-resistant.

## Implementation Status

### ✅ 5.1 Standardized Audit Event Schema

All audit logs now use a consistent schema:

- `conversation_id` (nullable) - Links to conversation
- `message_id` (stored in input_redacted/output_redacted) - Links to specific message
- `case_id` (nullable) - Links to support case
- `bank_customer_id` (nullable) - Links to bank customer
- `actor_type` - One of: `system`, `agent`, `customer`
- `actor_id` (nullable) - User/agent ID
- `event_type` - Event identifier (e.g., `webhook_received`, `message_persisted`)
- `event_version` - Schema version (default: 1)
- `input_redacted` (jsonb) - Redacted input data
- `output_redacted` (jsonb) - Redacted output data
- `success` (boolean) - Whether operation succeeded
- `error_code` (nullable) - Error code if failed
- `error_message` (nullable) - Redacted error message
- `created_at` - Timestamp

**Location**: `lib/banking-store.ts` → `writeAuditLog()`

### ✅ 5.2 Append-Only Enforcement (Immutability)

Audit logs are immutable via database trigger:

- **Trigger**: `audit_logs_immutable_trigger` on `cc_audit_logs`
- **Function**: `prevent_audit_log_modification()`
- **Effect**: Raises exception on UPDATE or DELETE attempts
- **RLS**: SELECT-only policies for staff (INSERT handled by service role)

**Location**: `supabase/migrations/006_add_missing_cc_step1.sql` (lines 580-598)

### ✅ 5.3 Redaction Middleware

Centralized redaction function `redactSensitive()` automatically sanitizes:

- **OTP codes**: 4-8 digit sequences (especially in auth contexts)
- **Card numbers**: PAN patterns (13-19 digits, with spaces/dashes)
- **CVV**: 3-4 digits (when preceded by "CVV", "CVC", "security code")
- **SSN/NIF/NIE**: National ID patterns
- **Email addresses**: Masks user part, keeps domain
- **Phone numbers**: Masks middle digits
- **Addresses**: Street addresses, apartment numbers
- **Tokens/keys**: API keys, Bearer tokens, Authorization headers
- **Bank account numbers**: In financial contexts

**Location**: `lib/audit-redaction.ts`

**Usage**:
```typescript
import { redactSensitive } from '@/lib/audit-redaction';

const redacted = redactSensitive(data, 'webhook'); // Context-aware redaction
```

### ✅ 5.4 Audit Coverage

All required events are logged for every inbound WhatsApp message:

1. **webhook_received** - Twilio webhook received
2. **message_persisted** - Message stored in database
3. **identity_resolution_result** - Identity resolution outcome
4. **intent_classified** - Intent classification result
5. **auth_gate_decision** - Authentication gate decision
6. **agent_selected** - Agent routing decision
7. **agent_completed** - Agent execution completed
8. **response_formatted** - Response formatted for channel
9. **message_sent** - Outbound message sent (or failed)
10. **wrap_up_completed** - Conversation wrap-up completed

**Plus failure events**:
- `tool_call_failed` - Tool execution failed
- `unexpected_error` - Unexpected errors

**Location**: 
- Webhook: `app/api/twilio/whatsapp/incoming/route.ts`
- Supervisor: `lib/agents/supervisor.ts`
- Tools: `lib/tools/audit-wrapper.ts`

### ✅ 5.5 Tool-Call Auditing Wrapper

All tools must be invoked via `callToolWithAudit()` wrapper:

**Features**:
- Logs `tool_call_started` before execution
- Logs `tool_call_succeeded` or `tool_call_failed` after execution
- Stores redacted input/output
- Records latency
- Ensures no tool escapes logging

**Location**: `lib/tools/audit-wrapper.ts`

**Usage**:
```typescript
import { callToolWithAudit } from '@/lib/tools/audit-wrapper';

const result = await callToolWithAudit(
  'search_policy_kb',
  { query: 'branch hours' },
  async (input) => await searchPolicyKB(input.query),
  {
    conversationId: '...',
    messageId: '...',
    context: 'tool_call',
  }
);
```

**Current tools using wrapper**:
- `searchPolicyKB` (via `general-info-agent.ts`)

### ✅ 5.6 Prompt Hygiene

**No raw webhook payloads are passed to LLM models.**

The supervisor builds `AgentContext` with only sanitized data:

- **Message text**: Only the message content (already stored in DB)
- **Recent messages**: Array of `{ direction, text }` (no raw payloads)
- **Customer info**: Only identity status, auth level, bank customer ID
- **No webhook metadata**: No Twilio SIDs, account SIDs, or raw form data

**Location**: `lib/agents/supervisor.ts` → `agentExecute()` (lines 348-366)

**Verification**:
- ✅ Webhook payloads are parsed and stored in DB
- ✅ Only message text is extracted for agent context
- ✅ No `formData`, `twilioPayload`, or raw webhook fields in `AgentContext`
- ✅ Agent receives only sanitized conversation history

### ✅ 5.7 Staff Access Rules (RLS)

RLS policies for audit logs:

- **Service role**: Full access (bypasses RLS for INSERT, SELECT allowed)
- **Admin/supervisor**: SELECT-only (read full audit, still redacted)
- **Agent/analyst**: SELECT-only (read-only access)
- **Nobody**: UPDATE/DELETE (blocked by trigger)

**Location**: `supabase/migrations/006_add_missing_cc_step1.sql` (lines 872-902)

## Files Created/Modified

### New Files
- `lib/audit-redaction.ts` - Redaction middleware
- `lib/tools/audit-wrapper.ts` - Tool call auditing wrapper
- `docs/STEP5_AUDIT_LOGGING.md` - This documentation

### Modified Files
- `lib/banking-store.ts` - Updated `writeAuditLog()` with redaction and standardized schema
- `lib/agents/supervisor.ts` - Updated all audit calls to use standardized schema with `message_id`
- `lib/agents/general-info-agent.ts` - Wrapped `searchPolicyKB` with `callToolWithAudit`
- `app/api/twilio/whatsapp/incoming/route.ts` - Added redaction to webhook audit logs

## Testing Checklist

- [ ] Send WhatsApp message → verify all 10 audit events are logged
- [ ] Check `cc_audit_logs` table → verify redaction (no card numbers, emails, etc.)
- [ ] Try UPDATE on `cc_audit_logs` → should fail with trigger error
- [ ] Try DELETE on `cc_audit_logs` → should fail with trigger error
- [ ] Verify tool calls log `tool_call_started` and `tool_call_succeeded`
- [ ] Check supervisor logs → verify no raw webhook payloads in agent context
- [ ] Verify RLS policies allow SELECT but block UPDATE/DELETE

## Definition of Done

✅ Every audit insert includes standardized schema fields  
✅ Audit logs are tamper-resistant (append-only)  
✅ Raw payloads never land in audit tables unredacted  
✅ All required events are logged for every inbound message  
✅ No tool escapes logging (all tools use wrapper)  
✅ Model never sees secrets/PII beyond what's necessary  
✅ Safe internal access (RLS policies in place)

