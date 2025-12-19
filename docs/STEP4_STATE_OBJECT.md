# Step 4: LangGraph State Object (Single Source of Truth)

## Overview

Step 4 implements a comprehensive state object that serves as the **single source of truth** for each LangGraph workflow run. This state object can explain the entire run in audit logs, providing full traceability and debuggability.

## State Object Structure

The `AgentState` interface includes all required fields from the Step 4 checklist:

### Input Fields
- `conversation_id`: UUID of the conversation
- `message_id`: UUID of the current message being processed
- `channel`: Communication channel (`whatsapp` | `voice` | `email` | `sms`)

### Conversation Context
- `conversation`: Full conversation object from CC DB
- `latest_message`: Latest message from CC DB
- `recent_messages[]`: Short window of recent messages (last 5-10)

### Identity
- `identity_status`: One of:
  - `resolved_verified`: Identity verified and linked to bank customer
  - `resolved_unverified`: Identity found but not verified
  - `unresolved`: No identity found
  - `ambiguous`: Multiple candidates found (requires step-up auth)
- `bank_customer_id`: UUID of linked bank customer (if resolved)

### Routing
- `intent`: Normalized enum (fraud, disputes, billing, loans, cards, general, other)
- `selected_agent`: One of 7 specialized banking agents:
  - `fraud_specialist`: Fraud detection and prevention
  - `disputes_specialist`: Chargebacks and disputes
  - `billing_specialist`: Billing and payments
  - `loans_specialist`: Loan inquiries and applications
  - `cards_specialist`: Credit/debit card issues
  - `general_support`: General banking inquiries
  - `escalation_handler`: High-priority escalations
- `requires_auth`: Boolean indicating if authentication is required
- `auth_level_required`: Authentication level (`none` | `otp` | `kba`)

### Outputs
- `assistant_draft`: Generated assistant response (before finalization)
- `actions[]`: Deterministic plan of actions to take
- `disposition_code`: Final disposition (resolved, escalated, pending, etc.)

### Control
- `errors[]`: Array of errors encountered during processing
- `retry_count`: Number of retries attempted

## Implementation Details

### State Initialization

The `initializeAgentState()` function:
1. Fetches conversation from banking store (with fallback to old store)
2. Extracts recent messages (last 10)
3. Resolves identity using Step 3 identity resolution
4. Converts messages to LangChain format
5. Initializes all state fields with defaults

### Intent to Agent Mapping

The `mapIntentToAgent()` function maps customer intents to specialized agents:
- Fraud/suspicious → `fraud_specialist`
- Dispute/chargeback → `disputes_specialist`
- Billing/payment → `billing_specialist`
- Loan/mortgage → `loans_specialist`
- Card issues → `cards_specialist`
- Complaint/escalation → `escalation_handler`
- Other → `general_support`

### Authentication Requirements

The `requiresAuthentication()` function determines auth requirements based on:
- **Identity status**: Verified identities don't require auth
- **Intent sensitivity**: 
  - High-sensitivity (fraud, disputes, account, transaction) → `kba` (Knowledge-Based Authentication)
  - Medium-sensitivity (billing, payment, card) → `otp` (One-Time Password)
  - Low-sensitivity → `none`

### Action Plan Generation

The workflow generates a deterministic action plan:
1. **Respond**: Generate and send response
2. **Request Auth**: If required and not verified
3. **Escalate**: If negative sentiment + sensitive intent

### Audit Logging

All state transitions are logged to `cc_audit_logs`:
- `agent_state_initialized`: State object created
- `agent_state_processed`: Processing complete
- `agent_escalated`: Escalation triggered
- `agent_state_error`: Error encountered

Audit logs include:
- Redacted input (conversation_id, message_id, channel, intent, selected_agent, identity_status)
- Redacted output (assistant_draft length, actions count, disposition_code, errors count)
- Success/failure status
- Error codes and messages

## Usage

### In API Routes

```typescript
const result = await processMessage(
  conversationId,
  customerMessage,
  customerInfo,
  {
    channel: 'whatsapp',
    fromAddress: 'whatsapp:+1234567890',
    messageId: 'msg-123',
  }
);
```

### State Access

The state object is available throughout the workflow and can be accessed in any node:

```typescript
async function myNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('Intent:', state.intent);
  console.log('Selected Agent:', state.selected_agent);
  console.log('Identity Status:', state.identity_status);
  console.log('Actions:', state.actions);
  
  return {
    // Update state
    assistant_draft: '...',
  };
}
```

## Definition of Done

✅ **State object includes all required fields**:
- Input (conversation_id, message_id, channel)
- Conversation context (conversation, latest_message, recent_messages)
- Identity (identity_status, bank_customer_id)
- Routing (intent, selected_agent, requires_auth, auth_level_required)
- Outputs (assistant_draft, actions, disposition_code)
- Control (errors, retry_count)

✅ **State is initialized from CC DB**:
- Conversation fetched from banking store
- Recent messages extracted
- Identity resolved using Step 3

✅ **State transitions are audited**:
- All major state changes logged to `cc_audit_logs`
- Redacted input/output for security
- Error tracking included

✅ **State can explain entire run**:
- One state object contains all information needed to understand the workflow execution
- Audit logs provide full traceability

## Next Steps

- **Step 5**: Implement authentication flows (OTP/KBA)
- **Step 6**: Implement agent handoff and assignment
- **Step 7**: Implement case creation and management

