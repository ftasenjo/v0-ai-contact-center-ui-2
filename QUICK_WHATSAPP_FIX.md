# Quick WhatsApp Fix Guide

## Most Common Issue: Webhooks Not Configured

WhatsApp messages aren't working because **Twilio can't reach your server**. Here's how to fix it:

## ✅ Step-by-Step Fix

### Step 1: Start Your Dev Server

```bash
npm run dev
```

Server should be running on `http://localhost:3000`

### Step 2: Install & Start ngrok (Required!)

**Install ngrok:**
```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

**Start ngrok:**
```bash
ngrok http 3000
```

**Copy your ngrok URL** (looks like: `https://abc123.ngrok.io`)

### Step 3: Configure Twilio WhatsApp Webhooks

1. **Go to Twilio Console**: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

2. **Find "When a message comes in"** section

3. **Set webhook URL**:
   ```
   https://your-ngrok-url.ngrok.io/api/twilio/whatsapp/incoming
   ```
   - Replace `your-ngrok-url` with your actual ngrok URL
   - Method: `POST`
   - **NO trailing slash!**

4. **Set "Status callback URL"**:
   ```
   https://your-ngrok-url.ngrok.io/api/twilio/whatsapp/webhook
   ```
   - Method: `POST`

5. **Click "Save"**

### Step 4: Join WhatsApp Sandbox (If Using Sandbox)

1. **Get your sandbox code** from Twilio Console
2. **Send WhatsApp message** to +1 (415) 523‑8886:
   ```
   join [your-sandbox-code]
   ```
3. Wait for confirmation message

### Step 5: Test

1. **Send a WhatsApp message** to +1 (415) 523‑8886
2. **Check your terminal** (where `npm run dev` is running)
3. You should see:
   ```
   Incoming WhatsApp message: { from: '...', to: '...', body: '...' }
   ✅ LangGraph processed message: { intent: '...', sentiment: '...' }
   ```

## 🔍 Quick Checks

### Check 1: Is dev server running?
```bash
# Should see: "Ready on http://localhost:3000"
npm run dev
```

### Check 2: Is ngrok running?
```bash
# Should show ngrok forwarding URL
curl http://127.0.0.1:4040/api/tunnels
```

### Check 3: Is webhook accessible?
Open in browser:
```
https://your-ngrok-url.ngrok.io/api/twilio/whatsapp/incoming
```
Should show an error (but be accessible), not "site can't be reached"

### Check 4: Check Twilio Logs
1. Go to: https://console.twilio.com/us1/monitor/logs
2. Look for webhook delivery attempts
3. Check for errors

## 🚨 Common Errors

### "Webhook URL not accessible"
- **Fix**: Make sure ngrok is running
- **Check**: Visit ngrok URL in browser

### "404 Not Found"
- **Fix**: Check webhook URL has no trailing slash
- **Correct**: `https://url.ngrok.io/api/twilio/whatsapp/incoming`
- **Wrong**: `https://url.ngrok.io/api/twilio/whatsapp/incoming/`

### "Not receiving messages"
- **Fix**: Join WhatsApp sandbox first
- **Send**: `join [code]` to +1 (415) 523‑8886

### "Messages received but no response"
- **Fix**: Check server logs for errors
- **Check**: Verify `OPENAI_API_KEY` is set

## 📋 Quick Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] ngrok running (`ngrok http 3000`)
- [ ] Webhook URL updated in Twilio Console
- [ ] Joined WhatsApp sandbox (if using sandbox)
- [ ] Test message sent
- [ ] Checked server logs

## 🆘 Still Not Working?

**Check Twilio Console Logs:**
1. Go to: https://console.twilio.com/us1/monitor/logs
2. Filter by "WhatsApp"
3. Look for webhook delivery errors

**Check Server Logs:**
- Look at terminal where `npm run dev` is running
- Should see "Incoming WhatsApp message" when you send a message

---

**The #1 issue is usually webhooks not configured. Make sure ngrok is running and webhook URL is set in Twilio!**

