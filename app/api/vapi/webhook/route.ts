import { NextRequest, NextResponse } from 'next/server';
import { storeCall, updateCallStatus, getCall } from '@/lib/store-adapter';
import { normalizeAddress } from '@/lib/identity-resolution';

/**
 * Vapi webhook endpoint for call events
 * POST /api/vapi/webhook
 * 
 * Vapi sends webhooks for:
 * - call-status-update
 * - function-call
 * - speech-update
 * - transcript
 * - end-of-call-report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, call } = body;

    console.log('Vapi webhook received:', { type, callId: call?.id });

    if (!call) {
      return NextResponse.json({ error: 'Call data is required' }, { status: 400 });
    }

    // Handle different webhook types
    switch (type) {
      case 'call-status-update':
        await handleCallStatusUpdate(call);
        break;
      
      case 'end-of-call-report':
        await handleEndOfCallReport(call);
        break;
      
      case 'transcript':
        await handleTranscript(call, body);
        break;
      
      case 'function-call':
        await handleFunctionCall(call, body);
        break;
      
      default:
        console.log('Unhandled Vapi webhook type:', type);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Vapi webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

type VoiceSpeaker = 'customer' | 'ai' | 'agent' | 'system';

function normalizeSpeaker(role: string | undefined): VoiceSpeaker {
  const r = (role || '').toLowerCase();
  if (r === 'user' || r === 'customer' || r === 'caller') return 'customer';
  if (r === 'assistant' || r === 'ai') return 'ai';
  if (r === 'agent') return 'agent';
  return 'system';
}

function extractTwilioCallSid(call: any): string | null {
  // Prefer Twilio CallSid if Vapi metadata contains it (Twilio → Vapi bridging)
  const metaSid =
    call?.metadata?.twilioCallSid ||
    call?.metadata?.twilio_call_sid ||
    call?.metadata?.twilioCallSid ||
    call?.metadata?.callSid ||
    call?.metadata?.call_sid;
  if (typeof metaSid === 'string' && metaSid.length > 0) return metaSid;

  // Some payloads include provider call id fields
  const providerSid =
    call?.phoneCallProviderCallId ||
    call?.providerCallId ||
    call?.twilioCallSid;
  if (typeof providerSid === 'string' && providerSid.length > 0) return providerSid;

  return null;
}

function callKeyForLegacyStore(call: any): string {
  return extractTwilioCallSid(call) || `vapi-${call?.id ?? 'unknown'}`;
}

async function resolveVoiceConversationFromVapiCall(call: any): Promise<{
  conversationId: string;
  twilioCallSid: string;
  from: string;
  to: string;
} | null> {
  const twilioCallSidFromPayload = extractTwilioCallSid(call);

  const fromRaw = call?.metadata?.twilioFrom || call.customer?.number || 'unknown';
  const toRaw = call?.metadata?.twilioTo || call.phoneNumber?.number || 'unknown';
  const from = normalizeAddress('voice', fromRaw);
  const to = normalizeAddress('voice', toRaw);

  // Fast path: we have the CallSid; ensure cc_conversation exists.
  if (twilioCallSidFromPayload) {
    const { createBankingConversationFromVoiceCall } = await import('@/lib/banking-store');
    const cc = await createBankingConversationFromVoiceCall({
      callSid: twilioCallSidFromPayload,
      from,
      to,
      timestamp: call.startedAt ? new Date(call.startedAt) : new Date(),
      provider: 'twilio',
    });
    if (cc?.conversationId) {
      return { conversationId: cc.conversationId, twilioCallSid: twilioCallSidFromPayload, from, to };
    }
  }

  // Fallback: look up the call-start marker message by from_address.
  // This covers the case where Vapi doesn't echo our stream params into call.metadata.
  try {
    const { supabaseServer } = await import('@/lib/supabase-server');
    const { data: marker } = await supabaseServer
      .from('cc_messages')
      .select('conversation_id,provider_message_id')
      .eq('channel', 'voice')
      .eq('direction', 'inbound')
      .eq('body_text', '[Call started]')
      .eq('from_address', from)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const conversationId = (marker as any)?.conversation_id as string | undefined;
    const providerMessageId = (marker as any)?.provider_message_id as string | undefined;
    if (!conversationId || !providerMessageId) return null;

    // provider_message_id format: CALL-<CallSid>-START
    const parts = providerMessageId.split('-');
    const callSid = parts.length >= 3 ? parts[1] : null;
    if (!callSid) return null;

    // Repair provider fields (idempotent)
    const { createBankingConversationFromVoiceCall } = await import('@/lib/banking-store');
    await createBankingConversationFromVoiceCall({
      callSid,
      from,
      to,
      timestamp: call.startedAt ? new Date(call.startedAt) : new Date(),
      provider: 'twilio',
    });

    return { conversationId, twilioCallSid: callSid, from, to };
  } catch {
    return null;
  }
}

/**
 * Handle call status update
 */
async function handleCallStatusUpdate(call: any) {
  const callSid = callKeyForLegacyStore(call);
  const existingCall = await getCall(callSid);

  if (existingCall) {
    await updateCallStatus(callSid, call.status, {
      duration: call.duration,
      endTime: call.endedAt ? new Date(call.endedAt) : undefined,
    });
  } else {
    await storeCall({
      callSid,
      from: call.customer?.number || 'unknown',
      to: call.phoneNumber?.number || 'unknown',
      status: call.status || 'unknown',
      direction: 'inbound',
      startTime: call.startedAt ? new Date(call.startedAt) : new Date(),
      endTime: call.endedAt ? new Date(call.endedAt) : undefined,
      duration: call.duration,
      topic: 'Vapi AI Call',
    });
  }

  // Audit + cc_conversation scaffolding (best effort)
  try {
    const { writeAuditLog, createBankingConversationFromVoiceCall } = await import('@/lib/banking-store');
    const twilioCallSid = extractTwilioCallSid(call);
    if (twilioCallSid) {
      const from = call?.metadata?.twilioFrom || call.customer?.number || 'unknown';
      const to = call?.metadata?.twilioTo || call.phoneNumber?.number || 'unknown';

      const cc = await createBankingConversationFromVoiceCall({
        callSid: twilioCallSid,
        from,
        to,
        timestamp: call.startedAt ? new Date(call.startedAt) : new Date(),
        provider: 'twilio',
      });

      await writeAuditLog({
        conversationId: cc?.conversationId,
        actorType: 'system',
        eventType: 'call_status_update',
        eventVersion: 1,
        inputRedacted: { status: call.status, provider_conversation_id: twilioCallSid },
        success: true,
        context: 'webhook',
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Handle end of call report
 */
async function handleEndOfCallReport(call: any) {
  const callSid = callKeyForLegacyStore(call);
  
  await updateCallStatus(callSid, 'completed', {
    duration: call.duration,
    endTime: call.endedAt ? new Date(call.endedAt) : new Date(),
    sentiment: call.sentiment || 'neutral',
    sentimentScore: call.sentimentScore,
  });

  // Store transcript summary into cc_call_transcripts as system blob (best effort)
  try {
    const twilioCallSid = extractTwilioCallSid(call);
    if (twilioCallSid && call.transcript) {
      const { createBankingConversationFromVoiceCall, appendVoiceTranscriptTurn, writeAuditLog } = await import('@/lib/banking-store');
      const from = call?.metadata?.twilioFrom || call.customer?.number || 'unknown';
      const to = call?.metadata?.twilioTo || call.phoneNumber?.number || 'unknown';

      const cc = await createBankingConversationFromVoiceCall({
        callSid: twilioCallSid,
        from,
        to,
        timestamp: call.startedAt ? new Date(call.startedAt) : new Date(),
        provider: 'twilio',
      });

      if (cc?.conversationId) {
        await appendVoiceTranscriptTurn({
          conversationId: cc.conversationId,
          provider: 'vapi',
          providerCallId: twilioCallSid,
          providerTurnId: `end_of_call_report:${call.id}`,
          speaker: 'system',
          text: typeof call.transcript === 'string' ? call.transcript : JSON.stringify(call.transcript),
          occurredAt: call.endedAt ? new Date(call.endedAt) : new Date(),
          isFinal: true,
          mirrorToMessages: false,
        });

        await writeAuditLog({
          conversationId: cc.conversationId,
          actorType: 'system',
          eventType: 'end_of_call_report_received',
          eventVersion: 1,
          inputRedacted: { provider_conversation_id: twilioCallSid, has_transcript: true },
          success: true,
          context: 'webhook',
        });
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Handle transcript updates
 */
async function handleTranscript(call: any, body: any) {
  // Vapi payload shape varies; support both:
  // - { transcript: { role, content, timestamp, isFinal?, confidence?, startMs?, endMs?, id? } }
  // - { transcript: "...", role: "user|assistant", timestamp: ... }
  const t = body?.transcript;
  const role = t?.role ?? body?.role;
  const content = t?.content ?? t?.text ?? (typeof t === 'string' ? t : undefined);
  const ts = t?.timestamp ?? body?.timestamp ?? body?.createdAt ?? Date.now();

  const isFinal = t?.isFinal ?? t?.final ?? true;
  const confidence = typeof t?.confidence === 'number' ? t.confidence : undefined;
  const startMs = typeof t?.startMs === 'number' ? t.startMs : undefined;
  const endMs = typeof t?.endMs === 'number' ? t.endMs : undefined;
  const providerTurnId = t?.id || t?.turnId || t?.utteranceId;

  if (!content || typeof content !== 'string') {
    console.warn('Transcript update missing content:', { callId: call?.id });
    return;
  }

  const speaker = normalizeSpeaker(role);

  const resolved = await resolveVoiceConversationFromVapiCall(call);
  if (!resolved) {
    // Still log to legacy store adapter if we cannot map to a cc_conversation
    const legacySid = callKeyForLegacyStore(call);
    const existing = await getCall(legacySid);
    if (!existing) {
      await storeCall({
        callSid: legacySid,
        from: call.customer?.number || 'unknown',
        to: call.phoneNumber?.number || 'unknown',
        status: call.status || 'unknown',
        direction: 'inbound',
        startTime: call.startedAt ? new Date(call.startedAt) : new Date(),
        topic: 'Vapi AI Call',
      });
    }
    return;
  }

  const { conversationId, twilioCallSid, from, to } = resolved;

  const occurredAt = typeof ts === 'number' ? new Date(ts) : new Date();

  const { appendVoiceTranscriptTurn, writeAuditLog } = await import('@/lib/banking-store');

  // Append canonical transcript + mirror into cc_messages for UI
  const direction = speaker === 'customer' ? 'inbound' : 'outbound';
  const mirrorFrom = direction === 'inbound' ? from : to;
  const mirrorTo = direction === 'inbound' ? to : from;

  const { messageId, wasDuplicate } = await appendVoiceTranscriptTurn({
    conversationId,
    provider: 'vapi',
    providerCallId: twilioCallSid,
    providerTurnId: typeof providerTurnId === 'string' ? providerTurnId : undefined,
    speaker,
    text: content,
    occurredAt,
    isFinal: isFinal !== false,
    confidence,
    startMs,
    endMs,
    mirrorToMessages: true,
    fromAddress: mirrorFrom,
    toAddress: mirrorTo,
    direction,
  });

  // Audit: transcript turn received
  await writeAuditLog({
    conversationId,
    messageId: messageId || undefined,
    actorType: 'system',
    eventType: 'transcript_turn_received',
    eventVersion: 1,
    inputRedacted: {
      provider: 'vapi',
      provider_conversation_id: twilioCallSid,
      speaker,
      is_final: isFinal !== false,
      confidence,
      was_duplicate: wasDuplicate,
    },
    success: true,
    context: 'webhook',
  });

  // Only orchestrate on FINAL customer turns
  if (speaker !== 'customer' || isFinal === false) return;

  // ASR uncertainty: if confidence is low, ask to repeat instead of invoking supervisor
  if (typeof confidence === 'number' && confidence < 0.65) {
    const controlUrl = call?.controlUrl;
    const apiKey = process.env.VAPI_API_KEY;
    if (apiKey && controlUrl) {
      const url = controlUrl.endsWith('/control') ? controlUrl : `${controlUrl}/control`;
      await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'say', content: 'Sorry — could you repeat that?', endCallAfterSpoken: false }),
      });
    }

    await writeAuditLog({
      conversationId,
      messageId: messageId || undefined,
      actorType: 'system',
      eventType: 'asr_low_confidence_reprompt',
      eventVersion: 1,
      inputRedacted: { confidence },
      success: true,
      context: 'webhook',
    });
    return;
  }

  // Run supervisor on this user turn (Step 9: voice is first-class channel)
  try {
    const { runSupervisor } = await import('@/lib/agents/supervisor');
    const inboundMessageId = messageId || `msg-${Date.now()}`;

    const supervisorResult = await runSupervisor(
      conversationId,
      inboundMessageId,
      'voice',
      from,
      {
        controlUrl: call?.controlUrl,
        providerCallId: twilioCallSid,
      }
    );

    await writeAuditLog({
      conversationId,
      messageId: inboundMessageId,
      actorType: 'system',
      eventType: 'supervisor_completed',
      eventVersion: 1,
      inputRedacted: { channel: 'voice' },
      outputRedacted: {
        intent: supervisorResult?.intent || null,
        disposition_code: supervisorResult?.disposition_code || null,
        message_sent: supervisorResult?.message_sent || false,
        errors_count: supervisorResult?.errors?.length || 0,
      },
      success: (supervisorResult?.errors?.length || 0) === 0,
      context: 'supervisor',
    });
  } catch (e: any) {
    await writeAuditLog({
      conversationId,
      messageId: messageId || undefined,
      actorType: 'system',
      eventType: 'supervisor_failed',
      eventVersion: 1,
      inputRedacted: { channel: 'voice' },
      success: false,
      errorCode: 'SUPERVISOR_ERROR',
      errorMessage: e?.message || 'Supervisor failed',
      context: 'supervisor',
    });
  }
}

/**
 * Handle function calls (if assistant calls functions)
 */
async function handleFunctionCall(call: any, body: any) {
  console.log('Function call:', {
    callId: call.id,
    functionName: body.functionCall?.name,
    parameters: body.functionCall?.parameters,
  });
  
  // Handle function calls here (e.g., create ticket, update CRM, etc.)
}



