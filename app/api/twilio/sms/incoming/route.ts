import { NextRequest, NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';

/**
 * Twilio webhook endpoint for incoming SMS messages
 * POST /api/twilio/sms/incoming
 * 
 * This endpoint receives SMS messages and can be used to:
 * - Capture verification codes from Meta/WhatsApp
 * - Handle SMS conversations
 * - Store SMS messages in the database
 */
export async function POST(request: NextRequest) {
  // Log immediately that webhook was called
  console.log('🔔 SMS Webhook Called - Request received');
  
  try {
    // Parse Twilio webhook payload (form-encoded)
    const formData = await request.formData();
    const from = formData.get('From') as string; // Phone number (e.g., +1234567890)
    const to = formData.get('To') as string; // Your Twilio number
    const body = (formData.get('Body') as string) || ''; // Message content
    const messageSid = formData.get('MessageSid') as string;
    const numMedia = formData.get('NumMedia') as string || '0';

    console.log('📱 Incoming SMS:', { from, to, body, messageSid, messageSidLength: messageSid?.length });
    console.log('📱 Full SMS Details:', {
      from,
      to,
      body: body.substring(0, 100), // First 100 chars
      bodyLength: body.length,
      messageSid,
      numMedia,
      timestamp: new Date().toISOString(),
    });

    // Extract media metadata if any
    const mediaUrls: string[] = [];
    if (parseInt(numMedia) > 0) {
      for (let i = 0; i < parseInt(numMedia); i++) {
        const mediaUrl = formData.get(`MediaUrl${i}`) as string;
        if (mediaUrl) {
          mediaUrls.push(mediaUrl);
        }
      }
    }

    // Check if this looks like a verification code (common patterns)
    const verificationPatterns = [
      /\b\d{4,8}\b/, // 4-8 digit codes
      /code[:\s]*(\d{4,8})/i,
      /verification[:\s]*(\d{4,8})/i,
      /verify[:\s]*(\d{4,8})/i,
    ];

    const isVerificationCode = verificationPatterns.some(pattern => pattern.test(body));
    
    if (isVerificationCode) {
      console.log('🔐 VERIFICATION CODE DETECTED:', body);
      // Log prominently so you can see it
      console.log('═══════════════════════════════════════');
      console.log('🔐 VERIFICATION CODE:', body);
      console.log('🔐 VERIFICATION CODE:', body);
      console.log('🔐 VERIFICATION CODE:', body);
      console.log('═══════════════════════════════════════');
    }
    
    // ALWAYS log the body for verification codes (even if pattern doesn't match)
    // Meta sometimes sends codes in different formats
    if (body && body.length <= 20 && /\d/.test(body)) {
      console.log('⚠️ Possible verification code (checking):', body);
    }

    // Store the message (optional - for verification code tracking)
    try {
      const { createBankingConversationFromMessage } = await import('@/lib/banking-store');
      const { normalizeAddress } = await import('@/lib/identity-resolution');
      
      const normalizedFromAddress = normalizeAddress('sms', from);
      const normalizedToAddress = normalizeAddress('sms', to);
      const normalizedFrom = normalizedFromAddress.replace(/^sms:/, '');
      const normalizedTo = normalizedToAddress.replace(/^sms:/, '');

      await createBankingConversationFromMessage({
        messageSid,
        from: normalizedFrom,
        to: normalizedTo,
        body: body || '[SMS message]',
        channel: 'sms' as const,
        timestamp: new Date(),
        provider: 'twilio',
        fromAddress: normalizedFromAddress,
        toAddress: normalizedToAddress,
        bodyJson: {
          raw: body,
          mediaUrls,
          numMedia: parseInt(numMedia),
          twilioPayload: {
            accountSid: formData.get('AccountSid') as string,
            messageStatus: formData.get('MessageStatus') as string,
          },
        },
        mediaUrls,
      });
    } catch (error) {
      // Non-fatal - just log it
      console.warn('⚠️ Failed to store SMS message:', error);
    }

    // Return TwiML response (acknowledge receipt)
    const twiml = new (await import('twilio')).default.twiml.MessagingResponse();
    
    // Don't send an auto-reply for verification codes (Meta might send them)
    // Only send reply for regular messages if needed
    if (!isVerificationCode && body.toLowerCase().includes('help')) {
      twiml.message('Thank you for your message! Our team will get back to you shortly.');
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('❌ Error handling incoming SMS:', error);
    
    // Still return 200 to Twilio (don't retry)
    const twiml = new (await import('twilio')).default.twiml.MessagingResponse();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

