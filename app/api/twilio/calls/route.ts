import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';

/**
 * API endpoint to get list of calls
 * GET /api/twilio/calls?status=active&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const client = getTwilioClient();

    // Fetch calls from Twilio
    const calls = await client.calls.list({
      status: status as any,
      limit: limit,
    });

    // Transform Twilio call data to match our application format
    const formattedCalls = calls.map((call) => ({
      callSid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      direction: call.direction === 'inbound' ? 'inbound' : 'outbound',
      duration: call.duration ? parseInt(call.duration) : undefined,
      startTime: call.startTime ? new Date(call.startTime) : undefined,
      endTime: call.endTime ? new Date(call.endTime) : undefined,
    }));

    return NextResponse.json({
      success: true,
      calls: formattedCalls,
      count: formattedCalls.length,
    });
  } catch (error: any) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch calls',
        message: error.message,
      },
      { status: 500 }
    );
  }
}



