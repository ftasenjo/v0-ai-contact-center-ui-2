/**
 * Step 4: LangGraph Inbound Supervisor
 * 
 * Orchestrates the GeneralInfoAgent with 8 mandatory nodes:
 * 1. load_context
 * 2. resolve_identity
 * 3. route_agent
 * 4. agent_execute
 * 5. auth_gate
 * 6. format_response
 * 7. persist_and_send
 * 8. wrap_up
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { getBankingConversation } from "@/lib/banking-store";
import { resolveIdentity } from "@/lib/identity-resolution";
import { generalInfoAgent } from "./general-info-agent";
import { fraudAgent } from "./fraud-agent";
import { executeActions, type ActionExecutionContext, type ActionExecutionResult } from "./action-executor";
import type { CreateFraudCaseResponse, FreezeCardResponse } from "@/lib/tools/fraud-tools";
import type { AgentAction, AgentContext, AgentResult, AuthLevel, Intent, ToolPermission } from "./contracts";
import type { Conversation, Message } from "@/lib/sample-data";
import { supabaseServer } from "@/lib/supabase-server";
import { getTwilioClient } from "@/lib/twilio";
import { startOtp, verifyOtp, getActiveAuthSession, extractOtpCode } from "@/lib/tools/otp";
import { getBankingSummary } from "@/lib/tools/banking-summary";
import { resumePendingOutboundAfterOtp } from "@/lib/outbound/outbound-resume";
import { emitAutomationEvent } from "@/lib/automation/outbox";
import { AutomationEventTypes } from "@/lib/automation/types";
import crypto from "crypto";

/**
 * Supervisor State - Must match Step 4.1 requirements exactly
 */
export interface SupervisorState {
  // ========== INPUT ==========
  conversation_id: string;
  message_id: string;
  channel: "whatsapp" | "voice" | "email";

  // ========== CONVERSATION CONTEXT ==========
  conversation: Conversation | null;
  latest_message: Message | null;
  recent_messages: Message[]; // last 5-10

  // ========== IDENTITY (from Step 3) ==========
  identity_status: "resolved_verified" | "resolved_unverified" | "unresolved" | "ambiguous";
  bank_customer_id: string | null;
  auth_level: AuthLevel; // Current auth level

  // ========== ROUTING / CONTROL ==========
  intent: Intent | null;
  selected_agent: "general_info" | "fraud" | null;
  requires_auth: boolean;
  errors: Array<{ code: string; message: string; timestamp: Date }>;
  retry_count: number;

  // ========== OUTPUT ==========
  assistant_draft: string;
  actions: AgentAction[];
  disposition_code: string | null;

  // ========== INTERNAL (for supervisor use) ==========
  from_address?: string; // For identity resolution
  agent_result?: AgentResult; // Result from agent_execute
  formatted_response?: string; // Result from format_response
  message_sent?: boolean; // Track if message was sent
  otp_handled?: boolean; // Track if OTP was handled in this run
  otp_response?: string; // OTP-specific response message
  banking_summary?: any; // Step 7.4: Banking summary (safe, policy-filtered)
  just_verified?: boolean; // True only for the single turn immediately after OTP verification
  case_id?: string; // Step 8: Fraud case ID if created
  pending_action?: string; // Step 8: Track pending follow-up actions (e.g., 'freeze_card_prompted')

  // ========== VOICE (Step 9) ==========
  voice_control_url?: string; // Vapi live-call control URL (optional)
  voice_provider_call_id?: string; // Twilio CallSid (preferred) or Vapi call.id
}

/**
 * Audit log helper
 * Step 5.1: Standardized schema with message_id
 * Step 5.3: Input/output already redacted by writeAuditLog
 */
async function auditLog(
  conversationId: string,
  eventType: string,
  data: Record<string, any>,
  success: boolean = true,
  error?: { code?: string; message?: string },
  messageId?: string
): Promise<void> {
  try {
    const { writeAuditLog } = await import("@/lib/banking-store");
    await writeAuditLog({
      conversationId,
      messageId: messageId || data.message_id, // Step 5.1: Include message_id
      bankCustomerId: data.bank_customer_id,
      actorType: "system",
      eventType,
      eventVersion: 1,
      inputRedacted: {
        conversation_id: conversationId,
        message_id: messageId || data.message_id,
        channel: data.channel,
        intent: data.intent,
        selected_agent: data.selected_agent,
        identity_status: data.identity_status,
        auth_level: data.auth_level,
        requires_auth: data.requires_auth,
      },
      outputRedacted: {
        assistant_draft_length: data.assistant_draft?.length || data.response_length || 0,
        actions_count: data.actions?.length || data.actions_count || 0,
        disposition_code: data.disposition_code,
        errors_count: data.errors?.length || data.errors_count || 0,
        message_sent: data.message_sent,
        twilio_sid: data.twilio_sid,
        // Voice tracing (lets us prove "say routed back" DB-only for a specific CallSid)
        voice_provider_call_id: data.voice_provider_call_id,
        has_voice_control_url: !!data.voice_control_url,
        http_status: data.http_status,
        was_duplicate: data.was_duplicate,
      },
      success,
      errorCode: error?.code,
      errorMessage: error?.message,
      context: 'supervisor', // For redaction context
    });
  } catch (auditError) {
    console.error(`Failed to write audit log for ${eventType}:`, auditError);
  }
}

/**
 * Step 6: Conversation-scoped auth level
 * OTP should grant `auth_level=otp` for the conversation/session only (not forever).
 */
async function getConversationAuthLevel(conversationId: string): Promise<"none" | "otp" | "kba"> {
  try {
    const { data } = await supabaseServer
      .from("cc_auth_sessions")
      .select("method,status,verified_at,expires_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return "none";
    if (data.status !== "verified" || !data.verified_at) return "none";

    const now = Date.now();
    const verifiedAt = new Date(data.verified_at).getTime();
    if (!Number.isFinite(verifiedAt)) return "none";

    // Demo-safe TTL for keeping the conversation verified (30 minutes)
    const ttlMs = 30 * 60 * 1000;
    if (now - verifiedAt > ttlMs) return "none";

    // Fail closed if expires_at exists and is in the past
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at).getTime();
      if (Number.isFinite(expiresAt) && expiresAt < now) return "none";
    }

    return data.method === "kba" ? "kba" : "otp";
  } catch (e) {
    console.warn("⚠️ [auth] Failed to load auth level for conversation:", e);
    return "none";
  }
}

/**
 * Node 1: load_context
 * Fetch conversation + latest inbound message + recent message window
 */
async function loadContext(state: SupervisorState): Promise<Partial<SupervisorState>> {
  try {
    console.log("📋 [load_context] Loading conversation context:", state.conversation_id);

    // Fetch conversation from banking store
    const conversation = await getBankingConversation(state.conversation_id);

    if (!conversation) {
      throw new Error(`Conversation ${state.conversation_id} not found`);
    }

    // Get latest message (should be the inbound message we're processing)
    const allMessages = conversation.messages || [];
    const latestMessage = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;

    // Get recent messages (last 10)
    const recentMessages = allMessages.slice(-10);

    // Load canonical bank_customer_id from cc_conversations (do NOT rely on the mapped UI conversation shape)
    const { data: convRow } = await supabaseServer
      .from("cc_conversations")
      .select("bank_customer_id")
      .eq("id", state.conversation_id)
      .maybeSingle();

    const conversationBankCustomerId: string | null = convRow?.bank_customer_id ?? null;

    // Load conversation-scoped auth_level from cc_auth_sessions
    const authLevel = await getConversationAuthLevel(state.conversation_id);

    // Step 8: Load pending_action from latest outbound cc_messages row (persisted across runs)
    let pendingAction: string | undefined;
    try {
      const { data: latestOutbound } = await supabaseServer
        .from("cc_messages")
        .select("body_json,body_text,created_at")
        .eq("conversation_id", state.conversation_id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const pendingFromJson = (latestOutbound as any)?.body_json?.pending_action as string | undefined;
      if (pendingFromJson) {
        pendingAction = pendingFromJson;
      } else {
        const lastOutboundText = ((latestOutbound as any)?.body_text || "").toLowerCase();
        if (lastOutboundText.includes("would you like me to freeze your card")) {
          pendingAction = "freeze_card_prompted";
        }
      }
    } catch (e) {
      // Non-fatal: fall back to message-based inference only
      console.warn("⚠️ [load_context] Failed to load pending_action from cc_messages:", e);
    }

    // Audit
    await auditLog(
      state.conversation_id,
      "context_loaded",
      {
        conversation_id: state.conversation_id,
        message_id: state.message_id,
        has_conversation: !!conversation,
        message_count: allMessages.length,
        recent_message_count: recentMessages.length,
        has_bank_customer_id: !!conversationBankCustomerId,
        auth_level: authLevel,
      },
      true,
      undefined,
      state.message_id
    );

    return {
      conversation,
      latest_message: latestMessage,
      recent_messages: recentMessages,
      ...(conversationBankCustomerId ? { bank_customer_id: conversationBankCustomerId } : {}),
      auth_level: authLevel,
      just_verified: false,
      ...(pendingAction ? { pending_action: pendingAction } : {}),
    };
  } catch (error: any) {
    console.error("❌ [load_context] Error:", error);
      await auditLog(
        state.conversation_id,
        "context_loaded",
        { conversation_id: state.conversation_id },
        false,
        { code: "CONTEXT_LOAD_FAILED", message: error?.message },
        state.message_id
      );
    return {
      errors: [
        ...(state.errors || []),
        {
          code: "CONTEXT_LOAD_FAILED",
          message: error?.message || "Failed to load conversation context",
          timestamp: new Date(),
        },
      ],
    };
  }
}

/**
 * Node 2: resolve_identity
 * Call Step 3 identity resolution
 */
async function resolveIdentityNode(state: SupervisorState): Promise<Partial<SupervisorState>> {
  try {
    console.log("🔐 [resolve_identity] Resolving identity:", {
      conversation_id: state.conversation_id,
      from_address: state.from_address,
      channel: state.channel,
    });

    if (!state.from_address) {
      // No address to resolve - mark as unresolved
      await auditLog(state.conversation_id, "identity_resolution_result", {
        conversation_id: state.conversation_id,
        identity_status: "unresolved",
      });
      return {
        identity_status: "unresolved",
        bank_customer_id: null,
        auth_level: "none",
      };
    }

    // Call Step 3 identity resolution
    const identityResult = await resolveIdentity({
      channel: state.channel,
      fromAddress: state.from_address,
      conversationId: state.conversation_id,
    });

    // Map identity result to state
    let identityStatus: "resolved_verified" | "resolved_unverified" | "unresolved" | "ambiguous" =
      identityResult.status === "resolved_verified"
        ? "resolved_verified"
        : identityResult.status === "resolved_unverified"
        ? "resolved_unverified"
        : identityResult.status === "ambiguous"
        ? "ambiguous"
        : "unresolved";

    // Prefer identity-resolution result, otherwise fall back to cc_conversations.bank_customer_id (from load_context)
    const bankCustomerId =
      (identityResult.status === "resolved_verified" || identityResult.status === "resolved_unverified"
        ? identityResult.bankCustomerId || null
        : null) ||
      (state.bank_customer_id && state.bank_customer_id.trim() ? state.bank_customer_id : null);

    // If we have a bank_customer_id but identity says unresolved, treat as resolved_unverified
    if (bankCustomerId && identityStatus === "unresolved") {
      identityStatus = "resolved_unverified";
    }

    // IMPORTANT: auth_level is conversation-scoped (cc_auth_sessions), not derived from identity links.
    const authLevel = state.auth_level || "none";

    // Audit
    await auditLog(
      state.conversation_id,
      "identity_resolution_result",
      {
        conversation_id: state.conversation_id,
        identity_status: identityStatus,
        bank_customer_id: bankCustomerId,
        auth_level: authLevel,
      },
      true,
      undefined,
      state.message_id
    );

    return {
      identity_status: identityStatus,
      bank_customer_id: bankCustomerId,
      auth_level: authLevel,
    };
  } catch (error: any) {
    console.error("❌ [resolve_identity] Error:", error);
    await auditLog(
      state.conversation_id,
      "identity_resolution_result",
      { conversation_id: state.conversation_id },
      false,
      { code: "IDENTITY_RESOLUTION_FAILED", message: error?.message },
      state.message_id
    );
    return {
      identity_status: "unresolved",
      bank_customer_id: null,
      auth_level: "none",
      errors: [
        ...(state.errors || []),
        {
          code: "IDENTITY_RESOLUTION_FAILED",
          message: error?.message || "Failed to resolve identity",
          timestamp: new Date(),
        },
      ],
    };
  }
}

/**
 * Node 3: handle_otp
 * Step 6.4: Handle OTP authentication flow
 * - Detect "VERIFY" command → start OTP
 * - Detect 6-digit code → verify OTP
 * - Handle lockout after max attempts
 */
async function handleOtp(state: SupervisorState): Promise<Partial<SupervisorState>> {
  try {
    console.log("🔐 [handle_otp] Checking for OTP flow");

    if (!state.latest_message) {
      return {}; // No message to process
    }

    const messageText = state.latest_message.content?.toLowerCase().trim() || "";
    
    // Check if message is "VERIFY" command
    if (messageText === "verify" || messageText === "verify me" || messageText.startsWith("verify ")) {
      console.log("📱 [handle_otp] VERIFY command detected - starting OTP");

      // Check if there's already an active OTP session
      const activeSession = await getActiveAuthSession(state.conversation_id);
      if (activeSession) {
        // OTP already sent, remind user
        await auditLog(
          state.conversation_id,
          "otp_already_sent",
          {
            conversation_id: state.conversation_id,
            session_id: activeSession.id,
          },
          true,
          undefined,
          state.message_id
        );

        return {
          otp_handled: true,
          otp_response: "📱 I've already sent a 6-digit code to your phone. Please reply with the code to continue.",
        };
      }

      // Start OTP
      if (!state.from_address) {
        throw new Error("No from_address available for OTP");
      }

      // Extract E.164 phone (remove whatsapp: prefix)
      const e164Phone = state.from_address.replace(/^whatsapp:/, "");

      try {
        const otpResult = await startOtp(e164Phone, {
          conversationId: state.conversation_id,
          messageId: state.message_id,
          bankCustomerId: state.bank_customer_id || undefined,
          channel: state.channel,
        });

        await auditLog(
          state.conversation_id,
          "otp_started",
          {
            conversation_id: state.conversation_id,
            verification_sid: otpResult.sid,
          },
          true,
          undefined,
          state.message_id
        );

        return {
          otp_handled: true,
          otp_response: "🔐 For your security, I've sent a 6-digit code to your phone. Please reply with the code to continue.",
        };
      } catch (otpError: any) {
        console.error("❌ [handle_otp] Failed to start OTP:", otpError);
        await auditLog(
          state.conversation_id,
          "otp_start_failed",
          { conversation_id: state.conversation_id },
          false,
          { code: "OTP_START_FAILED", message: otpError?.message },
          state.message_id
        );

        return {
          otp_handled: true,
          otp_response: "I'm having trouble sending the verification code. Please try again or contact our support team.",
        };
      }
    }

    // Check if message contains a 6-digit OTP code
    const otpCode = extractOtpCode(state.latest_message.content || "");
    if (otpCode) {
      console.log("🔢 [handle_otp] OTP code detected - verifying");

      // Get active auth session
      const activeSession = await getActiveAuthSession(state.conversation_id);
      if (!activeSession) {
        return {
          otp_handled: true,
          otp_response: "No active verification session found. Please reply VERIFY to start verification.",
        };
      }

      // Check if max attempts reached
      if (activeSession.attempts >= activeSession.max_attempts) {
        await auditLog(
          state.conversation_id,
          "otp_lockout",
          {
            conversation_id: state.conversation_id,
            session_id: activeSession.id,
          },
          false,
          { code: "OTP_MAX_ATTEMPTS", message: "Maximum verification attempts reached" },
          state.message_id
        );

        return {
          otp_handled: true,
          otp_response: "For security, verification is locked. Please call us or visit a branch.",
        };
      }

      // Verify OTP
      if (!state.from_address) {
        throw new Error("No from_address available for OTP verification");
      }

      const e164Phone = state.from_address.replace(/^whatsapp:/, "");

      try {
        const verifyResult = await verifyOtp(e164Phone, otpCode, {
          conversationId: state.conversation_id,
          messageId: state.message_id,
          bankCustomerId: state.bank_customer_id || undefined,
          channel: state.channel,
        });

        if (verifyResult.valid) {
          console.log("✅ [handle_otp] OTP verified successfully");

          // Step 6.5: Identity binding after OTP
          // If we have a single candidate bank_customer_id, bind it
          // Otherwise, keep verified "channel owner" but not mapped to specific bank customer
          if (state.bank_customer_id) {
            // Update identity link to verified
            await supabaseServer
              .from("cc_identity_links")
              .update({
                is_verified: true,
                bank_customer_id: state.bank_customer_id,
                last_seen_at: new Date().toISOString(),
              })
              .eq("channel", state.channel)
              .eq("address", state.from_address);

            // Update conversation with bank_customer_id
            await supabaseServer
              .from("cc_conversations")
              .update({
                bank_customer_id: state.bank_customer_id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", state.conversation_id);

            await auditLog(
              state.conversation_id,
              "identity_bound_after_otp",
              {
                conversation_id: state.conversation_id,
                bank_customer_id: state.bank_customer_id,
              },
              true,
              undefined,
              state.message_id
            );

            // Step 10: Resume any outbound workflows that were waiting on OTP.
            // Best-effort only; never blocks the inbound response.
            try {
              if (state.from_address) {
                await resumePendingOutboundAfterOtp({
                  bankCustomerId: state.bank_customer_id,
                  channel: state.channel,
                  fromAddress: state.from_address,
                  conversationId: state.conversation_id,
                  messageId: state.message_id,
                });
              }
            } catch (resumeError: any) {
              await auditLog(
                state.conversation_id,
                "outbound_resume_after_otp_failed",
                {
                  conversation_id: state.conversation_id,
                  bank_customer_id: state.bank_customer_id,
                },
                false,
                { code: "OUTBOUND_RESUME_FAILED", message: resumeError?.message },
                state.message_id
              );
            }
          }

          await auditLog(
            state.conversation_id,
            "otp_verified",
            {
              conversation_id: state.conversation_id,
              session_id: activeSession.id,
            },
            true,
            undefined,
            state.message_id
          );

          // After successful OTP verification, answer the ORIGINAL question automatically.
          // The user often sends: question -> VERIFY -> code. We should skip VERIFY and pick the last meaningful question.
          const recentMessages = state.recent_messages || [];
          const customerMessages = recentMessages.filter((m) => m.type === "customer" && !!m.content);

          const isOtpCodeMessage = (t: string) => /\b\d{6}\b/.test(t.trim());
          const isVerifyMessage = (t: string) => {
            const s = t.trim().toLowerCase();
            return s === "verify" || s === "verify me" || s.startsWith("verify ");
          };

          const pendingQuestion = [...customerMessages]
            .reverse()
            .find((m) => !isOtpCodeMessage(m.content) && !isVerifyMessage(m.content));

          if (pendingQuestion) {
            const previousText = pendingQuestion.content.toLowerCase();
            const sensitiveKeywords = ["balance", "transactions", "statement", "freeze", "card", "account"];
            const hasSensitiveIntent = sensitiveKeywords.some((keyword) => previousText.includes(keyword));

            if (hasSensitiveIntent) {
              console.log("📝 [handle_otp] Found pending sensitive question, answering after verification");
              return {
                identity_status: "resolved_verified" as const,
                auth_level: "otp" as const,
                latest_message: pendingQuestion,
                intent: null,
                just_verified: true,
              };
            }
          }

          // No pending question - just confirm verification
          return {
            otp_handled: true,
            identity_status: "resolved_verified" as const,
            auth_level: "otp" as const,
            otp_response: "✅ Verification successful! You can now ask about your balance or recent transactions.",
            just_verified: false,
          };
        } else {
          // Invalid code
          const attemptsRemaining = verifyResult.attemptsRemaining ?? 0;
          
          await auditLog(
            state.conversation_id,
            "otp_verification_failed",
            {
              conversation_id: state.conversation_id,
              session_id: activeSession.id,
              attempts_remaining: attemptsRemaining,
            },
            false,
            { code: "OTP_INVALID", message: "Invalid OTP code" },
            state.message_id
          );

          if (attemptsRemaining > 0) {
            return {
              otp_handled: true,
              otp_response: `❌ That code didn't work. Please try again. Attempts left: ${attemptsRemaining}.`,
            };
          } else {
            return {
              otp_handled: true,
              otp_response: "🔒 For security, verification is locked. Please call us or visit a branch.",
            };
          }
        }
      } catch (verifyError: any) {
        console.error("❌ [handle_otp] Failed to verify OTP:", verifyError);
        await auditLog(
          state.conversation_id,
          "otp_verification_error",
          { conversation_id: state.conversation_id },
          false,
          { code: "OTP_VERIFY_ERROR", message: verifyError?.message },
          state.message_id
        );

        return {
          otp_handled: true,
          otp_response: "I'm having trouble verifying the code. Please try again.",
        };
      }
    }

    // No OTP-related message - continue normal flow
    return {};
  } catch (error: any) {
    console.error("❌ [handle_otp] Error:", error);
    await auditLog(
      state.conversation_id,
      "otp_handling_error",
      { conversation_id: state.conversation_id },
      false,
      { code: "OTP_HANDLING_ERROR", message: error?.message },
      state.message_id
    );
    return {
      errors: [
        ...(state.errors || []),
        {
          code: "OTP_HANDLING_ERROR",
          message: error?.message || "Failed to handle OTP",
          timestamp: new Date(),
        },
      ],
    };
  }
}

/**
 * Node 4: route_agent
 * Select agent based on intent and set allowed tools
 * Step 8: Routes to fraud agent for fraud_report intent
 */
async function routeAgent(state: SupervisorState): Promise<Partial<SupervisorState>> {
  try {
    console.log("🛣️ [route_agent] Routing to agent");

    // Step 8: Check for pending_action first (follow-up handling)
    // Also check recent messages to detect freeze card prompt
    const messageText = state.latest_message?.content?.toLowerCase().trim() || 
                        state.latest_message?.body_text?.toLowerCase().trim() || "";
    const isYesNo = messageText === "yes" || messageText === "y" || messageText === "yeah" || 
                    messageText === "yep" || messageText === "sure" || messageText === "ok" || 
                    messageText === "okay" || messageText === "no" || messageText === "n" || 
                    messageText === "nope" || messageText.startsWith("yes ") || 
                    messageText.startsWith("no ") || messageText.includes("yes please") ||
                    messageText.includes("no thanks") || messageText.includes("don't") ||
                    messageText.includes("dont");
    
    // Check if we have pending_action OR if last outbound message asked about freezing card
    const hasPendingAction = state.pending_action === "freeze_card_prompted";
    const lastOutbound = (state.recent_messages || [])
      .filter((msg: any) => {
        const direction = msg.direction || (msg.type === "customer" ? "inbound" : "outbound");
        return direction === "outbound";
      })
      .slice(-1)[0];
    
    const lastOutboundText = (lastOutbound?.content || lastOutbound?.body_text || lastOutbound?.text || "").toLowerCase();
    const askedAboutFreeze = lastOutboundText.includes("freeze your card") || 
                             (lastOutboundText.includes("freeze") && lastOutboundText.includes("card")) ||
                             lastOutboundText.includes("would you like me to freeze");
    
    if ((hasPendingAction || askedAboutFreeze) && isYesNo) {
      // Route to fraud agent for follow-up handling
      const selectedAgent: "general_info" | "fraud" = "fraud";
      
      // Set tool permissions
      const toolPermissions: ToolPermission[] = ["read_policy_kb", "send_message"];
      if (state.auth_level !== "none" && !!state.bank_customer_id) {
        toolPermissions.push("read_banking_summary", "read_cards", "freeze_card", "create_fraud_case");
      }
      
      await auditLog(
        state.conversation_id,
        "agent_selected",
        {
          conversation_id: state.conversation_id,
          selected_agent: selectedAgent,
          tool_permissions: toolPermissions,
          pending_action: state.pending_action || (askedAboutFreeze ? "freeze_card_prompted" : undefined),
          detected_follow_up: true,
        },
        true,
        undefined,
        state.message_id
      );
      
      return {
        selected_agent: selectedAgent,
      };
    }
    
    // Pre-classify intent to determine routing
    // NOTE: `messageText` is already used above for follow-up detection.
    // Reuse it to avoid duplicate const declarations in this scope.
    const routingText = messageText;
    let preClassifiedIntent: Intent | null = null;
    
    // Quick intent classification for routing
    if (routingText.includes("balance") || routingText.includes("how much money") || routingText.includes("available")) {
      preClassifiedIntent = "account_balance";
    } else if (routingText.includes("transactions") || routingText.includes("statement") || routingText.includes("recent charges")) {
      preClassifiedIntent = "transactions";
    } else if (routingText.includes("freeze") || routingText.includes("block my card") || routingText.includes("lock card")) {
      preClassifiedIntent = "card_freeze";
    } else if (
      routingText.includes("my card was used") ||
      routingText.includes("fraudulent") ||
      routingText.includes("unauthorized transaction") ||
      routingText.includes("unauthorised transaction") ||
      routingText.includes("stolen card") ||
      routingText.includes("card was stolen") ||
      (routingText.includes("fraud") && (routingText.includes("think") || routingText.includes("believe") || routingText.includes("suspect") || routingText.includes("report")))
    ) {
      preClassifiedIntent = "fraud_report";
    }

    // Route to fraud agent for fraud_report intent, otherwise general_info
    const selectedAgent: "general_info" | "fraud" = preClassifiedIntent === "fraud_report" ? "fraud" : "general_info";

    // Set tool permissions (Step 9: voice scaffolding must not execute banking actions yet)
    const toolPermissions: ToolPermission[] = ["read_policy_kb", "send_message"];

    // Only enable banking/fraud tool permissions for non-voice channels.
    // Voice remains read-only + orchestration-only in Step 9.
    if (state.channel !== "voice") {
      if (state.auth_level !== "none" && !!state.bank_customer_id) {
        toolPermissions.push("read_banking_summary");
        // Step 8: Add fraud/card permissions for verified users
        toolPermissions.push("read_cards", "freeze_card", "create_fraud_case");
      }
    }

    // Audit
    await auditLog(
      state.conversation_id,
      "agent_selected",
      {
        conversation_id: state.conversation_id,
        selected_agent: selectedAgent,
        tool_permissions: toolPermissions,
      },
      true,
      undefined,
      state.message_id
    );

    return {
      selected_agent: selectedAgent,
    };
  } catch (error: any) {
    console.error("❌ [route_agent] Error:", error);
    await auditLog(
      state.conversation_id,
      "agent_selected",
      { conversation_id: state.conversation_id },
      false,
      { code: "AGENT_ROUTING_FAILED", message: error?.message },
      state.message_id
    );
    return {
      errors: [
        ...(state.errors || []),
        {
          code: "AGENT_ROUTING_FAILED",
          message: error?.message || "Failed to route to agent",
          timestamp: new Date(),
        },
      ],
    };
  }
}

/**
 * Node 5: agent_execute
 * Call selected agent (general_info or fraud)
 * Step 8: Supports fraud agent
 */
async function agentExecute(state: SupervisorState): Promise<Partial<SupervisorState>> {
  try {
    console.log("🤖 [agent_execute] Executing agent:", state.selected_agent);

    if (!state.selected_agent) {
      throw new Error("No agent selected");
    }

    // Keep summary in outer scope so we can persist it back into stateUpdate.
    let bankingSummary = state.banking_summary;

    // Route to appropriate agent
    let agentResult;
    if (state.selected_agent === "fraud") {
      // Step 8: Call fraud agent
      console.log("🔍 [agent_execute] Calling fraud agent");
      
      // Build agent context for fraud agent
      const agentContext: AgentContext = {
        conversationId: state.conversation_id,
        messageId: state.message_id,
        channel: state.channel,
        customer: {
          identityStatus: state.identity_status,
          bankCustomerId: state.bank_customer_id || null,
          authLevel: state.auth_level,
        },
        recentMessages: (state.recent_messages || []).map((msg) => ({
          direction: msg.type === "customer" ? "inbound" : "outbound",
          text: msg.content,
        })),
        latestMessageText: state.latest_message?.content || "",
        toolPermissions:
          state.channel === "voice"
            ? ["read_policy_kb", "send_message"]
            : state.auth_level !== "none" && state.bank_customer_id
            ? ["read_policy_kb", "read_banking_summary", "read_cards", "freeze_card", "create_fraud_case", "send_message"]
            : ["read_policy_kb", "send_message"],
        bankingSummary: state.banking_summary,
      };

      agentResult = await fraudAgent(agentContext);
    } else if (state.selected_agent === "general_info") {
      // Call general_info agent (existing logic)
      if (!state.latest_message) {
        throw new Error("No latest message to process");
      }

      // Step 7.4: Pre-classify intent to determine if we need banking summary
      // We need to classify intent BEFORE fetching summary, since summary fetch depends on intent
      const messageText = state.latest_message.content?.toLowerCase() || "";
      let preClassifiedIntent: Intent | null = null;
      
      // Quick intent classification (same logic as agent)
      if (messageText.includes("balance") || messageText.includes("how much money") || messageText.includes("available")) {
        preClassifiedIntent = "account_balance";
      } else if (messageText.includes("transactions") || messageText.includes("statement") || messageText.includes("recent charges")) {
        preClassifiedIntent = "transactions";
      } else if (messageText.includes("freeze") || messageText.includes("block my card") || messageText.includes("lock card")) {
        preClassifiedIntent = "card_freeze";
      }
      
      // Step 7.4: Fetch banking summary if verified and intent requires it
      
      const sensitiveIntents: Intent[] = ["account_balance", "transactions", "card_freeze"];
      const isSensitiveIntent = preClassifiedIntent && sensitiveIntents.includes(preClassifiedIntent);
      const isVerified = state.auth_level !== "none" && !!state.bank_customer_id;
      
      if (isVerified && isSensitiveIntent && state.bank_customer_id && !bankingSummary) {
        console.log("📊 [agent_execute] Fetching banking summary for verified user", {
          intent: preClassifiedIntent,
          bank_customer_id: state.bank_customer_id,
          auth_level: state.auth_level,
        });
        
        try {
          bankingSummary = await getBankingSummary(
            {
              bankCustomerId: state.bank_customer_id,
              authLevel: state.auth_level,
              intent: preClassifiedIntent || "unknown",
              channel: state.channel,
            },
            {
              conversationId: state.conversation_id,
              messageId: state.message_id,
              actorType: "system",
            }
          );
          
          console.log("✅ [agent_execute] Banking summary fetched", {
            has_accounts: !!bankingSummary?.accounts?.length,
            has_balance: !!bankingSummary?.accounts?.[0]?.availableBalance,
            balance: bankingSummary?.accounts?.[0]?.availableBalance,
          });
          
          await auditLog(
            state.conversation_id,
            "banking_summary_fetched",
            {
              conversation_id: state.conversation_id,
              intent: preClassifiedIntent,
              has_balance: !!bankingSummary?.accounts?.[0]?.availableBalance,
              has_transactions: bankingSummary?.recentTransactions?.available || false,
            },
            true,
            undefined,
            state.message_id
          );
        } catch (summaryError: any) {
          console.error("❌ [agent_execute] Failed to fetch banking summary:", summaryError);
          await auditLog(
            state.conversation_id,
            "banking_summary_fetch_failed",
            { conversation_id: state.conversation_id },
            false,
            { code: "BANKING_SUMMARY_FETCH_FAILED", message: summaryError?.message },
            state.message_id
          );
          // Don't throw - continue without summary
        }
      } else {
        console.log("⏭️ [agent_execute] Skipping banking summary fetch", {
          isVerified,
          isSensitiveIntent,
          hasBankCustomerId: !!state.bank_customer_id,
          hasSummary: !!bankingSummary,
          preClassifiedIntent,
        });
      }

      // Build agent context
      const agentContext: AgentContext = {
        conversationId: state.conversation_id,
        messageId: state.message_id,
        channel: state.channel,
        customer: {
          identityStatus: state.identity_status,
          bankCustomerId: state.bank_customer_id || null,
          authLevel: state.auth_level,
        },
        recentMessages: (state.recent_messages || []).map((msg) => ({
          direction: msg.type === "customer" ? "inbound" : "outbound",
          text: msg.content,
        })),
        latestMessageText: state.latest_message.content || "",
        toolPermissions: state.identity_status === "resolved_verified" 
          ? ["read_policy_kb", "read_banking_summary", "send_message"]
          : ["read_policy_kb", "send_message"],
        bankingSummary: bankingSummary, // Step 7.5: Include banking summary if available
      };

      // Call agent
      agentResult = await generalInfoAgent(agentContext);
    } else {
      throw new Error(`Unknown agent: ${state.selected_agent}`);
    }

    // Map agent result to state (including Step 8 fraud actions)
    // `agentResult.actions` already conforms to `AgentAction[]`.
    const actions = agentResult.actions;

    // Step 5.4: Audit intent classification
    await auditLog(
      state.conversation_id,
      "intent_classified",
      {
        conversation_id: state.conversation_id,
        intent: agentResult.intent,
      },
      true,
      undefined,
      state.message_id
    );

    // Audit: Agent completed
    await auditLog(
      state.conversation_id,
      "agent_completed",
      {
        conversation_id: state.conversation_id,
        intent: agentResult.intent,
        actions_count: actions.length,
        has_response_draft: !!agentResult.responseDraft,
      },
      true,
      undefined,
      state.message_id
    );

    // Store banking summary in state so it persists (for general_info path)
    // Step 8: Clear pending_action if user declined card freeze
    const declinedFreeze = state.selected_agent === "fraud" && 
                           agentResult.intent === "fraud_report" && 
                           !actions.some((a) => a.type === "freeze_card") &&
                           state.pending_action === "freeze_card_prompted";
    
    const stateUpdate: Partial<SupervisorState> = {
      intent: agentResult.intent,
      assistant_draft: agentResult.responseDraft,
      actions,
      agent_result: agentResult,
      requires_auth: actions.some((a) => a.type === "request_verification"),
      ...(declinedFreeze ? { pending_action: undefined } : {}),
    };

    // Include banking summary if it was fetched (only for general_info path)
    if (state.selected_agent === "general_info" && bankingSummary) {
      stateUpdate.banking_summary = bankingSummary;
    }

    return stateUpdate;
  } catch (error: any) {
    console.error("❌ [agent_execute] Error:", error);
    await auditLog(
      state.conversation_id,
      "agent_completed",
      { conversation_id: state.conversation_id },
      false,
      { code: "AGENT_EXECUTION_FAILED", message: error?.message },
      state.message_id
    );
    // Step 8: Replace generic error with safe, user-friendly message
    let errorMessage = "I apologize, but I'm having trouble processing your request right now. ";
    
    // Provide context-specific error messages
    if (state.intent === "card_freeze" || state.intent === "fraud_report") {
      errorMessage = "I'm having trouble processing your fraud-related request. " +
        "For your security, please call us at 1-800-XXX-XXXX or reply **HUMAN** to speak with an agent who can help you immediately.";
    } else {
      errorMessage += "Please try again in a moment, or reply **HUMAN** to speak with an agent.";
    }
    
    return {
      errors: [
        ...(state.errors || []),
        {
          code: "AGENT_EXECUTION_FAILED",
          message: error?.message || "Failed to execute agent",
          timestamp: new Date(),
        },
      ],
      assistant_draft: errorMessage,
    };
  }
}

/**
 * Node 5.5: execute_actions
 * Step 8: Execute agent-requested actions (fraud case creation, card freeze, etc.)
 * Only executes if user is verified and actions are valid
 */
async function executeActionsNode(state: SupervisorState): Promise<Partial<SupervisorState>> {
  let executableActions: AgentAction[] = [];
  try {
    console.log("⚡ [execute_actions] Checking for actions to execute");

    // Step 9 boundary: no banking actions for voice yet
    if (state.channel === "voice") {
      await auditLog(
        state.conversation_id,
        "actions_execution_skipped",
        {
          conversation_id: state.conversation_id,
          channel: state.channel,
          reason: "voice_scaffolding_no_banking_actions",
        },
        true,
        undefined,
        state.message_id
      );
      return {};
    }

    // Only execute actions if user is verified and we have actions
    const isVerified = state.auth_level !== "none" && !!state.bank_customer_id;
    executableActions = (state.actions || []).filter(
      (a) => a.type === "create_fraud_case" || a.type === "freeze_card" || a.type === "list_cards"
    ) as AgentAction[];

    console.log("⚡ [execute_actions] Checking actions", {
      isVerified,
      actionCount: executableActions.length,
      actions: executableActions.map(a => a.type),
      auth_level: state.auth_level,
      bank_customer_id: state.bank_customer_id,
    });

    if (!isVerified || executableActions.length === 0) {
      console.log("⏭️ [execute_actions] No actions to execute", {
        isVerified,
        actionCount: executableActions.length,
        auth_level: state.auth_level,
        bank_customer_id: state.bank_customer_id,
      });
      return {};
    }

    // Build action execution context
    const actionContext: ActionExecutionContext = {
      conversationId: state.conversation_id,
      messageId: state.message_id,
      bankCustomerId: state.bank_customer_id,
      authLevel: state.auth_level,
      toolPermissions: state.auth_level !== "none" && state.bank_customer_id
        ? ["read_policy_kb", "read_banking_summary", "read_cards", "freeze_card", "create_fraud_case", "send_message"]
        : ["read_policy_kb", "send_message"],
      actorType: "system",
    };

    // Execute actions
    const executionResults: ActionExecutionResult[] = await executeActions(executableActions, actionContext);

    // Check for failures
    const failures = executionResults.filter(
      (r): r is Extract<ActionExecutionResult, { success: false }> => !r.success
    );
    if (failures.length > 0) {
      console.error("❌ [execute_actions] Some actions failed:", failures);
      await auditLog(
        state.conversation_id,
        "actions_execution_failed",
        {
          conversation_id: state.conversation_id,
          failed_actions: failures.map((f) => f.action.type),
        },
        false,
        { code: "ACTION_EXECUTION_FAILED", message: failures[0].error },
        state.message_id
      );
      // Don't throw - continue with partial success
    }

    // Update response draft with case reference if fraud case was created
    let updatedDraft = state.assistant_draft || "";
    let caseId: string | undefined;

    for (const result of executionResults) {
      if (result.success && result.action.type === "create_fraud_case" && result.result) {
        const caseResult = result.result as CreateFraudCaseResponse;
        caseId = caseResult.caseId;
        const caseNumber = caseResult.caseNumber;

        // Update response to include case reference and ask about card freeze
        updatedDraft = `I've created a fraud case for you. Your case reference is **${caseNumber}**. ` +
          `Our fraud team will investigate this immediately. ` +
          `You'll receive updates via email or SMS. ` +
          `In the meantime, would you like me to freeze your card to prevent further unauthorized transactions?`;

        await auditLog(
          state.conversation_id,
          "fraud_case_created",
          {
            conversation_id: state.conversation_id,
            case_id: caseId,
            case_number: caseNumber,
          },
          true,
          undefined,
          state.message_id
        );

        // Step 11: Write outbox event (best-effort; must never break core flow)
        try {
          await emitAutomationEvent({
            eventType: AutomationEventTypes.FraudCaseCreated,
            dedupeKey: `fraud_case_created:${caseId}`,
            payload: {
              case_id: caseId,
              case_number: caseNumber,
              conversation_id: state.conversation_id,
              message_id: state.message_id,
              at: new Date().toISOString(),
            },
          });
        } catch {
          // Non-fatal
        }
      } else if (result.success && result.action.type === "freeze_card" && result.result) {
        const freezeResult = result.result as FreezeCardResponse;
        // Card freeze success - response already updated by agent
        await auditLog(
          state.conversation_id,
          "card_frozen",
          {
            conversation_id: state.conversation_id,
            card_id: result.action.cardId,
          },
          true,
          undefined,
          state.message_id
        );
      }
    }

    // Audit successful execution
    if (executionResults.every((r) => r.success)) {
      await auditLog(
        state.conversation_id,
        "actions_executed",
        {
          conversation_id: state.conversation_id,
          actions_count: executionResults.length,
          actions: executionResults.map((r) => r.action.type),
        },
        true,
        undefined,
        state.message_id
      );
    }

    // Step 8: Set pending_action if we asked about card freeze
    let pendingAction: string | undefined;
    if (updatedDraft && updatedDraft.includes("would you like me to freeze your card")) {
      pendingAction = "freeze_card_prompted";
    }

    // Step 8: Clear pending_action if we handled a freeze card action
    const handledFreeze = executionResults.some(
      (r) => r.success && r.action.type === "freeze_card"
    );
    const clearedPendingAction = handledFreeze ? undefined : pendingAction;
    
    return {
      assistant_draft: updatedDraft || state.assistant_draft,
      ...(caseId ? { case_id: caseId } : {}),
      ...(clearedPendingAction ? { pending_action: clearedPendingAction } : handledFreeze ? { pending_action: undefined } : pendingAction ? { pending_action: pendingAction } : {}),
    };
  } catch (error: any) {
    console.error("❌ [execute_actions] Error:", error);
    await auditLog(
      state.conversation_id,
      "actions_execution_error",
      { conversation_id: state.conversation_id },
      false,
      { code: "ACTION_EXECUTION_ERROR", message: error?.message },
      state.message_id
    );
    
    // Step 8: Replace generic error with safe, user-friendly message
    let errorMessage = "I'm having trouble processing your request right now. ";
    
    // Check if this is a card freeze or fraud-related action failure
    const hasFreezeAction = executableActions.some((a) => a.type === "freeze_card");
    const hasFraudAction = executableActions.some((a) => a.type === "create_fraud_case");
    
    if (hasFreezeAction || hasFraudAction) {
      errorMessage = "I'm having trouble processing your fraud-related request. " +
        "For your security, please call us at 1-800-XXX-XXXX or reply **HUMAN** to speak with an agent who can help you immediately.";
    } else {
      errorMessage += "Please try again in a moment, or reply **HUMAN** to speak with an agent.";
    }
    
    // Don't throw - return safe error message
    return {
      assistant_draft: errorMessage,
    };
  }
}

/**
 * Node 6: auth_gate
 * Evaluate authentication requirements
 */
async function authGate(state: SupervisorState): Promise<Partial<SupervisorState>> {
  try {
    console.log("🔒 [auth_gate] Evaluating authentication requirements");

    const sensitiveIntents: Intent[] = ["account_balance", "transactions", "card_freeze"];
    const isSensitiveIntent = state.intent && sensitiveIntents.includes(state.intent);
    const isVerified = state.auth_level !== "none" && !!state.bank_customer_id;

    // Check if agent requested verification
    const agentRequestedAuth = state.actions?.some((a) => a.type === "request_verification");
    const requestVerificationAction = state.actions?.find(
      (a): a is Extract<AgentAction, { type: "request_verification" }> => a.type === "request_verification"
    );
    const requestedAuthLevel = requestVerificationAction?.level;

    // Step 6.4: If OTP was already handled, skip auth gate (OTP response will be used)
    // Step 8: But if KBA is required, we still need to gate (KBA not implemented yet)
    if (state.otp_handled && requestedAuthLevel !== "kba") {
      console.log("✅ [auth_gate] OTP already handled - skipping gate");
      return {
        requires_auth: false, // OTP response will be sent instead
      };
    }
    
    // Step 8: If agent requested KBA for card freeze, log auth_gate_decision
    if (agentRequestedAuth && requestedAuthLevel === "kba" && state.intent === "card_freeze") {
      console.log("🔒 [auth_gate] KBA required for card freeze - gating");
      await auditLog(state.conversation_id, "auth_gate_decision", {
        conversation_id: state.conversation_id,
        intent: state.intent,
        requires_auth: true,
        required_auth: "kba",
        reason: "card_freeze_requires_kba",
      });
      // Don't override agent response - it already has the controlled message
      return {
        requires_auth: true,
      };
    }

    // Supervisor override: If sensitive intent and not verified, gate it
    if (isSensitiveIntent && !isVerified) {
      console.log("⚠️ [auth_gate] Sensitive intent requires authentication - gating");
      
      // Override agent response if it tried to leak sensitive info
      const safeResponse = 
        "🔒 For your security, I need to verify your identity before I can help with account-specific details. " +
        "Reply VERIFY to continue.";

      await auditLog(state.conversation_id, "auth_gate_decision", {
        conversation_id: state.conversation_id,
        intent: state.intent,
        requires_auth: true,
        reason: "sensitive_intent_unverified",
        supervisor_override: true,
      });

      return {
        assistant_draft: safeResponse,
        requires_auth: true,
        actions: [
          {
            type: "request_verification",
            level: state.intent === "card_freeze" ? "kba" : "otp",
            reason: "Sensitive operation requires identity verification",
          },
        ],
      };
    }

    // If agent requested verification, honor it
    if (agentRequestedAuth) {
      console.log("✅ [auth_gate] Agent requested verification - honoring");
      await auditLog(state.conversation_id, "auth_gate_decision", {
        conversation_id: state.conversation_id,
        requires_auth: true,
        reason: "agent_requested",
      });
      return {
        requires_auth: true,
      };
    }

    // Non-sensitive intent - allow through
    console.log("✅ [auth_gate] Non-sensitive intent - allowing through");
    await auditLog(state.conversation_id, "auth_gate_decision", {
      conversation_id: state.conversation_id,
      intent: state.intent,
      requires_auth: false,
      reason: "non_sensitive_intent",
    });

    return {
      requires_auth: false,
    };
  } catch (error: any) {
    console.error("❌ [auth_gate] Error:", error);
    await auditLog(
      state.conversation_id,
      "auth_gate_decision",
      { conversation_id: state.conversation_id },
      false,
      { code: "AUTH_GATE_FAILED", message: error?.message },
      state.message_id
    );
    // Fail closed - require auth on error
    return {
      requires_auth: true,
      errors: [
        ...(state.errors || []),
        {
          code: "AUTH_GATE_FAILED",
          message: error?.message || "Failed to evaluate auth requirements",
          timestamp: new Date(),
        },
      ],
    };
  }
}

/**
 * Node 7: format_response
 * Format response for WhatsApp (short, clear, safe)
 * Step 6.4: Use OTP response if OTP was handled
 */
async function formatResponse(state: SupervisorState): Promise<Partial<SupervisorState>> {
  try {
    console.log("📝 [format_response] Formatting response");

    let response = "";
    
    if (state.otp_handled && state.otp_response) {
      // OTP was handled but no agent response (just verification confirmation)
      response = state.otp_response;
    } else if (state.assistant_draft) {
      // Only prefix once, immediately after OTP verification
      response = state.just_verified ? `✅ Verification successful!\n\n${state.assistant_draft}` : state.assistant_draft;
    } else {
      response = "";
    }

    // Safety check: Remove any sensitive data if unverified
    if (state.identity_status !== "resolved_verified" || state.auth_level === "none") {
      // Remove any potential sensitive information
      const sensitivePatterns = [
        /\$\d+\.?\d*/g, // Dollar amounts
        /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, // Card numbers
        /\d{2}\/\d{2}\/\d{4}/g, // Dates
        /balance.*?\$\d+/gi, // Balance mentions
        /account.*?\d+/gi, // Account numbers
      ];

      sensitivePatterns.forEach((pattern) => {
        response = response.replace(pattern, "[REDACTED]");
      });

      // Ensure we don't imply authentication
      if (response.toLowerCase().includes("your account") && !response.toLowerCase().includes("verify")) {
        response = "For your security, I need to verify your identity first. Reply **VERIFY** to continue.";
      }
    }

    if (state.channel === "voice") {
      // Voice formatting: short, confirmation-style, no markdown/emojis/newlines
      response = response
        .replace(/[✅🔐📱❌🔒⚠️📤📥💾📝🤖🚀]/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/\s+/g, " ")
        .trim();

      // Spoken prompts
      response = response.replace(/\bReply\s+VERIFY\b/gi, "Say “verify”");
      response = response.replace(/\bReply\s+with\s+the\s+code\b/gi, "Say the 6-digit code");

      // Keep it tight for TTS
      const maxChars = 280;
      if (response.length > maxChars) {
        response = response.slice(0, maxChars - 1).replace(/\s+\S*$/, "") + "…";
      }

      if (!/^(okay|ok|got it|sure|alright|understood)\b/i.test(response)) {
        response = `Okay. ${response}`;
      }
      if (!/[.!?…]$/.test(response)) response += ".";
    } else {
      // WhatsApp formatting: Remove markdown, keep it short
      response = response
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.*?)\*/g, "$1") // Remove italic
        .trim();

      // Limit length for WhatsApp (1600 chars max, but keep shorter)
      if (response.length > 1000) {
        response = response.substring(0, 997) + "...";
      }
    }

    // Audit
    await auditLog(
      state.conversation_id,
      state.channel === "voice" ? "response_formatted_voice" : "response_formatted",
      {
        conversation_id: state.conversation_id,
        response_length: response.length,
        was_redacted: response !== state.assistant_draft,
      },
      true,
      undefined,
      state.message_id
    );

    return {
      formatted_response: response,
      just_verified: false,
    };
  } catch (error: any) {
    console.error("❌ [format_response] Error:", error);
    await auditLog(
      state.conversation_id,
      "response_formatted",
      { conversation_id: state.conversation_id },
      false,
      { code: "FORMAT_RESPONSE_FAILED", message: error?.message },
      state.message_id
    );
    return {
      formatted_response: "Thank you for your message. Our team will get back to you shortly.",
      errors: [
        ...(state.errors || []),
        {
          code: "FORMAT_RESPONSE_FAILED",
          message: error?.message || "Failed to format response",
          timestamp: new Date(),
        },
      ],
    };
  }
}

/**
 * Node 8: persist_and_send
 * Insert outbound row into cc_messages and send via Twilio
 */
async function persistAndSend(state: SupervisorState): Promise<Partial<SupervisorState>> {
  try {
    console.log("💾 [persist_and_send] Persisting and sending message");

    if (!state.formatted_response) {
      throw new Error("No formatted response to send");
    }

    if (state.channel !== "whatsapp" && state.channel !== "voice") {
      throw new Error(`Channel ${state.channel} not yet supported for sending`);
    }

    const outboundProviderMessageId = `OUT-${state.message_id}`;
    const contentHash = crypto
      .createHash("sha256")
      .update(`${state.conversation_id}:${state.message_id}:${state.formatted_response}`)
      .digest("hex")
      .substring(0, 16);

    const providerForSend = state.channel === "whatsapp" ? "twilio" : "vapi";

    // Idempotency per inbound message_id
    const { data: existingMessage } = await supabaseServer
      .from("cc_messages")
      .select("id")
      .eq("provider", providerForSend)
      .eq("provider_message_id", outboundProviderMessageId)
      .maybeSingle();

    if (existingMessage) {
      console.log("🔄 [persist_and_send] Message already sent (idempotent retry)");
      await auditLog(
        state.conversation_id,
        state.channel === "voice" ? "voice_response_sent" : "message_sent",
        { conversation_id: state.conversation_id, message_id: state.message_id, was_duplicate: true },
        true,
        undefined,
        state.message_id
      );
      return { message_sent: true };
    }

    // Use last inbound message for addressing
    const { data: latestInboundMessage } = await supabaseServer
      .from("cc_messages")
      .select("from_address,to_address")
      .eq("conversation_id", state.conversation_id)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const inboundFrom = latestInboundMessage?.from_address || state.from_address || null;
    const inboundTo = latestInboundMessage?.to_address || null;

    // Reply routing
    const toAddress = inboundFrom;
    const fromAddress = inboundTo;

    const { data: messageData, error: insertError } = await supabaseServer
      .from("cc_messages")
      .insert({
        conversation_id: state.conversation_id,
        direction: "outbound",
        channel: state.channel,
        provider: providerForSend,
        provider_message_id: outboundProviderMessageId,
        from_address: fromAddress,
        to_address: toAddress,
        body_text: state.formatted_response,
        body_json: {
          content_hash: contentHash,
          in_reply_to_message_id: state.message_id,
          intent: state.intent,
          disposition_code: state.disposition_code,
          voice_provider_call_id: state.voice_provider_call_id,
          // Step 8: Persist follow-up state for next inbound message
          pending_action: state.pending_action,
          case_id: state.case_id,
        },
        status: "sent",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    if (state.channel === "whatsapp") {
      // Send via Twilio (WhatsApp)
      const twilio = getTwilioClient();
      const fromWhatsApp =
        process.env.TWILIO_WHATSAPP_NUMBER ||
        (process.env.TWILIO_PHONE_NUMBER ? `whatsapp:${process.env.TWILIO_PHONE_NUMBER}` : "whatsapp:+14155238886");

      const whatsappTo = (toAddress || "").startsWith("whatsapp:") ? toAddress : `whatsapp:${toAddress}`;
      const twilioMessage = await twilio.messages.create({
        from: fromWhatsApp,
        to: whatsappTo,
        body: state.formatted_response,
      });

      await auditLog(
        state.conversation_id,
        "message_sent",
        { conversation_id: state.conversation_id, message_id: messageData.id, twilio_sid: twilioMessage.sid, was_duplicate: false },
        true,
        undefined,
        state.message_id
      );

      return { message_sent: true };
    }

    // Voice: send via Vapi call controlUrl (best-effort)
    const apiKey = process.env.VAPI_API_KEY;
    const controlUrl = state.voice_control_url;
    if (!apiKey || !controlUrl) {
      await auditLog(
        state.conversation_id,
        "voice_response_sent",
        {
          conversation_id: state.conversation_id,
          voice_provider_call_id: state.voice_provider_call_id,
          voice_control_url: controlUrl,
          has_api_key: !!apiKey,
          has_control_url: !!controlUrl,
          response_length: (state.formatted_response || "").length,
        },
        false,
        { code: "VOICE_SEND_MISSING_CONFIG", message: "Missing VAPI_API_KEY or voice_control_url" },
        state.message_id
      );
      return { message_sent: false };
    }

    const url = controlUrl.endsWith("/control") ? controlUrl : `${controlUrl}/control`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "say", content: state.formatted_response, endCallAfterSpoken: false }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      await auditLog(
        state.conversation_id,
        "voice_response_sent",
        {
          conversation_id: state.conversation_id,
          voice_provider_call_id: state.voice_provider_call_id,
          voice_control_url: controlUrl,
          http_status: res.status,
          response_length: (state.formatted_response || "").length,
        },
        false,
        { code: "VOICE_SEND_FAILED", message: msg || `Vapi control failed (${res.status})` },
        state.message_id
      );
      return { message_sent: false };
    }

    await auditLog(
      state.conversation_id,
      "voice_response_sent",
      {
        conversation_id: state.conversation_id,
        message_id: messageData.id,
        voice_provider_call_id: state.voice_provider_call_id,
        voice_control_url: controlUrl,
        http_status: res.status,
        response_length: (state.formatted_response || "").length,
        was_duplicate: false,
      },
      true,
      undefined,
      state.message_id
    );

    return { message_sent: true };
  } catch (error: any) {
    console.error("❌ [persist_and_send] Error:", error);
    await auditLog(
      state.conversation_id,
      state.channel === "voice" ? "voice_response_sent" : "message_sent",
      { conversation_id: state.conversation_id },
      false,
      { code: "MESSAGE_SEND_FAILED", message: error?.message },
      state.message_id
    );
    return {
      message_sent: false,
      errors: [
        ...(state.errors || []),
        { code: "MESSAGE_SEND_FAILED", message: error?.message || "Failed to persist and send message", timestamp: new Date() },
      ],
    };
  }
}

/**
 * Node 9: wrap_up
 * Update conversation status and set disposition code
 */
async function wrapUp(state: SupervisorState): Promise<Partial<SupervisorState>> {
  try {
    console.log("✅ [wrap_up] Wrapping up");

    // Determine disposition code
    let dispositionCode = "unknown";
    
    if (state.requires_auth) {
      dispositionCode = "verification_requested";
    } else if (state.intent === "unknown") {
      dispositionCode = "clarification_requested";
    } else if (state.intent?.startsWith("faq_")) {
      dispositionCode = "faq_answered";
    } else {
      dispositionCode = "in_progress";
    }

    // Update conversation status (keep it open)
    await supabaseServer
      .from("cc_conversations")
      .update({
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.conversation_id);

    // Audit
    await auditLog(
      state.conversation_id,
      "wrap_up_completed",
      {
        conversation_id: state.conversation_id,
        disposition_code: dispositionCode,
        message_sent: state.message_sent || false,
      },
      true,
      undefined,
      state.message_id
    );

    return {
      disposition_code: dispositionCode,
    };
  } catch (error: any) {
    console.error("❌ [wrap_up] Error:", error);
    await auditLog(
      state.conversation_id,
      "wrap_up_completed",
      { conversation_id: state.conversation_id },
      false,
      { code: "WRAP_UP_FAILED", message: error?.message },
      state.message_id
    );
    return {
      errors: [
        ...(state.errors || []),
        {
          code: "WRAP_UP_FAILED",
          message: error?.message || "Failed to wrap up",
          timestamp: new Date(),
        },
      ],
    };
  }
}

/**
 * Create the supervisor workflow
 */
export function createSupervisorWorkflow() {
  // NOTE: We intentionally loosen the StateGraph typing here.
  // Upstream @langchain/langgraph typings are very strict about node-name unions and
  // can drift across versions; our runtime behavior is correct and we don't want CI
  // blocked on node-name type inference.
  const workflow = new StateGraph<SupervisorState>({
    channels: {
      conversation_id: {
        reducer: (x, y) => y ?? x ?? "",
        default: () => "",
      },
      message_id: {
        reducer: (x, y) => y ?? x ?? "",
        default: () => "",
      },
      channel: {
        reducer: (x, y) => y ?? x ?? "whatsapp",
        default: () => "whatsapp" as const,
      },
      conversation: {
        reducer: (x, y) => y ?? x ?? null,
        default: () => null,
      },
      latest_message: {
        reducer: (x, y) => {
          // If y is provided and not null, use it (allows updating to previous message after OTP)
          if (y !== null && y !== undefined) return y;
          return x ?? null;
        },
        default: () => null,
      },
      recent_messages: {
        reducer: (x, y) => {
          const existing = x ?? [];
          const newMessages = y ?? [];
          return [...existing, ...newMessages].slice(-10);
        },
        default: () => [],
      },
      identity_status: {
        reducer: (x, y) => y ?? x ?? "unresolved",
        default: () => "unresolved" as const,
      },
      bank_customer_id: {
        reducer: (x, y) => y ?? x ?? null,
        default: () => null,
      },
      auth_level: {
        reducer: (x, y) => y ?? x ?? "none",
        default: () => "none" as const,
      },
      intent: {
        reducer: (x, y) => y ?? x ?? null,
        default: () => null,
      },
      selected_agent: {
        reducer: (x, y) => y ?? x ?? null,
        default: () => null,
      },
      requires_auth: {
        reducer: (x, y) => y ?? x ?? false,
        default: () => false,
      },
      errors: {
        reducer: (x, y) => {
          const existing = x ?? [];
          const newErrors = y ?? [];
          return [...existing, ...newErrors];
        },
        default: () => [],
      },
      retry_count: {
        reducer: (x, y) => (y ?? 0) + (x ?? 0),
        default: () => 0,
      },
      assistant_draft: {
        reducer: (x, y) => y ?? x ?? "",
        default: () => "",
      },
      actions: {
        reducer: (x, y) => {
          const existing = x ?? [];
          const newActions = y ?? [];
          return newActions.length > 0 ? newActions : existing;
        },
        default: () => [],
      },
      disposition_code: {
        reducer: (x, y) => y ?? x ?? null,
        default: () => null,
      },
      from_address: {
        reducer: (x, y) => y ?? x ?? undefined,
        default: () => undefined,
      },
      agent_result: {
        reducer: (x, y) => y ?? x ?? undefined,
        default: () => undefined,
      },
      formatted_response: {
        reducer: (x, y) => y ?? x ?? undefined,
        default: () => undefined,
      },
      message_sent: {
        reducer: (x, y) => y ?? x ?? false,
        default: () => false,
      },
      otp_handled: {
        reducer: (x, y) => y ?? x ?? false,
        default: () => false,
      },
      otp_response: {
        reducer: (x, y) => y ?? x ?? undefined,
        default: () => undefined,
      },
      banking_summary: {
        reducer: (x, y) => y ?? x ?? undefined,
        default: () => undefined,
      },
      just_verified: {
        reducer: (x, y) => y ?? x ?? false,
        default: () => false,
      },
      case_id: {
        reducer: (x, y) => y ?? x ?? undefined,
        default: () => undefined,
      },
      pending_action: {
        reducer: (x, y) => y ?? x ?? undefined,
        default: () => undefined,
      },
      voice_control_url: {
        reducer: (x, y) => y ?? x ?? undefined,
        default: () => undefined,
      },
      voice_provider_call_id: {
        reducer: (x, y) => y ?? x ?? undefined,
        default: () => undefined,
      },
    },
  }) as any;

  // Add nodes in order
  workflow.addNode("load_context", loadContext);
  workflow.addNode("resolve_identity", resolveIdentityNode);
  workflow.addNode("handle_otp", handleOtp); // Step 6.4: OTP handling
  workflow.addNode("route_agent", routeAgent);
  workflow.addNode("agent_execute", agentExecute);
  workflow.addNode("execute_actions", executeActionsNode); // Step 8: Execute agent actions
  workflow.addNode("auth_gate", authGate);
  workflow.addNode("format_response", formatResponse);
  workflow.addNode("persist_and_send", persistAndSend);
  workflow.addNode("wrap_up", wrapUp);

  // Add edges (linear flow) - use setEntryPoint for first node
  workflow.setEntryPoint("load_context");
  workflow.addEdge("load_context", "resolve_identity");
  workflow.addEdge("resolve_identity", "handle_otp"); // Step 6.4: Check OTP after identity resolution
  workflow.addEdge("handle_otp", "route_agent");
  workflow.addEdge("route_agent", "agent_execute");
  workflow.addEdge("agent_execute", "execute_actions"); // Step 8: Execute actions after agent
  workflow.addEdge("execute_actions", "auth_gate");
  workflow.addEdge("auth_gate", "format_response");
  workflow.addEdge("format_response", "persist_and_send");
  workflow.addEdge("persist_and_send", "wrap_up");
  workflow.addEdge("wrap_up", END);

  return workflow.compile();
}

/**
 * Run the supervisor workflow
 */
export async function runSupervisor(
  conversationId: string,
  messageId: string,
  channel: "whatsapp" | "voice" | "email",
  fromAddress?: string,
  voice?: { controlUrl?: string; providerCallId?: string }
): Promise<SupervisorState> {
  const workflow = createSupervisorWorkflow();

  const initialState: SupervisorState = {
    conversation_id: conversationId,
    message_id: messageId,
    channel,
    conversation: null,
    latest_message: null,
    recent_messages: [],
    identity_status: "unresolved",
    bank_customer_id: null,
    auth_level: "none",
    intent: null,
    selected_agent: null,
    requires_auth: false,
    errors: [],
    retry_count: 0,
    assistant_draft: "",
    actions: [],
    disposition_code: null,
    from_address: fromAddress,
    voice_control_url: voice?.controlUrl,
    voice_provider_call_id: voice?.providerCallId,
  };

  const result = await workflow.invoke(initialState);
  return result;
}

