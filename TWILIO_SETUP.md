# Twilio Phone Integration Setup Guide

This guide will help you set up Twilio phone call integration for your contact center application.

## Prerequisites

1. A Twilio account (sign up at https://www.twilio.com)
2. A Twilio phone number (you mentioned you already have one)
3. Your Twilio Account SID and Auth Token

## Step 1: Get Your Twilio Credentials

1. Log in to your Twilio Console: https://console.twilio.com
2. Navigate to your dashboard
3. Find your **Account SID** and **Auth Token** (click "Show" to reveal the auth token)
4. Note your **Twilio Phone Number** (format: +1234567890)

## Step 2: Configure Environment Variables

Create a `.env.local` file in the root of your project with the following:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# Application URL (for webhooks)
# For local development, use ngrok or similar to expose your localhost
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** Never commit `.env.local` to version control. It contains sensitive credentials.

## Step 3: Configure Twilio Webhooks

For Twilio to send call events to your application, you need to configure webhooks in your Twilio Console:

### For Incoming Calls:

1. Go to Phone Numbers → Manage → Active Numbers
2. Click on your Twilio phone number
3. Under "Voice & Fax", find "A CALL COMES IN"
4. Set it to: `Webhook` → `[YOUR_APP_URL]/api/twilio/incoming-call`
5. Set HTTP method to: `POST`
6. Save the configuration

### For Call Status Updates:

1. In the same phone number configuration
2. Under "STATUS CALLBACK URL"
3. Set it to: `[YOUR_APP_URL]/api/twilio/webhook`
4. Set HTTP method to: `POST`
5. Save the configuration

### For Local Development:

Since Twilio needs to reach your local server, you'll need to use a tunneling service:

1. **Using ngrok** (recommended):
   ```bash
   ngrok http 3000
   ```
   Then use the ngrok URL (e.g., `https://abc123.ngrok.io`) in your Twilio webhook configuration and `NEXT_PUBLIC_APP_URL`

2. **Using Twilio CLI**:
   ```bash
   twilio phone-numbers:update [YOUR_PHONE_NUMBER] --voice-url http://localhost:3000/api/twilio/incoming-call
   ```

## Step 4: Test the Integration

### Test Incoming Calls:

1. Call your Twilio phone number from any phone
2. You should hear the greeting message
3. Check your application logs to see the webhook being received

### Test Outbound Calls:

You can test making outbound calls through the API:

```bash
curl -X POST http://localhost:3000/api/twilio/make-call \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890"}'
```

## API Endpoints

The following API endpoints are available:

- `POST /api/twilio/incoming-call` - Handles incoming calls (TwiML)
- `POST /api/twilio/outbound-call` - Handles outbound calls (TwiML)
- `POST /api/twilio/webhook` - Receives call status updates
- `POST /api/twilio/make-call` - Initiates an outbound call
- `GET /api/twilio/calls` - Lists all calls
- `GET /api/twilio/calls/[callSid]` - Gets details of a specific call
- `POST /api/twilio/calls/[callSid]` - Ends a call

## Next Steps

1. **Customize Call Flow**: Edit `/app/api/twilio/incoming-call/route.ts` to customize how incoming calls are handled
2. **Connect to Agents**: Implement logic to route calls to available agents
3. **Add IVR**: Create an Interactive Voice Response menu
4. **Call Recording**: Enable call recording in Twilio
5. **Real-time Updates**: Integrate with WebSockets or Server-Sent Events to update the UI in real-time

## Troubleshooting

### Webhooks not being received:
- Ensure your local server is accessible (use ngrok)
- Check that the webhook URL is correctly configured in Twilio
- Verify the webhook URL is accessible (try opening it in a browser)

### Calls not connecting:
- Verify your Twilio credentials are correct
- Check that your phone number is verified (for trial accounts)
- Review Twilio logs in the console

### Environment variables not working:
- Ensure `.env.local` is in the root directory
- Restart your Next.js development server after adding environment variables
- Check that variable names match exactly (case-sensitive)

## Security Notes

- Never expose your Auth Token in client-side code
- Use environment variables for all sensitive data
- Consider using Twilio's webhook signature validation for production
- Implement rate limiting on your API endpoints

