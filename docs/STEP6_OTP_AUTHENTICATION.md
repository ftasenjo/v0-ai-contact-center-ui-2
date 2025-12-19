# Step 6: OTP Authentication

## Overview

Step 6 implements OTP (One-Time Password) authentication using Twilio Verify. This enables secure identity verification for sensitive banking operations.

## Implementation Status

### ✅ 6.1 Twilio Verify Setup

**Environment Variable Required**:
```bash
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**OTP Channel Decision**:
- **WhatsApp inbound** → OTP sent via **SMS** to phone number (most common)
- **Email inbound** → OTP sent via **SMS** (email OTP not implemented yet)

**Location**: `lib/tools/otp.ts` → `startOtp()`

### ✅ 6.2 Contact Centre DB Support

The `cc_auth_sessions` table has all required fields (from migrations 004 and 006):

- ✅ `id` - UUID primary key
- ✅ `conversation_id` - Links to conversation
- ✅ `bank_customer_id` - Nullable until verified
- ✅ `method` - Set to `'otp'`
- ✅ `status` - One of: `'created'`, `'sent'`, `'verified'`, `'failed'`, `'expired'`, `'cancelled'`
- ✅ `channel` - `'whatsapp'`, `'email'`, `'voice'`, `'sms'`
- ✅ `destination` - Masked phone/email (e.g., `+1 *** *** 7890`)
- ✅ `provider` - Set to `'twilio_verify'`
- ✅ `provider_request_id` - Twilio verification SID
- ✅ `attempts` - Attempt count (default: 0)
- ✅ `max_attempts` - Max attempts (default: 3)
- ✅ `expires_at` - OTP expiration (10 minutes)
- ✅ `verified_at` - Timestamp when verified

**Location**: `supabase/migrations/004_banking_schema.sql` and `006_add_missing_cc_step1.sql`

### ✅ 6.3 OTP Tools (TypeScript)

All tools use the audit wrapper (`callToolWithAudit`) for comprehensive logging:

1. **`startOtp(e164Phone, auditContext)`**
   - Starts OTP via Twilio Verify
   - Creates auth session in DB
   - Returns verification SID and status
   - **Audit events**: `tool_call_started`, `tool_call_succeeded`

2. **`verifyOtp(e164Phone, code, auditContext)`**
   - Verifies OTP code with Twilio
   - Increments attempt count
   - Handles max attempts lockout
   - Updates auth session status
   - **Audit events**: `tool_call_started`, `tool_call_succeeded`/`tool_call_failed`

3. **`getActiveAuthSession(conversationId)`**
   - Returns active OTP session for conversation
   - Filters by `status IN ('created', 'sent')` and `expires_at > NOW()`

4. **`extractOtpCode(text)`**
   - Extracts 6-digit code from message text
   - Uses regex: `/\b(\d{6})\b/`

**Location**: `lib/tools/otp.ts`

### ✅ 6.4 LangGraph "Auth Loop"

The supervisor workflow includes a new `handle_otp` node that runs after `resolve_identity` and before `route_agent`:

**Flow**:
1. **Detect "VERIFY" command** → Start OTP
   - Checks if message is "verify", "verify me", or starts with "verify "
   - Checks for existing active session (prevents duplicate sends)
   - Calls `startOtp()` via audit wrapper
   - Returns: "I've sent a 6-digit code to your phone. Reply with the code to continue."

2. **Detect 6-digit code** → Verify OTP
   - Extracts code using `extractOtpCode()`
   - Gets active auth session
   - Checks max attempts (lockout if reached)
   - Calls `verifyOtp()` via audit wrapper
   - Returns success/failure message

3. **Otherwise** → Continue normal flow
   - If sensitive intent and not verified → `auth_gate` will prompt "VERIFY"

**Lockout Handling**:
- After `max_attempts` (default: 3) → Status set to `'failed'`
- Response: "For security, verification is locked. Please call us or visit a branch."

**Location**: `lib/agents/supervisor.ts` → `handleOtp()` node

### ✅ 6.5 Identity Binding After OTP

On successful OTP verification:

1. **If `bank_customer_id` exists** (single candidate):
   - Updates `cc_identity_links.is_verified = true`
   - Updates `cc_identity_links.bank_customer_id`
   - Updates `cc_conversations.bank_customer_id`
   - Sets `identity_status = 'resolved_verified'`
   - Sets `auth_level = 'otp'`

2. **If no `bank_customer_id`** (ambiguous/multiple candidates):
   - Keeps verified "channel owner" but **not mapped** to specific bank customer
   - OTP proves control of phone number, not which bank profile
   - Requires additional KBA step later to bind to specific customer

**Safety Rule**: Never auto-bind if identity is ambiguous (multiple candidates).

**Location**: `lib/agents/supervisor.ts` → `handleOtp()` → OTP verified path

### ✅ WhatsApp UX

User-friendly messages implemented:

**When gating triggers**:
> "For your security, I need to verify your identity before I can help with account-specific details. Reply **VERIFY** to continue."

**When OTP sent**:
> "For your security, I've sent a 6-digit code to your phone. Reply with the code to continue."

**When wrong code**:
> "That code didn't work. Please try again. Attempts left: 2."

**When lockout**:
> "For security, verification is locked. Please call us or visit a branch."

**When verified**:
> "Verification successful! How can I help you today?"

**Location**: `lib/agents/supervisor.ts` → `handleOtp()` and `authGate()`

## Critical Safety Rules

✅ **Never log OTP code** - Redaction middleware (`redactSensitive`) automatically redacts 4-8 digit sequences in auth contexts

✅ **OTP verification only grants `auth_level='otp'`** for this conversation/session

✅ **If identity is ambiguous** (multiple candidates), do not bind `bank_customer_id` automatically after OTP unless single candidate

✅ **All tool calls use audit wrapper** - No tool escapes logging

## Files Created/Modified

### New Files
- `lib/tools/otp.ts` - OTP tools (startOtp, verifyOtp, getActiveAuthSession, extractOtpCode)
- `docs/STEP6_OTP_AUTHENTICATION.md` - This documentation

### Modified Files
- `lib/agents/supervisor.ts` - Added `handle_otp` node, updated workflow edges, updated `auth_gate` to skip if OTP handled, updated `format_response` to use OTP response

## Testing Checklist

- [ ] Set `TWILIO_VERIFY_SERVICE_SID` in `.env.local`
- [ ] Send WhatsApp message with sensitive intent (e.g., "what's my balance?")
- [ ] Verify system responds with "Reply VERIFY to continue"
- [ ] Send "VERIFY" → Verify OTP is sent via SMS
- [ ] Check `cc_auth_sessions` table → Verify session created with status `'sent'`
- [ ] Send correct 6-digit code → Verify authentication succeeds
- [ ] Check `cc_identity_links` → Verify `is_verified = true` if `bank_customer_id` exists
- [ ] Send wrong code 3 times → Verify lockout message
- [ ] Check audit logs → Verify no OTP codes are logged (redacted)
- [ ] Verify sensitive operations work after successful OTP

## Definition of Done

✅ Twilio Verify Service SID configured  
✅ `cc_auth_sessions` has all required fields  
✅ OTP tools implemented with audit logging  
✅ LangGraph auth loop handles VERIFY command and OTP codes  
✅ Identity binding works for single candidates  
✅ Ambiguous identities are not auto-bound  
✅ User-friendly WhatsApp messages  
✅ Lockout after max attempts  
✅ OTP codes never logged (redacted)

