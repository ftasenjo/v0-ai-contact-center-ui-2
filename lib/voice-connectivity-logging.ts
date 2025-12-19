import { supabaseServer } from '@/lib/supabase-server';
import { redactError, redactSensitive } from '@/lib/audit-redaction';
import { normalizeAddress } from '@/lib/identity-resolution';

export type VoiceConnectivityEventType =
  | 'twilio_stream_start'
  | 'twilio_stream_connected'
  | 'twilio_stream_disconnected'
  | 'twilio_stream_error'
  | 'call_initiated'
  | 'call_ringing'
  | 'call_answered'
  | 'call_completed';

/**
 * Deterministic connectivity logging.
 *
 * - Always writes to `cc_audit_logs` (server client, bypasses RLS).
 * - Also writes a `cc_call_transcripts` row with speaker='system' for UI/debug visibility.
 * - Uses stable `provider_turn_id` to dedupe Twilio retries.
 *
 * Throws on failure so webhook can return non-2xx and Twilio can retry.
 */
export async function logVoiceConnectivityEvent(params: {
  callSid: string;
  from?: string | null;
  to?: string | null;
  eventType: VoiceConnectivityEventType;
  occurredAt?: Date;
  details?: any;
}): Promise<{
  conversationId: string | null;
  transcriptId: string | null;
}> {
  const callSid = (params.callSid || '').trim();
  if (!callSid) {
    throw new Error('logVoiceConnectivityEvent: missing callSid');
  }

  const occurredAt = params.occurredAt ?? new Date();
  const from = params.from ? normalizeAddress('voice', params.from) : null;
  const to = params.to ? normalizeAddress('voice', params.to) : null;

  // Ensure cc_conversation exists (idempotent)
  const { createBankingConversationFromVoiceCall, appendVoiceTranscriptTurn } = await import(
    '@/lib/banking-store'
  );

  const cc = await createBankingConversationFromVoiceCall({
    callSid,
    // IMPORTANT: Do NOT pass placeholder strings like "unknown" through normalizeAddress,
    // since they normalize to "+" and pollute identity links. Empty string is safe.
    from: params.from || '',
    to: params.to || '',
    timestamp: occurredAt,
    provider: 'twilio',
  });

  const conversationId = cc?.conversationId || null;
  if (!conversationId) {
    throw new Error('logVoiceConnectivityEvent: failed to resolve/create cc_conversation');
  }

  // 1) Deterministic audit log (MUST)
  try {
    const redactedInput = redactSensitive(
      {
        provider: 'twilio',
        provider_call_id: callSid,
        from,
        to,
        event_type: params.eventType,
        occurred_at: occurredAt.toISOString(),
        details: params.details ?? null,
      },
      'webhook'
    );

    const redactedOutput = redactSensitive(
      {
        conversation_id: conversationId,
      },
      'webhook'
    );

    const { error } = await supabaseServer.from('cc_audit_logs').insert({
      conversation_id: conversationId,
      case_id: null,
      bank_customer_id: null,
      actor_type: 'system',
      actor_id: null,
      event_type: params.eventType,
      event_version: 1,
      input_redacted: redactedInput,
      output_redacted: redactedOutput,
      success: true,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
  } catch (e: any) {
    const redacted = redactError(e);
    throw new Error(
      `logVoiceConnectivityEvent: failed to write cc_audit_logs (${redacted?.message || 'unknown'})`
    );
  }

  // 2) UI/debug visibility in canonical voice transcript table
  // Use stable provider_turn_id so retries are idempotent per (callSid,eventType).
  let transcriptId: string | null = null;
  try {
    const res = await appendVoiceTranscriptTurn({
      conversationId,
      provider: 'twilio',
      providerCallId: callSid,
      providerTurnId: `evt:${params.eventType}`,
      speaker: 'system',
      text: params.eventType,
      occurredAt,
      isFinal: true,
      mirrorToMessages: false,
      fromAddress: from || undefined,
      toAddress: to || undefined,
      direction: 'outbound',
    });

    transcriptId = res.transcriptId;
  } catch (e: any) {
    const redacted = redactError(e);
    throw new Error(
      `logVoiceConnectivityEvent: failed to write cc_call_transcripts (${redacted?.message || 'unknown'})`
    );
  }

  return { conversationId, transcriptId };
}

