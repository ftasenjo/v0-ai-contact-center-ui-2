/**
 * General Info Agent
 * 
 * Step 4.2: Implements the general_info agent that handles:
 * - Non-sensitive banking FAQs (branch hours, fees, card delivery, etc.)
 * - Gates sensitive account operations behind authentication
 * - Provides deterministic, auditable responses
 */

import type { AgentContext, AgentResult, Intent, AuthLevel } from "./contracts";
import { searchPolicyKB } from "@/lib/tools/policy-kb";
import { callToolWithAudit } from "@/lib/tools/audit-wrapper";

/**
 * Classify customer intent from message text
 * Uses keyword matching (can be enhanced with LLM classification later)
 */
function classifyIntent(text: string): Intent {
  const t = text.toLowerCase();

  // Non-sensitive FAQs
  if (t.includes("hours") || t.includes("open") || t.includes("close") || t.includes("branch")) {
    return "faq_branch_hours";
  }
  
  if (t.includes("delivery") || t.includes("arrive") || t.includes("card replacement") || t.includes("new card")) {
    return "faq_card_delivery_times";
  }
  
  if (t.includes("fee") || t.includes("charges") || t.includes("pricing") || t.includes("cost")) {
    return "faq_fees";
  }
  
  if (t.includes("dispute") || t.includes("chargeback") || t.includes("refund process")) {
    return "faq_disputes_process";
  }
  
  // Fraud reporting (actual report, not FAQ)
  if (
    t.includes("my card was used") ||
    t.includes("fraudulent") ||
    t.includes("unauthorized transaction") ||
    t.includes("unauthorised transaction") ||
    t.includes("stolen card") ||
    t.includes("card was stolen") ||
    (t.includes("fraud") && (t.includes("think") || t.includes("believe") || t.includes("suspect") || t.includes("report")))
  ) {
    return "fraud_report";
  }
  
  // FAQ about fraud process (general questions)
  if (t.includes("fraud") || t.includes("scam") || t.includes("unauthorised") || t.includes("unauthorized")) {
    return "faq_fraud_process";
  }

  // Sensitive / account-specific
  if (t.includes("balance") || t.includes("how much money") || t.includes("available")) {
    return "account_balance";
  }
  
  if (t.includes("transactions") || t.includes("statement") || t.includes("recent charges")) {
    return "transactions";
  }
  
  if (t.includes("freeze") || t.includes("block my card") || t.includes("lock card")) {
    return "card_freeze";
  }

  return "unknown";
}

/**
 * Determine if an intent requires authentication
 */
function needsAuth(intent: Intent): boolean {
  return intent === "account_balance" || intent === "transactions" || intent === "card_freeze" || intent === "fraud_report";
}

/**
 * General Info Agent
 * 
 * Main agent function that processes customer messages and returns:
 * - Classified intent
 * - Deterministic action plan
 * - Response draft
 * - Safety notes for audit
 */
export async function generalInfoAgent(ctx: AgentContext): Promise<AgentResult> {
  const intent = classifyIntent(ctx.latestMessageText);

  // Check if customer is verified for THIS conversation/session
  // (OTP/KBA grants auth_level; identityStatus alone should not bypass auth)
  const isVerified = ctx.customer.authLevel !== "none" && !!ctx.customer.bankCustomerId;

  // If sensitive intent and not verified → gate behind authentication
  if (needsAuth(intent) && !isVerified) {
    // Determine required auth level based on intent sensitivity
    const requiredAuthLevel: AuthLevel = intent === "card_freeze" ? "kba" : intent === "fraud_report" ? "otp" : "otp";
    
    return {
      agent: "general_info",
      intent,
      actions: [
        {
          type: "request_verification",
          level: requiredAuthLevel,
          reason: "This request involves account-specific information or actions and requires identity verification.",
        },
        {
          type: "ask_clarifying_question",
          question: `Reply VERIFY to continue. What exactly do you need help with (${intent === "account_balance" ? "balance" : intent === "transactions" ? "transactions" : intent === "fraud_report" ? "fraud reporting" : "card freeze"})?`,
        },
      ],
      responseDraft:
        "For your security, I need to verify your identity before I can help with account-specific details. " +
        `Reply **VERIFY** to continue, and tell me whether you need help with **${intent === "account_balance" ? "balance" : intent === "transactions" ? "transactions" : intent === "fraud_report" ? "reporting fraud" : "freezing your card"}**.`,
      safetyNotes: [
        "Unverified: do not disclose any account-specific info.",
        `Supervisor should start ${requiredAuthLevel.toUpperCase()} on VERIFY.`,
        `Intent: ${intent} requires authentication.`,
      ],
    };
  }

  // If sensitive intent and verified → can provide account info
  if (needsAuth(intent) && isVerified) {
    // User is verified - can access account information
    // TODO: Connect to actual banking API/tool for real data
    // For now, provide helpful response based on intent
    
    if (intent === "account_balance") {
      // Step 7.5: Use banking summary if available
      const summary = ctx.bankingSummary;
      
      if (summary?.accounts && summary.accounts.length > 0) {
        const account = summary.accounts[0];
        
        if (account.availableBalance !== undefined) {
          // Balance is available - show it
          const balance = account.availableBalance.toLocaleString('en-US', {
            style: 'currency',
            currency: account.currency || 'USD',
          });
          
          return {
            agent: "general_info",
            intent,
            actions: [{ type: "answer_faq", topic: "account_balance" }],
            responseDraft:
              `Your ${account.type} account (ending in ${account.last4 || '****'}) has an available balance of ${balance}. ` +
              `For detailed transaction history, please check your online banking or mobile app.`,
            safetyNotes: [
              "User is verified - balance displayed from banking summary.",
              `Account type: ${account.type}, Last 4: ${account.last4}`,
            ],
          };
        } else {
          // Summary available but balance not included (policy restriction)
          return {
            agent: "general_info",
            intent,
            actions: [{ type: "answer_faq", topic: "account_balance" }],
            responseDraft:
              `I can see your ${account.type} account (ending in ${account.last4 || '****'}), but I can't display your balance here for security reasons. ` +
              `Please check your online banking or mobile app for your current balance.`,
            safetyNotes: [
              "User is verified but balance not included in summary (policy restriction).",
            ],
          };
        }
      }
      
      // No summary available - fallback response
      return {
        agent: "general_info",
        intent,
        actions: [{ type: "answer_faq", topic: "account_balance" }],
        responseDraft:
          "I can help you check your account balance. To get your current balance, please check your online banking or mobile app. " +
          "If you need further assistance, I can connect you with a support agent.",
        safetyNotes: [
          "User is verified but banking summary not available.",
        ],
      };
    }
    
    if (intent === "transactions") {
      // Step 7.5: Use banking summary if available
      const summary = ctx.bankingSummary;
      
      if (summary?.recentTransactions?.available && summary.recentTransactions.transactions && summary.recentTransactions.transactions.length > 0) {
        // Transactions are available - format them
        const transactions = summary.recentTransactions.transactions.slice(0, 3); // Show last 3
        const transactionList = transactions
          .map((t) => {
            const amount = t.amount 
              ? t.amount.toLocaleString('en-US', { style: 'currency', currency: t.currency || 'USD' })
              : 'N/A';
            const date = t.date || 'Recent';
            const merchant = t.merchant || 'Transaction';
            return `• ${merchant} - ${amount} on ${date}`;
          })
          .join('\n');
        
        return {
          agent: "general_info",
          intent,
          actions: [{ type: "answer_faq", topic: "transactions" }],
          responseDraft:
            `Here are your recent transactions:\n\n${transactionList}\n\n` +
            `For complete transaction history, please check your online banking or mobile app.`,
          safetyNotes: [
            "User is verified - transactions displayed from banking summary.",
            `Transaction count: ${summary.recentTransactions.transactions.length}`,
          ],
        };
      } else if (summary?.recentTransactions?.available) {
        // Transactions available but not included (policy restriction)
        return {
          agent: "general_info",
          intent,
          actions: [{ type: "answer_faq", topic: "transactions" }],
          responseDraft:
            "I can see that you have recent transactions, but I can't display them here for security reasons. " +
            "Please check your online banking or mobile app for detailed transaction history.",
          safetyNotes: [
            "User is verified but transactions not included in summary (policy restriction).",
          ],
        };
      }
      
      // No transactions available - fallback response
      return {
        agent: "general_info",
        intent,
        actions: [{ type: "answer_faq", topic: "transactions" }],
        responseDraft:
          "I can help you view your recent transactions. Please check your online banking or mobile app for detailed transaction history. " +
          "If you need assistance with a specific transaction, I can connect you with a support agent.",
        safetyNotes: [
          "User is verified but transaction summary not available.",
        ],
      };
    }
    
    if (intent === "card_freeze") {
      // Step 7.5: Use banking summary if available to show card status
      const summary = ctx.bankingSummary;
      
      if (summary?.cards && summary.cards.length > 0) {
        const card = summary.cards[0];
        const cardInfo = card.last4 ? `card ending in ${card.last4}` : 'card';
        
        if (card.status === 'frozen' || card.status === 'blocked') {
          return {
            agent: "general_info",
            intent,
            actions: [{ type: "answer_faq", topic: "card_freeze" }],
            responseDraft:
              `Your ${cardInfo} is already ${card.status === 'frozen' ? 'frozen' : 'blocked'}. ` +
              `If you need to unfreeze it or have questions, I can connect you with a support agent.`,
            safetyNotes: [
              "User is verified - card status checked from banking summary.",
              `Card status: ${card.status}`,
            ],
          };
        }
        
        return {
          agent: "general_info",
          intent,
          actions: [{ type: "answer_faq", topic: "card_freeze" }],
          responseDraft:
            `I can help you freeze your ${cardInfo}. This will immediately block all transactions on your card. ` +
            `You can unfreeze it anytime through your online banking or by contacting us. ` +
            `Would you like me to proceed with freezing your card?`,
          safetyNotes: [
            "User is verified - can freeze card.",
            `Card status: ${card.status}, Last 4: ${card.last4}`,
            "TODO: Connect to banking API to actually freeze the card.",
          ],
        };
      }
      
      // No card info available - fallback response
      return {
        agent: "general_info",
        intent,
        actions: [{ type: "answer_faq", topic: "card_freeze" }],
        responseDraft:
          "I can help you freeze your card. This will immediately block all transactions on your card. " +
          "You can unfreeze it anytime through your online banking or by contacting us. " +
          "Would you like me to proceed with freezing your card?",
        safetyNotes: [
          "User is verified but card summary not available.",
          "TODO: Connect to banking API to actually freeze the card.",
        ],
      };
    }
  }

      // If non-sensitive FAQ: answer via KB (or stub)
      // Step 5.5: Use tool wrapper for audit logging
      const canUseKB = ctx.toolPermissions.includes("read_policy_kb");
      let answer = "";

      if (canUseKB) {
        const kb = await callToolWithAudit(
          "search_policy_kb",
          { query: ctx.latestMessageText },
          async (input) => await searchPolicyKB(input.query),
          {
            conversationId: ctx.conversationId,
            messageId: ctx.messageId,
            bankCustomerId: ctx.customer.bankCustomerId || undefined,
            actorType: "system",
            context: "tool_call",
          }
        );
        answer = kb.answer;
      } else {
        // fallback if KB tool not permitted/available
        answer =
          "I can help with general banking questions like fees, card delivery timelines, fraud/dispute steps, and branch hours. " +
          "What would you like to know?";
      }

  // If intent unknown: ask a clarifier
  if (intent === "unknown") {
    return {
      agent: "general_info",
      intent,
      actions: [
        {
          type: "ask_clarifying_question",
          question: "Can you tell me what you're trying to do—fees, card delivery, fraud, or disputes?",
        },
      ],
      responseDraft:
        "I can help with general banking questions. Are you asking about **fees**, **card delivery/replacement**, **fraud**, or **disputes**?",
      safetyNotes: ["Intent classification returned 'unknown' - requesting clarification."],
    };
  }

  // Known FAQ intent - return answer
  return {
    agent: "general_info",
    intent,
    actions: [{ type: "answer_faq", topic: intent }],
    responseDraft: answer,
    safetyNotes: [
      `Intent: ${intent} (non-sensitive FAQ)`,
      "No authentication required for this query.",
    ],
  };
}

