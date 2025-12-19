# Banking Support Setup Guide

This application has been configured for **banking support only** with a specialized database schema.

## Database Schema

The banking schema uses tables with the `cc_` prefix (Contact Center):

### Core Tables

1. **`cc_bank_customers`** - Bank customer information
   - Account numbers, customer IDs, personal information
   - Account types (checking, savings, credit, loan, investment)
   - Risk levels and KYC status

2. **`cc_conversations`** - Banking conversations
   - Channel (voice, chat, email, whatsapp, sms)
   - Status, priority, assigned queue
   - Links to bank customers
   - Timestamps (opened_at, closed_at)

3. **`cc_messages`** - Messages within conversations
   - Direction (inbound/outbound)
   - Channel, text content
   - Provider message IDs (Twilio, etc.)

4. **`cc_cases`** - Banking cases (fraud, disputes, etc.)
   - Case types: fraud, dispute, chargeback, account_issue, transaction_inquiry
   - Status, priority, amounts
   - Links to conversations and customers

5. **`cc_auth_sessions`** - Authentication sessions
   - Methods: OTP, KBA (Knowledge-Based Authentication), biometric, password, PIN
   - Status tracking and expiration

6. **`cc_audit_logs`** - Audit trail
   - Actor, action, redacted payload
   - IP address and user agent tracking

7. **`cc_preferences`** - Customer preferences
   - Do Not Call (DNC)
   - Quiet hours
   - Preferred channel
   - Marketing and data sharing consent

## Migration Files

1. **`004_banking_schema.sql`** - Creates all banking tables
2. **`005_banking_demo_data.sql`** - Populates with demo banking data

## Running Migrations

### Option 1: Supabase Dashboard
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run `004_banking_schema.sql` first
4. Then run `005_banking_demo_data.sql`

### Option 2: Command Line
```bash
# If you have Supabase CLI installed
supabase db push
```

## Application Configuration

### Default Industry
The application now defaults to **banking** industry:
- Inbox page loads with banking conversations
- New conversations are created in banking tables
- WhatsApp messages are stored in `cc_conversations` and `cc_messages`

### Banking Store
Located in `lib/banking-store.ts`:
- `getAllBankingConversations()` - Fetches all banking conversations
- `getBankingConversation(id)` - Gets single conversation
- `createBankingConversationFromMessage()` - Creates conversation from incoming message
- `storeBankingAIResponse()` - Stores AI responses
- `updateBankingConversation()` - Updates conversation metadata
- `deleteBankingConversation()` - Deletes conversation

### API Routes
- `/api/conversations?industry=banking` - Uses banking store automatically
- `/api/twilio/whatsapp/incoming` - Creates banking conversations

## Demo Data

The demo data includes:
- **10 bank customers** with various account types
- **10 conversations** across different channels
- **22 messages** showing realistic banking interactions
- **4 cases** (fraud, disputes)
- **4 auth sessions** (OTP, KBA)
- **5 audit logs** for compliance tracking
- **10 preference records** with DNC and quiet hours

## Banking-Specific Features

### Queues
- Fraud Prevention
- Account Services
- Credit Services
- Dispute Resolution
- Loan Services

### Case Types
- **fraud** - Suspicious transactions, security breaches
- **dispute** - Unauthorized charges, payment issues
- **chargeback** - Transaction reversals
- **account_issue** - Account problems
- **transaction_inquiry** - Transaction questions

### Authentication Methods
- **OTP** - One-Time Password
- **KBA** - Knowledge-Based Authentication
- **biometric** - Fingerprint, face recognition
- **password** - Account password
- **pin** - PIN verification

## Next Steps

1. **Run the migrations** in your Supabase database
2. **Verify demo data** is loaded correctly
3. **Test WhatsApp integration** - messages will create banking conversations
4. **Customize queues** - Update assigned_queue values as needed
5. **Add more demo data** - Use the migration file as a template

## Security Considerations

- **Audit logs** track all actions with redacted payloads
- **Auth sessions** have expiration and attempt limits
- **Customer preferences** include DNC and consent tracking
- **Risk levels** help prioritize high-risk customers

## Support

For questions or issues:
1. Check the migration files for schema details
2. Review `lib/banking-store.ts` for data access patterns
3. Check Supabase dashboard for data verification

