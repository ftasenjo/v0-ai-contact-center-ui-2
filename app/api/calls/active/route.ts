import { NextRequest, NextResponse } from 'next/server';
import { getActiveCalls, getAllCalls } from '@/lib/store-adapter';

/**
 * API endpoint to get active calls
 * GET /api/calls/active
 */
export async function GET(request: NextRequest) {
  try {
    const activeCalls = await getActiveCalls();
    const allCalls = await getAllCalls();

    // Transform to match Live Console format
    const formattedCalls = activeCalls.map((call) => ({
      id: call.callSid,
      callSid: call.callSid,
      agent: {
        id: call.agentId || 'unassigned',
        name: call.agentId ? 'Agent' : 'Unassigned',
        avatar: '/placeholder-user.jpg',
        status: 'on-call',
      },
      customer: {
        name: call.customerName || call.from,
        company: call.customerEmail?.split('@')[1] || 'Unknown',
        tier: 'standard' as const,
      },
      duration: call.duration 
        ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')}`
        : calculateDuration(call.startTime),
      sentiment: call.sentiment || 'neutral',
      sentimentScore: call.sentimentScore || 0.5,
      topic: call.topic || 'Incoming Call',
      riskFlags: call.sentiment === 'negative' ? ['escalation-risk'] : [],
      queue: 'General Support',
      from: call.from,
      to: call.to,
      status: call.status,
      startTime: call.startTime,
    }));

    return NextResponse.json({
      success: true,
      calls: formattedCalls,
      count: formattedCalls.length,
      totalCalls: allCalls.length,
    });
  } catch (error: any) {
    console.error('Error fetching active calls:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch active calls',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

function calculateDuration(startTime: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - startTime.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

