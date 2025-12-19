import { NextRequest, NextResponse } from 'next/server';
import { writeObservabilityEvent, writeWebhookReceipt } from '@/lib/observability';

/**
 * Twilio webhook endpoint for WhatsApp message status updates
 * POST /api/twilio/whatsapp/webhook
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const endpoint = "/api/twilio/whatsapp/webhook";
  let parsedBody: Record<string, any> = {};
  let correlationId: string | null = null;
  let responseStatus = 200;
  let responseBody: any = null;
  let errorText: string | null = null;

  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    parsedBody = Object.fromEntries(formData.entries());
    correlationId = messageSid || null;

    console.log('WhatsApp status update:', {
      messageSid,
      messageStatus,
      from,
      to,
    });

    // Here you would typically:
    // 1. Update message status in your database
    // 2. Trigger real-time UI updates
    // 3. Handle delivery failures

    responseStatus = 200;
    responseBody = '';
    return new NextResponse(responseBody, { status: responseStatus });
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    responseStatus = 500;
    responseBody = 'Error processing webhook';
    errorText = (error as any)?.message || responseBody;

    await writeObservabilityEvent({
      severity: "error",
      source: "whatsapp",
      eventType: "webhook_handler_exception",
      summary: "Twilio WhatsApp status webhook threw an exception",
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



