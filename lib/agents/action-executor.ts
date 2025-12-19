/**
 * Step 8: Action Executor
 * 
 * Supervisor-side function that validates permissions and authentication
 * before executing agent-requested actions.
 * 
 * IMPORTANT: This is scaffolding only - not yet connected to supervisor workflow.
 * The supervisor will call this after agent_execute to validate and execute actions.
 * 
 * Rules:
 * - Validates auth level matches action requirements
 * - Validates permissions (tool permissions)
 * - Executes tools with audit logging
 * - Returns execution results
 */

import type { AgentAction, AuthLevel, ToolPermission } from "./contracts";
import type {
  ListCustomerCardsRequest,
  ListCustomerCardsResponse,
  FreezeCardRequest,
  FreezeCardResponse,
  CreateFraudCaseRequest,
  CreateFraudCaseResponse,
} from "@/lib/tools/fraud-tools";
import {
  listCustomerCards,
  freezeCard,
  createFraudCase,
} from "@/lib/tools/fraud-tools";

/**
 * Step 8.4: Action Execution Context
 */
export type ActionExecutionContext = {
  conversationId: string;
  messageId?: string;
  caseId?: string;
  bankCustomerId: string | null;
  authLevel: AuthLevel;
  toolPermissions: ToolPermission[];
  actorType?: "system" | "agent" | "customer";
};

/**
 * Step 8.4: Action Execution Result
 */
export type ActionExecutionResult =
  | {
      success: true;
      action: AgentAction;
      result: any; // Tool result (type depends on action)
      message?: string;
    }
  | {
      success: false;
      action: AgentAction;
      error: string;
      errorCode?: string;
    };

/**
 * Step 8.4: Validate Action Permissions
 * 
 * Checks if the current auth level and tool permissions allow the action.
 */
function validateActionPermissions(
  action: AgentAction,
  ctx: ActionExecutionContext
): { valid: boolean; error?: string; errorCode?: string } {
  // Read-only actions
  if (action.type === "list_cards") {
    if (ctx.authLevel === "none") {
      return {
        valid: false,
        error: "Authentication required to list cards",
        errorCode: "AUTH_REQUIRED",
      };
    }
    if (!ctx.toolPermissions.includes("read_cards")) {
      return {
        valid: false,
        error: "Permission denied: read_cards",
        errorCode: "PERMISSION_DENIED",
      };
    }
    return { valid: true };
  }

  // Card freeze action
  if (action.type === "freeze_card") {
    if (ctx.authLevel !== "kba") {
      return {
        valid: false,
        error: "KBA authentication required to freeze card",
        errorCode: "AUTH_INSUFFICIENT",
      };
    }
    if (!ctx.toolPermissions.includes("freeze_card")) {
      return {
        valid: false,
        error: "Permission denied: freeze_card",
        errorCode: "PERMISSION_DENIED",
      };
    }
    if (!ctx.bankCustomerId) {
      return {
        valid: false,
        error: "bankCustomerId required for card freeze",
        errorCode: "MISSING_CUSTOMER_ID",
      };
    }
    return { valid: true };
  }

  // Fraud case creation
  if (action.type === "create_fraud_case") {
    if (ctx.authLevel === "none") {
      return {
        valid: false,
        error: "Authentication required to create fraud case",
        errorCode: "AUTH_REQUIRED",
      };
    }
    if (!ctx.toolPermissions.includes("create_fraud_case")) {
      return {
        valid: false,
        error: "Permission denied: create_fraud_case",
        errorCode: "PERMISSION_DENIED",
      };
    }
    if (!ctx.bankCustomerId) {
      return {
        valid: false,
        error: "bankCustomerId required for fraud case creation",
        errorCode: "MISSING_CUSTOMER_ID",
      };
    }
    return { valid: true };
  }

  // Non-action actions (answer_faq, request_verification, etc.) - always valid
  return { valid: true };
}

/**
 * Step 8.4: Execute Action
 * 
 * Executes a single agent action after validation.
 * 
 * IMPORTANT: This function is scaffolding only - not yet connected to supervisor.
 */
export async function executeAction(
  action: AgentAction,
  ctx: ActionExecutionContext
): Promise<ActionExecutionResult> {
  // Validate permissions first
  const validation = validateActionPermissions(action, ctx);
  if (!validation.valid) {
    return {
      success: false,
      action,
      error: validation.error || "Action validation failed",
      errorCode: validation.errorCode,
    };
  }

  // Execute action based on type
  try {
    if (action.type === "list_cards") {
      if (!ctx.bankCustomerId) {
        return {
          success: false,
          action,
          error: "bankCustomerId required",
          errorCode: "MISSING_CUSTOMER_ID",
        };
      }

      const result: ListCustomerCardsResponse = await listCustomerCards(
        {
          bankCustomerId: ctx.bankCustomerId,
          authLevel: ctx.authLevel,
        },
        {
          conversationId: ctx.conversationId,
          messageId: ctx.messageId,
          actorType: ctx.actorType || "system",
        }
      );

      return {
        success: true,
        action,
        result,
        message: `Found ${result.cards.length} card(s)`,
      };
    }

    if (action.type === "freeze_card") {
      if (!ctx.bankCustomerId) {
        return {
          success: false,
          action,
          error: "bankCustomerId required",
          errorCode: "MISSING_CUSTOMER_ID",
        };
      }

      const result: FreezeCardResponse = await freezeCard(
        {
          bankCustomerId: ctx.bankCustomerId,
          cardId: action.cardId,
          reason: action.reason,
          authLevel: ctx.authLevel,
        },
        {
          conversationId: ctx.conversationId,
          messageId: ctx.messageId,
          caseId: ctx.caseId,
          actorType: ctx.actorType || "system",
        }
      );

      return {
        success: true,
        action,
        result,
        message: result.message,
      };
    }

    if (action.type === "create_fraud_case") {
      if (!ctx.bankCustomerId) {
        return {
          success: false,
          action,
          error: "bankCustomerId required",
          errorCode: "MISSING_CUSTOMER_ID",
        };
      }

      const result: CreateFraudCaseResponse = await createFraudCase(
        {
          bankCustomerId: ctx.bankCustomerId,
          conversationId: ctx.conversationId,
          description: action.description,
          amount: action.amount,
          currency: action.currency || "USD",
          priority: action.priority,
          authLevel: ctx.authLevel,
        },
        {
          conversationId: ctx.conversationId,
          messageId: ctx.messageId,
          actorType: ctx.actorType || "system",
        }
      );

      return {
        success: true,
        action,
        result,
        message: result.message,
      };
    }

    // Non-action actions (answer_faq, request_verification, etc.) - no execution needed
    return {
      success: true,
      action,
      result: null,
      message: "Action validated (no tool execution required)",
    };
  } catch (error: any) {
    // Step 8: Provide more specific error messages
    let errorMessage = error?.message || "Action execution failed";
    let errorCode = error?.code || "EXECUTION_FAILED";
    
    // Handle specific error cases
    if (error?.message?.includes("KBA authentication required")) {
      errorMessage = "KBA authentication required for this action";
      errorCode = "AUTH_INSUFFICIENT";
    } else if (error?.message?.includes("Authentication required")) {
      errorMessage = "Authentication required for this action";
      errorCode = "AUTH_REQUIRED";
    } else if (error?.message?.includes("Permission denied")) {
      errorMessage = "Permission denied for this action";
      errorCode = "PERMISSION_DENIED";
    }
    
    return {
      success: false,
      action,
      error: errorMessage,
      errorCode,
    };
  }
}

/**
 * Step 8.4: Execute Multiple Actions
 * 
 * Executes multiple actions in sequence, stopping on first failure.
 * 
 * IMPORTANT: This function is scaffolding only - not yet connected to supervisor.
 */
export async function executeActions(
  actions: AgentAction[],
  ctx: ActionExecutionContext
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action, ctx);
    results.push(result);

    // Stop on first failure (fail-fast)
    if (!result.success) {
      break;
    }

    // Update context with results (e.g., caseId from create_fraud_case)
    if (result.success && result.result) {
      if (action.type === "create_fraud_case" && result.result.caseId) {
        ctx.caseId = result.result.caseId;
      }
    }
  }

  return results;
}
