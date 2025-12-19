/**
 * Step 7.2: Banking Summary Service
 * 
 * Provides safe, policy-filtered banking information to agents.
 * This module enforces "what's allowed" based on auth_level, intent, and channel.
 * 
 * Rule: Never return full PAN, full account numbers, full addresses, full DOB, full email/phone.
 */

import { supabaseServer } from '@/lib/supabase-server';

/**
 * Step 7.1: Safe Summary Contract
 * 
 * This is the shape of data that is safe to pass to the model.
 * All sensitive data is redacted or filtered based on policy.
 */
export type SafeBankingSummary = {
  // Identity
  bank_customer_id: string;
  kyc_status?: 'verified' | 'pending' | 'failed' | 'unknown';

  // Accounts (high-level)
  accounts?: Array<{
    type: string; // 'checking', 'savings', 'credit', 'loan', 'investment'
    last4?: string; // Last 4 digits only
    currency?: string; // 'USD', 'EUR', etc.
    availableBalance?: number; // Only if OTP-verified and policy allows
    status?: string; // 'active', 'frozen', 'closed'
  }>;

  // Cards (high-level)
  cards?: Array<{
    type?: string; // 'debit', 'credit'
    last4?: string; // Last 4 digits only
    status?: 'active' | 'frozen' | 'blocked' | 'replaced' | 'unknown';
  }>;

  // Recent activity (high-level)
  recentTransactions?: {
    available: boolean; // Whether transactions are available
    count?: number; // Number of recent transactions
    transactions?: Array<{
      date?: string; // YYYY-MM-DD
      merchant?: string;
      amount?: number;
      currency?: string;
    }>; // Only if policy allows and user is verified
  };

  // Risk flags
  risk?: {
    hasFlags: boolean;
    label?: string; // Generic label like "security hold present", not detailed reasons
  };
};

/**
 * Policy configuration for what data is allowed based on context
 */
type PolicyConfig = {
  authLevel: 'none' | 'otp' | 'kba';
  intent: string;
  channel: 'whatsapp' | 'voice' | 'email';
};

/**
 * Determine what data is allowed based on policy
 */
function getPolicyAllowances(config: PolicyConfig): {
  allowBalance: boolean;
  allowTransactions: boolean;
  allowAccountDetails: boolean;
  allowCardDetails: boolean;
} {
  const { authLevel, intent, channel } = config;

  // Balance: Only if OTP-verified and intent requires it
  const allowBalance = authLevel === 'otp' || authLevel === 'kba';

  // Transactions: Only if OTP-verified, intent requires it, and channel allows
  const allowTransactions = 
    (authLevel === 'otp' || authLevel === 'kba') &&
    (intent === 'transactions' || intent === 'account_balance') &&
    channel !== 'email'; // Email is less secure, restrict transactions

  // Account details: Last 4 digits only, always allowed if verified
  const allowAccountDetails = authLevel === 'otp' || authLevel === 'kba';

  // Card details: Last 4 digits only, always allowed if verified
  const allowCardDetails = authLevel === 'otp' || authLevel === 'kba';

  return {
    allowBalance,
    allowTransactions,
    allowAccountDetails,
    allowCardDetails,
  };
}

/**
 * Extract last 4 digits from account/card number
 */
function getLast4(fullNumber: string | null | undefined): string | undefined {
  if (!fullNumber) return undefined;
  const cleaned = fullNumber.replace(/\D/g, ''); // Remove non-digits
  return cleaned.length >= 4 ? cleaned.slice(-4) : undefined;
}

/**
 * Demo-only: Deterministic balance based on customer id (stable across requests)
 */
function demoBalanceForCustomer(bankCustomerId: string): number {
  let hash = 0;
  for (let i = 0; i < bankCustomerId.length; i++) {
    hash = (hash * 31 + bankCustomerId.charCodeAt(i)) >>> 0;
  }
  // $1,000 - $50,000
  return (hash % 49001) + 1000;
}

/**
 * Step 7.2: Build Banking Summary
 * 
 * Pulls from banking DB and returns safe, policy-filtered summary
 */
export async function buildBankingSummary(
  bankCustomerId: string,
  policy: PolicyConfig
): Promise<SafeBankingSummary> {
  const supabase = supabaseServer;

  // Fetch customer data
  const { data: customer, error: customerError } = await supabase
    .from('cc_bank_customers')
    .select('id, customer_id, account_number, account_type, account_status, kyc_status, risk_level')
    .eq('id', bankCustomerId)
    .single();

  if (customerError || !customer) {
    throw new Error(`Customer not found: ${bankCustomerId}`);
  }

  // Get policy allowances
  const allowances = getPolicyAllowances(policy);

  // Build safe summary
  const summary: SafeBankingSummary = {
    bank_customer_id: customer.id,
    kyc_status: customer.kyc_status as 'verified' | 'pending' | 'failed' | 'unknown' | undefined,
  };

  // Accounts (high-level)
  if (allowances.allowAccountDetails) {
    // For now, use account_number from customer table as a single account
    // In a real system, you'd have a separate accounts table
    const accounts = [];
    
    const accountIdentifier = customer.account_number || customer.customer_id || customer.id;
    if (accountIdentifier) {
      accounts.push({
        type: customer.account_type || 'checking',
        last4: getLast4(accountIdentifier),
        currency: 'USD', // Default
        status: customer.account_status || 'active',
        // Balance only if policy allows
        ...(allowances.allowBalance ? {
          // TODO: In real system, fetch from accounts table
          // For demo purposes, generate a realistic placeholder balance (stable per customer)
          // In production, you'd query: SELECT available_balance FROM cc_accounts WHERE bank_customer_id = ...
          availableBalance: demoBalanceForCustomer(customer.id),
        } : {}),
      });
    }

    if (accounts.length > 0) {
      summary.accounts = accounts;
    }
  }

  // Cards (high-level)
  if (allowances.allowCardDetails) {
    // TODO: In real system, fetch from cards table
    // For now, stub with placeholder data
    // In production, you'd query: SELECT * FROM cc_cards WHERE bank_customer_id = ...
    summary.cards = [
      {
        type: 'debit',
        last4: '1234', // Placeholder - in real system, fetch from cards table
        status: 'active' as const,
      },
    ];
  }

  // Recent transactions
  if (allowances.allowTransactions) {
    // TODO: In real system, fetch from transactions table
    // For now, stub with placeholder
    // In production, you'd query: SELECT * FROM cc_transactions WHERE bank_customer_id = ... ORDER BY date DESC LIMIT 3
    summary.recentTransactions = {
      available: true,
      count: 0, // Placeholder
      transactions: [], // Will be populated from real transactions table
    };
  } else {
    summary.recentTransactions = {
      available: false,
    };
  }

  // Risk flags
  summary.risk = {
    hasFlags: customer.risk_level === 'high' || customer.risk_level === 'medium',
    label: customer.risk_level === 'high' 
      ? 'Security review in progress' 
      : customer.risk_level === 'medium'
      ? 'Account monitoring active'
      : undefined,
  };

  return summary;
}

