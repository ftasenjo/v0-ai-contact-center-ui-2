# Step 2: WhatsApp Inbound Ingestion (Twilio) + Idempotency

## ✅ Implementation Complete

This document describes the WhatsApp inbound ingestion implementation that meets the Step 2 Checklist requirements.

## A) Twilio Webhook Endpoint

**Location**: `app/api/twilio/whatsapp/incoming/route.ts`

### Features:
- ✅ Accepts `application/x-www-form-urlencoded` (Twilio default)
- ✅ Parses body correctly using `await request.formData()`
- ✅ Returns TwiML (`text/xml`) for synchronous responses
- ✅ Returns 200 OK quickly for async processing
- ⚠️ Twilio signature validation: **Recommended for production** (can be added later)

### Response Format:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for your message!</Message>
</Response>
```

## B) Normalize + Store Inbound Message

### Conversation Thread Management:
- **Channel**: `whatsapp`
- **Provider**: `twilio`
- **Provider Conversation ID**: Uses `From` address (whatsapp:+E164) as thread key
- **Single thread per sender**: One active conversation per customer/channel

### Message Storage:
All inbound messages are stored in `cc_messages` with:
- ✅ `direction` = `'inbound'`
- ✅ `provider_message_id` = `MessageSid` (from Twilio)
- ✅ `from_address` = `From` (full whatsapp:+E164 format)
- ✅ `to_address` = `To` (full whatsapp:+E164 format)
- ✅ `body_text` = `Body` (or `'[Media message - no text]'` if empty)
- ✅ `conversation_id` = Links to `cc_conversations`
- ✅ `body_json` = Raw payload + media metadata (optional but useful)

## C) Idempotency

### Database Level:
- ✅ **Unique constraint** on `(provider, provider_message_id)` in `cc_messages` table
- ✅ Migration `006_add_missing_cc_step1.sql` adds this constraint

### Code Level:
- ✅ **Idempotent check**: Before inserting, checks if message already exists
- ✅ **Retry handling**: If insert conflicts → returns 200 without duplicating
- ✅ **Race condition handling**: Handles concurrent requests gracefully

### Implementation:
```typescript
// Check for existing message first
const existingMessage = await supabase
  .from('cc_messages')
  .select('id, conversation_id')
  .eq('provider', 'twilio')
  .eq('provider_message_id', messageSid)
  .maybeSingle();

if (existingMessage) {
  // Return existing conversation (idempotent retry)
  return { conversationId, messageId, isNewMessage: false };
}
```

## D) Trigger Orchestrator Safely

### Implementation:
- ✅ **Internal API call**: `POST /api/agents/process`
- ✅ **Idempotent**: Can be called multiple times safely
- ✅ **Passes required data**:
  - `conversationId`
  - `messageId`
  - `message` (body text)
  - `customerInfo`
  - `channel` metadata

### Orchestrator Endpoint:
**Location**: `app/api/agents/process/route.ts`

- ✅ Handles banking conversations
- ✅ Falls back to old store adapter if needed
- ✅ Idempotent processing (safe to retry)

### Error Handling:
- ✅ Orchestrator failures don't break webhook
- ✅ Fallback response sent to customer
- ✅ Errors logged in audit logs

## E) Audit Logging

### Events Logged:
1. ✅ **`inbound_webhook_received`** - Webhook received from Twilio
2. ✅ **`message_persisted`** - Message stored in database
3. ✅ **`orchestrator_triggered`** - Orchestrator processing started
4. ✅ **`orchestrator_trigger_failed`** - Orchestrator error
5. ✅ **`webhook_processing_failed`** - General processing error

### Audit Log Fields:
- `conversation_id` - Links to conversation
- `actor_type` - `'system'` for automated events
- `event_type` - Event name
- `input_redacted` - Redacted input data (no PII)
- `output_redacted` - Redacted output data
- `success` - Boolean
- `error_code` / `error_message` - Error details if failed

### Implementation:
**Location**: `lib/banking-store.ts` → `writeAuditLog()`

## F) Operational Hardening

### Edge Cases Handled:
- ✅ **Empty body**: Handles media-only messages gracefully
  - Sets `body_text` = `'[Media message - no text]'`
  - Stores media metadata in `body_json`
- ✅ **Missing fields**: Validates required fields before processing
- ✅ **Media metadata**: Stores `NumMedia`, `MediaUrl0`, `MediaContentType0`, etc.
- ✅ **Error handling**: Always returns 200 to Twilio (prevents retries)

### Media Handling:
```typescript
const mediaUrls: string[] = [];
const mediaMetadata: any[] = [];
if (parseInt(numMedia) > 0) {
  for (let i = 0; i < parseInt(numMedia); i++) {
    const mediaUrl = formData.get(`MediaUrl${i}`);
    const mediaContentType = formData.get(`MediaContentType${i}`);
    // Store in body_json
  }
}
```

## Definition of Done ✅

### Test Scenario: Send Same Webhook Twice

**Result**:
- ✅ **One `cc_messages` row** - Unique constraint prevents duplicates
- ✅ **No duplicate conversation** - Existing conversation reused
- ✅ **No duplicate message creation** - Idempotent check prevents insert
- ✅ **Orchestrator does not double-act** - Only processes new messages

### Test Scenario: New Inbound WhatsApp Message

**Result**:
- ✅ **Message appears in DB** - Stored in `cc_messages` table
- ✅ **Conversation created/found** - In `cc_conversations` table
- ✅ **Orchestrator triggered** - `POST /api/agents/process` called
- ✅ **AI response generated** - LangGraph workflow processes message
- ✅ **Response sent** - TwiML response returned to Twilio

## Files Modified

1. **`app/api/twilio/whatsapp/incoming/route.ts`**
   - Complete rewrite for Step 2 compliance
   - Idempotency, audit logging, orchestrator triggering

2. **`lib/banking-store.ts`**
   - Added `createBankingConversationFromMessage()` - idempotent version
   - Added `writeAuditLog()` - audit logging function
   - Updated to use new schema columns (`body_text`, `from_address`, etc.)

3. **`app/api/agents/process/route.ts`**
   - Updated to handle banking conversations
   - Made idempotent-safe

## Next Steps

- [ ] Add Twilio signature validation (recommended for production)
- [ ] Add rate limiting
- [ ] Add monitoring/alerting for failed orchestrator calls
- [ ] Consider async job queue for high-volume scenarios

