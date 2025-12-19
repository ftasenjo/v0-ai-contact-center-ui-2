import { supabaseServer } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/banking-store';
import { normalizeAddress } from '@/lib/identity-resolution';

export type OutboundChannel = 'whatsapp' | 'email' | 'voice' | 'sms';

export type OutboundEligibilityReasonCode =
  | 'DNC'
  | 'quiet_hours'
  | 'channel_not_allowed'
  | 'missing_consent'
  | 'unknown_party';

export interface OutboundEligibilityInput {
  bankCustomerId?: string | null;
  channel: OutboundChannel;
  destination: string; // raw or normalized
  now: Date;
  timezoneHint?: string; // optional fallback
  campaignPurpose?: 'fraud_alert' | 'kyc_update' | 'collections' | 'case_followup' | 'service_notice';
  serviceNoticeOverride?: boolean; // must be explicit to bypass quiet hours

  // Optional audit context
  outboundJobId?: string;
  campaignId?: string;
}

export interface OutboundEligibilityResult {
  eligible: boolean;
  resolvedBankCustomerId?: string | null;
  normalizedDestination: string;
  reasons: OutboundEligibilityReasonCode[];
}

function parseAllowedChannels(allowed: any): OutboundChannel[] | null {
  if (!allowed) return null;
  if (Array.isArray(allowed)) return allowed as OutboundChannel[];
  // JSONB may arrive as object/array depending on client; tolerate stringified arrays
  if (typeof allowed === 'string') {
    try {
      const parsed = JSON.parse(allowed);
      return Array.isArray(parsed) ? (parsed as OutboundChannel[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function timeToMinutes(t: string): number | null {
  // expected "HH:MM:SS" or "HH:MM"
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function getLocalMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hh * 60 + mm;
}

function isInQuietHours(params: {
  now: Date;
  timeZone: string;
  quietStart?: string | null;
  quietEnd?: string | null;
}): boolean {
  const start = params.quietStart ? timeToMinutes(params.quietStart) : null;
  const end = params.quietEnd ? timeToMinutes(params.quietEnd) : null;
  if (start == null || end == null) return false;
  if (start === end) return false;

  const current = getLocalMinutes(params.now, params.timeZone);

  // quiet window may cross midnight (e.g., 22:00 -> 08:00)
  if (start < end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

async function resolveBankCustomerId(params: {
  bankCustomerId?: string | null;
  channel: OutboundChannel;
  normalizedDestination: string;
}): Promise<{ bankCustomerId: string | null; verified: boolean }> {
  if (params.bankCustomerId) return { bankCustomerId: params.bankCustomerId, verified: true };

  const { data: link } = await supabaseServer
    .from('cc_identity_links')
    .select('bank_customer_id,is_verified')
    .eq('channel', params.channel)
    .eq('address', params.normalizedDestination)
    .maybeSingle();

  if (!link?.bank_customer_id) return { bankCustomerId: null, verified: false };
  return { bankCustomerId: link.bank_customer_id, verified: !!link.is_verified };
}

/**
 * Step 10: Outbound eligibility decision engine
 * - DNC
 * - allowed channels
 * - quiet hours (timezone-aware)
 * - unknown party handling
 *
 * Always emits an audit log for the decision.
 */
export async function evaluateOutboundEligibility(
  input: OutboundEligibilityInput
): Promise<OutboundEligibilityResult> {
  const normalizedDestination = normalizeAddress(input.channel, input.destination);
  const reasons: OutboundEligibilityReasonCode[] = [];
  let debugPrefs: {
    loaded: boolean;
    do_not_contact?: boolean;
    allowed_channels_present?: boolean;
    allowed_channels_includes_channel?: boolean;
    quiet_hours_hit?: boolean;
    timezone?: string;
    prefs_error?: boolean;
  } = { loaded: false };

  const resolved = await resolveBankCustomerId({
    bankCustomerId: input.bankCustomerId ?? null,
    channel: input.channel,
    normalizedDestination,
  });

  if (!resolved.bankCustomerId || !resolved.verified) {
    reasons.push('unknown_party');
  }

  if (resolved.bankCustomerId) {
    const { data: prefs, error: prefsError } = await supabaseServer
      .from('cc_comm_preferences')
      // NOTE: keep this list aligned with the actual DB schema (no phantom columns).
      .select('do_not_contact,allowed_channels,quiet_hours_start,quiet_hours_end,timezone')
      .eq('bank_customer_id', resolved.bankCustomerId)
      .maybeSingle();

    if (prefsError || !prefs) {
      debugPrefs = { loaded: false, prefs_error: !!prefsError };
      reasons.push('missing_consent');
    } else {
      debugPrefs.loaded = true;
      debugPrefs.do_not_contact = prefs.do_not_contact === true;

      if (prefs.do_not_contact === true) {
        reasons.push('DNC');
      }

      const allowed = parseAllowedChannels(prefs.allowed_channels);
      debugPrefs.allowed_channels_present = !!allowed && allowed.length > 0;
      debugPrefs.allowed_channels_includes_channel = !!allowed && allowed.includes(input.channel);
      if (!allowed || allowed.length === 0) {
        reasons.push('missing_consent');
      } else if (!allowed.includes(input.channel)) {
        reasons.push('channel_not_allowed');
      }

      const tz = prefs.timezone || input.timezoneHint || 'UTC';
      debugPrefs.timezone = tz;
      const quiet = isInQuietHours({
        now: input.now,
        timeZone: tz,
        quietStart: prefs.quiet_hours_start,
        quietEnd: prefs.quiet_hours_end,
      });
      debugPrefs.quiet_hours_hit = quiet;

      // Only bypass quiet hours for service_notice when explicitly flagged.
      const allowQuietOverride =
        input.campaignPurpose === 'service_notice' && input.serviceNoticeOverride === true;
      if (quiet && !allowQuietOverride) {
        reasons.push('quiet_hours');
      }
    }
  }

  // DNC always blocks (even service_notice)
  const eligible = reasons.length === 0;
  const result: OutboundEligibilityResult = {
    eligible,
    resolvedBankCustomerId: resolved.bankCustomerId,
    normalizedDestination,
    reasons,
  };

  await writeAuditLog({
    actorType: 'system',
    eventType: 'outbound_eligibility_decision',
    eventVersion: 1,
    bankCustomerId: resolved.bankCustomerId || undefined,
    context: 'compliance',
    inputRedacted: {
      outbound_job_id: input.outboundJobId,
      campaign_id: input.campaignId,
      channel: input.channel,
      destination: normalizedDestination,
      now: input.now.toISOString(),
      campaign_purpose: input.campaignPurpose,
      service_notice_override: input.serviceNoticeOverride === true,
      has_bank_customer_id_input: !!input.bankCustomerId,
    },
    outputRedacted: {
      eligible,
      reasons,
      resolved_bank_customer_id: resolved.bankCustomerId,
      prefs: debugPrefs,
    },
    success: true,
  });

  return result;
}

