import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';

/**
 * API endpoint to send WhatsApp messages
 * POST /api/twilio/whatsapp/send
 * Body: { to: string, message: string, mediaUrl?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, mediaUrl } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number (to) and message are required' },
        { status: 400 }
      );
    }

    const client = getTwilioClient();
    
    // Get WhatsApp sender number from environment (format: whatsapp:+14155238886)
    const from = process.env.TWILIO_WHATSAPP_NUMBER || `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
    
    // Format recipient number (ensure it starts with whatsapp:)
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    // Send WhatsApp message
    const messageResponse = await client.messages.create({
      from: from,
      to: toFormatted,
      body: message,
      ...(mediaUrl && { mediaUrl: [mediaUrl] }), // Optional media attachment
    });

    console.log('WhatsApp message sent:', messageResponse.sid);

    return NextResponse.json({
      success: true,
      messageSid: messageResponse.sid,
      status: messageResponse.status,
      to: messageResponse.to,
      from: messageResponse.from,
    });
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json(
      {
        error: 'Failed to send WhatsApp message',
        message: error.message,
      },
      { status: 500 }
    );
  }
}



