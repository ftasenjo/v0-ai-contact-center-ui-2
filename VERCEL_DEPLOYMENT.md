# Vercel Deployment Guide for Twilio Integration

## Step 1: Deploy to Vercel

You can deploy using the Vercel CLI or through the Vercel dashboard. Here's the CLI method:

```bash
# Make sure you're logged in to Vercel
vercel login

# Deploy (this will prompt you for project setup)
vercel

# For production deployment
vercel --prod
```

Or use the Vercel Dashboard:
1. Go to https://vercel.com
2. Import your Git repository
3. Vercel will auto-detect Next.js and configure it

## Step 2: Set Environment Variables in Vercel

After deployment, configure your environment variables:

1. **Go to your Vercel project dashboard**
2. **Navigate to**: Settings → Environment Variables
3. **Add the following variables**:

   ```
   TWILIO_ACCOUNT_SID = your_account_sid_here
   TWILIO_AUTH_TOKEN = your_auth_token_here
   TWILIO_PHONE_NUMBER = your_twilio_phone_number_here
   NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
   ```

   **Important**: 
   - Replace `your-app.vercel.app` with your actual Vercel deployment URL
   - Make sure to add these for **Production**, **Preview**, and **Development** environments (or at least Production)
   - After adding variables, you may need to redeploy for them to take effect

4. **Redeploy** (if needed):
   ```bash
   vercel --prod
   ```
   Or trigger a redeploy from the Vercel dashboard

## Step 3: Get Your Vercel URL

After deployment, you'll get a URL like:
- Production: `https://your-app.vercel.app`
- Or a custom domain if you've configured one

**Note this URL** - you'll need it for Twilio webhook configuration.

## Step 4: Configure Twilio Webhooks

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
   - Enter your webhook URL: `https://your-app.vercel.app/api/twilio/incoming-call`
     - Replace `your-app.vercel.app` with your actual Vercel URL
   - Set HTTP method to: `POST`
   - Click "Save"

4. **Configure Status Callback**:
   - In the same "Voice & Fax" section
   - Find "STATUS CALLBACK URL"
   - Enter: `https://your-app.vercel.app/api/twilio/webhook`
     - Replace `your-app.vercel.app` with your actual Vercel URL
   - Set HTTP method to: `POST`
   - Click "Save"

## Step 5: Test the Integration

1. **Verify your deployment is live**:
   - Visit your Vercel URL in a browser
   - Make sure the app loads correctly

2. **Test an incoming call**:
   - Call your Twilio phone number from any phone
   - You should hear the greeting message
   - Check Vercel logs to see webhook requests

3. **Check Vercel logs**:
   - Go to your Vercel project dashboard
   - Navigate to "Deployments" → Click on your latest deployment → "Functions" tab
   - Or check "Logs" in the dashboard to see API route executions

## Troubleshooting

### Environment variables not working
- Make sure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

### Webhooks not being received
- Verify your Vercel URL is correct and accessible
- Check that webhook URLs in Twilio match your Vercel URL exactly
- Ensure there are no trailing slashes in the webhook URLs
- Check Vercel logs for any errors

### "Invalid webhook URL" in Twilio
- Ensure the URL starts with `https://` (Vercel uses HTTPS by default)
- Make sure there are no trailing slashes
- Verify the URL is accessible (try opening `https://your-app.vercel.app/api/twilio/incoming-call` in a browser - it should return XML/TwiML)

### Calls not connecting
- Check your Twilio phone number is active
- Verify your Account SID and Auth Token are correct in Vercel environment variables
- Check Twilio logs in the Console under "Monitor" → "Logs" → "Calls"
- Check Vercel function logs for any errors

### API routes returning 404
- Make sure your files are in `app/api/twilio/...` directory structure
- Verify the deployment includes all API route files
- Check Vercel build logs for any errors

## Next Steps

Once everything is working:
1. Customize the call flow in `/app/api/twilio/incoming-call/route.ts`
2. Add agent routing logic
3. Implement call recording
4. Set up real-time updates for the live console
5. Consider setting up a custom domain in Vercel for a cleaner URL

