# AI Contact Center UI

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ai-deologyai/v0-h-call-centre)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/nTWticnzrc8)

## Overview

AI-powered contact center solution with multi-channel communication support. This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Integrations

### ✅ Phone Calls (Twilio Voice)
- Incoming and outbound call handling
- Call status tracking and webhooks
- TwiML-based call flow management
- Phone number: +17623162272

### ✅ WhatsApp (Twilio WhatsApp Business API)
- Send and receive WhatsApp messages
- Media attachment support
- Message status tracking
- Webhook integration for real-time updates

### ✅ Email (SendGrid)
- Send emails via API
- Email event tracking (bounces, opens, clicks)
- HTML and plain text support
- Webhook integration for delivery status

## API Endpoints

### Phone Calls
- `POST /api/twilio/incoming-call` - Handles incoming calls
- `POST /api/twilio/make-call` - Makes outbound calls
- `GET /api/twilio/calls` - Lists all calls

### WhatsApp
- `POST /api/twilio/whatsapp/incoming` - Receives WhatsApp messages
- `POST /api/twilio/whatsapp/send` - Sends WhatsApp messages

### Email
- `POST /api/email/send` - Sends emails
- `POST /api/email/webhook` - Receives email events

## Deployment

Your project is live at:

**[https://vercel.com/ai-deologyai/v0-h-call-centre](https://vercel.com/ai-deologyai/v0-h-call-centre)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/nTWticnzrc8](https://v0.app/chat/nTWticnzrc8)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
