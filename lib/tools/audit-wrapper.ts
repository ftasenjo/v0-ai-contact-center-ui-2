/**
 * Step 5.5: Tool-Call Auditing Wrapper
 * 
 * Every tool must be invoked via this wrapper to ensure:
 * - tool_call_started event is logged
 * - Tool execution is wrapped
 * - tool_call_succeeded OR tool_call_failed event is logged
 * - Redacted input/output is stored
 * - Latency is recorded
 * 
 * Usage:
 * ```typescript
 * const result = await callToolWithAudit(
 *   'search_policy_kb',
 *   { query: 'branch hours' },
 *   async (input) => await searchPolicyKB(input.query),
 *   { conversationId: '...', context: 'tool_call' }
 * );
 * ```
 */

import { writeAuditLog } from '@/lib/banking-store';
import { redactSensitive } from '@/lib/audit-redaction';

export interface ToolAuditContext {
  conversationId?: string;
  messageId?: string;
  caseId?: string;
  bankCustomerId?: string;
  actorType?: 'system' | 'agent' | 'customer';
  actorId?: string;
  context?: string; // For redaction context (e.g., 'auth', 'tool_call')
}

/**
 * Call a tool with comprehensive audit logging
 * 
 * @param toolName - Name of the tool (e.g., 'search_policy_kb', 'lookup_bank_customer')
 * @param input - Tool input parameters (will be redacted)
 * @param toolFn - The actual tool function to execute
 * @param auditContext - Audit context (conversationId, messageId, etc.)
 * @returns Tool result
 */
export async function callToolWithAudit<TInput, TOutput>(
  toolName: string,
  input: TInput,
  toolFn: (input: TInput) => Promise<TOutput>,
  auditContext: ToolAuditContext = {}
): Promise<TOutput> {
  const startTime = Date.now();
  const toolCallId = `tool-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Audit: Tool call started
  await writeAuditLog({
    conversationId: auditContext.conversationId,
    messageId: auditContext.messageId,
    caseId: auditContext.caseId,
    bankCustomerId: auditContext.bankCustomerId,
    actorType: auditContext.actorType || 'system',
    actorId: auditContext.actorId,
    eventType: 'tool_call_started',
    eventVersion: 1,
    inputRedacted: {
      tool_name: toolName,
      tool_call_id: toolCallId,
      input: redactSensitive(input, auditContext.context || 'tool_call'),
    },
    outputRedacted: null,
    success: true,
    context: auditContext.context || 'tool_call',
  });

  try {
    // Execute tool
    const result = await toolFn(input);

    const latency = Date.now() - startTime;

    // Audit: Tool call succeeded
    await writeAuditLog({
      conversationId: auditContext.conversationId,
      messageId: auditContext.messageId,
      caseId: auditContext.caseId,
      bankCustomerId: auditContext.bankCustomerId,
      actorType: auditContext.actorType || 'system',
      actorId: auditContext.actorId,
      eventType: 'tool_call_succeeded',
      eventVersion: 1,
      inputRedacted: {
        tool_name: toolName,
        tool_call_id: toolCallId,
        input: redactSensitive(input, auditContext.context || 'tool_call'),
      },
      outputRedacted: {
        tool_name: toolName,
        tool_call_id: toolCallId,
        output: redactSensitive(result, auditContext.context || 'tool_call'),
        latency_ms: latency,
      },
      success: true,
      context: auditContext.context || 'tool_call',
    });

    return result;
  } catch (error: any) {
    const latency = Date.now() - startTime;

    // Audit: Tool call failed
    await writeAuditLog({
      conversationId: auditContext.conversationId,
      messageId: auditContext.messageId,
      caseId: auditContext.caseId,
      bankCustomerId: auditContext.bankCustomerId,
      actorType: auditContext.actorType || 'system',
      actorId: auditContext.actorId,
      eventType: 'tool_call_failed',
      eventVersion: 1,
      inputRedacted: {
        tool_name: toolName,
        tool_call_id: toolCallId,
        input: redactSensitive(input, auditContext.context || 'tool_call'),
      },
      outputRedacted: {
        tool_name: toolName,
        tool_call_id: toolCallId,
        latency_ms: latency,
      },
      success: false,
      errorCode: error?.code || 'TOOL_CALL_FAILED',
      errorMessage: error?.message || 'Unknown error',
      context: auditContext.context || 'tool_call',
    });

    // Re-throw error so caller can handle it
    throw error;
  }
}

