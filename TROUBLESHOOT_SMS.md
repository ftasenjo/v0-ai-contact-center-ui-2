# 🔍 Troubleshooting SMS Webhook - Step by Step

## Step 1: Verify Webhook URL in Twilio

1. **Go to Twilio Console**: https://console.twilio.com
2. **Phone Numbers** → **Manage** → **Active Numbers**
3. **Click your phone number**
4. **Check "A MESSAGE COMES IN"** - verify it's exactly:
   ```
   https://v0-ai-contact-center-ui-2-dgx7k9r4e-ai-deologyai.vercel.app/api/twilio/sms/incoming
   ```
   - Must be **HTTPS** (not HTTP)
   - Must be **HTTP POST** method
   - No trailing slash

## Step 2: Test the Endpoint Directly

Open this URL in your browser:
```
https://v0-ai-contact-center-ui-2-dgx7k9r4e-ai-deologyai.vercel.app/api/twilio/sms/incoming
```

**Expected**: Should return `405 Method Not Allowed` (because browser uses GET, not POST)
**If 404**: Endpoint not deployed correctly
**If 500**: There's an error in the code

## Step 3: Check Twilio Logs

1. **Go to Twilio Console**: https://console.twilio.com
2. **Monitor** → **Logs** → **Messaging**
3. **Look for**:
   - Did Meta send the SMS? (Check "From" field)
   - Was the SMS received by Twilio?
   - Was the webhook called? (Check webhook status)

4. **Click on the SMS log entry** to see:
   - Message body (the verification code!)
   - Webhook status (success/failed)
   - Webhook URL called

## Step 4: Check Vercel Logs

1. **Go to Vercel**: https://vercel.com/ai-deologyai/v0-ai-contact-center-ui-2
2. **Click "Logs"** tab
3. **Filter by**: `/api/twilio/sms/incoming`
4. **Look for**:
   - `📱 Incoming SMS:` logs
   - Any errors
   - `🔐 VERIFICATION CODE` logs

## Step 5: Check if SMS Was Actually Sent

**In Twilio Console** → **Monitor** → **Logs** → **Messaging**:
- Do you see ANY incoming SMS?
- If NO: Meta hasn't sent the code yet, or SMS failed
- If YES: Check the message body - the code should be there!

## Step 6: Manual Test

Send a test SMS to your Twilio number from your phone:
1. Send SMS: "TEST123" to your Twilio number
2. Check Vercel logs - should see `📱 Incoming SMS:`
3. If this works, the webhook is fine - Meta just hasn't sent yet

## Common Issues

### Issue: Webhook URL Wrong
**Fix**: Copy-paste the exact URL from Vercel deployment

### Issue: Meta Didn't Send SMS
**Fix**: 
- Check WhatsApp Manager - did it say "Code sent"?
- Wait 2-3 minutes
- Request a new code

### Issue: SMS Sent But Webhook Not Called
**Fix**:
- Check Twilio logs for webhook errors
- Verify webhook URL is accessible (test in browser)
- Check if there's a firewall blocking Twilio

### Issue: Webhook Called But No Logs
**Fix**:
- Check Vercel logs with filter
- Check for errors in logs
- Verify deployment is latest version

## Quick Check Commands

**Test endpoint**:
```bash
curl -X POST https://v0-ai-contact-center-ui-2-dgx7k9r4e-ai-deologyai.vercel.app/api/twilio/sms/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B1234567890&To=%2B0987654321&Body=TEST123&MessageSid=SMtest"
```

**Check Vercel logs**:
```bash
vercel logs --follow
```

