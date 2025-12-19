import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

/**
 * Twilio webhook endpoint for outbound calls
 * This generates TwiML to handle outbound calls
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;

    console.log('Outbound call:', { from, to, callSid });

    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    // Step 9 (voice): Optional Twilio Voice → Vapi streaming bridge for outbound calls
    const useVapi = process.env.USE_VAPI === 'true';
    const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
    const vapiAssistantId = process.env.VAPI_ASSISTANT_ID;
    const vapiTwilioStreamUrl = process.env.VAPI_TWILIO_STREAM_URL || 'wss://api.vapi.ai/stream';
    const vapiPublicApiKey =
      process.env.VAPI_PUBLIC_API_KEY ||
      process.env.VAPI_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_VAPI_PUBLIC_API_KEY ||
      null;
    const vapiStreamApiKey =
      process.env.VAPI_STREAM_API_KEY ||
      process.env.VAPI_API_KEY ||
      vapiPublicApiKey;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (useVapi && vapiPhoneNumberId && vapiAssistantId) {
      const connect = twiml.connect();
      const streamUrl = new URL(vapiTwilioStreamUrl);
      streamUrl.searchParams.set('assistantId', vapiAssistantId);
      streamUrl.searchParams.set('phoneNumberId', vapiPhoneNumberId);
      if (vapiStreamApiKey) streamUrl.searchParams.set('apiKey', vapiStreamApiKey);
      try {
        const { getVapiOrgId } = await import('@/lib/vapi');
        const orgId = await getVapiOrgId();
        if (orgId) streamUrl.searchParams.set('organizationId', orgId);
      } catch {
        // ignore
      }
      streamUrl.searchParams.set('twilioCallSid', callSid);
      streamUrl.searchParams.set('twilioFrom', from);
      streamUrl.searchParams.set('twilioTo', to);

      const stream = connect.stream({
        url: streamUrl.toString(),
        statusCallback: `${appUrl}/api/twilio/stream-webhook`,
        statusCallbackMethod: 'POST',
        // @ts-ignore - Twilio typings vary; attribute exists in TwiML
        statusCallbackEvent: ['start', 'stop', 'error'],
      });
      // @ts-ignore - twilio typings vary; parameter() exists at runtime
      stream.parameter({ name: 'assistantId', value: vapiAssistantId });
      // @ts-ignore
      stream.parameter({ name: 'phoneNumberId', value: vapiPhoneNumberId });
      // @ts-ignore
      stream.parameter({ name: 'twilioCallSid', value: callSid });
      // @ts-ignore
      stream.parameter({ name: 'twilioFrom', value: from });
      // @ts-ignore
      stream.parameter({ name: 'twilioTo', value: to });

      twiml.pause({ length: 1 });
    } else {
      twiml.say(
        {
          voice: 'alice',
          language: 'en-US',
        },
        'Hello, this is a call from our contact center. Please hold while we connect you.'
      );
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error handling outbound call:', error);
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



