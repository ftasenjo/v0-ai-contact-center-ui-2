/**
 * Step 4.2: Agent Contract (Shared Types)
 * 
 * Defines the contract between agents, supervisor, and tools.
 * All agents must conform to this contract for consistency and auditability.
 */

export type AuthLevel = "none" | "otp" | "kba";

export type AgentName = "general_info" | "fraud";

export type Intent =
  | "faq_branch_hours"
  | "faq_card_delivery_times"
  | "faq_fees"
  | "faq_disputes_process"
  | "faq_fraud_process"
  | "account_balance"          // sensitive
  | "transactions"            // sensitive
  | "card_freeze"             // action + sensitive
  | "fraud_report"            // Step 8: fraud case creation
  | "unknown";

export type ToolPermission =
  | "read_policy_kb"           // RAG policy/knowledge base
  | "read_banking_summary"     // sensitive
  | "read_cards"               // Step 8: read customer cards
  | "freeze_card"              // Step 8: freeze card action
  | "create_fraud_case"        // Step 8: create fraud case action
  | "send_message";

/**
 * Step 7.5: Banking Summary (safe, policy-filtered)
 */
export type BankingSummary = {
  bank_customer_id: string;
  kyc_status?: 'verified' | 'pending' | 'failed' | 'unknown';
  accounts?: Array<{
    type: string;
    last4?: string;
    currency?: string;
    availableBalance?: number;
    status?: string;
  }>;
  cards?: Array<{
    type?: string;
    last4?: string;
    status?: 'active' | 'frozen' | 'blocked' | 'replaced' | 'unknown';
  }>;
  recentTransactions?: {
    available: boolean;
    count?: number;
    transactions?: Array<{
      date?: string;
      merchant?: string;
      amount?: number;
      currency?: string;
    }>;
  };
  risk?: {
    hasFlags: boolean;
    label?: string;
  };
};

/**
 * Agent Context - Input to agent functions
 * Contains all information an agent needs to make decisions
 * Step 7.5: Added optional bankingSummary
 */
export type AgentContext = {
  conversationId: string;
  messageId: string;
  channel: "whatsapp" | "voice" | "email";
  customer: {
    identityStatus: "resolved_verified" | "resolved_unverified" | "unresolved" | "ambiguous";
    bankCustomerId?: string | null;
    authLevel: AuthLevel; // supervisor sets this
  };
  recentMessages: Array<{ direction: "inbound" | "outbound"; text: string }>;
  latestMessageText: string;
  toolPermissions: ToolPermission[];
  bankingSummary?: BankingSummary; // Step 7.5: Optional banking summary (only if verified)
};

/**
 * Agent Action - Deterministic action plan
 * Agents return an array of actions to be executed
 * Step 8: Added fraud-related actions (supervisor executes, not agent)
 */
export type AgentAction =
  | { type: "answer_faq"; topic: string }
  | { type: "request_verification"; level: AuthLevel; reason: string }
  | { type: "handoff_suggest"; reason: string }
  | { type: "ask_clarifying_question"; question: string }
  | { type: "list_cards"; bankCustomerId: string } // Step 8: Read-only action
  | { type: "freeze_card"; bankCustomerId: string; cardId: string; reason?: string } // Step 8: Action
  | { type: "create_fraud_case"; bankCustomerId: string; description: string; amount?: number; currency?: string; priority?: "low" | "medium" | "high" | "urgent" }; // Step 8: Action

/**
 * Agent Result - Output from agent functions
 * Contains the agent's decision, actions, and response draft
 */
export type AgentResult = {
  agent: AgentName;
  intent: Intent;
  actions: AgentAction[];
  responseDraft: string;
  safetyNotes?: string[]; // internal notes for supervisor/audit
};

