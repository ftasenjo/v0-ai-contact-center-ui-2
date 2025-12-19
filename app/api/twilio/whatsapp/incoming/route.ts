import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';

/**
 * Twilio webhook endpoint for incoming WhatsApp messages
 * POST /api/twilio/whatsapp/incoming
 * 
 * Step 2 Checklist Compliance:
 * - ✅ Accepts application/x-www-form-urlencoded
 * - ✅ Idempotent message storage (unique constraint on provider + provider_message_id)
 * - ✅ Normalizes and stores inbound messages
 * - ✅ Triggers orchestrator safely
 * - ✅ Audit logging
 * - ✅ Handles edge cases (empty body, media-only messages)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let conversationId: string | null = null;
  let messageId: string | null = null;
  let isNewMessage = false;

  try {
    // A) Parse Twilio webhook payload (form-encoded)
    const formData = await request.formData();
    const from = formData.get('From') as string; // WhatsApp number (e.g., whatsapp:+1234567890)
    const to = formData.get('To') as string; // Your Twilio WhatsApp number
    const body = (formData.get('Body') as string) || ''; // Message content (may be empty for media-only)
    const messageSid = formData.get('MessageSid') as string;
    const numMedia = formData.get('NumMedia') as string || '0';

    // Extract media metadata
    const mediaUrls: string[] = [];
    const mediaMetadata: any[] = [];
    if (parseInt(numMedia) > 0) {
      for (let i = 0; i < parseInt(numMedia); i++) {
        const mediaUrl = formData.get(`MediaUrl${i}`) as string;
        const mediaContentType = formData.get(`MediaContentType${i}`) as string;
        if (mediaUrl) {
          mediaUrls.push(mediaUrl);
          mediaMetadata.push({
            url: mediaUrl,
            contentType: mediaContentType,
            index: i,
          });
        }
      }
    }

    // Audit: Inbound webhook received
    // Step 5.3: Redaction handled by writeAuditLog, but we pre-redact for clarity
    const { writeAuditLog } = await import('@/lib/banking-store');
    const { redactSensitive } = await import('@/lib/audit-redaction');
    
    await writeAuditLog({
      actorType: 'system',
      eventType: 'webhook_received', // Step 5.4: Standard event name
      eventVersion: 1,
      inputRedacted: redactSensitive({
        from,
        to,
        messageSid,
        body: body?.substring(0, 100) || '', // Only first 100 chars for audit
        bodyLength: body?.length || 0,
        numMedia: parseInt(numMedia),
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      }, 'webhook'),
      success: true,
      context: 'webhook',
    });

    // Validate required fields
    if (!messageSid || !from || !to) {
      console.error('Missing required fields:', { messageSid, from, to });
      await writeAuditLog({
        actorType: 'system',
        eventType: 'inbound_webhook_validation_failed',
        inputRedacted: { messageSid, hasFrom: !!from, hasTo: !!to },
        success: false,
        errorCode: 'MISSING_FIELDS',
        errorMessage: 'Missing required fields: messageSid, from, or to',
      });
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // B) Normalize + store inbound message (idempotent)
    // Note: Identity link upsert is now handled inside createBankingConversationFromMessage
    // to ensure it runs before any return (even for duplicates)
    const { createBankingConversationFromMessage } = await import('@/lib/banking-store');
    const { resolveIdentity, normalizeAddress } = await import('@/lib/identity-resolution');
    
    // CRITICAL: Normalize addresses using the same function used everywhere
    // This ensures consistency across identity links and message storage
    const normalizedFromAddress = normalizeAddress('whatsapp', from);
    const normalizedToAddress = normalizeAddress('whatsapp', to);
    
    console.log('📝 Address normalization:', {
      rawFrom: from,
      normalizedFrom: normalizedFromAddress,
      rawTo: to,
      normalizedTo: normalizedToAddress,
    });
    
    // Prepare message data with all required fields
    // Use normalized addresses for customer lookup (remove whatsapp: prefix)
    const normalizedFrom = normalizedFromAddress.replace('whatsapp:', '');
    const normalizedTo = normalizedToAddress.replace('whatsapp:', '');
    
    // Handle empty body (media-only messages)
    const messageBody = body || '[Media message - no text]';
    
    console.log('📤 Calling createBankingConversationFromMessage with:', {
      messageSid,
      from: normalizedFrom,
      fromAddress: normalizedFromAddress,
      to: normalizedTo,
      toAddress: normalizedToAddress,
      channel: 'whatsapp',
      bodyLength: messageBody.length,
    });

    const result = await createBankingConversationFromMessage({
      messageSid,
      from: normalizedFrom, // For customer lookup (no prefix, e.g., +1234567890)
      to: normalizedTo, // For customer lookup (no prefix)
      body: messageBody,
      channel: 'whatsapp' as const,
      timestamp: new Date(),
      provider: 'twilio',
      fromAddress: normalizedFromAddress, // Normalized with whatsapp: prefix for from_address column
      toAddress: normalizedToAddress, // Normalized with whatsapp: prefix for to_address column
      bodyJson: {
        raw: body,
        mediaUrls,
        mediaMetadata,
        numMedia: parseInt(numMedia),
        twilioPayload: {
          // Store additional Twilio fields if needed
          accountSid: formData.get('AccountSid') as string,
          messageStatus: formData.get('MessageStatus') as string,
        },
      },
      mediaUrls,
    });

    console.log('📥 Result from createBankingConversationFromMessage:', {
      success: !!result,
      conversationId: result?.conversationId,
      messageId: result?.messageId,
      isNewMessage: result?.isNewMessage,
    });

    if (!result) {
      console.error('❌ Failed to create conversation from message - result is null');
      await writeAuditLog({
        actorType: 'system',
        eventType: 'message_persist_failed',
        inputRedacted: { messageSid },
        success: false,
        errorCode: 'CONVERSATION_CREATION_FAILED',
        errorMessage: 'Failed to create conversation from message',
      });
      
      // Still return 200 to Twilio (don't retry)
      const twiml = new (await import('twilio')).default.twiml.MessagingResponse();
      twiml.message('Thank you for your message! Our team will get back to you shortly.');
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    conversationId = result.conversationId;
    messageId = result.messageId;
    isNewMessage = result.isNewMessage;

    // Step 3: Resolve identity with conversation ID (after conversation is created)
    const identityResult = await resolveIdentity({
      channel: 'whatsapp',
      fromAddress: from,
      conversationId,
    });

    // Step 3: Update conversation with bank_customer_id if verified
    if (identityResult.status === 'resolved_verified') {
      const { supabase } = await import('@/lib/supabase');
      await supabase
        .from('cc_conversations')
        .update({ bank_customer_id: identityResult.bankCustomerId })
        .eq('id', conversationId);
    }

    // Audit: Message persisted
    // Step 5.1: Include message_id in audit
    await writeAuditLog({
      conversationId,
      messageId, // Step 5.1: Include message_id
      actorType: 'system',
      eventType: 'message_persisted',
      eventVersion: 1,
      inputRedacted: redactSensitive({ messageSid, isNewMessage }, 'webhook'),
      success: true,
      context: 'webhook',
    });

    // If message already existed (idempotent retry), return early
    if (!isNewMessage) {
      console.log('🔄 Message already processed (idempotent retry):', messageSid);
      // Return 200 OK - message already processed
      const twiml = new (await import('twilio')).default.twiml.MessagingResponse();
      twiml.message('Thank you for your message! Our team will get back to you shortly.');
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // D) Trigger supervisor (Step 4: LangGraph Inbound Supervisor)
    // Note: Message is already stored above, so even if supervisor fails, the message will appear in inbox
    try {
      // Run supervisor workflow directly
      const { runSupervisor } = await import('@/lib/agents/supervisor');
      
      console.log('🚀 [Supervisor] Starting supervisor workflow:', {
        conversationId,
        messageId,
        channel: 'whatsapp',
        fromAddress: normalizedFromAddress,
      });

      const supervisorResult = await runSupervisor(
        conversationId,
        messageId,
        'whatsapp',
        normalizedFromAddress
      ).catch((supervisorError: any) => {
        // Catch supervisor errors gracefully - don't break the webhook
        console.error('❌ Supervisor workflow error (non-fatal):', supervisorError);
        
        // Audit: Supervisor failed
        writeAuditLog({
          conversationId: conversationId || undefined,
          actorType: 'system',
          eventType: 'supervisor_failed',
          eventVersion: 1,
          inputRedacted: { messageId },
          success: false,
          errorCode: 'SUPERVISOR_ERROR',
          errorMessage: supervisorError?.message || 'Unknown error',
        }).catch((auditError) => {
          console.error('Failed to audit supervisor error:', auditError);
        });
        
        // Return a safe state so the webhook can continue
        return {
          conversation_id: conversationId,
          message_id: messageId,
          channel: 'whatsapp' as const,
          errors: [{
            code: 'SUPERVISOR_ERROR',
            message: supervisorError?.message || 'Supervisor workflow failed',
            timestamp: new Date(),
          }],
          message_sent: false,
        };
      });

      // Audit: Supervisor completed (even if with errors)
      await writeAuditLog({
        conversationId,
        actorType: 'system',
        eventType: 'supervisor_completed',
        eventVersion: 1,
        inputRedacted: { messageId },
        outputRedacted: {
          intent:
            supervisorResult &&
            typeof supervisorResult === 'object' &&
            'intent' in supervisorResult
              ? (supervisorResult as any).intent || null
              : null,
          disposition_code:
            supervisorResult &&
            typeof supervisorResult === 'object' &&
            'disposition_code' in supervisorResult
              ? (supervisorResult as any).disposition_code || null
              : null,
          message_sent: supervisorResult?.message_sent || false,
          errors_count: supervisorResult?.errors?.length || 0,
        },
        success: (supervisorResult?.errors?.length || 0) === 0,
      }).catch((auditError) => {
        console.error('Failed to audit supervisor completion:', auditError);
      });

      // Return 200 OK - message is already stored, supervisor tried to send response
      // (We don't send via TwiML since supervisor sends via Twilio REST API)
      const twiml = new (await import('twilio')).default.twiml.MessagingResponse();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    } catch (error: any) {
      // This catch is for any unexpected errors in the try block itself
      console.error('❌ Unexpected error in supervisor block:', error);
      
      // Still return 200 OK - message is already stored in DB
      // The message will appear in inbox even if supervisor fails
      const twiml = new (await import('twilio')).default.twiml.MessagingResponse();
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }
  } catch (error: any) {
    console.error('Error handling incoming WhatsApp message:', error);
    
    // Audit: Webhook processing failed
    try {
      const { writeAuditLog } = await import('@/lib/banking-store');
      await writeAuditLog({
        conversationId: conversationId || undefined,
        actorType: 'system',
        eventType: 'webhook_processing_failed',
        eventVersion: 1,
        inputRedacted: { hasConversationId: !!conversationId },
        success: false,
        errorCode: 'PROCESSING_ERROR',
        errorMessage: error?.message || 'Unknown error',
      });
    } catch (auditError) {
      console.error('Failed to write audit log for webhook error:', auditError);
    }

    // Return 200 to Twilio (don't retry on our errors)
    const twiml = new (await import('twilio')).default.twiml.MessagingResponse();
    twiml.message('Thank you for your message! Our team will get back to you shortly.');
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
