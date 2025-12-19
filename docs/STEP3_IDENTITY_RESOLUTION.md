# Step 3: Identity Resolution + Linking Strategy

## ✅ Implementation Complete

This document describes the identity resolution and linking implementation that meets the Step 3 Checklist requirements.

## A) Normalize Identifiers

**Location**: `lib/identity-resolution.ts` → `normalizeAddress()`

### Implementation:
- ✅ **Single utility function**: `normalizeAddress(channel, raw)`
- ✅ **WhatsApp**: `whatsapp:+E164` (preserves Twilio format)
- ✅ **Voice/SMS**: `+E164` (phone number only)
- ✅ **Email**: `lowercase + trim`

### Usage:
```typescript
import { normalizeAddress } from '@/lib/identity-resolution';

const normalized = normalizeAddress('whatsapp', 'whatsapp:+1234567890');
// Returns: 'whatsapp:+1234567890'

const normalized = normalizeAddress('email', '  User@Example.COM  ');
// Returns: 'user@example.com'
```

### DoD: ✅
- Every message insert uses `normalizeAddress()`
- Every identity lookup uses `normalizeAddress()`
- Consistent normalization across the system

## B) Identity Resolution Function

**Location**: `lib/identity-resolution.ts` → `resolveIdentity()`

### Function Signature:
```typescript
resolveIdentity({
  channel: 'whatsapp' | 'email' | 'voice' | 'sms',
  fromAddress: string,
  conversationId?: string,
}): Promise<IdentityResolutionResult>
```

### Return Types:
1. **`resolved_verified`**: Has `bank_customer_id` and `is_verified=true`
2. **`resolved_unverified`**: Has candidate customer but not verified OR low confidence
3. **`unresolved`**: No mapping found
4. **`ambiguous`**: Multiple candidates found (force step-up auth)

### Behavior:
- ✅ Looks up `cc_identity_links` by `(channel, address)`
- ✅ Updates `cc_conversations.bank_customer_id` if verified
- ✅ Always updates `cc_identity_links.last_seen_at`
- ✅ Deterministic result (same input = same output)

### DoD: ✅
- Supervisor can call `resolveIdentity()` once per inbound message
- Gets deterministic result
- Updates conversation with `bank_customer_id` if verified

## C) Unknown-Caller Flows

### Ambiguous Handling:
- ✅ **Multiple candidates**: Returns `ambiguous` status
- ✅ **Forces step-up auth**: Does NOT pick one automatically
- ✅ **Audit logging**: Logs `identity_ambiguous` event

### Implementation:
```typescript
if (candidates.length > 1) {
  return {
    status: 'ambiguous',
    candidates: [...],
    identityLinkId: ...,
  };
}
```

### DoD: ✅
- No guessing when multiple candidates exist
- Ambiguous cases logged and require auth

## D) Link Creation & Verification Rules

### Link Creation:
- ✅ **On inbound message**: `ensureIdentityLink()` creates `cc_identity_links` row
- ✅ **Even if no customer**: Link exists with `bank_customer_id = null`
- ✅ **Never auto-verified**: `is_verified=false` by default

### Verification Rules:
- ✅ **Only via auth**: `is_verified=true` only after successful OTP/KBA
- ✅ **Function**: `verifyIdentityLink()` sets verified status
- ✅ **Requires**: `authSessionId` and `bankCustomerId`

### DoD: ✅
- Verified status impossible without completed auth session
- Links created on every inbound message
- No auto-verification

## E) Bank Customer Lookup Interface

**Location**: `lib/identity-resolution.ts` → `lookupBankCustomerCandidates()`

### Function:
```typescript
lookupBankCustomerCandidates({
  channel: 'whatsapp' | 'email' | 'voice' | 'sms',
  address: string,
}): Promise<Array<{
  bank_customer_id: string;
  confidence: number;
  match_reason: string;
}>>
```

### Implementation:
- ✅ **Phone lookup**: Queries `cc_bank_customers` by phone
- ✅ **Email lookup**: Queries `cc_bank_customers` by email
- ✅ **Returns candidates**: Array of potential matches with confidence
- ✅ **Graceful handling**: Returns empty array if no candidates

### DoD: ✅
- System supports "no candidates found" gracefully
- Returns structured candidate list
- Can be extended with mapping table queries

## F) Supervisor Integration Points

**Location**: `lib/agents/langgraph-workflow.ts` → `processMessage()`

### Integration:
- ✅ **Early call**: `resolveIdentity()` called at start of `processMessage()`
- ✅ **Metadata passed**: Channel and fromAddress passed to workflow
- ✅ **Auth prompting**: If intent requires auth and identity not verified → prompt for OTP (Step 4/6)
- ✅ **Safe operations**: If verified → allow banking summary fetch

### Implementation:
```typescript
// Step 3F: Resolve identity early in supervisor
if (metadata?.channel && metadata?.fromAddress) {
  const identityResult = await resolveIdentity({
    channel: metadata.channel,
    fromAddress: metadata.fromAddress,
    conversationId,
  });
  
  // Use identity status to determine if auth is needed
  if (identityStatus !== 'verified') {
    // Prompt for OTP for sensitive operations
  }
}
```

## G) Audit Logging

### Events Logged:
1. ✅ **`identity_lookup_started`** - Identity resolution initiated
2. ✅ **`identity_resolved_verified`** - Identity verified and linked
3. ✅ **`identity_resolved_unverified`** - Identity found but not verified
4. ✅ **`identity_unresolved`** - No identity found
5. ✅ **`identity_ambiguous`** - Multiple candidates found
6. ✅ **`identity_link_updated`** - Identity link created/updated
7. ✅ **`identity_link_verified`** - Identity link verified via auth

### Audit Fields:
- `conversation_id` - Links to conversation
- `bank_customer_id` - Links to customer (if resolved)
- `actor_type` - `'system'` for automated events
- `event_type` - Event name
- `input_redacted` - Redacted input (address prefix only)
- `output_redacted` - Redacted output (customer ID, confidence)
- `success` - Boolean
- `error_code` / `error_message` - Error details if failed

### DoD: ✅
- Can reconstruct why customer was/wasn't linked
- All identity events logged with redacted PII

## Step 3 "Done" Definition ✅

### Test Scenario: WhatsApp Inbound Message

**Input**: `From=whatsapp:+34628764918`

**Result**:
- ✅ **`cc_identity_links` row exists** (`channel=whatsapp`, `address=whatsapp:+34628764918`)
- ✅ **`resolveIdentity()` returns** one of: `verified` / `unverified` / `unresolved` / `ambiguous`
- ✅ **If verified** → `cc_conversations.bank_customer_id` set
- ✅ **Audit logs show** identity resolution outcome

## Files Created/Modified

1. **`lib/identity-resolution.ts`** (NEW)
   - `normalizeAddress()` - Normalize identifiers
   - `resolveIdentity()` - Core identity resolution
   - `lookupBankCustomerCandidates()` - Customer lookup
   - `ensureIdentityLink()` - Create identity links
   - `verifyIdentityLink()` - Verify after auth

2. **`app/api/twilio/whatsapp/incoming/route.ts`** (MODIFIED)
   - Calls `ensureIdentityLink()` on inbound
   - Calls `resolveIdentity()` after message storage
   - Updates conversation with `bank_customer_id` if verified

3. **`lib/agents/langgraph-workflow.ts`** (MODIFIED)
   - Integrates identity resolution in `processMessage()`
   - Uses identity status for auth decisions

4. **`app/api/agents/process/route.ts`** (MODIFIED)
   - Passes channel/address metadata to workflow

5. **`lib/banking-store.ts`** (MODIFIED)
   - Exports `writeAuditLog()` for identity resolution

## Next Steps

- [ ] Step 4: Implement OTP/KBA authentication flow
- [ ] Step 5: Integrate auth verification with identity links
- [ ] Step 6: Add banking summary fetch (requires verified identity)

