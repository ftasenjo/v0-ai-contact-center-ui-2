/**
 * Step 8: Fraud Agent
 * 
 * Handles fraud-related intents:
 * - Fraud case creation
 * - Card freeze requests
 * - Card listing (read-only)
 * 
 * IMPORTANT: This agent NEVER executes tools directly.
 * It outputs deterministic AgentResult with actions that the supervisor will execute
 * after validating permissions and authentication.
 */

import type { AgentContext, AgentResult, Intent, AuthLevel } from "./contracts";

/**
 * Classify fraud-related intent from message text
 */
function classifyFraudIntent(text: string): Intent {
  const t = text.toLowerCase();

  // Fraud reporting
  if (
    t.includes("fraud") ||
    t.includes("unauthorized") ||
    t.includes("unauthorised") ||
    t.includes("stolen") ||
    t.includes("scam") ||
    t.includes("suspicious transaction") ||
    t.includes("report fraud")
  ) {
    return "fraud_report";
  }

  // Card freeze (already handled by general_info, but fraud agent can also handle)
  if (
    t.includes("freeze") ||
    t.includes("block my card") ||
    t.includes("lock card") ||
    t.includes("disable card")
  ) {
    return "card_freeze";
  }

  return "unknown";
}

/**
 * Determine if an intent requires authentication
 */
function needsAuth(intent: Intent): boolean {
  return intent === "fraud_report" || intent === "card_freeze";
}

/**
 * Determine required auth level for intent
 */
function getRequiredAuthLevel(intent: Intent): AuthLevel {
  // Card freeze requires KBA (most sensitive)
  if (intent === "card_freeze") {
    return "kba";
  }
  // Fraud reporting requires OTP (sensitive but less than card freeze)
  if (intent === "fraud_report") {
    return "otp";
  }
  return "none";
}

/**
 * Check if user is responding to a freeze card prompt
 */
function isFreezeCardResponse(text: string, recentMessages: Array<{ direction: "inbound" | "outbound"; text: string }>): boolean {
  const t = text.toLowerCase().trim();
  
  // Check if this looks like a yes/no response
  const isYes = t === "yes" || t === "y" || t === "yeah" || t === "yep" || t === "sure" || t === "ok" || t === "okay" || 
                t.startsWith("yes ") || t.includes("yes please") || t.includes("yes, please");
  const isNo = t === "no" || t === "n" || t === "nope" || t === "nah" || t.startsWith("no ") || 
               t.includes("no thanks") || t.includes("no thank you") || t.includes("don't") || t.includes("dont");
  
  if (!isYes && !isNo) {
    return false;
  }
  
  // Check if last outbound message asked about freezing card
  const lastOutbound = [...recentMessages].reverse().find(msg => msg.direction === "outbound");
  if (lastOutbound) {
    const outboundText = (lastOutbound.text || "").toLowerCase();
    if (outboundText.includes("freeze your card") || 
        outboundText.includes("freeze") && outboundText.includes("card") ||
        outboundText.includes("would you like me to freeze")) {
      return true;
    }
  }
  
  return false;
}

/**
 * Fraud Agent
 * 
 * Main agent function that processes fraud-related customer messages and returns:
 * - Classified intent
 * - Deterministic action plan (actions to be executed by supervisor)
 * - Response draft
 * - Safety notes for audit
 * 
 * IMPORTANT: This agent NEVER calls tools directly.
 * It returns actions that the supervisor will execute after validation.
 */
export async function fraudAgent(ctx: AgentContext): Promise<AgentResult> {
  // Step 8: Check if this is a follow-up response to freeze card prompt
  const isFreezeResponse = isFreezeCardResponse(ctx.latestMessageText, ctx.recentMessages);
  
  if (isFreezeResponse) {
    const t = ctx.latestMessageText.toLowerCase().trim();
    const isYes = t === "yes" || t === "y" || t === "yeah" || t === "yep" || t === "sure" || t === "ok" || t === "okay" || 
                  t.startsWith("yes ") || t.includes("yes please") || t.includes("yes, please");
    
    if (isYes) {
      // User wants to freeze card - check KBA
      const isVerified = ctx.customer.identityStatus === "resolved_verified" && 
                         ctx.customer.authLevel !== "none" && 
                         !!ctx.customer.bankCustomerId;
      
      // Check if KBA is available (authLevel === 'kba')
      const hasKBA = ctx.customer.authLevel === "kba";
      
      if (!hasKBA) {
        // KBA not available - gate with controlled message
        return {
          agent: "fraud",
          intent: "card_freeze",
          actions: [
            {
              type: "request_verification",
              level: "kba",
              reason: "Card freeze requires KBA authentication",
            },
          ],
          responseDraft:
            "To freeze your card, we need an additional verification step for your security. " +
            "Please call us at 1-800-XXX-XXXX or reply **HUMAN** to speak with an agent who can help you freeze your card securely.",
          safetyNotes: [
            "User requested card freeze but KBA not available.",
            "Gating with controlled message - do not attempt freezeCard() without KBA.",
            "Supervisor should log auth_gate_decision with required_auth='kba'.",
          ],
        };
      }
      
      // KBA available - proceed with freeze
      // Get cards from banking summary
      const cards = ctx.bankingSummary?.cards || [];
      const activeCard = cards.find((c) => c.status === "active");
      
      if (!activeCard) {
        return {
          agent: "fraud",
          intent: "card_freeze",
          actions: [],
          responseDraft:
            "I can see your cards, but they all appear to be frozen or blocked already. " +
            "If you need further assistance, I can connect you with a support agent.",
          safetyNotes: [
            "User requested card freeze but no active cards available.",
          ],
        };
      }
      
      // Freeze the active card
      return {
        agent: "fraud",
        intent: "card_freeze",
        actions: [
          {
            type: "freeze_card",
            bankCustomerId: ctx.customer.bankCustomerId!,
            cardId: `card-${ctx.customer.bankCustomerId}-${activeCard.last4}`, // Stub ID
            reason: "Customer requested card freeze after fraud case creation",
          },
        ],
        responseDraft:
          `I'll freeze your ${activeCard.type} card ending in ${activeCard.last4} right now. ` +
          "This will immediately block all transactions. You can unfreeze it anytime through your online banking or by contacting us.",
        safetyNotes: [
          "User confirmed card freeze after fraud case creation.",
          `Card: ${activeCard.type} ending in ${activeCard.last4}`,
          "Supervisor should execute freeze_card action after validation.",
        ],
      };
    } else {
      // User said no - polite close (clear pending_action)
      return {
        agent: "fraud",
        intent: "fraud_report",
        actions: [],
        responseDraft:
          "Okay — your fraud case is open and our team will investigate. " +
          "You'll receive updates via email or SMS. " +
          "If you notice any other suspicious activity, please contact us immediately.",
        safetyNotes: [
          "User declined card freeze after fraud case creation.",
          "Pending action should be cleared.",
        ],
      };
    }
  }
  
  const intent = classifyFraudIntent(ctx.latestMessageText);

  // If intent is not fraud-related, return unknown (let general_info handle it)
  if (intent === "unknown") {
    return {
      agent: "fraud",
      intent: "unknown",
      actions: [
        {
          type: "ask_clarifying_question",
          question: "Are you reporting fraud, or do you need to freeze your card?",
        },
      ],
      responseDraft:
        "I can help you with fraud reporting or card freezing. Are you reporting unauthorized transactions, or do you need to freeze your card?",
      safetyNotes: ["Intent not clearly fraud-related - requesting clarification."],
    };
  }

  // Check if customer is verified
  const isVerified =
    ctx.customer.identityStatus === "resolved_verified" &&
    ctx.customer.authLevel !== "none" &&
    !!ctx.customer.bankCustomerId;

  const requiredAuthLevel = getRequiredAuthLevel(intent);

  // If sensitive intent and not verified → gate behind authentication
  if (needsAuth(intent) && !isVerified) {
    return {
      agent: "fraud",
      intent,
      actions: [
        {
          type: "request_verification",
          level: requiredAuthLevel,
          reason: "This request involves sensitive account actions and requires identity verification.",
        },
        {
          type: "ask_clarifying_question",
          question: `Reply VERIFY to continue. What exactly do you need help with (${intent === "fraud_report" ? "fraud reporting" : "card freeze"})?`,
        },
      ],
      responseDraft:
        "For your security, I need to verify your identity before I can help with fraud-related requests. " +
        `Reply **VERIFY** to continue, and tell me whether you need help with **${intent === "fraud_report" ? "reporting fraud" : "freezing your card"}**.`,
      safetyNotes: [
        "Unverified: do not disclose any account-specific info or execute actions.",
        `Supervisor should start ${requiredAuthLevel.toUpperCase()} on VERIFY.`,
        `Intent: ${intent} requires authentication.`,
      ],
    };
  }

  // If sensitive intent and verified → can proceed with actions
  if (needsAuth(intent) && isVerified) {
    // Check if auth level is sufficient
    const authLevels: AuthLevel[] = ["none", "otp", "kba"];
    const currentAuthIndex = authLevels.indexOf(ctx.customer.authLevel);
    const requiredAuthIndex = authLevels.indexOf(requiredAuthLevel);

    if (currentAuthIndex < requiredAuthIndex) {
      // Auth level insufficient - request higher level
      return {
        agent: "fraud",
        intent,
        actions: [
          {
            type: "request_verification",
            level: requiredAuthLevel,
            reason: `This action requires ${requiredAuthLevel.toUpperCase()} authentication.`,
          },
        ],
        responseDraft:
          `For this action, I need to verify your identity with ${requiredAuthLevel.toUpperCase()}. ` +
          "Reply **VERIFY** to continue.",
        safetyNotes: [
          `Current auth level (${ctx.customer.authLevel}) insufficient for ${intent}.`,
          `Requires ${requiredAuthLevel.toUpperCase()}.`,
        ],
      };
    }

    // Auth level sufficient - proceed with action plan
    if (intent === "fraud_report") {
      // Extract fraud details from message (basic keyword extraction)
      const messageText = ctx.latestMessageText.toLowerCase();
      const hasAmount = /\$\d+/.test(ctx.latestMessageText) || /\d+\.\d{2}/.test(ctx.latestMessageText);
      const amountMatch = ctx.latestMessageText.match(/\$?(\d+\.?\d*)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;

      // Determine priority based on keywords
      let priority: "low" | "medium" | "high" | "urgent" = "high";
      if (messageText.includes("urgent") || messageText.includes("immediately")) {
        priority = "urgent";
      } else if (messageText.includes("small") || messageText.includes("minor")) {
        priority = "medium";
      }

      return {
        agent: "fraud",
        intent,
        actions: [
          {
            type: "create_fraud_case",
            bankCustomerId: ctx.customer.bankCustomerId!,
            description: ctx.latestMessageText,
            amount,
            currency: "USD",
            priority,
          },
        ],
        responseDraft:
          "I understand you're reporting fraud. I'm creating a fraud case for you right now. " +
          "Our fraud team will investigate this immediately. " +
          "In the meantime, would you like me to freeze your card to prevent further unauthorized transactions?",
        safetyNotes: [
          "User is verified - can create fraud case.",
          `Auth level: ${ctx.customer.authLevel}, Priority: ${priority}`,
          "Supervisor should execute create_fraud_case action after validation.",
        ],
      };
    }

    if (intent === "card_freeze") {
      // Check if we have card information from banking summary
      const cards = ctx.bankingSummary?.cards || [];
      
      if (cards.length === 0) {
        // No cards in summary - need to list cards first
        return {
          agent: "fraud",
          intent,
          actions: [
            {
              type: "list_cards",
              bankCustomerId: ctx.customer.bankCustomerId!,
            },
            {
              type: "ask_clarifying_question",
              question: "Which card would you like to freeze? (I'll show you your cards)",
            },
          ],
          responseDraft:
            "I can help you freeze your card. Let me first check which cards you have, then I'll ask which one you'd like to freeze.",
          safetyNotes: [
            "User is verified - can list cards and freeze.",
            "No cards in banking summary - need to list cards first.",
            "Supervisor should execute list_cards action first, then freeze_card after user confirms.",
          ],
        };
      }

      // We have cards - can proceed with freeze
      // For now, assume user wants to freeze the first active card
      const activeCard = cards.find((c) => c.status === "active");
      
      if (!activeCard) {
        return {
          agent: "fraud",
          intent,
          actions: [],
          responseDraft:
            "I can see your cards, but they all appear to be frozen or blocked already. " +
            "If you need further assistance, I can connect you with a support agent.",
          safetyNotes: [
            "User is verified but no active cards to freeze.",
            `Card statuses: ${cards.map((c) => c.status).join(", ")}`,
          ],
        };
      }

      // Extract card identifier from message if mentioned (e.g., "freeze card ending in 1234")
      const cardLast4Match = ctx.latestMessageText.match(/ending in (\d{4})/i);
      const cardLast4 = cardLast4Match ? cardLast4Match[1] : activeCard.last4;

      // Find card by last4 if specified, otherwise use first active card
      const cardToFreeze = cardLast4
        ? cards.find((c) => c.last4 === cardLast4 && c.status === "active") || activeCard
        : activeCard;

      return {
        agent: "fraud",
        intent,
        actions: [
          {
            type: "freeze_card",
            bankCustomerId: ctx.customer.bankCustomerId!,
            cardId: `card-${ctx.customer.bankCustomerId}-${cardToFreeze.last4}`, // Stub ID - in production would be real card ID
            reason: "Customer requested card freeze via fraud agent",
          },
        ],
        responseDraft:
          `I'll freeze your ${cardToFreeze.type} card ending in ${cardToFreeze.last4} right now. ` +
          "This will immediately block all transactions. You can unfreeze it anytime through your online banking or by contacting us.",
        safetyNotes: [
          "User is verified with KBA - can freeze card.",
          `Card: ${cardToFreeze.type} ending in ${cardToFreeze.last4}`,
          "Supervisor should execute freeze_card action after validation.",
        ],
      };
    }
  }

  // Fallback: should not reach here
  return {
    agent: "fraud",
    intent: "unknown",
    actions: [
      {
        type: "ask_clarifying_question",
        question: "I'm not sure how to help. Are you reporting fraud or need to freeze your card?",
      },
    ],
    responseDraft:
      "I can help you with fraud reporting or card freezing. What would you like to do?",
    safetyNotes: ["Unexpected state in fraud agent - requesting clarification."],
  };
}
