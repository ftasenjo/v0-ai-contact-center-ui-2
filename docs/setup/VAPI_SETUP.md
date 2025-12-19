# Vapi Integration Setup Guide

## Overview

Vapi is a voice AI platform that allows you to build AI voice assistants for phone calls. This guide will help you integrate Vapi with your contact center.

## What is Vapi?

Vapi provides:
- **AI Voice Assistants** - Conversational AI for phone calls
- **Natural Language Processing** - Understands customer intent
- **Call Routing** - Routes calls based on AI analysis
- **Call Transcription** - Real-time transcription
- **Function Calling** - Can trigger actions during calls

## Prerequisites

1. **Vapi Account**: Sign up at https://vapi.ai
2. **API Key**: Get your API key from Vapi dashboard
3. **Assistant Created**: Create an AI assistant in Vapi dashboard
4. **Phone Number**: Configure a phone number in Vapi (or use Twilio integration)

## Step 1: Get Vapi Credentials

1. **Sign up/Login** to Vapi: https://vapi.ai
2. **Go to Settings** → API Keys
3. **Copy your API Key**
4. **Go to Assistants** → Create or select an assistant
5. **Copy the Assistant ID**
6. **Go to Phone Numbers** → Configure a phone number
7. **Copy the Phone Number ID**

## Step 2: Configure Environment Variables

Add to your `.env.local` file:

```env
# Vapi Configuration
VAPI_API_KEY=your-vapi-api-key-here
VAPI_ASSISTANT_ID=your-assistant-id-here
VAPI_PHONE_NUMBER_ID=your-phone-number-id-here
USE_VAPI=true
```

## Step 3: Integration Options

### Option A: Vapi Handles Calls Directly (Recommended)

1. **Configure Vapi Phone Number**:
   - In Vapi dashboard, set up a phone number
   - Point it to your assistant
   - Use this number for incoming calls

2. **Update Twilio Webhook**:
   - Point Twilio webhook to Vapi's endpoint
   - Or use Vapi's Twilio integration

### Option B: Twilio → Vapi Integration

1. **Incoming calls via Twilio**:
   - Calls come to your Twilio number (+17623162272)
   - Twilio webhook creates Vapi call via API
   - Vapi handles the conversation
   - Webhooks update your database

2. **This is what we've implemented**:
   - `/api/twilio/incoming-call` creates Vapi call
   - Vapi webhooks update call status
   - Transcripts stored in database

## Step 4: Configure Vapi Webhooks

1. **Go to Vapi Dashboard** → Settings → Webhooks
2. **Add Webhook URL**:
   ```
   https://your-domain.com/api/vapi/webhook
   ```
   Or for local development with ngrok:
   ```
   https://your-ngrok-url.ngrok.io/api/vapi/webhook
   ```

3. **Select Webhook Events**:
   - ✅ call-status-update
   - ✅ end-of-call-report
   - ✅ transcript
   - ✅ function-call (optional)

## Step 5: Create Vapi Assistant

1. **Go to Assistants** in Vapi dashboard
2. **Create New Assistant**:
   - Name: "Contact Center Assistant"
   - Model: Choose (GPT-4, Claude, etc.)
   - Voice: Select a voice
   - First Message: "Hello! How can I help you today?"
   - System Message: Configure assistant behavior

3. **Configure Functions** (optional):
   - Create ticket
   - Check order status
   - Schedule appointment
   - Escalate to human

## Step 6: Test the Integration

### Test via API:

```bash
# Create a Vapi call
curl -X POST http://localhost:3000/api/vapi/call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "assistantId": "your-assistant-id"
  }'
```

### Test via Twilio:

1. **Call your Twilio number**: +17623162272
2. **Check logs**: Should see "Vapi call created"
3. **Check Vapi dashboard**: Should see call in Vapi
4. **Check Live Console**: Should see call appear

## API Endpoints

### Create Vapi Call
```
POST /api/vapi/call
Body: {
  "to": "+15551234567",
  "assistantId": "optional-assistant-id",
  "metadata": {}
}
```

### Get Vapi Call
```
GET /api/vapi/call?id=call-id
```

### Vapi Webhook
```
POST /api/vapi/webhook
(Handled automatically by Vapi)
```

## How It Works

### Call Flow:

1. **Call arrives** → Twilio webhook → `/api/twilio/incoming-call`
2. **Vapi call created** → Via Vapi API
3. **AI handles call** → Vapi assistant converses with customer
4. **Webhooks update** → Vapi sends updates to `/api/vapi/webhook`
5. **Database updated** → Call status, transcript stored
6. **Live Console** → Shows call in real-time

### Webhook Events:

- **call-status-update**: Call status changes (ringing, in-progress, completed)
- **end-of-call-report**: Call ends, includes summary and transcript
- **transcript**: Real-time transcript updates
- **function-call**: Assistant calls a function (e.g., create ticket)

## Features

### ✅ Implemented:
- Vapi call creation via API
- Webhook handling for call events
- Call status tracking
- Database integration
- Live Console display

### 🔄 To Implement:
- Real-time transcript display
- Function call handling
- Assistant configuration UI
- Call recording playback

## Troubleshooting

### Call doesn't connect to Vapi?
1. Check `USE_VAPI=true` in `.env.local`
2. Verify `VAPI_PHONE_NUMBER_ID` and `VAPI_ASSISTANT_ID` are set
3. Check server logs for errors
4. Verify Vapi API key is correct

### Webhooks not working?
1. Check webhook URL in Vapi dashboard
2. Verify ngrok is running (for local dev)
3. Check server logs for webhook errors
4. Verify webhook events are enabled

### Assistant not responding?
1. Check assistant configuration in Vapi dashboard
2. Verify assistant ID is correct
3. Check Vapi dashboard for call logs
4. Review assistant system message

## Next Steps

1. **Configure Assistant**: Customize AI behavior in Vapi dashboard
2. **Add Functions**: Create functions for common tasks
3. **Test Calls**: Make test calls and review transcripts
4. **Monitor**: Use Vapi dashboard to monitor call quality
5. **Optimize**: Adjust assistant prompts based on performance

## Resources

- **Vapi Documentation**: https://docs.vapi.ai
- **Vapi Dashboard**: https://dashboard.vapi.ai
- **API Reference**: https://docs.vapi.ai/api-reference

---

**✅ Vapi integration is ready!** Configure your credentials and start making AI-powered calls!



