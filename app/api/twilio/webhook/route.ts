import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';

/**
 * Twilio webhook endpoint for call status updates
 * This endpoint receives status callbacks from Twilio
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const direction = formData.get('Direction') as string;
    const duration = formData.get('CallDuration') as string;

    console.log('Twilio webhook received:', {
      callSid,
      callStatus,
      from,
      to,
      direction,
      duration,
    });

    // Store/update call status
    const { storeCall, updateCallStatus, getCall } = await import('@/lib/store-adapter');
    
    const existingCall = await getCall(callSid);
    if (existingCall) {
      // Update existing call
      await updateCallStatus(callSid, callStatus, {
        duration: duration ? parseInt(duration) : undefined,
        endTime: callStatus === 'completed' ? new Date() : undefined,
      });
    } else {
      // Store new call
      await storeCall({
        callSid,
        from,
        to,
        status: callStatus,
        direction: direction === 'inbound' ? 'inbound' : 'outbound',
        startTime: new Date(),
        duration: duration ? parseInt(duration) : undefined,
        endTime: callStatus === 'completed' ? new Date() : undefined,
      });
    }

    return new NextResponse('', { status: 200 });
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    return new NextResponse('Error processing webhook', { status: 500 });
  }
}

