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

    // For outbound calls, you might want to:
    // 1. Connect directly to the agent
    // 2. Play a message first
    // 3. Record the call

    twiml.say(
      {
        voice: 'alice',
        language: 'en-US',
      },
      'Hello, this is a call from our contact center. Please hold while we connect you.'
    );

    // Example: Dial an agent or external number
    // const dial = twiml.dial();
    // dial.number('+1234567890'); // Agent's phone number

    // For now, we'll just play a message
    // You can customize this based on your needs

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

