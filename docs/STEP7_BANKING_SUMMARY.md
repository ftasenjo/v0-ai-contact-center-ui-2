# Step 7: Safe Banking Summary

## Overview

Step 7 implements a safe, policy-filtered banking summary service that provides limited banking information to agents. This ensures the model never sees sensitive data like full PANs, account numbers, addresses, or DOB.

## Implementation Status

### ✅ 7.1 Safe Summary Contract

Defined a single response shape that is channel-safe and prompt-safe:

**Identity**:
- `bank_customer_id` - Customer identifier
- `kyc_status` - Verification status (verified/pending/failed/unknown)

**Accounts (high-level)**:
- `type` - Account type (checking, savings, credit, loan, investment)
- `last4` - Last 4 digits only (never full account number)
- `currency` - Currency code
- `availableBalance` - Only if OTP-verified and policy allows
- `status` - Account status (active, frozen, closed)

**Cards (high-level)**:
- `type` - Card type (debit, credit)
- `last4` - Last 4 digits only (never full PAN)
- `status` - Card status (active, frozen, blocked, replaced, unknown)

**Recent Activity (high-level)**:
- `available` - Whether transactions are available
- `count` - Number of recent transactions
- `transactions` - Array of last 3 transactions (merchant + date + amount) - only if policy allows and user is verified

**Risk Flags**:
- `hasFlags` - Boolean indicating if risk flags exist
- `label` - Generic label (e.g., "security hold present"), not detailed reasons

**Rule**: Never return full PAN, full account numbers, full addresses, full DOB, full email/phone.

**Location**: `lib/banking/summary.ts` → `SafeBankingSummary` type

### ✅ 7.2 Banking Summary Service

Created `lib/banking/summary.ts` that:

- Takes `bank_customer_id` and policy configuration
- Pulls from banking DB (server-to-server via Supabase)
- Returns safe, policy-filtered summary only
- Applies policy filtering based on:
  - `auth_level` (none/otp/kba)
  - `intent` (balance vs faq)
  - `channel` (whatsapp/email/voice)

**Policy Rules**:
- **Balance**: Only if OTP-verified and intent requires it
- **Transactions**: Only if OTP-verified, intent requires it, and channel allows (email restricted)
- **Account details**: Last 4 digits only, always allowed if verified
- **Card details**: Last 4 digits only, always allowed if verified

**Location**: `lib/banking/summary.ts` → `buildBankingSummary()`

**Note**: Currently uses `cc_bank_customers` table. In production, you'd have separate tables for:
- `cc_accounts` - Multiple accounts per customer
- `cc_cards` - Card information
- `cc_transactions` - Transaction history

The service is designed to be extended with these tables when available.

### ✅ 7.3 Tool Interface

Created `lib/tools/banking-summary.ts` with:

**Types**:
- `BankingSummaryRequest` - Input parameters
- `BankingSummary` - Output (matches SafeBankingSummary)

**Function**:
- `getBankingSummary(req, auditContext)` - Fetches banking summary
  - Wrapped with `callToolWithAudit()` for comprehensive logging
  - Returns minimal summary for unverified users
  - Returns full policy-filtered summary for verified users

**Rules**:
- If `authLevel === 'none'` → returns minimal summary only
- If verified but `bank_customer_id` missing → throws error
- All calls are audited and redacted

**Location**: `lib/tools/banking-summary.ts`

### ✅ 7.4 Supervisor Integration

Updated supervisor flow to fetch banking summary:

**When**:
- After OTP verification (`identity_status === 'resolved_verified'`)
- Intent requires banking context (`account_balance`, `transactions`, `card_freeze`)
- `bank_customer_id` is present

**Where**:
- Integrated into `agent_execute` node
- Fetches summary before building agent context
- Passes summary to agent via `AgentContext.bankingSummary`

**Rules**:
- If not verified → does not call banking summary tool
- If verified but `bank_customer_id` missing → does not call (would need KBA to complete identity)
- Only passes summary to agent (never raw banking DB rows)

**Location**: `lib/agents/supervisor.ts` → `agentExecute()` node

### ✅ 7.5 General Banking Agent Updates

Updated `AgentContext` to include:
- `bankingSummary?: BankingSummary` - Optional banking summary (only if verified)

Updated `general-info-agent.ts` to use summary:

**For `account_balance` intent**:
- If summary includes balance → responds with formatted balance
- If summary available but balance not included → explains policy restriction
- If no summary → fallback response

**For `transactions` intent**:
- If summary includes transactions → formats and displays last 3 transactions
- If summary available but transactions not included → explains policy restriction
- If no summary → fallback response

**For `card_freeze` intent**:
- If summary includes card info → shows card status and last 4 digits
- If card already frozen → informs user
- If no summary → fallback response

**Location**: `lib/agents/general-info-agent.ts`

## Files Created/Modified

### New Files
- `lib/banking/summary.ts` - Banking summary service with policy filtering
- `lib/tools/banking-summary.ts` - Tool interface for banking summary
- `docs/STEP7_BANKING_SUMMARY.md` - This documentation

### Modified Files
- `lib/agents/contracts.ts` - Added `BankingSummary` type and `bankingSummary` to `AgentContext`
- `lib/agents/supervisor.ts` - Added banking summary fetching in `agent_execute` node
- `lib/agents/general-info-agent.ts` - Updated to use banking summary for balance/transactions/card intents

## Policy Enforcement

The policy enforcement happens in **one place**: `lib/banking/summary.ts` → `getPolicyAllowances()`.

This ensures:
- ✅ What's allowed is defined in code, not in prompts
- ✅ Policy is consistent across all channels
- ✅ Easy to audit and modify policy rules
- ✅ Model never sees data it shouldn't

## Example Flow

1. User: "What's my balance?"
2. System: "Reply VERIFY to continue"
3. User: "VERIFY"
4. System: "I've sent a 6-digit code..."
5. User: "760159"
6. System: "Verification successful!"
7. **Supervisor fetches banking summary** (with OTP auth level, balance intent, whatsapp channel)
8. **Summary includes**: account type, last 4 digits, available balance
9. **Agent receives summary** (not raw DB rows)
10. **Agent responds**: "Your checking account (ending in 1234) has an available balance of $1,234.56"

## Testing Checklist

- [ ] Send sensitive question (balance) without verification → verify no summary fetched
- [ ] Verify via OTP → verify summary is fetched
- [ ] Check audit logs → verify all summary fetches are logged
- [ ] Verify balance is displayed correctly when available
- [ ] Verify transactions are displayed when available
- [ ] Verify card info is displayed when available
- [ ] Test with different channels (whatsapp, email) → verify policy restrictions
- [ ] Verify no full account numbers or PANs are ever returned

## Definition of Done

✅ Safe summary contract defined (no full PANs, account numbers, addresses, DOB)  
✅ Banking summary service built with policy filtering  
✅ Tool interface created with audit logging  
✅ Supervisor integrates summary fetching (only after OTP)  
✅ General Banking agent uses summary for balance/transactions/card intents  
✅ Policy enforcement in one place (not in prompts)  
✅ All summary fetches are audited and redacted

