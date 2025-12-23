import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { storeCall, updateCallStatus, getCall } from '@/lib/store-adapter';
import { normalizeAddress } from '@/lib/identity-resolution';
import { writeObservabilityEvent, writeWebhookReceipt } from '@/lib/observability';

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
  const startedAt = Date.now();
  const endpoint = "/api/vapi/webhook";
  let parsedBody: any = null;
  let correlationId: string | null = null;
  let responseStatus = 200;
  let responseJson: any = null;
  let errorText: string | null = null;
  let voiceControlUrl: string | null = null;

  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch (e: any) {
      // Some senders probe the webhook with non-JSON; acknowledge but log.
      responseStatus = 200;
      responseJson = { success: true, ignored: true };
      errorText = e?.message || "invalid_json";
      await writeObservabilityEvent({
        severity: "warn",
        source: "vapi",
        eventType: "webhook_invalid_json",
        summary: "Vapi webhook received non-JSON payload",
        correlationId: null,
        httpStatus: 200,
        durationMs: Date.now() - startedAt,
        details: { endpoint, error_code: "INVALID_JSON", error_message: errorText },
      });
      return NextResponse.json(responseJson, { status: responseStatus });
    }

    parsedBody = body;

    // Vapi payload shape can be either:
    // - { type, call, ... }
    // - { message: { type, call, ... } }
    // - { event: ..., call: ... }
    const envelope = body?.message && typeof body.message === "object" ? body.message : body;
    const type = envelope?.type || envelope?.event || envelope?.eventType;
    let call = envelope?.call;
    voiceControlUrl =
      (typeof envelope?.call?.controlUrl === "string" ? envelope.call.controlUrl : null) ||
      (typeof envelope?.call?.control_url === "string" ? envelope.call.control_url : null) ||
      (typeof envelope?.controlUrl === "string" ? envelope.controlUrl : null) ||
      (typeof envelope?.control_url === "string" ? envelope.control_url : null) ||
      (typeof body?.controlUrl === "string" ? body.controlUrl : null) ||
      (typeof body?.control_url === "string" ? body.control_url : null) ||
      null;

    // Some payloads may provide only callId; fetch details from Vapi API.
    const callIdFromPayload = envelope?.callId || envelope?.call_id || envelope?.id || body?.callId;
    if (!call && typeof callIdFromPayload === "string" && callIdFromPayload.length > 0) {
      try {
        const apiKey = process.env.VAPI_API_KEY;
        if (apiKey) {
          const res = await fetch(`https://api.vapi.ai/call/${callIdFromPayload}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (res.ok) {
            call = await res.json();
          }
        }
      } catch {
        // ignore
      }
    }

    console.log('Vapi webhook received:', {
      type,
      callId: call?.id || callIdFromPayload,
      hasControlUrl: !!voiceControlUrl,
      bodyKeys: body && typeof body === "object" ? Object.keys(body).slice(0, 12) : null,
    });

    if (!call) {
      // Acknowledge "probe/ping" style payloads so Vapi doesn't retry forever.
      responseStatus = 200;
      responseJson = { success: true, ignored: true };

      await writeObservabilityEvent({
        severity: "warn",
        source: "vapi",
        eventType: "webhook_missing_call",
        summary: "Vapi webhook missing call payload (ignored)",
        correlationId: null,
        httpStatus: responseStatus,
        durationMs: Date.now() - startedAt,
        details: {
          endpoint,
          error_code: "MISSING_CALL",
          type: type ?? null,
          body_keys: body && typeof body === "object" ? Object.keys(body).slice(0, 30) : null,
        },
      });

      return NextResponse.json(responseJson, { status: responseStatus });
    }

    correlationId = (call?.id as string | undefined) || null;

    // Handle different webhook types
    switch (type) {
      case 'call-status-update':
        await handleCallStatusUpdate(call);
        break;

      // Vapi sometimes emits `status-update` instead of `call-status-update`
      case 'status-update':
        await handleCallStatusUpdate(call);
        break;
      
      case 'end-of-call-report':
        await handleEndOfCallReport(call);
        break;
      
      case 'transcript':
        await handleTranscript(call, { ...body, __voiceControlUrl: voiceControlUrl });
        break;

      // Vapi often streams ASR/TTS updates via `speech-update`.
      // Treat it as transcript-like to feed our logging + supervisor pipeline.
      case 'speech-update':
        await handleSpeechUpdate(call, { ...body, __voiceControlUrl: voiceControlUrl });
        break;

      // Lifecycle events we want to acknowledge + log
      case 'assistant.started':
        await handleAssistantStarted(call, { ...body, __voiceControlUrl: voiceControlUrl });
        break;

      case 'conversation-update':
        await handleConversationUpdate(call, { ...body, __voiceControlUrl: voiceControlUrl });
        break;
      
      case 'function-call':
        await handleFunctionCall(call, body);
        break;
      
      default:
        console.log('Unhandled Vapi webhook type:', type);
    }

    responseStatus = 200;
    responseJson = { success: true };
    return NextResponse.json(responseJson, { status: responseStatus });
  } catch (error: any) {
    console.error('Error processing Vapi webhook:', error);
    responseStatus = 500;
    responseJson = { error: 'Failed to process webhook', message: error.message };
    errorText = error?.message || 'Failed to process webhook';

    await writeObservabilityEvent({
      severity: "error",
      source: "vapi",
      eventType: "webhook_handler_exception",
      summary: "Vapi webhook threw an exception",
      correlationId,
      httpStatus: responseStatus,
      durationMs: Date.now() - startedAt,
      details: { endpoint, error_code: "WEBHOOK_EXCEPTION", error_message: errorText },
    });

    return NextResponse.json(responseJson, { status: responseStatus });
  } finally {
    await writeWebhookReceipt({
      provider: "vapi",
      endpoint,
      method: "POST",
      correlationId,
      signatureValid: null,
      dedupeKey: null,
      requestHeaders: request.headers,
      requestBody: parsedBody ?? {},
      responseStatus,
      responseBody: responseJson ?? null,
      durationMs: Date.now() - startedAt,
      errorText,
    });
  }
}

type VoiceSpeaker = 'customer' | 'ai' | 'agent' | 'system';

function normalizeSpeaker(role: string | undefined): VoiceSpeaker {
  const r = (role || '').toLowerCase();
  if (r === 'user' || r === 'customer' || r === 'caller' || r.includes('user')) return 'customer';
  if (r === 'assistant' || r === 'ai' || r === 'bot' || r === 'model' || r.includes('assistant')) return 'ai';
  if (r === 'agent') return 'agent';
  return 'system';
}

function isLikelySystemPromptBlob(text: string): boolean {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 240) return false;
  // Common patterns when the assistant "prompt" or configuration leaks into a message stream.
  const markers = [
    'identity & purpose',
    'voice & persona',
    'conversation flow',
    'customer service',
    'support agent prompt',
  ];
  const lower = t.toLowerCase();
  const markerHits = markers.filter((m) => lower.includes(m)).length;
  return markerHits >= 2;
}

function stableProviderTurnId(params: {
  kind: string;
  callId: string | undefined | null;
  role: string | undefined;
  occurredAt: Date;
  content: string;
  explicitId?: string | null;
}): string {
  if (typeof params.explicitId === 'string' && params.explicitId.length > 0) {
    return `${params.kind}:${params.explicitId}`;
  }
  const ts = params.occurredAt.getTime();
  const hash = crypto.createHash('sha1').update(params.content).digest('hex').slice(0, 12);
  const role = (params.role || 'unknown').toLowerCase();
  const callId = params.callId || 'unknown';
  return `${params.kind}:${callId}:${role}:${ts}:${hash}`;
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
 * Extracts Vapi's structured output (success evaluation, customer sentiment, CSAT) and stores as call analysis
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
    if (twilioCallSid) {
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
        // Store transcript if available
        if (call.transcript) {
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
        }

        // Step 12: Extract and store Vapi structured output as call analysis
        try {
          await processVapiCallAnalysis(call, cc.conversationId, twilioCallSid);
        } catch (analysisError: any) {
          console.warn('[vapi/webhook] Failed to process call analysis:', analysisError?.message);
          // Non-fatal: log but don't fail the webhook
        }

        await writeAuditLog({
          conversationId: cc.conversationId,
          actorType: 'system',
          eventType: 'end_of_call_report_received',
          eventVersion: 1,
          inputRedacted: { 
            provider_conversation_id: twilioCallSid, 
            has_transcript: !!call.transcript,
            has_analysis: !!(call.analysis || call.structuredData || call.csat),
          },
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
 * Process Vapi's structured output and store as call analysis
 * Maps Vapi fields to our call analysis schema
 */
async function processVapiCallAnalysis(call: any, conversationId: string, twilioCallSid: string): Promise<void> {
  // Extract Vapi structured output from various possible locations
  const structuredData = 
    call?.analysis || 
    call?.structuredData || 
    call?.structured_output ||
    call?.analysisPlan?.structuredData ||
    {};

  // Extract CSAT (Customer Satisfaction Score) - can be 1-10 or 1-5 scale
  const csatRaw = 
    structuredData?.CSAT || 
    structuredData?.csat || 
    structuredData?.customerSatisfaction ||
    call?.csat ||
    call?.customerSatisfaction;
  
  // Normalize CSAT to 1-10 scale (Vapi might send 1-5, we store 1-10)
  let qualityScore: number | null = null;
  if (typeof csatRaw === 'number') {
    if (csatRaw <= 5) {
      // Scale 1-5 to 1-10
      qualityScore = Math.round((csatRaw / 5) * 10);
    } else if (csatRaw <= 10) {
      qualityScore = csatRaw;
    }
  }

  // Extract customer sentiment
  const sentimentRaw = 
    structuredData?.customerSentiment || 
    structuredData?.customer_sentiment ||
    structuredData?.sentiment ||
    call?.sentiment ||
    call?.customerSentiment ||
    'neutral';
  
  // Normalize sentiment to our format
  const customerSentiment = typeof sentimentRaw === 'string' 
    ? sentimentRaw.toLowerCase().trim() 
    : 'neutral';
  
  // Map Vapi sentiment to our format
  const sentimentMap: Record<string, string> = {
    'very positive': 'positive',
    'positive': 'positive',
    'neutral': 'neutral',
    'negative': 'negative',
    'very negative': 'negative',
    'frustrated': 'frustrated',
    'angry': 'frustrated',
  };
  const normalizedSentiment = sentimentMap[customerSentiment] || customerSentiment;

  // Extract success evaluation
  const successEvaluation = 
    structuredData?.success || 
    structuredData?.successEvaluation ||
    structuredData?.call_success ||
    call?.success ||
    call?.successEvaluation;
  
  // Determine if issue was resolved based on success evaluation
  const issueResolved = typeof successEvaluation === 'boolean' 
    ? successEvaluation 
    : typeof successEvaluation === 'string'
      ? successEvaluation.toLowerCase().includes('success') || successEvaluation.toLowerCase().includes('resolved')
      : null;

  // Extract call summary from transcript or structured data
  const callSummary = 
    structuredData?.summary ||
    structuredData?.callSummary ||
    structuredData?.call_summary ||
    call?.summary ||
    (typeof call.transcript === 'string' && call.transcript.length > 0 
      ? call.transcript.substring(0, 500) // First 500 chars of transcript as summary
      : null);

  // Determine customer frustrated flag
  const customerFrustrated = 
    normalizedSentiment === 'frustrated' || 
    normalizedSentiment === 'negative' ||
    (qualityScore !== null && qualityScore <= 4);

  // Determine escalation/compliance flags based on sentiment and quality
  const escalationRequired = customerFrustrated && (qualityScore !== null && qualityScore <= 3);
  const supervisorReviewNeeded = qualityScore !== null && qualityScore <= 5;
  const complianceVerified = issueResolved !== false; // Assume verified unless explicitly failed

  // Try to infer issue type from transcript or structured data
  let issueType: string | null = null;
  const transcriptText = typeof call.transcript === 'string' ? call.transcript.toLowerCase() : '';
  if (transcriptText.includes('fraud') || transcriptText.includes('unauthorized')) {
    issueType = 'fraud';
  } else if (transcriptText.includes('card') || transcriptText.includes('debit') || transcriptText.includes('credit')) {
    issueType = 'card';
  } else if (transcriptText.includes('login') || transcriptText.includes('password') || transcriptText.includes('account')) {
    issueType = 'login';
  } else if (transcriptText.includes('dispute') || transcriptText.includes('chargeback')) {
    issueType = 'dispute';
  } else if (transcriptText.includes('payment') || transcriptText.includes('transfer')) {
    issueType = 'payments';
  } else {
    issueType = structuredData?.issueType || structuredData?.issue_type || 'general';
  }

  // Determine issue severity based on quality score and sentiment
  let issueSeverity: 'low' | 'medium' | 'high' | null = null;
  if (qualityScore !== null) {
    if (qualityScore <= 4) {
      issueSeverity = 'high';
    } else if (qualityScore <= 6) {
      issueSeverity = 'medium';
    } else {
      issueSeverity = 'low';
    }
  }

  // Store call analysis via API endpoint
  const analysisPayload = {
    conversation_id: conversationId,
    provider: 'vapi',
    provider_call_id: twilioCallSid,
    vapi_call_id: call.id || null,
    call_summary: callSummary,
    issue_type: issueType,
    issue_severity: issueSeverity,
    issue_resolved: issueResolved,
    escalation_required: escalationRequired,
    supervisor_review_needed: supervisorReviewNeeded,
    compliance_verified: complianceVerified,
    customer_sentiment: normalizedSentiment,
    customer_frustrated: customerFrustrated,
    quality_score: qualityScore,
    raw_analysis_json: {
      vapi_structured_data: structuredData,
      vapi_success_evaluation: successEvaluation,
      vapi_csat: csatRaw,
      vapi_sentiment: sentimentRaw,
    },
  };

  // Call our analysis API endpoint (internal call - use service role directly)
  // Since we're in the same process, we can import and call the handler directly
  try {
    const { supabaseServer } = await import('@/lib/supabase-server');
    const { redactSensitive } = await import('@/lib/audit-redaction');
    
    const rawAnalysisSafe = redactSensitive(analysisPayload.raw_analysis_json, "automation");
    
    const { data, error } = await supabaseServer
      .from("cc_call_analysis")
      .insert({
        conversation_id: conversationId,
        provider: 'vapi',
        provider_call_id: twilioCallSid,
        vapi_call_id: call.id || null,
        call_summary: callSummary,
        issue_type: issueType,
        issue_severity: issueSeverity,
        issue_resolved: issueResolved,
        escalation_required: escalationRequired,
        supervisor_review_needed: supervisorReviewNeeded,
        compliance_verified: complianceVerified,
        customer_sentiment: normalizedSentiment,
        customer_frustrated: customerFrustrated,
        quality_score: qualityScore,
        raw_analysis_json: rawAnalysisSafe,
        analyzed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert analysis: ${error.message}`);
    }

    // Process automation (create inbox items)
    if (data) {
      const { processCallAnalysis } = await import('@/lib/automation/call-analysis-automation');
      await processCallAnalysis(data as any);
    }

    console.log('[vapi/webhook] ✅ Call analysis stored:', {
      conversationId,
      qualityScore,
      sentiment: normalizedSentiment,
      issueResolved,
    });
  } catch (e: any) {
    throw new Error(`Failed to store call analysis: ${e?.message || 'Unknown error'}`);
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
  const role = t?.role ?? body?.role ?? body?.message?.role;
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

  // Avoid polluting transcripts with the assistant prompt / system config blobs.
  if (isLikelySystemPromptBlob(content)) return;

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

  const occurredAt =
    typeof ts === 'number'
      ? new Date(ts)
      : typeof ts === 'string'
        ? new Date(ts)
        : new Date();

  const { appendVoiceTranscriptTurn, writeAuditLog } = await import('@/lib/banking-store');

  // Append canonical transcript + mirror into cc_messages for UI
  const direction = speaker === 'customer' ? 'inbound' : 'outbound';
  const mirrorFrom = direction === 'inbound' ? from : to;
  const mirrorTo = direction === 'inbound' ? to : from;

  const eventKind =
    (typeof body?.__eventKind === 'string' && body.__eventKind.length > 0 ? body.__eventKind : null) ||
    (typeof body?.message?.type === 'string' ? body.message.type : null) ||
    'transcript';

  const computedTurnId = stableProviderTurnId({
    kind: `vapi:${eventKind}`,
    callId: call?.id || null,
    role,
    occurredAt,
    content,
    explicitId: typeof providerTurnId === 'string' ? providerTurnId : null,
  });

  const { messageId, wasDuplicate } = await appendVoiceTranscriptTurn({
    conversationId,
    provider: 'vapi',
    providerCallId: twilioCallSid,
    providerTurnId: computedTurnId,
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

  // Prevent duplicate webhook deliveries from triggering supervisor twice.
  if (wasDuplicate) return;

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
    const voiceControlUrl =
      (typeof (body as any)?.__voiceControlUrl === 'string' && (body as any).__voiceControlUrl.length > 0
        ? (body as any).__voiceControlUrl
        : null) || call?.controlUrl || null;

    const supervisorResult = await runSupervisor(
      conversationId,
      inboundMessageId,
      'voice',
      from,
      {
        controlUrl: voiceControlUrl,
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
 * Handle speech updates (ASR/TTS streaming). We normalize to the transcript handler.
 */
async function handleSpeechUpdate(call: any, body: any) {
  const envelope = body?.message && typeof body.message === 'object' ? body.message : body;

  const s =
    envelope?.speech ||
    envelope?.speechUpdate ||
    envelope?.speech_update ||
    envelope?.speechUpdateEvent ||
    envelope?.data ||
    envelope;

  // Try common shapes:
  // - speech: { role, content|text, timestamp, isFinal }
  // - { role, content|text, timestamp, isFinal }
  const roleRaw = s?.role ?? s?.speaker ?? s?.from ?? s?.type ?? envelope?.role;
  const role =
    typeof roleRaw === 'string'
      ? roleRaw
      : // Heuristic: many payloads omit role but do include a `type` like "assistant" / "user"
        typeof s?.type === 'string'
        ? s.type
        : undefined;
  const content = s?.content ?? s?.text ?? s?.transcript ?? s?.utterance ?? envelope?.content ?? envelope?.text;
  const ts = s?.timestamp ?? s?.createdAt ?? s?.time ?? envelope?.timestamp ?? envelope?.createdAt ?? Date.now();
  const isFinal = s?.isFinal ?? s?.final ?? s?.is_final ?? true;
  const confidence = typeof s?.confidence === 'number' ? s.confidence : undefined;
  const startMs = typeof s?.startMs === 'number' ? s.startMs : undefined;
  const endMs = typeof s?.endMs === 'number' ? s.endMs : undefined;
  const id = s?.id || s?.turnId || s?.utteranceId;

  // If we cannot extract usable text, just acknowledge.
  if (typeof content !== 'string' || content.trim().length === 0) return;
  if (isLikelySystemPromptBlob(content)) return;

  await handleTranscript(call, {
    ...body,
    __eventKind: 'speech-update',
    transcript: { role, content, timestamp: ts, isFinal, confidence, startMs, endMs, id },
  });
}

/**
 * Assistant lifecycle marker (useful for deterministic connectivity evidence).
 */
async function handleAssistantStarted(call: any, body: any) {
  const resolved = await resolveVoiceConversationFromVapiCall(call);
  if (!resolved) return;

  const { conversationId, twilioCallSid } = resolved;
  const occurredAt = call?.startedAt ? new Date(call.startedAt) : new Date();

  try {
    const { appendVoiceTranscriptTurn, writeAuditLog } = await import('@/lib/banking-store');

    await appendVoiceTranscriptTurn({
      conversationId,
      provider: 'vapi',
      providerCallId: twilioCallSid,
      providerTurnId: `assistant_started:${call?.id ?? 'unknown'}`,
      speaker: 'system',
      text: 'vapi_assistant_started',
      occurredAt,
      isFinal: true,
      mirrorToMessages: false,
    });

    await writeAuditLog({
      conversationId,
      actorType: 'system',
      eventType: 'vapi_assistant_started',
      eventVersion: 1,
      inputRedacted: { provider: 'vapi', provider_conversation_id: twilioCallSid },
      success: true,
      context: 'webhook',
    });
  } catch {
    // ignore
  }
}

/**
 * Conversation update (may contain messages). Best-effort: ingest messages as transcript turns.
 */
async function handleConversationUpdate(call: any, body: any) {
  const envelope = body?.message && typeof body.message === 'object' ? body.message : body;
  const conversation = envelope?.conversation || envelope?.data?.conversation || envelope?.payload?.conversation;
  const messages = conversation?.messages || envelope?.messages || envelope?.data?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return;

  // Conversation updates often contain the user turns when `transcript` isn't enabled.
  // Normalize these messages into our canonical `handleTranscript` pipeline so we:
  // - dedupe consistently
  // - trigger supervisor on FINAL customer turns
  // - send "say" via Vapi controlUrl
  const tail = messages.slice(-5);
  for (const m of tail) {
    const role = m?.role ?? m?.speaker ?? m?.type;
    const content = m?.content ?? m?.text ?? m?.message;
    if (typeof content !== 'string' || content.trim().length === 0) continue;
    if (isLikelySystemPromptBlob(content)) continue;

    const occurredAtRaw = m?.timestamp ?? m?.createdAt ?? m?.time ?? Date.now();
    const ts =
      typeof occurredAtRaw === 'number'
        ? occurredAtRaw
        : typeof occurredAtRaw === 'string'
          ? occurredAtRaw
          : Date.now();

    await handleTranscript(call, {
      __eventKind: 'conversation-update',
      transcript: {
        role,
        content,
        timestamp: ts,
        isFinal: true,
        id: typeof m?.id === 'string' ? `conversation:${m.id}` : undefined,
      },
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



