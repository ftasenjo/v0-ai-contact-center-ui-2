# 📞 Twilio Webhook Configuration for Public Demos

This guide shows you how to configure Twilio webhooks so that **ANY** phone number or WhatsApp number can contact your system.

## ✅ Good News: Already Configured!

Your application **already accepts calls and messages from ANY number**. There are no number restrictions in the code.

## 🔧 Twilio Console Configuration

### Step 1: Configure Phone Number Webhook

1. **Go to Twilio Console**: https://console.twilio.com
2. **Navigate to**: Phone Numbers → Manage → Active Numbers
3. **Click** on your phone number
4. **Scroll to "Voice & Fax"** section
5. **Set "A CALL COMES IN"** webhook:
   ```
   https://your-vercel-app.vercel.app/api/twilio/incoming-call
   ```
   - Method: **HTTP POST**
6. **Set "STATUS CALLBACK URL"** (optional, for call status updates):
   ```
   https://your-vercel-app.vercel.app/api/twilio/webhook
   ```
   - Method: **HTTP POST**
7. **Click "Save"**

### Step 2: Configure WhatsApp Webhook

1. **In Twilio Console**, go to: **Phone Numbers** → **Manage** → **Active Numbers**
2. **Click** on your WhatsApp-enabled number
3. **Scroll to "Messaging"** section
4. **Set "A MESSAGE COMES IN"** webhook:
   ```
   https://your-vercel-app.vercel.app/api/twilio/whatsapp/incoming
   ```
   - Method: **HTTP POST**
5. **Set "STATUS CALLBACK URL"** (optional, for message status updates):
   ```
   https://your-vercel-app.vercel.app/api/twilio/whatsapp/webhook
   ```
   - Method: **HTTP POST**
6. **Click "Save"**

## 🎯 How It Works

### Phone Calls

1. **Anyone calls** your Twilio number from any phone
2. **Twilio sends webhook** to `/api/twilio/incoming-call`
3. **Your app**:
   - Stores the call in database
   - Creates a conversation
   - Connects to Vapi (if configured) or plays message
   - Returns TwiML response

### WhatsApp Messages

1. **Anyone sends WhatsApp** to your Twilio WhatsApp number
2. **Twilio sends webhook** to `/api/twilio/whatsapp/incoming`
3. **Your app**:
   - Stores the message in database
   - Creates a conversation
   - Runs AI supervisor workflow
   - Sends automated response (if configured)
   - Returns TwiML response

## 🔒 Security

### Webhook Validation

Twilio automatically validates webhook requests using:
- **Request signature** (X-Twilio-Signature header)
- **Account SID** verification

Your code doesn't need to validate - Twilio ensures requests are legitimate.

### No Number Whitelisting

The code accepts calls/messages from **ANY** number:
- ✅ No whitelist checks
- ✅ No blacklist checks
- ✅ All numbers are accepted

This is perfect for public demos!

## 🧪 Testing

### Test Phone Call

1. Call your Twilio number from any phone
2. Check Vercel logs: Project → Logs
3. Check Supabase: `cc_conversations` table
4. Check inbox in your app

### Test WhatsApp

1. Send WhatsApp message to your Twilio WhatsApp number
2. Check Vercel logs
3. Check Supabase: `cc_conversations` table
4. Check inbox in your app

## 📝 Webhook URLs

After deploying to Vercel, your webhook URLs will be:

**Production:**
```
https://your-project.vercel.app/api/twilio/incoming-call
https://your-project.vercel.app/api/twilio/webhook
https://your-project.vercel.app/api/twilio/whatsapp/incoming
https://your-project.vercel.app/api/twilio/whatsapp/webhook
```

**Preview (for testing):**
```
https://your-project-git-branch.vercel.app/api/twilio/incoming-call
```

## ⚠️ Important Notes

1. **HTTPS Required**: Twilio requires HTTPS for webhooks
2. **Public Endpoints**: Webhook endpoints must be publicly accessible
3. **No Authentication**: Webhooks don't require authentication (Twilio validates)
4. **Idempotent**: Webhooks are idempotent (safe to retry)

## 🐛 Troubleshooting

### Webhook not receiving requests

1. **Check URL**: Verify webhook URL is correct in Twilio console
2. **Check HTTPS**: Ensure URL uses `https://` not `http://`
3. **Test URL**: Try accessing webhook URL in browser (should return 405, not 404)
4. **Check Logs**: Check Vercel logs for incoming requests

### 404 Not Found

- Verify webhook URL path is correct
- Check that route file exists: `app/api/twilio/incoming-call/route.ts`
- Redeploy if you just created the route

### 500 Internal Server Error

- Check Vercel logs for error details
- Verify environment variables are set
- Check Supabase connection
- Verify database migrations are run

---

**Your webhooks are now configured for public demos!** 🎉

Anyone can call or message your numbers, and the system will handle them automatically.

