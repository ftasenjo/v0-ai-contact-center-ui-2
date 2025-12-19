import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';

/**
 * API endpoint to get details of a specific call
 * GET /api/twilio/calls/[callSid]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callSid: string }> }
) {
  try {
    const { callSid } = await params;

    if (!callSid) {
      return NextResponse.json(
        { error: 'Call SID is required' },
        { status: 400 }
      );
    }

    const client = getTwilioClient();

    // Fetch call details from Twilio
    const call = await client.calls(callSid).fetch();

    // Transform to our format
    const formattedCall = {
      callSid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      direction: call.direction === 'inbound' ? 'inbound' : 'outbound',
      duration: call.duration ? parseInt(call.duration) : undefined,
      startTime: call.startTime ? new Date(call.startTime) : undefined,
      endTime: call.endTime ? new Date(call.endTime) : undefined,
      price: call.price,
      priceUnit: call.priceUnit,
    };

    return NextResponse.json({
      success: true,
      call: formattedCall,
    });
  } catch (error: any) {
    console.error('Error fetching call:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch call',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * API endpoint to end a call
 * POST /api/twilio/calls/[callSid]/end
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callSid: string }> }
) {
  try {
    const { callSid } = await params;

    if (!callSid) {
      return NextResponse.json(
        { error: 'Call SID is required' },
        { status: 400 }
      );
    }

    const client = getTwilioClient();

    // Update call status to completed
    const call = await client.calls(callSid).update({ status: 'completed' });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
    });
  } catch (error: any) {
    console.error('Error ending call:', error);
    return NextResponse.json(
      {
        error: 'Failed to end call',
        message: error.message,
      },
      { status: 500 }
    );
  }
}



