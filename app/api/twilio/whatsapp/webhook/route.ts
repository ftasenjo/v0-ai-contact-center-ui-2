import { NextRequest, NextResponse } from 'next/server';

/**
 * Twilio webhook endpoint for WhatsApp message status updates
 * POST /api/twilio/whatsapp/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    console.log('WhatsApp status update:', {
      messageSid,
      messageStatus,
      from,
      to,
    });

    // Here you would typically:
    // 1. Update message status in your database
    // 2. Trigger real-time UI updates
    // 3. Handle delivery failures

    return new NextResponse('', { status: 200 });
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return new NextResponse('Error processing webhook', { status: 500 });
  }
}



