# WhatsApp Address Normalization Fix

## Problem
- `cc_messages.from_address` was always NULL
- `cc_identity_links` remained empty because identity resolution couldn't match addresses
- Identity resolution never ran meaningfully

## Root Cause
The Twilio `From` field was being parsed but not normalized before storing in `cc_messages.from_address`. The address was also not being passed correctly to the identity link upsert.

## Solution
1. Parse `From` and `To` from Twilio form payload
2. Normalize using `normalizeAddress("whatsapp", From)` and `normalizeAddress("whatsapp", To)`
3. Persist normalized addresses into `cc_messages.from_address` and `cc_messages.to_address` on every inbound message
4. Use the same normalized addresses for identity link upsert

## Files Modified

### 1. `app/api/twilio/whatsapp/incoming/route.ts`

**Changes:**
- Import `normalizeAddress` from identity-resolution
- Normalize `From` and `To` addresses immediately after parsing
- Pass normalized addresses to `createBankingConversationFromMessage`

**Exact Diff:**

```typescript
// BEFORE:
const normalizedFrom = from.replace('whatsapp:', '');
const normalizedTo = to.replace('whatsapp:', '');
// ...
fromAddress: from, // Keep full whatsapp: prefix for from_address
toAddress: to, // Keep full whatsapp: prefix for to_address

// AFTER:
const { resolveIdentity, normalizeAddress } = await import('@/lib/identity-resolution');

// CRITICAL: Normalize addresses using the same function used everywhere
const normalizedFromAddress = normalizeAddress('whatsapp', from);
const normalizedToAddress = normalizeAddress('whatsapp', to);

console.log('📝 Address normalization:', {
  rawFrom: from,
  normalizedFrom: normalizedFromAddress,
  rawTo: to,
  normalizedTo: normalizedToAddress,
});

// Use normalized addresses for customer lookup (remove whatsapp: prefix)
const normalizedFrom = normalizedFromAddress.replace('whatsapp:', '');
const normalizedTo = normalizedToAddress.replace('whatsapp:', '');

// ...
fromAddress: normalizedFromAddress, // Normalized with whatsapp: prefix for from_address column
toAddress: normalizedToAddress, // Normalized with whatsapp: prefix for to_address column
```

### 2. `lib/banking-store.ts`

**Changes:**
- Use normalized `fromAddress` and `toAddress` from message parameter
- Store normalized addresses in `cc_messages.from_address` and `cc_messages.to_address`
- Use same normalized address for identity link upsert

**Exact Diff:**

```typescript
// BEFORE (Step 4):
const fromAddress = message.fromAddress || message.from;
const toAddress = message.toAddress || message.to;
// ...
from_address: fromAddress,
to_address: toAddress,

// AFTER (Step 4):
// CRITICAL: Use normalized addresses for from_address and to_address columns
const normalizedFromForMessage = message.fromAddress 
  ? message.fromAddress // Already normalized by caller (e.g., whatsapp:+1234567890)
  : normalizeAddress(message.channel, message.from); // Fallback: normalize if not provided

const normalizedToForMessage = message.toAddress
  ? message.toAddress // Already normalized by caller (e.g., whatsapp:+1234567890)
  : normalizeAddress(message.channel, message.to); // Fallback: normalize if not provided

console.log('💾 Storing message with normalized addresses:', {
  from_address: normalizedFromForMessage,
  to_address: normalizedToForMessage,
  messageSid: message.messageSid,
});

// ...
from_address: normalizedFromForMessage, // Normalized address (e.g., whatsapp:+1234567890)
to_address: normalizedToForMessage, // Normalized address (e.g., whatsapp:+1234567890)
```

**Identity Link Section (already correct, but added logging):**

```typescript
// Normalize address for identity link
const fromAddressForIdentity = message.fromAddress || message.from;
const normalizedAddress = message.fromAddress 
  ? message.fromAddress // Already normalized by caller (e.g., whatsapp:+1234567890)
  : normalizeAddress(message.channel, fromAddressForIdentity); // Normalize if not provided

console.log('🔗 Identity link normalization:', {
  rawFrom: message.from,
  fromAddress: message.fromAddress,
  normalizedAddress,
  channel: message.channel,
});
```

## Flow

1. **Webhook receives message** → Parses `From` and `To` from form data
2. **Normalizes addresses** → `normalizeAddress('whatsapp', from)` and `normalizeAddress('whatsapp', to)`
3. **Calls `createBankingConversationFromMessage()`** with normalized addresses
4. **Identity link upsert** → Uses normalized `fromAddress` for identity link
5. **Message storage** → Stores normalized addresses in `cc_messages.from_address` and `cc_messages.to_address`

## Verification

After sending 1 WhatsApp message:

```sql
-- Check that from_address and to_address are populated
SELECT 
  id,
  provider_message_id,
  from_address,
  to_address,
  channel,
  created_at
FROM cc_messages
WHERE channel = 'whatsapp'
ORDER BY created_at DESC
LIMIT 5;

-- Should show:
-- from_address: whatsapp:+1234567890 (normalized)
-- to_address: whatsapp:+14155238886 (normalized)

-- Check identity links
SELECT COUNT(*) FROM cc_identity_links;
-- Should be > 0

SELECT 
  channel,
  address,
  last_seen_at
FROM cc_identity_links
ORDER BY last_seen_at DESC;
-- Should show normalized addresses (e.g., whatsapp:+1234567890)
```

## Expected Results

- ✅ `cc_messages.from_address` is populated with normalized address (e.g., `whatsapp:+1234567890`)
- ✅ `cc_messages.to_address` is populated with normalized address (e.g., `whatsapp:+14155238886`)
- ✅ `cc_identity_links` has rows with normalized addresses
- ✅ Identity resolution can match addresses correctly
- ✅ Audit logs show identity link events

