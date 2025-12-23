# 📱 WhatsApp Number Verification Guide

Step-by-step guide to verify your Twilio number in WhatsApp Manager using SMS verification codes.

## ✅ Step 1: SMS Endpoint Deployed

The SMS webhook endpoint is now deployed and ready to receive verification codes.

**Endpoint URL:**
```
https://v0-ai-contact-center-ui-2-mb06m247j-ai-deologyai.vercel.app/api/twilio/sms/incoming
```

## 🔧 Step 2: Configure SMS Webhook in Twilio

1. **Go to Twilio Console**: https://console.twilio.com
2. **Navigate to**: Phone Numbers → Manage → Active Numbers
3. **Click** on your Twilio phone number
4. **Scroll down** to the **"Messaging"** section
5. **Set "A MESSAGE COMES IN"** webhook:
   ```
   https://v0-ai-contact-center-ui-2-mb06m247j-ai-deologyai.vercel.app/api/twilio/sms/incoming
   ```
   - **Method**: HTTP POST
6. **Click "Save"**

## 📲 Step 3: Request Verification Code from Meta

1. **Go to WhatsApp Manager**: https://business.facebook.com/wa/manage/home
2. **Navigate to**: Settings → Phone Numbers
3. **Click** on your phone number
4. **Click "Verify"** or **"Start Verification"**
5. **Choose "Verify via SMS"** (if available)
   - If SMS option is not available, try "Verify via Phone Call"
6. **Click "Send Code"**

Meta will send a verification code to your Twilio number.

## 🔍 Step 4: Get the Verification Code

The SMS webhook will automatically detect and log verification codes. Here's how to find it:

### Option A: Vercel Logs (Easiest)

1. **Go to Vercel Dashboard**: https://vercel.com
2. **Select your project**: `v0-ai-contact-center-ui-2`
3. **Click "Logs"** tab
4. **Look for** this in the logs:
   ```
   🔐 VERIFICATION CODE DETECTED: [code]
   ═══════════════════════════════════════
   🔐 VERIFICATION CODE: [code]
   ═══════════════════════════════════════
   ```
5. **Copy the code** (usually 4-8 digits)

### Option B: Twilio Console Logs

1. **Go to Twilio Console**: https://console.twilio.com
2. **Navigate to**: Monitor → Logs → Messaging
3. **Find** the incoming SMS from Meta
4. **Click** on it to see the message body
5. **Copy the verification code**

### Option C: Supabase Database

1. **Go to Supabase Dashboard**: https://supabase.com
2. **Navigate to**: Table Editor → `cc_messages`
3. **Filter by**: `channel = 'sms'`
4. **Sort by**: `created_at DESC` (newest first)
5. **Look for** the message body containing the code

## ✅ Step 5: Enter Code in WhatsApp Manager

1. **Go back to WhatsApp Manager**
2. **Enter the verification code** you copied
3. **Click "Verify"** or **"Submit"**
4. **Wait for confirmation** - your number should now be verified!

## 🎯 What Happens Next

Once verified:
- ✅ Your number will show as "Verified" in WhatsApp Manager
- ✅ You can complete the Twilio WhatsApp Business API setup
- ✅ The Phone Number ID will be available
- ✅ You can configure WhatsApp webhooks

## 🐛 Troubleshooting

### Code not received?
- **Check Twilio webhook** is configured correctly
- **Check Vercel logs** for any errors
- **Wait 1-2 minutes** - SMS can take time
- **Try phone call verification** instead

### Code expired?
- Request a new code from WhatsApp Manager
- Codes usually expire after 10-15 minutes

### Webhook not working?
- Verify the URL is correct in Twilio
- Check Vercel deployment is live
- Test by sending a test SMS to your Twilio number

## 📝 Quick Checklist

- [ ] SMS webhook configured in Twilio
- [ ] Verification code requested from Meta
- [ ] Code received and logged
- [ ] Code entered in WhatsApp Manager
- [ ] Number verified successfully

---

**Need help?** Check Vercel logs first - verification codes are logged prominently!

