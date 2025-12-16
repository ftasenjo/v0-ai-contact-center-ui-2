import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient, getTwilioPhoneNumber } from '@/lib/twilio';

/**
 * API endpoint to make an outbound call
 * POST /api/twilio/make-call
 * Body: { to: string, agentId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, agentId } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Phone number (to) is required' },
        { status: 400 }
      );
    }

    const client = getTwilioClient();
    const from = getTwilioPhoneNumber();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Make the call
    const call = await client.calls.create({
      to: to,
      from: from,
      url: `${appUrl}/api/twilio/outbound-call`, // TwiML URL for outbound calls
      statusCallback: `${appUrl}/api/twilio/webhook`, // Webhook for status updates
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    console.log('Outbound call initiated:', call.sid);

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from,
    });
  } catch (error: any) {
    console.error('Error making call:', error);
    return NextResponse.json(
      {
        error: 'Failed to make call',
        message: error.message,
      },
      { status: 500 }
    );
  }
}



