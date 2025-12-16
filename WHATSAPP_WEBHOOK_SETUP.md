# How to Configure WhatsApp Webhooks in Twilio Console

## Step-by-Step Guide

### Step 1: Access Twilio Console

1. Go to: https://console.twilio.com
2. Sign in to your account

### Step 2: Navigate to WhatsApp Settings

**Method 1: Via Messaging Dashboard**
1. In the left sidebar, click on **"Messaging"**
2. Click on **"Try it out"** or **"Settings"**
3. Look for **"WhatsApp Sandbox Settings"** or **"WhatsApp"** section

**Method 2: Direct URL**
- Go directly to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

### Step 3: Configure Incoming Message Webhook

1. **Find "When a message comes in"** section
   - This might be labeled as:
     - "When a message comes in"
     - "Incoming Message Webhook"
     - "Webhook URL"
     - "A MESSAGE COMES IN"

2. **Set the webhook URL**:
   - Select **"Webhook"** from the dropdown (if there's a dropdown)
   - Enter this URL: `https://nicole-brutalitarian-gilberto.ngrok-free.dev/api/twilio/whatsapp/incoming`
   - Make sure it starts with `https://` (not `http://`)
   - No trailing slash at the end

3. **Set HTTP method**:
   - Select **"POST"** from the HTTP method dropdown
   - This is usually right next to the URL field

4. **Click "Save"** or **"Update"**

### Step 4: Configure Status Callback Webhook

1. **Find "Status callback URL"** section
   - This might be labeled as:
     - "Status callback URL"
     - "Status Callback"
     - "Event Webhook URL"
     - "Message Status Callback"

2. **Set the status callback URL**:
   - Enter this URL: `https://nicole-brutalitarian-gilberto.ngrok-free.dev/api/twilio/whatsapp/webhook`
   - Make sure it starts with `https://`
   - No trailing slash

3. **Set HTTP method**:
   - Select **"POST"**

4. **Click "Save"** or **"Update"**

## Visual Guide

The WhatsApp settings page typically looks like this:

```
┌─────────────────────────────────────────┐
│ WhatsApp Sandbox Settings               │
├─────────────────────────────────────────┤
│                                         │
│ When a message comes in:               │
│ [Webhook ▼] [URL input field]          │
│ HTTP Method: [POST ▼]                   │
│                                         │
│ Status callback URL:                    │
│ [URL input field]                       │
│ HTTP Method: [POST ▼]                   │
│                                         │
│ [Save] [Cancel]                        │
└─────────────────────────────────────────┘
```

## Alternative: If You Can't Find WhatsApp Settings

If you don't see WhatsApp settings in the Messaging section:

1. **Check if WhatsApp is enabled**:
   - Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
   - You should see a sandbox number and instructions

2. **Enable WhatsApp Sandbox**:
   - Follow the instructions to join the sandbox
   - Send "join [sandbox-code]" to the sandbox number

3. **Look for "Configure" or "Settings"** button:
   - There might be a "Configure" button next to your sandbox number
   - Click it to access webhook settings

## Important Notes

1. **ngrok URL**: Make sure ngrok is running and your URL matches exactly:
   - Current: `https://nicole-brutalitarian-gilberto.ngrok-free.dev`
   - If ngrok restarts, you'll get a new URL and need to update webhooks

2. **URL Format**: 
   - ✅ Correct: `https://nicole-brutalitarian-gilberto.ngrok-free.dev/api/twilio/whatsapp/incoming`
   - ❌ Wrong: `https://nicole-brutalitarian-gilberto.ngrok-free.dev/api/twilio/whatsapp/incoming/` (trailing slash)
   - ❌ Wrong: `http://nicole-brutalitarian-gilberto.ngrok-free.dev/...` (http instead of https)

3. **Testing**: After saving, you can test by:
   - Sending a WhatsApp message to your sandbox number
   - Checking your terminal for incoming message logs
   - Checking ngrok dashboard at http://127.0.0.1:4040

## Troubleshooting

### Can't find WhatsApp settings?
- Make sure you're in the correct Twilio account
- Try the direct URL: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- Check if WhatsApp is enabled for your account

### Webhook not saving?
- Verify the URL is accessible (try opening it in a browser)
- Check that ngrok is running
- Ensure you're using HTTPS (not HTTP)

### Webhooks not being received?
- Check ngrok dashboard: http://127.0.0.1:4040
- Verify the URL in Twilio matches your ngrok URL exactly
- Check your Next.js server is running
- Look for errors in your terminal

## Quick Checklist

- [ ] Navigated to WhatsApp settings in Twilio Console
- [ ] Set "When a message comes in" webhook URL
- [ ] Set HTTP method to POST
- [ ] Set "Status callback URL"
- [ ] Set status callback HTTP method to POST
- [ ] Clicked Save
- [ ] Verified ngrok is running
- [ ] Tested by sending a WhatsApp message

---

**Need help?** If you're stuck on any step, let me know what you see in your Twilio Console and I can guide you further!



