import { NextRequest, NextResponse } from 'next/server';
import { storeCall, updateCallStatus, getCall } from '@/lib/store-adapter';

/**
 * Vapi webhook endpoint for call events
 * POST /api/vapi/webhook
 * 
 * Vapi sends webhooks for:
 * - call-status-update
 * - function-call
 * - speech-update
 * - transcript
 * - end-of-call-report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, call } = body;

    console.log('Vapi webhook received:', { type, callId: call?.id });

    if (!call) {
      return NextResponse.json({ error: 'Call data is required' }, { status: 400 });
    }

    // Handle different webhook types
    switch (type) {
      case 'call-status-update':
        await handleCallStatusUpdate(call);
        break;
      
      case 'end-of-call-report':
        await handleEndOfCallReport(call);
        break;
      
      case 'transcript':
        await handleTranscript(call, body);
        break;
      
      case 'function-call':
        await handleFunctionCall(call, body);
        break;
      
      default:
        console.log('Unhandled Vapi webhook type:', type);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Vapi webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle call status update
 */
async function handleCallStatusUpdate(call: any) {
  const callSid = `vapi-${call.id}`;
  const existingCall = await getCall(callSid);

  if (existingCall) {
    await updateCallStatus(callSid, call.status, {
      duration: call.duration,
      endTime: call.endedAt ? new Date(call.endedAt) : undefined,
    });
  } else {
    await storeCall({
      callSid,
      from: call.customer?.number || 'unknown',
      to: call.phoneNumber?.number || 'unknown',
      status: call.status || 'unknown',
      direction: 'inbound',
      startTime: call.startedAt ? new Date(call.startedAt) : new Date(),
      endTime: call.endedAt ? new Date(call.endedAt) : undefined,
      duration: call.duration,
      topic: 'Vapi AI Call',
    });
  }
}

/**
 * Handle end of call report
 */
async function handleEndOfCallReport(call: any) {
  const callSid = `vapi-${call.id}`;
  
  await updateCallStatus(callSid, 'completed', {
    duration: call.duration,
    endTime: call.endedAt ? new Date(call.endedAt) : new Date(),
    sentiment: call.sentiment || 'neutral',
    sentimentScore: call.sentimentScore,
  });

  // Store transcript if available
  if (call.transcript) {
    // TODO: Store transcript in call_transcripts table
    console.log('Call transcript:', call.transcript);
  }
}

/**
 * Handle transcript updates
 */
async function handleTranscript(call: any, body: any) {
  const callSid = `vapi-${call.id}`;
  
  // TODO: Store transcript chunks in real-time
  console.log('Transcript update:', {
    callId: call.id,
    transcript: body.transcript,
    role: body.role,
  });
}

/**
 * Handle function calls (if assistant calls functions)
 */
async function handleFunctionCall(call: any, body: any) {
  console.log('Function call:', {
    callId: call.id,
    functionName: body.functionCall?.name,
    parameters: body.functionCall?.parameters,
  });
  
  // Handle function calls here (e.g., create ticket, update CRM, etc.)
}

