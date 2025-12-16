import { NextRequest, NextResponse } from 'next/server';
import { createVapiCall, getVapiApiKey, getVapiAssistantId, getVapiPhoneNumberId } from '@/lib/vapi';

/**
 * Create a Vapi call
 * POST /api/vapi/call
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, assistantId, metadata } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Phone number (to) is required' },
        { status: 400 }
      );
    }

    const phoneNumberId = getVapiPhoneNumberId();
    const defaultAssistantId = assistantId || getVapiAssistantId();

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: 'VAPI_PHONE_NUMBER_ID is not configured. Please set it in your .env.local file.' },
        { status: 400 }
      );
    }

    if (!defaultAssistantId) {
      return NextResponse.json(
        { error: 'VAPI_ASSISTANT_ID is not configured and no assistantId provided.' },
        { status: 400 }
      );
    }

    const vapiCall = await createVapiCall({
      phoneNumberId,
      customer: {
        number: to,
      },
      assistantId: defaultAssistantId,
      metadata: metadata || {},
    });

    console.log('Vapi call created:', vapiCall.id);

    return NextResponse.json({
      success: true,
      call: vapiCall,
    });
  } catch (error: any) {
    console.error('Error creating Vapi call:', error);
    return NextResponse.json(
      {
        error: 'Failed to create Vapi call',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get Vapi call details
 * GET /api/vapi/call?id=call-id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('id');

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      );
    }

    const { getVapiCall } = await import('@/lib/vapi');
    const call = await getVapiCall(callId);

    return NextResponse.json({
      success: true,
      call,
    });
  } catch (error: any) {
    console.error('Error getting Vapi call:', error);
    return NextResponse.json(
      {
        error: 'Failed to get Vapi call',
        message: error.message,
      },
      { status: 500 }
    );
  }
}



