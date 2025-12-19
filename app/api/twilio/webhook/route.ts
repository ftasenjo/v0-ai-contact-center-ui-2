import { NextRequest, NextResponse } from 'next/server';
import { writeObservabilityEvent, writeWebhookReceipt } from '@/lib/observability';

/**
 * Twilio webhook endpoint for call status updates
 * This endpoint receives status callbacks from Twilio
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const endpoint = "/api/twilio/webhook";
  let parsedBody: Record<string, any> = {};
  let correlationId: string | null = null;
  let responseStatus = 200;
  let responseBody: any = null;
  let errorText: string | null = null;

  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const direction = formData.get('Direction') as string;
    const duration = formData.get('CallDuration') as string;
    const timestampRaw =
      (formData.get('Timestamp') as string | null) ||
      (formData.get('TimeStamp') as string | null) ||
      null;

    parsedBody = Object.fromEntries(formData.entries());
    correlationId = callSid || null;

    // Best-effort forward of Twilio call status callbacks to Vapi.
    //
    // When Twilio "A call comes in" is configured to Vapi (recommended),
    // Vapi may still rely on Twilio's status callbacks. Since Twilio only supports
    // a single "Call status changes" URL, we keep it pointing to our app for
    // deterministic audit logging, and forward the same payload to Vapi.
    // NOTE:
    // Vapi's Twilio status endpoint expects the original Twilio request (and may validate
    // signature/URL). A naive forward from our server typically returns 400 and doesn't help.
    // Only enable forwarding if explicitly requested.
    const shouldForwardToVapi = process.env.VAPI_FORWARD_TWILIO_STATUS === "true";
    const vapiTwilioStatusUrl = process.env.VAPI_TWILIO_STATUS_URL || "https://api.vapi.ai/twilio/status";
    if (shouldForwardToVapi) {
      try {
        const params = new URLSearchParams();
        for (const [k, v] of formData.entries()) {
          params.append(k, typeof v === "string" ? v : String(v));
        }

        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1500);
        await fetch(vapiTwilioStatusUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
          signal: ctrl.signal,
        }).catch(() => {
          // swallow
        });
        clearTimeout(t);
      } catch (e: any) {
        // Non-fatal
        await writeObservabilityEvent({
          severity: "warn",
          source: "vapi",
          eventType: "twilio_status_forward_failed",
          summary: "Failed to forward Twilio call status callback to Vapi",
          correlationId,
          httpStatus: null,
          durationMs: Date.now() - startedAt,
          details: {
            endpoint,
            vapi_twilio_status_url: vapiTwilioStatusUrl,
            error_code: "VAPI_TWILIO_STATUS_FORWARD_FAILED",
            error_message: e?.message || "forward failed",
          },
        });
      }
    }

    console.log('Twilio webhook received:', {
      callSid,
      callStatus,
      from,
      to,
      direction,
      duration,
      timestampRaw,
    });

    // Store/update call status
    const { storeCall, updateCallStatus, getCall } = await import('@/lib/store-adapter');
    
    const existingCall = await getCall(callSid);
    if (existingCall) {
      // Update existing call
      await updateCallStatus(callSid, callStatus, {
        duration: duration ? parseInt(duration) : undefined,
        endTime: callStatus === 'completed' ? new Date() : undefined,
      });
    } else {
      // Store new call
      await storeCall({
        callSid,
        from,
        to,
        status: callStatus,
        direction: direction === 'inbound' ? 'inbound' : 'outbound',
        startTime: new Date(),
        duration: duration ? parseInt(duration) : undefined,
        endTime: callStatus === 'completed' ? new Date() : undefined,
      });
    }

    // Deterministic connectivity logging (cc_audit_logs + cc_call_transcripts system row)
    try {
      const { logVoiceConnectivityEvent } = await import('@/lib/voice-connectivity-logging');

      const status = (callStatus || '').toLowerCase();
      const eventType =
        status === 'initiated'
          ? 'call_initiated'
          : status === 'ringing'
            ? 'call_ringing'
            : status === 'answered' || status === 'in-progress'
              ? 'call_answered'
              : status === 'completed'
                ? 'call_completed'
                : null;

      const occurredAt = timestampRaw ? new Date(timestampRaw) : new Date();

      if (eventType) {
        await logVoiceConnectivityEvent({
          callSid,
          from,
          to,
          eventType,
          occurredAt,
          details: {
            call_status: callStatus,
            direction,
            duration: duration ? parseInt(duration) : null,
          },
        });
      }
    } catch (e) {
      // Return non-2xx so Twilio retries; we want deterministic DB evidence.
      console.error('❌ Failed deterministic call status logging:', e);
      responseStatus = 500;
      responseBody = 'Failed to persist call status audit logs';
      errorText = 'Failed deterministic call status logging';

      await writeObservabilityEvent({
        severity: "error",
        source: "twilio",
        eventType: "webhook_handler_exception",
        summary: "Twilio call status webhook failed while persisting audit logs",
        correlationId,
        httpStatus: responseStatus,
        durationMs: Date.now() - startedAt,
        details: {
          endpoint,
          error_code: "CALL_STATUS_AUDIT_PERSIST_FAILED",
        },
      });

      return new NextResponse(responseBody, { status: responseStatus });
    }

    responseStatus = 200;
    responseBody = '';
    return new NextResponse(responseBody, { status: responseStatus });
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    responseStatus = 500;
    responseBody = 'Error processing webhook';
    errorText = (error as any)?.message || 'Error processing webhook';

    await writeObservabilityEvent({
      severity: "error",
      source: "twilio",
      eventType: "webhook_handler_exception",
      summary: "Twilio call status webhook threw an exception",
      correlationId,
      httpStatus: responseStatus,
      durationMs: Date.now() - startedAt,
      details: {
        endpoint,
        error_code: "WEBHOOK_EXCEPTION",
        error_message: errorText,
      },
    });

    return new NextResponse(responseBody, { status: responseStatus });
  } finally {
    await writeWebhookReceipt({
      provider: "twilio",
      endpoint,
      method: "POST",
      correlationId,
      signatureValid: null,
      dedupeKey: null,
      requestHeaders: request.headers,
      requestBody: parsedBody,
      responseStatus,
      responseBody,
      durationMs: Date.now() - startedAt,
      errorText,
    });
  }
}

