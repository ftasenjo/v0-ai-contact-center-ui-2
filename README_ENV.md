# Environment Variables

This repository includes `.env.local` with actual API keys for development purposes.

## ⚠️ Security Note

**This repository contains real API keys and credentials.** 

- **Do NOT** share this repository publicly if it contains production keys
- Consider using a **private repository** for sensitive credentials
- For production, use environment variables in your deployment platform (Vercel, etc.)
- Rotate keys immediately if they are exposed

## Environment Variables

All environment variables are stored in `.env.local`:

- **Twilio**: Phone, SMS, WhatsApp integration
- **SendGrid**: Email sending
- **OpenAI**: LangGraph/LangChain AI workflows
- **Vapi**: Voice AI assistant (optional)
- **Supabase**: Database (optional)

See `.env.example` for a template of required variables.



