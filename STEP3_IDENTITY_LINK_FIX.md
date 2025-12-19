# Step 3 Identity Link Fix - Moved to Message Persistence Path

## Problem
- `cc_messages` has rows and audit logs are writing
- `cc_identity_links` is always empty
- No identity audit events

## Root Cause
Identity link upsert was only called in the webhook route, but it wasn't guaranteed to run before early returns for duplicate messages.

## Solution
Moved identity link upsert into the message persistence path (`lib/banking-store.ts` → `createBankingConversationFromMessage`) so it runs **before any return**, even for duplicates.

## Changes Made

### 1. `lib/banking-store.ts` (MODIFIED)

**Added at the very beginning of `createBankingConversationFromMessage()`:**

```typescript
// CRITICAL: Upsert identity link BEFORE any return (even for duplicates)
const provider = message.provider || 'twilio';
const fromAddress = message.fromAddress || message.from;
const normalizedAddress = normalizeAddress(message.channel, fromAddress);

// Upsert identity link - must run before any return
try {
  // Check if link exists
  const { data: existingLink } = await supabase
    .from('cc_identity_links')
    .select('id')
    .eq('channel', message.channel)
    .eq('address', normalizedAddress)
    .maybeSingle();

  if (existingLink) {
    // Update existing link - always update last_seen_at
    await supabase
      .from('cc_identity_links')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existingLink.id);
    
    // Audit: Success
    await writeAuditLog({
      actorType: 'system',
      eventType: 'identity_link_upserted',
      eventVersion: 1,
      inputRedacted: { channel: message.channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
      outputRedacted: { identityLinkId: existingLink.id },
      success: true,
    });
  } else {
    // Create new link
    const { data: newLink, error: insertError } = await supabase
      .from('cc_identity_links')
      .insert({
        channel: message.channel,
        address: normalizedAddress,
        is_verified: false,
        confidence: 0,
        last_seen_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle race condition (unique constraint violation)
      if (insertError.code === '23505') {
        // Another request created it - fetch and update
        const { data: raceLink } = await supabase
          .from('cc_identity_links')
          .select('id')
          .eq('channel', message.channel)
          .eq('address', normalizedAddress)
          .maybeSingle();

        if (raceLink) {
          await supabase
            .from('cc_identity_links')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', raceLink.id);

          await writeAuditLog({
            actorType: 'system',
            eventType: 'identity_link_upserted',
            eventVersion: 1,
            inputRedacted: { channel: message.channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
            outputRedacted: { identityLinkId: raceLink.id },
            success: true,
          });
        }
      } else {
        // Other error - log failure
        await writeAuditLog({
          actorType: 'system',
          eventType: 'identity_link_upsert_failed',
          eventVersion: 1,
          inputRedacted: { channel: message.channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
          success: false,
          errorCode: 'IDENTITY_LINK_UPSERT_FAILED',
          errorMessage: insertError.message || 'Failed to insert identity link',
        });
        console.error('Error creating identity link:', insertError);
      }
    } else if (newLink) {
      // Audit: Success (new link created)
      await writeAuditLog({
        actorType: 'system',
        eventType: 'identity_link_upserted',
        eventVersion: 1,
        inputRedacted: { channel: message.channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
        outputRedacted: { identityLinkId: newLink.id },
        success: true,
      });
    }
  }
} catch (identityError: any) {
  // Audit: Failure
  await writeAuditLog({
    actorType: 'system',
    eventType: 'identity_link_upsert_failed',
    eventVersion: 1,
    inputRedacted: { channel: message.channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
    success: false,
    errorCode: 'IDENTITY_LINK_UPSERT_FAILED',
    errorMessage: identityError?.message || 'Unknown error upserting identity link',
  });
  console.error('Error in identity link upsert:', identityError);
  // Continue processing even if identity link fails
}
```

**Key Points:**
- ✅ Runs **before** duplicate message check
- ✅ Runs **before** any return statement
- ✅ Uses same `supabaseServer` client as message inserts
- ✅ Always updates `last_seen_at` on existing links
- ✅ Handles race conditions (unique constraint violations)
- ✅ Audit events: `identity_link_upserted` (success) and `identity_link_upsert_failed` (failure)
- ✅ Continues processing even if identity link fails (non-blocking)

### 2. `app/api/twilio/whatsapp/incoming/route.ts` (MODIFIED)

**Removed duplicate identity link call** (now handled in message persistence):

```typescript
// OLD: Called separately
const { ensureIdentityLink, resolveIdentity } = await import('@/lib/identity-resolution');
const identityLinkId = await ensureIdentityLink({...});

// NEW: Identity link handled in createBankingConversationFromMessage
const { createBankingConversationFromMessage } = await import('@/lib/banking-store');
const { resolveIdentity } = await import('@/lib/identity-resolution');
```

## Execution Flow

1. **Webhook receives message** → Parses `From` address
2. **Calls `createBankingConversationFromMessage()`**
3. **Identity link upsert runs FIRST** (before any checks)
   - Normalizes address
   - Upserts `cc_identity_links` with `(channel, address)` unique key
   - Updates `last_seen_at = now()`
   - Logs audit event
4. **Then checks for duplicate message** (if duplicate, returns but identity link already created ✅)
5. **Then creates customer/conversation/message** (if any step fails, identity link already created ✅)

## Verification

After sending 1 WhatsApp message:
```sql
SELECT COUNT(*) FROM cc_identity_links;
-- Should be > 0

SELECT * FROM cc_audit_logs 
WHERE event_type IN ('identity_link_upserted', 'identity_link_upsert_failed')
ORDER BY created_at DESC;
-- Should show identity link events
```

## Benefits

1. **Unavoidable**: Identity link upsert runs for every message, even duplicates
2. **Consistent**: Uses same Supabase server client as message inserts
3. **Auditable**: All operations logged in `cc_audit_logs`
4. **Non-blocking**: Identity link failures don't prevent message storage
5. **Race-condition safe**: Handles concurrent requests gracefully

