import { NextRequest, NextResponse } from 'next/server';
import { logVoiceConnectivityEvent } from '@/lib/voice-connectivity-logging';
import { writeObservabilityEvent, writeWebhookReceipt } from '@/lib/observability';

/**
 * Twilio Media Streams status callback webhook.
 *
 * Configured via <Connect><Stream statusCallback="...">.
 * Twilio sends `StreamEvent` values like: start | stop | error
 *
 * We normalize them into required deterministic event types:
 * - twilio_stream_start
 * - twilio_stream_connected (logged on StreamEvent=start)
 * - twilio_stream_disconnected (logged on StreamEvent=stop)
 * - twilio_stream_error (logged on StreamEvent=error)
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const endpoint = "/api/twilio/stream-webhook";
  let parsedBody: Record<string, any> = {};
  let correlationId: string | null = null;
  let responseStatus = 200;
  let responseBody: any = null;
  let errorText: string | null = null;

  try {
    const formData = await request.formData();

    const callSid = (formData.get('CallSid') as string) || '';
    const from = formData.get('From') as string | null;
    const to = formData.get('To') as string | null;

    const streamSid = formData.get('StreamSid') as string | null;
    const streamName = formData.get('StreamName') as string | null;
    // Twilio has slightly different parameter naming across Stream variants.
    // Prefer StreamEvent, but fall back to other plausible keys.
    const streamEvent =
      (((formData.get('StreamEvent') as string) ||
        (formData.get('StreamStatus') as string) ||
        (formData.get('EventType') as string) ||
        '') as string).toLowerCase();
    const streamTrack = formData.get('StreamTrack') as string | null;
    const streamError = formData.get('StreamError') as string | null;

    parsedBody = Object.fromEntries(formData.entries());
    correlationId = callSid || null;

    const details = {
      stream_event: streamEvent || null,
      stream_sid: streamSid,
      stream_name: streamName,
      stream_track: streamTrack,
      stream_error: streamError,
    };

    if (!callSid) {
      responseStatus = 400;
      responseBody = 'Missing CallSid';
      errorText = responseBody;

      await writeObservabilityEvent({
        severity: "warn",
        source: "twilio",
        eventType: "webhook_failed",
        summary: "Twilio stream status webhook missing CallSid",
        correlationId: null,
        httpStatus: responseStatus,
        durationMs: Date.now() - startedAt,
        details: { endpoint, error_code: "MISSING_CALLSID" },
      });

      return new NextResponse(responseBody, { status: responseStatus });
    }

    // Debug: make it obvious in dev logs what Twilio is sending.
    console.log('Twilio stream status callback:', {
      callSid,
      streamEvent,
      streamSid,
      streamTrack,
      hasStreamError: !!streamError,
    });

    // Map Twilio callback to our deterministic event types.
    //
    // Twilio can send any of these depending on which Media Streams flavor is active:
    // - start | stop | error
    // - connected | disconnected
    // - stream-started | stream-stopped | stream-error
    //
    // For our DoD, "stream started" is considered "connected" (WS established).
    if (
      streamEvent === 'start' ||
      streamEvent === 'connected' ||
      streamEvent === 'stream-started'
    ) {
      await logVoiceConnectivityEvent({
        callSid,
        from,
        to,
        eventType: 'twilio_stream_start',
        details,
      });

      await logVoiceConnectivityEvent({
        callSid,
        from,
        to,
        eventType: 'twilio_stream_connected',
        details,
      });
    } else if (
      streamEvent === 'stop' ||
      streamEvent === 'disconnected' ||
      streamEvent === 'stream-stopped'
    ) {
      await logVoiceConnectivityEvent({
        callSid,
        from,
        to,
        eventType: 'twilio_stream_disconnected',
        details,
      });
    } else if (streamEvent === 'error' || streamEvent === 'stream-error') {
      await logVoiceConnectivityEvent({
        callSid,
        from,
        to,
        eventType: 'twilio_stream_error',
        details,
      });
    } else {
      // Unknown event name; log as error so we still get DB-only proof.
      await logVoiceConnectivityEvent({
        callSid,
        from,
        to,
        eventType: 'twilio_stream_error',
        details: {
          ...details,
          stream_error: streamError || `unknown_stream_event:${streamEvent || 'null'}`,
        },
      });
    }

    responseStatus = 200;
    responseBody = '';
    return new NextResponse(responseBody, { status: responseStatus });
  } catch (error: any) {
    // Return non-2xx so Twilio retries; we want deterministic DB evidence.
    console.error('Error processing Twilio stream status webhook:', error);
    responseStatus = 500;
    responseBody = 'Error processing stream status webhook';
    errorText = error?.message || responseBody;

    await writeObservabilityEvent({
      severity: "error",
      source: "twilio",
      eventType: "webhook_handler_exception",
      summary: "Twilio stream status webhook threw an exception",
      correlationId,
      httpStatus: responseStatus,
      durationMs: Date.now() - startedAt,
      details: { endpoint, error_code: "WEBHOOK_EXCEPTION", error_message: errorText },
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

