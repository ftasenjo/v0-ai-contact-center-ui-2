# Twilio Webhook Configuration Guide

## Important: Development vs Production

- **Local Development**: Use ngrok to expose your localhost (this guide)
- **Production (Vercel)**: Use your Vercel deployment URL directly - no ngrok needed!

When you deploy to Vercel, you'll get a public URL like `https://your-app.vercel.app` that you can use directly in Twilio webhooks.

---

## Step 1: Set up ngrok (LOCAL DEVELOPMENT ONLY)

If this is your first time using ngrok, you may need to authenticate:

1. **Sign up for a free ngrok account** (if you don't have one):
   - Go to https://dashboard.ngrok.com/signup
   - Create a free account

2. **Get your authtoken**:
   - After signing up, go to https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy your authtoken

3. **Configure ngrok**:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```

4. **Start ngrok** (if not already running):
   ```bash
   ngrok http 3000
   ```

5. **Get your public URL**:
   - Open http://127.0.0.1:4040 in your browser
   - You'll see the ngrok dashboard
   - Copy the "Forwarding" URL (it will look like: `https://abc123.ngrok.io`)
   - This is your public URL that Twilio will use

## Step 2: Update your environment variables

Update your `.env.local` file with the ngrok URL:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
```

**Important:** Replace `your-ngrok-url.ngrok.io` with your actual ngrok URL.

## Step 3: Configure Twilio Webhooks

### Option A: Using Twilio Console (Web UI)

1. **Log in to Twilio Console**:
   - Go to https://console.twilio.com
   - Sign in to your account

2. **Navigate to Phone Numbers**:
   - Click on "Phone Numbers" in the left sidebar
   - Click "Manage" → "Active Numbers"
   - Click on your Twilio phone number

3. **Configure Incoming Call Webhook**:
   - Scroll down to the "Voice & Fax" section
   - Find "A CALL COMES IN"
   - Select "Webhook" from the dropdown
   - Enter your webhook URL: `https://your-ngrok-url.ngrok.io/api/twilio/incoming-call`
   - Set HTTP method to: `POST`
   - Click "Save"

4. **Configure Status Callback**:
   - In the same "Voice & Fax" section
   - Find "STATUS CALLBACK URL"
   - Enter: `https://your-ngrok-url.ngrok.io/api/twilio/webhook`
   - Set HTTP method to: `POST`
   - Click "Save"

### Option B: Using Twilio CLI (Alternative)

If you have the Twilio CLI installed:

```bash
# Install Twilio CLI (if not installed)
npm install -g twilio-cli

# Login to Twilio
twilio login

# Configure webhooks
twilio phone-numbers:update YOUR_PHONE_NUMBER \
  --voice-url https://your-ngrok-url.ngrok.io/api/twilio/incoming-call \
  --status-callback-url https://your-ngrok-url.ngrok.io/api/twilio/webhook \
  --status-callback-method POST
```

## Step 4: Test the Integration

1. **Make sure your Next.js dev server is running**:
   ```bash
   pnpm dev
   ```

2. **Make sure ngrok is running**:
   ```bash
   ngrok http 3000
   ```

3. **Test an incoming call**:
   - Call your Twilio phone number from any phone
   - You should hear the greeting message
   - Check your terminal/console for webhook logs

4. **Check webhook logs**:
   - Your Next.js server console will show incoming webhook requests
   - You can also check the ngrok dashboard at http://127.0.0.1:4040 to see all HTTP requests

## Troubleshooting

### ngrok shows "Session Expired"
- Your free ngrok session has expired (free accounts have time limits)
- Restart ngrok: `ngrok http 3000`
- Update your Twilio webhooks with the new ngrok URL

### Webhooks not being received
- Verify ngrok is running and accessible
- Check that the webhook URL in Twilio matches your ngrok URL exactly
- Make sure your Next.js server is running
- Check ngrok dashboard at http://127.0.0.1:4040 for incoming requests

### "Invalid webhook URL" in Twilio
- Ensure the URL starts with `https://` (not `http://`)
- Make sure there are no trailing slashes
- Verify the URL is accessible (try opening it in a browser)

### Calls not connecting
- Check your Twilio phone number is active
- Verify your Account SID and Auth Token are correct in `.env.local`
- Check Twilio logs in the Console under "Monitor" → "Logs" → "Calls"

## Production Deployment on Vercel

When you're ready to deploy to production:

1. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI (if not already installed)
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Set Environment Variables in Vercel**:
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add all your Twilio credentials:
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `TWILIO_PHONE_NUMBER`
     - `NEXT_PUBLIC_APP_URL` (set to your Vercel URL, e.g., `https://your-app.vercel.app`)

3. **Update Twilio Webhooks**:
   - Go to Twilio Console → Phone Numbers → Your Number
   - Update webhook URLs to use your Vercel URL:
     - Incoming Call: `https://your-app.vercel.app/api/twilio/incoming-call`
     - Status Callback: `https://your-app.vercel.app/api/twilio/webhook`
   - Save the changes

4. **Test in Production**:
   - Call your Twilio number
   - Check Vercel logs to see webhook requests
   - Verify everything works as expected

**Note**: You can skip ngrok entirely if you want to test directly in production, but it's recommended to test locally first with ngrok.

## Next Steps

Once webhooks are configured and tested:
1. Customize the call flow in `/app/api/twilio/incoming-call/route.ts`
2. Add agent routing logic
3. Implement call recording
4. Set up real-time updates for the live console
5. Deploy to Vercel when ready for production

