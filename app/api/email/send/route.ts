import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to send emails
 * POST /api/email/send
 * Body: { to: string, subject: string, body: string, from?: string }
 * 
 * Note: Twilio doesn't have native email service, so we'll use SendGrid (owned by Twilio)
 * or you can use other email services like Resend, AWS SES, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody, from, html } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'To, subject, and body are required' },
        { status: 400 }
      );
    }

    // Option 1: Using SendGrid (Twilio-owned)
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = from || process.env.EMAIL_FROM || 'noreply@yourcompany.com';

    if (sendGridApiKey) {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(sendGridApiKey);

      const msg = {
        to: to,
        from: fromEmail,
        subject: subject,
        text: emailBody,
        html: html || emailBody,
      };

      await sgMail.default.send(msg);

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
      });
    }

    // Option 2: Using Resend (modern alternative)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: subject,
          html: html || emailBody,
          text: emailBody,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      return NextResponse.json({
        success: true,
        messageId: data.id,
        message: 'Email sent successfully',
      });
    }

    // Fallback: Return error if no email service configured
    return NextResponse.json(
      {
        error: 'No email service configured. Please set SENDGRID_API_KEY or RESEND_API_KEY in environment variables.',
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      {
        error: 'Failed to send email',
        message: error.message,
      },
      { status: 500 }
    );
  }
}



