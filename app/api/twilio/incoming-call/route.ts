import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

/**
 * Twilio webhook endpoint for incoming calls
 * This generates TwiML to handle incoming calls
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;

    console.log('Incoming call:', { from, to, callSid });

    // Store the incoming call
    const { storeCall, createConversationFromCall } = await import('@/lib/store-adapter');
    
    const callData = {
      callSid,
      from,
      to,
      status: 'ringing',
      direction: 'inbound' as const,
      startTime: new Date(),
      topic: 'Incoming Call',
    };
    
    // Store the call
    await storeCall(callData);
    
    // Create conversation from call
    await createConversationFromCall(callData);
    
    console.log('✅ Call stored and conversation created:', callSid);

    // Step 9: Also create/find cc_conversations row (banking-grade voice)
    try {
      const { createBankingConversationFromVoiceCall, writeAuditLog } = await import('@/lib/banking-store');
      const ccResult = await createBankingConversationFromVoiceCall({
        callSid,
        from,
        to,
        timestamp: callData.startTime,
        provider: 'twilio',
      });

      await writeAuditLog({
        conversationId: ccResult?.conversationId,
        actorType: 'system',
        eventType: 'call_started',
        eventVersion: 1,
        inputRedacted: { channel: 'voice', provider: 'twilio', provider_conversation_id: callSid },
        outputRedacted: { conversation_id: ccResult?.conversationId, is_new: ccResult?.isNewConversation },
        success: !!ccResult,
        context: 'webhook',
      });
    } catch (e) {
      // Non-fatal: keep Twilio webhook responsive
      console.warn('⚠️ Failed to create cc_conversation for voice call:', e);
    }

    // Check if Vapi is enabled
    const useVapi = process.env.USE_VAPI === 'true';
    const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
    const vapiAssistantId = process.env.VAPI_ASSISTANT_ID;
    const vapiTwilioStreamUrl = process.env.VAPI_TWILIO_STREAM_URL || 'wss://api.vapi.ai/stream';

    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    if (useVapi && vapiPhoneNumberId && vapiAssistantId) {
      /**
       * Step 9 (voice scaffolding): Twilio Voice → Vapi streaming bridge
       *
       * Preferred integration for real-time voice is Twilio <Connect><Stream>.
       * Vapi will receive audio + send events back to `/api/vapi/webhook`.
       *
       * NOTE: This is intentionally "plumbing only" — no banking actions are executed here.
       */
      const connect = twiml.connect();
      // Twilio will open a WebSocket to Vapi. Vapi must be configured to accept the stream.
      // If you need to pass metadata, Vapi typically supports reading query params or stream parameters.
      // This repo currently uses Vapi metadata in webhook processing to map transcripts back to Twilio CallSid.
      // Attach call identifiers so we can map Vapi → Twilio → cc_conversations reliably.
      const streamUrl = new URL(vapiTwilioStreamUrl);
      streamUrl.searchParams.set('twilioCallSid', callSid);
      streamUrl.searchParams.set('twilioFrom', from);
      streamUrl.searchParams.set('twilioTo', to);

      const stream = connect.stream({ url: streamUrl.toString() });
      // Also include as Twilio stream parameters (some receivers prefer this)
      // @ts-ignore - twilio typings vary; parameter() exists at runtime
      stream.parameter({ name: 'twilioCallSid', value: callSid });
      // @ts-ignore
      stream.parameter({ name: 'twilioFrom', value: from });
      // @ts-ignore
      stream.parameter({ name: 'twilioTo', value: to });

      // A short, voice-friendly initial prompt (kept minimal; Vapi will do the speaking once connected)
      twiml.pause({ length: 1 });
    } else {
      // Regular call handling (no Vapi)
      twiml.say(
        {
          voice: 'alice',
          language: 'en-US',
        },
        'Thank you for calling. Your call is being connected to an agent. Please hold.'
      );

      // Example: Connect to a queue (you'll need to create a queue in Twilio)
      // twiml.enqueue({ workflowSid: 'your-workflow-sid' }, 'support');

      // For now, we'll just dial a number or play a message
      twiml.pause({ length: 2 });
      twiml.say(
        {
          voice: 'alice',
          language: 'en-US',
        },
        'We are currently experiencing high call volume. Please try again later or visit our website for support.'
      );
    }

    // Return TwiML response
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error handling incoming call:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      {
        voice: 'alice',
        language: 'en-US',
      },
      'We are sorry, but we are experiencing technical difficulties. Please try again later.'
    );
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

