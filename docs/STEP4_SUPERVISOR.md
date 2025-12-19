# Step 4: LangGraph Inbound Supervisor Implementation

## Overview

The LangGraph Inbound Supervisor orchestrates the GeneralInfoAgent through 8 mandatory nodes, ensuring proper context loading, identity resolution, agent execution, authentication gating, response formatting, message persistence, and wrap-up.

## Implementation Status

✅ **All 8 mandatory nodes implemented:**
1. `load_context` - Fetches conversation and messages
2. `resolve_identity` - Calls Step 3 identity resolution
3. `route_agent` - Selects general_info agent
4. `agent_execute` - Calls GeneralInfoAgent
5. `auth_gate` - Evaluates authentication requirements
6. `format_response` - Formats response for WhatsApp
7. `persist_and_send` - Inserts message and sends via Twilio
8. `wrap_up` - Updates conversation and sets disposition

✅ **All required audit events:**
- `context_loaded`
- `identity_resolution_result`
- `agent_selected`
- `agent_completed`
- `auth_gate_decision`
- `response_formatted`
- `message_sent`
- `wrap_up_completed`

✅ **Safety guarantees:**
- Never mentions balances, transactions, card numbers unless verified
- Never implies authentication if not verified
- Never guesses customer identity
- Supervisor overrides agent if it tries to leak sensitive info

✅ **Idempotency:**
- Content hash-based duplicate detection
- Prevents double-sending of messages

## Supervisor State

The `SupervisorState` interface matches Step 4.1 requirements exactly:

```typescript
interface SupervisorState {
  // Input
  conversation_id: string;
  message_id: string;
  channel: "whatsapp" | "voice" | "email";
  
  // Conversation context
  conversation: Conversation | null;
  latest_message: Message | null;
  recent_messages: Message[]; // last 5-10
  
  // Identity
  identity_status: "resolved_verified" | "resolved_unverified" | "unresolved" | "ambiguous";
  bank_customer_id: string | null;
  auth_level: "none" | "otp" | "kba";
  
  // Routing / Control
  intent: Intent | null;
  selected_agent: "general_info" | null;
  requires_auth: boolean;
  errors: Array<{ code: string; message: string; timestamp: Date }>;
  retry_count: number;
  
  // Output
  assistant_draft: string;
  actions: Array<{ type: string; [key: string]: any }>;
  disposition_code: string | null;
}
```

## Node Details

### 1. load_context
- Fetches conversation from `cc_conversations`
- Extracts latest message and recent message window (last 10)
- Audits: `context_loaded`

### 2. resolve_identity
- Calls Step 3 `resolveIdentity()` function
- Sets `identity_status`, `bank_customer_id`, `auth_level`
- Audits: `identity_resolution_result`

### 3. route_agent
- Selects `general_info` agent (default)
- Sets tool permissions based on identity status
- Audits: `agent_selected`

### 4. agent_execute
- Builds `AgentContext` from supervisor state
- Calls `generalInfoAgent(ctx)`
- Maps agent result to supervisor state
- Audits: `agent_completed`

### 5. auth_gate
- Evaluates authentication requirements
- **Supervisor override**: If sensitive intent and not verified, gates it
- Conditions:
  - Agent requested verification → Honor it
  - Sensitive intent + unverified → Gate it
  - Non-sensitive intent → Allow through
- Audits: `auth_gate_decision`

### 6. format_response
- Removes sensitive data if unverified (dollar amounts, card numbers, dates)
- Formats for WhatsApp (removes markdown, limits length)
- Ensures no implied authentication
- Audits: `response_formatted`

### 7. persist_and_send
- Generates content hash for idempotency
- Checks for duplicate messages
- Inserts outbound message into `cc_messages`
- Sends via Twilio REST API
- Updates message with Twilio SID
- Audits: `message_sent`

### 8. wrap_up
- Determines disposition code:
  - `verification_requested` - If auth required
  - `clarification_requested` - If intent unknown
  - `faq_answered` - If FAQ intent
  - `in_progress` - Otherwise
- Updates conversation status (keeps it open)
- Audits: `wrap_up_completed`

## Safety Guarantees

### Never Leak Sensitive Data
- Supervisor overrides agent response if it tries to leak
- Removes sensitive patterns from response (dollar amounts, card numbers, dates)
- Blocks sensitive intents (`account_balance`, `transactions`, `card_freeze`) without verification

### Never Imply Authentication
- Checks response for "your account" mentions
- Replaces with verification prompt if unverified
- Ensures clear distinction between verified and unverified states

### Never Guess Identity
- Uses Step 3 identity resolution (deterministic)
- Returns `unresolved` or `ambiguous` if no match
- Never creates fake customer links

## Branching Behavior

### ✅ Allowed without auth:
- `faq_branch_hours`
- `faq_fees`
- `faq_card_delivery_times`
- `faq_disputes_process`
- `faq_fraud_process`

### 🔒 Must be gated:
- `account_balance`
- `transactions`
- `card_freeze`
- Any customer-specific info

## Integration

The supervisor is integrated into the WhatsApp incoming webhook:

```typescript
// In app/api/twilio/whatsapp/incoming/route.ts
const { runSupervisor } = await import('@/lib/agents/supervisor');

const supervisorResult = await runSupervisor(
  conversationId,
  messageId,
  'whatsapp',
  normalizedFromAddress
);
```

The supervisor handles all 8 nodes automatically and sends the response via Twilio REST API (not TwiML).

## Test Cases

### Test A - Non-sensitive FAQ
**User:** "What fees do you charge?"
- ✅ Answer immediately
- ❌ No verification request
- ✅ Disposition: `faq_answered`

### Test B - Sensitive question
**User:** "What's my balance?"
- ✅ Requests VERIFY
- ❌ No numbers, no account mention
- ✅ Disposition: `verification_requested`

### Test C - Ambiguous input
**User:** "asdfasdf"
- ✅ Asks clarifying question
- ❌ No hallucination
- ✅ Disposition: `clarification_requested`

### Test D - Repeat message
**Same inbound message delivered twice**
- ✅ One outbound response
- ❌ No double-send
- ✅ Idempotent by content hash

## Definition of Done

✅ **Supervisor state matches Step 4.1 requirements**
✅ **All 8 mandatory nodes implemented**
✅ **All required audit events logged**
✅ **Safety guarantees enforced**
✅ **Idempotency implemented**
✅ **Branching behavior correct**
✅ **Integration with WhatsApp webhook complete**

## Next Steps

- Test with real WhatsApp messages
- Verify all audit events appear in `cc_audit_logs`
- Monitor for any safety violations
- Add more agents (fraud_specialist, disputes_specialist, etc.)
- Enhance intent classification with LLM

