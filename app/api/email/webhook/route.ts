import { NextRequest, NextResponse } from 'next/server';
import { writeObservabilityEvent, writeWebhookReceipt } from '@/lib/observability';

/**
 * Webhook endpoint for email events (bounces, opens, clicks, etc.)
 * POST /api/email/webhook
 * 
 * This works with SendGrid, Resend, or other email providers that support webhooks
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const endpoint = "/api/email/webhook";
  let parsedBody: any = null;
  let correlationId: string | null = null;
  let responseStatus = 200;
  let responseBody: any = null;
  let errorText: string | null = null;

  try {
    const body = await request.json();
    parsedBody = body;
    
    // Handle different email provider webhook formats
    // SendGrid format
    if (Array.isArray(body)) {
      body.forEach((event: any) => {
        console.log('Email event:', {
          event: event.event,
          email: event.email,
          timestamp: event.timestamp,
          messageId: event.sg_message_id,
        });
      });

      // Correlate on the first available message id (best-effort)
      correlationId =
        (body.find((e: any) => e?.sg_message_id)?.sg_message_id as string | undefined) ||
        null;
    }
    // Resend format
    else if (body.type) {
      console.log('Email event:', {
        type: body.type,
        data: body.data,
      });

      correlationId = (body?.data?.email_id as string | undefined) || (body?.data?.id as string | undefined) || null;
    }
    // Generic format
    else {
      console.log('Email webhook received:', body);
    }

    // Here you would typically:
    // 1. Update email status in your database
    // 2. Handle bounces and unsubscribes
    // 3. Track opens and clicks
    // 4. Update conversation status

    responseStatus = 200;
    responseBody = '';
    return new NextResponse(responseBody, { status: responseStatus });
  } catch (error) {
    console.error('Error processing email webhook:', error);
    responseStatus = 500;
    responseBody = 'Error processing webhook';
    errorText = (error as any)?.message || responseBody;

    await writeObservabilityEvent({
      severity: "error",
      source: "sendgrid",
      eventType: "webhook_handler_exception",
      summary: "Email webhook threw an exception",
      correlationId,
      httpStatus: responseStatus,
      durationMs: Date.now() - startedAt,
      details: { endpoint, error_code: "WEBHOOK_EXCEPTION", error_message: errorText },
    });

    return new NextResponse(responseBody, { status: responseStatus });
  } finally {
    await writeWebhookReceipt({
      provider: "sendgrid",
      endpoint,
      method: "POST",
      correlationId,
      signatureValid: null,
      dedupeKey: null,
      requestHeaders: request.headers,
      requestBody: parsedBody ?? {},
      responseStatus,
      responseBody,
      durationMs: Date.now() - startedAt,
      errorText,
    });
  }
}



