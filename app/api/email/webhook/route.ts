import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook endpoint for email events (bounces, opens, clicks, etc.)
 * POST /api/email/webhook
 * 
 * This works with SendGrid, Resend, or other email providers that support webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle different email provider webhook formats
    // SendGrid format
    if (Array.isArray(body)) {
      body.forEach((event: any) => {
        console.log('Email event:', {
          event: event.event,
          email: event.email,
          timestamp: event.timestamp,
          messageId: event.sg_message_id,
        });
      });
    }
    // Resend format
    else if (body.type) {
      console.log('Email event:', {
        type: body.type,
        data: body.data,
      });
    }
    // Generic format
    else {
      console.log('Email webhook received:', body);
    }

    // Here you would typically:
    // 1. Update email status in your database
    // 2. Handle bounces and unsubscribes
    // 3. Track opens and clicks
    // 4. Update conversation status

    return new NextResponse('', { status: 200 });
  } catch (error) {
    console.error('Error processing email webhook:', error);
    return new NextResponse('Error processing webhook', { status: 500 });
  }
}

