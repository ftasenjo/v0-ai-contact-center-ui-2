-- Banking-specific schema migration
-- This migration creates banking-focused tables with cc_ prefix

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bank Customers table (replaces generic customers for banking context)
CREATE TABLE IF NOT EXISTS cc_bank_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_number TEXT UNIQUE,
  customer_id TEXT NOT NULL, -- Internal bank customer ID
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  account_type TEXT CHECK (account_type IN ('checking', 'savings', 'credit', 'loan', 'investment')),
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'frozen', 'closed', 'pending')),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CC Conversations table (banking-specific)
CREATE TABLE IF NOT EXISTS cc_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel TEXT NOT NULL CHECK (channel IN ('voice', 'chat', 'email', 'whatsapp', 'sms')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'resolved', 'escalated', 'closed')),
  bank_customer_id UUID REFERENCES cc_bank_customers(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  assigned_queue TEXT,
  assigned_agent_id UUID, -- Can reference agents table if needed
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  topic TEXT,
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CC Messages table
CREATE TABLE IF NOT EXISTS cc_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES cc_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL CHECK (channel IN ('voice', 'chat', 'email', 'whatsapp', 'sms')),
  text TEXT NOT NULL,
  provider_msg_id TEXT, -- External provider message ID (Twilio, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB -- For additional message metadata
);

-- CC Cases table (for fraud, disputes, etc.)
CREATE TABLE IF NOT EXISTS cc_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('fraud', 'dispute', 'chargeback', 'account_issue', 'transaction_inquiry', 'other')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  bank_customer_id UUID REFERENCES cc_bank_customers(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES cc_conversations(id) ON DELETE SET NULL,
  case_number TEXT UNIQUE, -- Human-readable case number
  description TEXT,
  amount DECIMAL(15, 2), -- For financial cases
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID -- Agent who resolved it
);

-- CC Auth Sessions table (for OTP, KBA authentication)
CREATE TABLE IF NOT EXISTS cc_auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES cc_conversations(id) ON DELETE CASCADE,
  bank_customer_id UUID REFERENCES cc_bank_customers(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN ('otp', 'kba', 'biometric', 'password', 'pin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CC Audit Logs table
CREATE TABLE IF NOT EXISTS cc_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES cc_conversations(id) ON DELETE SET NULL,
  actor TEXT NOT NULL, -- 'agent', 'customer', 'system', 'ai', or agent ID
  action TEXT NOT NULL, -- 'view', 'update', 'transfer', 'escalate', 'resolve', etc.
  payload_redacted JSONB, -- Redacted payload for security
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- CC Preferences table
CREATE TABLE IF NOT EXISTS cc_preferences (
  bank_customer_id UUID PRIMARY KEY REFERENCES cc_bank_customers(id) ON DELETE CASCADE,
  dnc BOOLEAN DEFAULT FALSE, -- Do Not Call
  quiet_hours_start TIME, -- e.g., '22:00:00'
  quiet_hours_end TIME, -- e.g., '08:00:00'
  preferred_channel TEXT CHECK (preferred_channel IN ('voice', 'chat', 'email', 'whatsapp', 'sms')),
  consent_marketing BOOLEAN DEFAULT FALSE,
  consent_data_sharing BOOLEAN DEFAULT FALSE,
  language_preference TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cc_conversations_bank_customer_id ON cc_conversations(bank_customer_id);
CREATE INDEX IF NOT EXISTS idx_cc_conversations_status ON cc_conversations(status);
CREATE INDEX IF NOT EXISTS idx_cc_conversations_channel ON cc_conversations(channel);
CREATE INDEX IF NOT EXISTS idx_cc_conversations_opened_at ON cc_conversations(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cc_conversations_assigned_queue ON cc_conversations(assigned_queue);

CREATE INDEX IF NOT EXISTS idx_cc_messages_conversation_id ON cc_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cc_messages_created_at ON cc_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cc_messages_provider_msg_id ON cc_messages(provider_msg_id);

CREATE INDEX IF NOT EXISTS idx_cc_cases_bank_customer_id ON cc_cases(bank_customer_id);
CREATE INDEX IF NOT EXISTS idx_cc_cases_conversation_id ON cc_cases(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cc_cases_status ON cc_cases(status);
CREATE INDEX IF NOT EXISTS idx_cc_cases_type ON cc_cases(type);
CREATE INDEX IF NOT EXISTS idx_cc_cases_case_number ON cc_cases(case_number);

CREATE INDEX IF NOT EXISTS idx_cc_auth_sessions_conversation_id ON cc_auth_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cc_auth_sessions_bank_customer_id ON cc_auth_sessions(bank_customer_id);
CREATE INDEX IF NOT EXISTS idx_cc_auth_sessions_status ON cc_auth_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cc_auth_sessions_expires_at ON cc_auth_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_cc_audit_logs_conversation_id ON cc_audit_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cc_audit_logs_created_at ON cc_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cc_audit_logs_actor ON cc_audit_logs(actor);

CREATE INDEX IF NOT EXISTS idx_cc_bank_customers_customer_id ON cc_bank_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_cc_bank_customers_account_number ON cc_bank_customers(account_number);
CREATE INDEX IF NOT EXISTS idx_cc_bank_customers_email ON cc_bank_customers(email);
CREATE INDEX IF NOT EXISTS idx_cc_bank_customers_phone ON cc_bank_customers(phone);

-- Triggers to auto-update updated_at
CREATE TRIGGER update_cc_bank_customers_updated_at BEFORE UPDATE ON cc_bank_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cc_conversations_updated_at BEFORE UPDATE ON cc_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cc_cases_updated_at BEFORE UPDATE ON cc_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cc_preferences_updated_at BEFORE UPDATE ON cc_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

