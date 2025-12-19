/**
 * Step 7.3: Banking Summary Tool Interface
 * 
 * Provides a tool interface for fetching safe banking summaries.
 * All calls are wrapped with audit logging via callToolWithAudit.
 */

import { callToolWithAudit } from './audit-wrapper';
import { buildBankingSummary, type SafeBankingSummary } from '@/lib/banking/summary';

/**
 * Step 7.3: Banking Summary Request
 */
export type BankingSummaryRequest = {
  bankCustomerId: string;
  authLevel: 'none' | 'otp' | 'kba';
  intent: string;
  channel: 'whatsapp' | 'voice' | 'email';
};

/**
 * Step 7.3: Banking Summary Response
 * 
 * This matches the SafeBankingSummary contract from lib/banking/summary.ts
 */
export type BankingSummary = SafeBankingSummary;

/**
 * Step 7.3: Get Banking Summary
 * 
 * Fetches a safe, policy-filtered banking summary for a customer.
 * All calls are audited and redacted.
 * 
 * Rules:
 * - If not verified (authLevel === 'none') → returns minimal summary
 * - If verified but bank_customer_id missing → throws error
 * - Applies policy filtering based on auth_level, intent, and channel
 */
export async function getBankingSummary(
  req: BankingSummaryRequest,
  auditContext: {
    conversationId: string;
    messageId?: string;
    actorType?: 'system' | 'agent' | 'customer';
  }
): Promise<BankingSummary> {
  // Validate request
  if (!req.bankCustomerId) {
    throw new Error('bankCustomerId is required');
  }

  if (req.authLevel === 'none') {
    // Not verified - return minimal summary only
    return callToolWithAudit(
      'get_banking_summary',
      {
        bankCustomerId: req.bankCustomerId,
        authLevel: req.authLevel,
        intent: req.intent,
        channel: req.channel,
      },
      async () => {
        // Minimal summary for unverified users
        return {
          bank_customer_id: req.bankCustomerId,
          kyc_status: 'unknown',
          recentTransactions: {
            available: false,
          },
          risk: {
            hasFlags: false,
          },
        };
      },
      {
        conversationId: auditContext.conversationId,
        messageId: auditContext.messageId,
        bankCustomerId: req.bankCustomerId,
        actorType: auditContext.actorType || 'system',
        context: 'banking_summary',
      }
    );
  }

  // Verified user - fetch full summary with policy filtering
  return callToolWithAudit(
    'get_banking_summary',
    {
      bankCustomerId: req.bankCustomerId,
      authLevel: req.authLevel,
      intent: req.intent,
      channel: req.channel,
    },
    async () => {
      return await buildBankingSummary(req.bankCustomerId, {
        authLevel: req.authLevel,
        intent: req.intent,
        channel: req.channel,
      });
    },
    {
      conversationId: auditContext.conversationId,
      messageId: auditContext.messageId,
      bankCustomerId: req.bankCustomerId,
      actorType: auditContext.actorType || 'system',
      context: 'banking_summary',
    }
  );
}

