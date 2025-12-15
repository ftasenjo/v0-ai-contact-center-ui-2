# WhatsApp Troubleshooting Guide

## Issue: WhatsApp Messages Not Working

If messages to +1 (415) 523‑8886 aren't working, follow these steps:

## ✅ Step 1: Check Dev Server is Running

```bash
npm run dev
```

Your server should be running on `http://localhost:3000`

## ✅ Step 2: Expose Local Server (Required for Webhooks)

Twilio needs to reach your local server. Use **ngrok**:

### Install ngrok:
```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

### Start ngrok:
```bash
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

## ✅ Step 3: Configure Twilio WhatsApp Webhooks

1. **Go to Twilio Console**: https://console.twilio.com
2. **Navigate to**: Messaging → Settings → WhatsApp Sandbox Settings
   - Direct link: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
3. **Set Webhook URLs**:

   **"When a message comes in"**:
   ```
   https://your-ngrok-url.ngrok.io/api/twilio/whatsapp/incoming
   ```
   Method: `POST`

   **"Status callback URL"**:
   ```
   https://your-ngrok-url.ngrok.io/api/twilio/whatsapp/webhook
   ```
   Method: `POST`

4. **Save** the configuration

## ✅ Step 4: Join WhatsApp Sandbox (If Using Sandbox)

If you're using Twilio's WhatsApp Sandbox:

1. **Get your sandbox code** from Twilio Console
2. **Send WhatsApp message** to +1 (415) 523‑8886:
   ```
   join [your-sandbox-code]
   ```
3. You'll receive a confirmation message

## ✅ Step 5: Test the Webhook

### Test 1: Check if endpoint is accessible
```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/twilio/whatsapp/incoming \
  -d "From=whatsapp:+1234567890" \
  -d "To=whatsapp:+14155238886" \
  -d "Body=Test message" \
  -d "MessageSid=test123"
```

### Test 2: Send actual WhatsApp message
1. Send a WhatsApp message to **+1 (415) 523‑8886**
2. Check your server logs for:
   - "Incoming WhatsApp message"
   - "✅ LangGraph processed message"

## ✅ Step 6: Check Environment Variables

Verify in `.env.local`:
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
OPENAI_API_KEY=your-openai-key
```

## ✅ Step 7: Check Server Logs

When you send a WhatsApp message, you should see:

```
Incoming WhatsApp message: {
  from: 'whatsapp:+1234567890',
  to: 'whatsapp:+14155238886',
  body: 'Your message',
  messageSid: 'SM...'
}
✅ LangGraph processed message: {
  intent: '...',
  sentiment: '...',
  requiresEscalation: false
}
```

## 🔍 Common Issues

### Issue 1: "Webhook URL not accessible"
- **Solution**: Make sure ngrok is running and URL is correct
- **Check**: Visit `https://your-ngrok-url.ngrok.io/api/twilio/whatsapp/incoming` in browser (should show error, but be accessible)

### Issue 2: "Not receiving messages"
- **Solution**: Check if you've joined the WhatsApp sandbox
- **Check**: Send "join [code]" to the sandbox number first

### Issue 3: "Messages received but no response"
- **Solution**: Check server logs for errors
- **Check**: Verify `OPENAI_API_KEY` is set correctly
- **Check**: Verify LangGraph packages are installed

### Issue 4: "404 Not Found"
- **Solution**: Verify webhook URL is correct (no trailing slash)
- **Correct**: `https://your-url.ngrok.io/api/twilio/whatsapp/incoming`
- **Wrong**: `https://your-url.ngrok.io/api/twilio/whatsapp/incoming/`

### Issue 5: "CORS errors"
- **Solution**: This shouldn't happen with Twilio webhooks, but if it does, check Next.js CORS settings

## 🧪 Quick Test

1. **Start dev server**: `npm run dev`
2. **Start ngrok**: `ngrok http 3000`
3. **Update Twilio webhook** with ngrok URL
4. **Send WhatsApp** to +1 (415) 523‑8886
5. **Check logs** for incoming message

## 📋 Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] ngrok running (`ngrok http 3000`)
- [ ] Twilio webhook URL updated with ngrok URL
- [ ] Joined WhatsApp sandbox (if using sandbox)
- [ ] Environment variables set correctly
- [ ] Test message sent
- [ ] Checked server logs

## 🆘 Still Not Working?

1. **Check Twilio Console Logs**:
   - Go to: https://console.twilio.com/us1/monitor/logs
   - Look for webhook delivery attempts
   - Check for error messages

2. **Check Server Logs**:
   ```bash
   # Look for errors in your terminal where npm run dev is running
   ```

3. **Test Webhook Manually**:
   ```bash
   curl -X POST http://localhost:3000/api/twilio/whatsapp/incoming \
     -d "From=whatsapp:+1234567890" \
     -d "To=whatsapp:+14155238886" \
     -d "Body=Test" \
     -d "MessageSid=test123"
   ```

4. **Verify Route Exists**:
   - Check: `app/api/twilio/whatsapp/incoming/route.ts` exists
   - Verify it exports `POST` function

---

**Need more help?** Check Twilio Console logs and server logs for specific error messages!

