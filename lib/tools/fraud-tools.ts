/**
 * Step 8: Fraud Case & Card Freeze Tools
 * 
 * Tool interfaces for fraud case management and card operations.
 * All tools are wrapped with audit logging via callToolWithAudit.
 * 
 * IMPORTANT: These tools are stubs and should NOT be called directly by agents.
 * The supervisor's action executor will call these after validating permissions.
 */

import { callToolWithAudit } from './audit-wrapper';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * Step 8.1: Card Information
 */
export type Card = {
  id: string;
  type: 'debit' | 'credit';
  last4: string;
  status: 'active' | 'frozen' | 'blocked' | 'replaced' | 'unknown';
  bankCustomerId: string;
};

/**
 * Step 8.1: List Customer Cards Request
 */
export type ListCustomerCardsRequest = {
  bankCustomerId: string;
  authLevel: 'none' | 'otp' | 'kba';
};

/**
 * Step 8.1: List Customer Cards Response
 */
export type ListCustomerCardsResponse = {
  cards: Card[];
};

/**
 * Step 8.1: List Customer Cards
 * 
 * Read-only tool to fetch customer's cards.
 * Returns only last4 digits and status (no full PAN).
 * 
 * Rules:
 * - Requires verified identity (authLevel !== 'none')
 * - Returns only safe card information (last4, status, type)
 * - All calls are audited and redacted
 */
export async function listCustomerCards(
  req: ListCustomerCardsRequest,
  auditContext: {
    conversationId: string;
    messageId?: string;
    actorType?: 'system' | 'agent' | 'customer';
  }
): Promise<ListCustomerCardsResponse> {
  // Validate request
  if (!req.bankCustomerId) {
    throw new Error('bankCustomerId is required');
  }

  if (req.authLevel === 'none') {
    throw new Error('Authentication required to list cards');
  }

  return callToolWithAudit(
    'list_customer_cards',
    {
      bankCustomerId: req.bankCustomerId,
      authLevel: req.authLevel,
    },
    async () => {
      // TODO: In production, fetch from cc_cards table
      // For now, stub with placeholder data from banking summary
      // In production: SELECT id, type, card_number, status FROM cc_cards WHERE bank_customer_id = ...
      
      // Stub: Return placeholder cards
      // In real system, this would query a cc_cards table
      const cards: Card[] = [
        {
          id: `card-${req.bankCustomerId}-1`,
          type: 'debit',
          last4: '1234',
          status: 'active',
          bankCustomerId: req.bankCustomerId,
        },
      ];

      return { cards };
    },
    {
      conversationId: auditContext.conversationId,
      messageId: auditContext.messageId,
      bankCustomerId: req.bankCustomerId,
      actorType: auditContext.actorType || 'system',
      context: 'fraud_tools',
    }
  );
}

/**
 * Step 8.2: Freeze Card Request
 */
export type FreezeCardRequest = {
  bankCustomerId: string;
  cardId: string;
  reason?: string;
  authLevel: 'none' | 'otp' | 'kba';
};

/**
 * Step 8.2: Freeze Card Response
 */
export type FreezeCardResponse = {
  success: boolean;
  cardId: string;
  status: 'frozen' | 'blocked';
  message: string;
};

/**
 * Step 8.2: Freeze Card
 * 
 * Action tool to freeze a customer's card.
 * 
 * Rules:
 * - Requires KBA authentication (authLevel === 'kba')
 * - All calls are audited and redacted
 * - Updates card status in database
 */
export async function freezeCard(
  req: FreezeCardRequest,
  auditContext: {
    conversationId: string;
    messageId?: string;
    caseId?: string;
    actorType?: 'system' | 'agent' | 'customer';
  }
): Promise<FreezeCardResponse> {
  // Validate request
  if (!req.bankCustomerId) {
    throw new Error('bankCustomerId is required');
  }

  if (!req.cardId) {
    throw new Error('cardId is required');
  }

  if (req.authLevel !== 'kba') {
    throw new Error('KBA authentication required to freeze card');
  }

  return callToolWithAudit(
    'freeze_card',
    {
      bankCustomerId: req.bankCustomerId,
      cardId: req.cardId,
      reason: req.reason,
      authLevel: req.authLevel,
    },
    async () => {
      // TODO: In production, update cc_cards table
      // UPDATE cc_cards SET status = 'frozen', updated_at = NOW() WHERE id = ... AND bank_customer_id = ...
      
      // Stub: Simulate card freeze
      // In real system, this would:
      // 1. Verify card belongs to customer
      // 2. Update card status to 'frozen'
      // 3. Log the action
      // 4. Optionally notify card network/processor
      
      return {
        success: true,
        cardId: req.cardId,
        status: 'frozen' as const,
        message: 'Card has been frozen successfully',
      };
    },
    {
      conversationId: auditContext.conversationId,
      messageId: auditContext.messageId,
      caseId: auditContext.caseId,
      bankCustomerId: req.bankCustomerId,
      actorType: auditContext.actorType || 'system',
      context: 'fraud_tools',
    }
  );
}

/**
 * Step 8.3: Fraud Case Information
 */
export type FraudCase = {
  id: string;
  caseNumber: string;
  type: 'fraud';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  bankCustomerId: string;
  conversationId?: string;
  description?: string;
  amount?: number;
  currency?: string;
  createdAt: string;
};

/**
 * Step 8.3: Create Fraud Case Request
 */
export type CreateFraudCaseRequest = {
  bankCustomerId: string;
  conversationId: string;
  description: string;
  amount?: number;
  currency?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  authLevel: 'none' | 'otp' | 'kba';
};

/**
 * Step 8.3: Create Fraud Case Response
 */
export type CreateFraudCaseResponse = {
  success: boolean;
  caseId: string;
  caseNumber: string;
  message: string;
};

/**
 * Step 8.3: Create Fraud Case
 * 
 * Action tool to create a fraud case.
 * 
 * Rules:
 * - Requires OTP or KBA authentication (authLevel !== 'none')
 * - All calls are audited and redacted
 * - Creates case in cc_cases table
 */
export async function createFraudCase(
  req: CreateFraudCaseRequest,
  auditContext: {
    conversationId: string;
    messageId?: string;
    actorType?: 'system' | 'agent' | 'customer';
  }
): Promise<CreateFraudCaseResponse> {
  // Validate request
  if (!req.bankCustomerId) {
    throw new Error('bankCustomerId is required');
  }

  if (!req.conversationId) {
    throw new Error('conversationId is required');
  }

  if (!req.description) {
    throw new Error('description is required');
  }

  if (req.authLevel === 'none') {
    throw new Error('Authentication required to create fraud case');
  }

  return callToolWithAudit(
    'create_fraud_case',
    {
      bankCustomerId: req.bankCustomerId,
      conversationId: req.conversationId,
      description: req.description,
      amount: req.amount,
      currency: req.currency,
      priority: req.priority,
      authLevel: req.authLevel,
    },
    async () => {
      // Generate case number (format: FRAUD-YYYYMMDD-XXXX)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const caseNumber = `FRAUD-${dateStr}-${randomSuffix}`;

      // TODO: In production, insert into cc_cases table
      // INSERT INTO cc_cases (type, status, priority, bank_customer_id, conversation_id, case_number, description, amount, currency)
      // VALUES ('fraud', 'open', ..., ...)
      
      // Stub: Create case in database
      const { data: caseData, error: caseError } = await supabaseServer
        .from('cc_cases')
        .insert({
          type: 'fraud',
          status: 'open',
          priority: req.priority || 'high',
          bank_customer_id: req.bankCustomerId,
          conversation_id: req.conversationId,
          case_number: caseNumber,
          description: req.description,
          amount: req.amount || null,
          currency: req.currency || 'USD',
        })
        .select('id')
        .single();

      if (caseError || !caseData) {
        throw new Error(`Failed to create fraud case: ${caseError?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        caseId: caseData.id,
        caseNumber,
        message: `Fraud case ${caseNumber} has been created successfully`,
      };
    },
    {
      conversationId: auditContext.conversationId,
      messageId: auditContext.messageId,
      bankCustomerId: req.bankCustomerId,
      actorType: auditContext.actorType || 'system',
      context: 'fraud_tools',
    }
  );
}
