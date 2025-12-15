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

    // Check if Vapi is enabled
    const useVapi = process.env.USE_VAPI === 'true';
    const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
    const vapiAssistantId = process.env.VAPI_ASSISTANT_ID;

    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    if (useVapi && vapiPhoneNumberId && vapiAssistantId) {
      // Route call to Vapi AI assistant
      // Vapi handles the call through their platform
      // We'll use Twilio's <Dial> to connect to Vapi's phone number
      // Or use Vapi's direct integration
      
      // Option 1: Use Vapi's phone number (if configured)
      // Option 2: Use Vapi API to create call and connect
      
      // For now, we'll create a Vapi call via API
      try {
        const { createVapiCall } = await import('@/lib/vapi');
        const vapiCall = await createVapiCall({
          phoneNumberId: vapiPhoneNumberId,
          customer: {
            number: from,
          },
          assistantId: vapiAssistantId,
          metadata: {
            twilioCallSid: callSid,
            twilioFrom: from,
            twilioTo: to,
          },
        });
        
        console.log('✅ Vapi call created:', vapiCall.id);
        
        // Return TwiML that connects to Vapi
        // Vapi will handle the call, so we can either:
        // 1. Redirect to Vapi's phone number
        // 2. Use Vapi's webhook to handle the call
        
        twiml.say(
          {
            voice: 'alice',
            language: 'en-US',
          },
          'Connecting you to our AI assistant. Please hold.'
        );
        
        // Note: Vapi typically handles calls through their own phone numbers
        // You'll need to configure Vapi to use your Twilio number or vice versa
        // This is a simplified integration - see VAPI_SETUP.md for full setup
        
      } catch (vapiError: any) {
        console.error('Error creating Vapi call:', vapiError);
        // Fallback to regular call handling
        twiml.say(
          {
            voice: 'alice',
            language: 'en-US',
          },
          'Thank you for calling. Your call is being connected to an agent. Please hold.'
        );
      }
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

