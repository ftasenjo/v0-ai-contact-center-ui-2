/**
 * Identity Resolution and Linking Strategy
 * Step 3: Normalize identifiers, resolve identities, and link to bank customers
 */

import { supabaseServer } from './supabase-server';

// Import writeAuditLog - will be called dynamically to avoid circular dependency
async function writeAuditLog(event: {
  conversationId?: string;
  caseId?: string;
  bankCustomerId?: string;
  actorType: 'system' | 'agent' | 'customer';
  actorId?: string;
  eventType: string;
  eventVersion?: number;
  inputRedacted?: any;
  outputRedacted?: any;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
}): Promise<void> {
  const { writeAuditLog: writeLog } = await import('./banking-store');
  return writeLog(event);
}

/**
 * Normalize address based on channel
 * Must be consistent everywhere (DoD requirement)
 */
export function normalizeAddress(channel: 'whatsapp' | 'email' | 'voice' | 'sms', raw: string): string {
  if (!raw) return '';

  switch (channel) {
    case 'whatsapp':
      // WhatsApp: whatsapp:+E164 (Twilio From already looks like this)
      // Ensure it starts with whatsapp: prefix
      if (raw.startsWith('whatsapp:')) {
        return raw;
      }
      // If it's just a number, add whatsapp: prefix
      if (raw.startsWith('+')) {
        return `whatsapp:${raw}`;
      }
      return `whatsapp:+${raw.replace(/\D/g, '')}`;

    case 'voice':
    case 'sms':
      // Voice/SMS: +E164 (just the phone number)
      // Remove whatsapp: prefix if present
      const cleaned = raw.replace(/^whatsapp:/, '');
      // Ensure it starts with +
      if (cleaned.startsWith('+')) {
        return cleaned;
      }
      return `+${cleaned.replace(/\D/g, '')}`;

    case 'email':
      // Email: lowercase + trim
      return raw.trim().toLowerCase();

    default:
      return raw.trim();
  }
}

/**
 * Identity resolution result types
 */
export type IdentityResolutionResult =
  | {
      status: 'resolved_verified';
      bankCustomerId: string;
      confidence: number;
      identityLinkId: string;
    }
  | {
      status: 'resolved_unverified';
      bankCustomerId: string | null;
      confidence: number;
      identityLinkId: string | null;
      reason: 'low_confidence' | 'not_verified' | 'no_customer';
    }
  | {
      status: 'unresolved';
      bankCustomerId: null;
      confidence: 0;
      identityLinkId: string | null;
    }
  | {
      status: 'ambiguous';
      candidates: Array<{
        bankCustomerId: string;
        confidence: number;
        matchReason: string;
      }>;
      identityLinkId: string | null;
    };

/**
 * Resolve identity from channel and address
 * Core identity resolution function (Step 3B)
 */
export async function resolveIdentity(params: {
  channel: 'whatsapp' | 'email' | 'voice' | 'sms';
  fromAddress: string;
  conversationId?: string;
}): Promise<IdentityResolutionResult> {
  const { channel, fromAddress, conversationId } = params;

  // Normalize address (must be consistent)
  const normalizedAddress = normalizeAddress(channel, fromAddress);

  // Audit: Identity lookup started
  await writeAuditLog({
    conversationId,
    actorType: 'system',
    eventType: 'identity_lookup_started',
    eventVersion: 1,
    inputRedacted: {
      channel,
      addressPrefix: normalizedAddress.substring(0, 10) + '...', // Redact full address
    },
    success: true,
  });

  // Step 1: Look up identity link
  const { data: identityLink, error: linkError } = await supabaseServer
    .from('cc_identity_links')
    .select('*')
    .eq('channel', channel)
    .eq('address', normalizedAddress)
    .maybeSingle();

  // Update last_seen_at if link exists
  if (identityLink) {
    await supabaseServer
      .from('cc_identity_links')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', identityLink.id);
  }

  // Step 2: Check for verified identity
  if (identityLink?.is_verified && identityLink.bank_customer_id) {
    // Resolved and verified
    await writeAuditLog({
      conversationId,
      bankCustomerId: identityLink.bank_customer_id,
      actorType: 'system',
      eventType: 'identity_resolved_verified',
      eventVersion: 1,
      inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
      outputRedacted: {
        bankCustomerId: identityLink.bank_customer_id,
        confidence: identityLink.confidence,
      },
      success: true,
    });

    return {
      status: 'resolved_verified',
      bankCustomerId: identityLink.bank_customer_id,
      confidence: identityLink.confidence || 100,
      identityLinkId: identityLink.id,
    };
  }

  // Step 3: Check for unverified identity with customer
  if (identityLink?.bank_customer_id && !identityLink.is_verified) {
    // Has candidate but not verified
    await writeAuditLog({
      conversationId,
      bankCustomerId: identityLink.bank_customer_id,
      actorType: 'system',
      eventType: 'identity_resolved_unverified',
      eventVersion: 1,
      inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
      outputRedacted: {
        bankCustomerId: identityLink.bank_customer_id,
        confidence: identityLink.confidence,
        reason: identityLink.confidence && identityLink.confidence < 80 ? 'low_confidence' : 'not_verified',
      },
      success: true,
    });

    return {
      status: 'resolved_unverified',
      bankCustomerId: identityLink.bank_customer_id,
      confidence: identityLink.confidence || 50,
      identityLinkId: identityLink.id,
      reason: (identityLink.confidence || 0) < 80 ? 'low_confidence' : 'not_verified',
    };
  }

  // Step 4: Check for ambiguous cases (multiple candidates)
  const candidates = await lookupBankCustomerCandidates({ channel, address: normalizedAddress });
  
  if (candidates.length > 1) {
    // Multiple candidates - ambiguous
    await writeAuditLog({
      conversationId,
      actorType: 'system',
      eventType: 'identity_ambiguous',
      eventVersion: 1,
      inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
      outputRedacted: {
        candidateCount: candidates.length,
        candidates: candidates.map(c => ({
          bankCustomerId: c.bank_customer_id,
          confidence: c.confidence,
        })),
      },
      success: false,
      errorCode: 'AMBIGUOUS_IDENTITY',
      errorMessage: `Multiple candidates found for ${channel}:${normalizedAddress.substring(0, 10)}...`,
    });

    return {
      status: 'ambiguous',
      candidates: candidates.map(c => ({
        bankCustomerId: c.bank_customer_id,
        confidence: c.confidence,
        matchReason: c.match_reason,
      })),
      identityLinkId: identityLink?.id || null,
    };
  }

  // Step 5: Single candidate but not linked yet
  if (candidates.length === 1) {
    const candidate = candidates[0];
    
    // Create or update identity link with candidate
    if (identityLink) {
      // Update existing link with candidate
      await supabaseServer
        .from('cc_identity_links')
        .update({
          bank_customer_id: candidate.bank_customer_id,
          confidence: candidate.confidence,
          is_verified: false, // Not verified yet
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', identityLink.id);
    } else {
      // Create new link with candidate
      const { data: newLink } = await supabaseServer
        .from('cc_identity_links')
        .insert({
          channel,
          address: normalizedAddress,
          bank_customer_id: candidate.bank_customer_id,
          confidence: candidate.confidence,
          is_verified: false,
          last_seen_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (newLink) {
        await writeAuditLog({
          conversationId,
          bankCustomerId: candidate.bank_customer_id,
          actorType: 'system',
          eventType: 'identity_link_updated',
          eventVersion: 1,
          inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
          outputRedacted: {
            bankCustomerId: candidate.bank_customer_id,
            confidence: candidate.confidence,
            verified: false,
          },
          success: true,
        });
      }
    }

    return {
      status: 'resolved_unverified',
      bankCustomerId: candidate.bank_customer_id,
      confidence: candidate.confidence,
      identityLinkId: identityLink?.id || null,
      reason: 'no_customer',
    };
  }

  // Step 6: Unresolved (no candidates)
  await writeAuditLog({
    conversationId,
    actorType: 'system',
    eventType: 'identity_unresolved',
    eventVersion: 1,
    inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
    success: true,
  });

  return {
    status: 'unresolved',
    bankCustomerId: null,
    confidence: 0,
    identityLinkId: identityLink?.id || null,
  };
}

/**
 * Lookup bank customer candidates (read-only tool)
 * Step 3E: Minimal bank customer lookup interface
 */
export async function lookupBankCustomerCandidates(params: {
  channel: 'whatsapp' | 'email' | 'voice' | 'sms';
  address: string;
}): Promise<Array<{
  bank_customer_id: string;
  confidence: number;
  match_reason: string;
}>> {
  const { channel, address } = params;
  const normalizedAddress = normalizeAddress(channel, address);

  // Remove channel prefix for lookup
  const lookupValue = normalizedAddress
    .replace(/^whatsapp:/, '')
    .replace(/^\+/, '');

  const candidates: Array<{
    bank_customer_id: string;
    confidence: number;
    match_reason: string;
  }> = [];

  // Query bank customers by phone or email
  if (channel === 'whatsapp' || channel === 'voice' || channel === 'sms') {
    // Phone lookup
    const { data: phoneMatches } = await supabaseServer
      .from('cc_bank_customers')
      .select('id, phone')
      .or(`phone.eq.${normalizedAddress.replace(/^whatsapp:/, '')},phone.eq.${lookupValue}`);

    if (phoneMatches) {
      for (const customer of phoneMatches) {
        // Calculate confidence based on exact match
        const confidence = customer.phone === normalizedAddress.replace(/^whatsapp:/, '') ? 100 : 90;
        candidates.push({
          bank_customer_id: customer.id,
          confidence,
          match_reason: `phone_match_${channel}`,
        });
      }
    }
  }

  if (channel === 'email') {
    // Email lookup
    const { data: emailMatches } = await supabaseServer
      .from('cc_bank_customers')
      .select('id, email')
      .eq('email', normalizedAddress);

    if (emailMatches) {
      for (const customer of emailMatches) {
        candidates.push({
          bank_customer_id: customer.id,
          confidence: 100, // Exact email match
          match_reason: 'email_match',
        });
      }
    }
  }

  // If you have a mapping table in banking DB, query it here
  // For now, we rely on direct phone/email lookup

  return candidates;
}

/**
 * Ensure identity link exists (create if not exists)
 * Step 3D: Create identity links on inbound message
 * Uses upsert with (channel, address) unique key
 */
export async function ensureIdentityLink(params: {
  channel: 'whatsapp' | 'email' | 'voice' | 'sms';
  address: string;
  conversationId?: string;
}): Promise<string | null> {
  const { channel, address, conversationId } = params;
  const normalizedAddress = normalizeAddress(channel, address);

  try {
    // First, check if link exists
    const { data: existing } = await supabaseServer
      .from('cc_identity_links')
      .select('id, bank_customer_id, is_verified, confidence')
      .eq('channel', channel)
      .eq('address', normalizedAddress)
      .maybeSingle();

    if (existing) {
      // Update existing link - always update last_seen_at, preserve other fields
      const { data: updatedLink, error: updateError } = await supabaseServer
        .from('cc_identity_links')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateError) {
        throw updateError;
      }

      // Audit: Success
      await writeAuditLog({
        conversationId,
        actorType: 'system',
        eventType: 'identity_link_upserted',
        eventVersion: 1,
        inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
        outputRedacted: { identityLinkId: updatedLink?.id || existing.id },
        success: true,
      });

      return updatedLink?.id || existing.id;
    }

    // Create new link (no bank_customer_id yet, not verified)
    const { data: newLink, error: insertError } = await supabaseServer
      .from('cc_identity_links')
      .insert({
        channel,
        address: normalizedAddress,
        is_verified: false,
        confidence: 0,
        last_seen_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      // Check if it's a unique constraint violation (race condition)
      if (insertError.code === '23505') {
        // Another request created it - fetch it
        const { data: raceLink } = await supabaseServer
          .from('cc_identity_links')
          .select('id')
          .eq('channel', channel)
          .eq('address', normalizedAddress)
          .maybeSingle();

        if (raceLink) {
          // Update last_seen_at
          await supabaseServer
            .from('cc_identity_links')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', raceLink.id);

          // Audit: Success after race condition
          await writeAuditLog({
            conversationId,
            actorType: 'system',
            eventType: 'identity_link_upserted',
            eventVersion: 1,
            inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
            outputRedacted: { identityLinkId: raceLink.id },
            success: true,
          });

          return raceLink.id;
        }
      }

      throw insertError;
    }

    // Audit: Success (new link created)
    await writeAuditLog({
      conversationId,
      actorType: 'system',
      eventType: 'identity_link_upserted',
      eventVersion: 1,
      inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
      outputRedacted: { identityLinkId: newLink?.id },
      success: true,
    });

    return newLink?.id || null;
  } catch (error: any) {
    // Audit: Failure
    await writeAuditLog({
      conversationId,
      actorType: 'system',
      eventType: 'identity_link_upsert_failed',
      eventVersion: 1,
      inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
      success: false,
      errorCode: 'IDENTITY_LINK_UPSERT_FAILED',
      errorMessage: error?.message || 'Unknown error upserting identity link',
    });

    console.error('Error in ensureIdentityLink:', error);
    return null;
  }
}

/**
 * Verify identity link (only after successful auth)
 * Step 3D: Only set is_verified=true when OTP/KBA verifies
 */
export async function verifyIdentityLink(params: {
  identityLinkId: string;
  bankCustomerId: string;
  authSessionId: string;
}): Promise<void> {
  const { identityLinkId, bankCustomerId, authSessionId } = params;

  // Update identity link to verified
  await supabaseServer
    .from('cc_identity_links')
    .update({
      bank_customer_id: bankCustomerId,
      is_verified: true,
      confidence: 100, // Verified = 100% confidence
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', identityLinkId);

  // Audit: Identity link verified
  await writeAuditLog({
    bankCustomerId,
    actorType: 'system',
    eventType: 'identity_link_verified',
    eventVersion: 1,
    inputRedacted: { identityLinkId, authSessionId },
    outputRedacted: {
      bankCustomerId,
      verified: true,
      confidence: 100,
    },
    success: true,
  });
}

