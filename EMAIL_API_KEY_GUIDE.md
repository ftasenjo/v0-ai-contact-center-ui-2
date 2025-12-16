# How to Get Email API Key

You have two options: **SendGrid** (Twilio-owned) or **Resend** (modern alternative). Choose one:

---

## Option 1: SendGrid (Recommended - Twilio-owned)

### Step 1: Sign Up
1. Go to: https://sendgrid.com
2. Click **"Start for Free"** or **"Sign Up"**
3. Create an account (free tier: 100 emails/day)

### Step 2: Verify Your Email
1. Check your email inbox
2. Click the verification link from SendGrid

### Step 3: Get API Key
1. **Log in** to SendGrid dashboard: https://app.sendgrid.com
2. In the left sidebar, click **"Settings"**
3. Click **"API Keys"**
4. Click **"Create API Key"** button (top right)
5. **Name your API key** (e.g., "Contact Center App")
6. **Select permissions**:
   - Choose **"Full Access"** (for all features)
   - OR **"Restricted Access"** → Select only **"Mail Send"** permission
7. Click **"Create & View"**
8. **Copy the API key immediately** - you won't be able to see it again!
   - It will look like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Verify Sender Email
1. Go to: **Settings** → **Sender Authentication**
2. Choose one:
   - **Single Sender Verification**: Verify one email address (quickest)
   - **Domain Authentication**: Verify your entire domain (better for production)
3. Follow the verification steps

### Step 5: Add to Your Project
Add to your `.env.local`:
```env
SENDGRID_API_KEY=SG.your_actual_api_key_here
EMAIL_FROM=your-verified-email@yourcompany.com
```

---

## Option 2: Resend (Modern Alternative)

### Step 1: Sign Up
1. Go to: https://resend.com
2. Click **"Get Started"** or **"Sign Up"**
3. Create an account (free tier: 100 emails/day, 3,000 emails/month)

### Step 2: Verify Your Email
1. Check your email inbox
2. Click the verification link from Resend

### Step 3: Get API Key
1. **Log in** to Resend dashboard: https://resend.com/api-keys
2. Click **"Create API Key"** button
3. **Name your API key** (e.g., "Contact Center App")
4. **Select permissions**:
   - Choose **"Full Access"** (recommended)
   - OR **"Sending Access"** (if you only need to send emails)
5. Click **"Add"**
6. **Copy the API key immediately** - you can see it again later, but it's good practice to save it now
   - It will look like: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Verify Domain (Optional for testing, required for production)
1. Go to: **Domains** → **Add Domain**
2. Add your domain (e.g., `yourcompany.com`)
3. Add the DNS records they provide to your domain registrar
4. Wait for verification (usually a few minutes)

### Step 5: Add to Your Project
Add to your `.env.local`:
```env
RESEND_API_KEY=re_your_actual_api_key_here
EMAIL_FROM=noreply@yourcompany.com
```

---

## Quick Comparison

| Feature | SendGrid | Resend |
|---------|----------|--------|
| **Free Tier** | 100 emails/day | 100 emails/day, 3,000/month |
| **API Key Format** | `SG.xxxxx...` | `re_xxxxx...` |
| **Setup Time** | ~5 minutes | ~3 minutes |
| **Documentation** | Extensive | Modern & clean |
| **Best For** | Enterprise, Twilio users | Modern apps, developers |

---

## Which Should You Choose?

- **Choose SendGrid if**:
  - You're already using Twilio (same company)
  - You need enterprise features
  - You want extensive documentation

- **Choose Resend if**:
  - You want a modern, developer-friendly API
  - You prefer cleaner documentation
  - You want faster setup

---

## After Getting Your API Key

1. **Add to `.env.local`**:
   ```env
   # For SendGrid
   SENDGRID_API_KEY=your_api_key_here
   EMAIL_FROM=your-verified-email@yourcompany.com
   
   # OR for Resend
   RESEND_API_KEY=your_api_key_here
   EMAIL_FROM=noreply@yourcompany.com
   ```

2. **Restart your Next.js server**:
   ```bash
   # Stop the server (Ctrl+C) and restart
   pnpm dev
   ```

3. **Test sending an email**:
   ```bash
   curl -X POST http://localhost:3000/api/email/send \
     -H "Content-Type: application/json" \
     -d '{
       "to": "test@example.com",
       "subject": "Test Email",
       "body": "This is a test email!"
     }'
   ```

---

## Troubleshooting

### "Invalid API Key" error
- Double-check you copied the entire key (they're long!)
- Make sure there are no extra spaces
- Verify the key is active in the dashboard

### "Sender not verified" error
- Make sure you verified your sender email/domain
- Check the `EMAIL_FROM` matches your verified email

### Emails going to spam
- Verify your domain (not just email) for better deliverability
- Set up SPF, DKIM records (provider will guide you)

---

**Need help?** Let me know which service you choose and I can help you through any step!



