# WhatsApp & Email Integration Setup Guide

## Overview

Your application now supports:
- ✅ **WhatsApp** via Twilio WhatsApp Business API
- ✅ **Email** via SendGrid (Twilio-owned) or Resend

## WhatsApp Setup

### Step 1: Enable WhatsApp in Twilio

1. **Go to Twilio Console**:
   - Visit: https://console.twilio.com
   - Navigate to: Messaging → Try it out → Send a WhatsApp message

2. **Get Your WhatsApp Sandbox Number**:
   - Twilio provides a sandbox number (e.g., `+14155238886`)
   - Format: `whatsapp:+14155238886`
   - Add this to your `.env.local` as `TWILIO_WHATSAPP_NUMBER`

3. **Join the Sandbox** (for testing):
   - Send "join [your-sandbox-code]" to the sandbox number
   - You'll receive a confirmation message

4. **For Production**:
   - Apply for WhatsApp Business API access
   - Get your official WhatsApp Business number approved
   - Update `TWILIO_WHATSAPP_NUMBER` with your production number

### Step 2: Configure WhatsApp Webhooks

1. **In Twilio Console**:
   - Go to: Messaging → Settings → WhatsApp Sandbox Settings
   - Set "When a message comes in" to: `https://your-ngrok-url.ngrok.io/api/twilio/whatsapp/incoming`
   - Set HTTP method to: `POST`
   - Set "Status callback URL" to: `https://your-ngrok-url.ngrok.io/api/twilio/whatsapp/webhook`
   - Save

### Step 3: Update Environment Variables

Add to your `.env.local`:
```env
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## Email Setup

### Option 1: Using SendGrid (Recommended - Twilio-owned)

1. **Sign up for SendGrid**:
   - Go to: https://sendgrid.com
   - Create a free account (100 emails/day free)

2. **Get API Key**:
   - Go to: Settings → API Keys
   - Create a new API key with "Full Access" or "Mail Send" permissions
   - Copy the API key

3. **Verify Sender**:
   - Go to: Settings → Sender Authentication
   - Verify a single sender email or domain

4. **Update Environment Variables**:
```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM=noreply@yourcompany.com
```

### Option 2: Using Resend (Modern Alternative)

1. **Sign up for Resend**:
   - Go to: https://resend.com
   - Create a free account (100 emails/day free)

2. **Get API Key**:
   - Go to: API Keys
   - Create a new API key
   - Copy the API key

3. **Verify Domain** (for production):
   - Add your domain in Resend dashboard
   - Add DNS records to verify

4. **Update Environment Variables**:
```env
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=noreply@yourcompany.com
```

## API Endpoints

### WhatsApp Endpoints

- `POST /api/twilio/whatsapp/incoming` - Receives incoming WhatsApp messages
- `POST /api/twilio/whatsapp/send` - Sends WhatsApp messages
- `POST /api/twilio/whatsapp/webhook` - Receives WhatsApp status updates

### Email Endpoints

- `POST /api/email/send` - Sends emails
- `POST /api/email/webhook` - Receives email events (bounces, opens, clicks)

## Usage Examples

### Send WhatsApp Message

```typescript
import { sendWhatsApp } from '@/lib/twilio-client';

await sendWhatsApp({
  to: '+1234567890', // or 'whatsapp:+1234567890'
  message: 'Hello! This is a test message.',
  mediaUrl: 'https://example.com/image.jpg', // Optional
});
```

### Send Email

```typescript
import { sendEmail } from '@/lib/twilio-client';

await sendEmail({
  to: 'customer@example.com',
  subject: 'Support Request',
  body: 'Thank you for contacting us...',
  html: '<p>Thank you for contacting us...</p>', // Optional HTML
  from: 'support@yourcompany.com', // Optional, uses EMAIL_FROM if not provided
});
```

## Testing

### Test WhatsApp

1. **Join Twilio WhatsApp Sandbox**:
   - Send "join [sandbox-code]" to the sandbox number
   - You'll receive a confirmation

2. **Send a test message**:
   ```bash
   curl -X POST http://localhost:3000/api/twilio/whatsapp/send \
     -H "Content-Type: application/json" \
     -d '{
       "to": "+1234567890",
       "message": "Hello from the contact center!"
     }'
   ```

3. **Send a message to your sandbox**:
   - Send a WhatsApp message to your sandbox number
   - Check your terminal for incoming message logs

### Test Email

1. **Send a test email**:
   ```bash
   curl -X POST http://localhost:3000/api/email/send \
     -H "Content-Type: application/json" \
     -d '{
       "to": "test@example.com",
       "subject": "Test Email",
       "body": "This is a test email from the contact center."
     }'
   ```

2. **Check email provider dashboard**:
   - SendGrid: Activity Feed
   - Resend: Logs section

## Production Considerations

### WhatsApp

1. **Apply for WhatsApp Business API**:
   - Complete business verification
   - Get your official WhatsApp Business number
   - Update webhooks to production URLs

2. **Message Templates**:
   - For outbound messages, use approved templates
   - Free-form messages only work within 24-hour window after customer message

### Email

1. **Domain Authentication**:
   - Set up SPF, DKIM, and DMARC records
   - Improves deliverability

2. **Webhook Configuration**:
   - Configure webhooks in SendGrid/Resend dashboard
   - Set webhook URL to: `https://your-domain.com/api/email/webhook`

3. **Rate Limits**:
   - Free tier: ~100 emails/day
   - Upgrade for higher limits

## Troubleshooting

### WhatsApp not receiving messages
- Verify sandbox is joined correctly
- Check webhook URL is accessible
- Verify `TWILIO_WHATSAPP_NUMBER` format (must start with `whatsapp:`)

### Email not sending
- Check API key is correct
- Verify sender email is verified/authenticated
- Check spam folder
- Review email provider logs

### Webhooks not working
- Ensure ngrok is running (for local testing)
- Verify webhook URLs are accessible
- Check webhook logs in Twilio/SendGrid/Resend dashboard

## Next Steps

1. **Customize message templates** for WhatsApp
2. **Add email templates** for common responses
3. **Integrate with inbox UI** to show WhatsApp and email conversations
4. **Add real-time updates** for new messages
5. **Implement message threading** and conversation history

