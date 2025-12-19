# Step 4.2: Agent Contract (Shared Types) + GeneralInfoAgent

## Overview

Step 4.2 implements the agent contract system with shared types and the first specialized agent (`general_info`). This provides a consistent, auditable interface for all agents in the system.

## Files Created

### 1. `lib/agents/contracts.ts`

Defines the shared contract between agents, supervisor, and tools:

- **`AuthLevel`**: Authentication levels (`none`, `otp`, `kba`)
- **`AgentName`**: Agent identifiers (currently `general_info`)
- **`Intent`**: Normalized intent types (FAQs + sensitive operations)
- **`ToolPermission`**: Permissions for tool access
- **`AgentContext`**: Input to agent functions (conversation, customer, messages)
- **`AgentAction`**: Deterministic action plan items
- **`AgentResult`**: Output from agent functions (intent, actions, response)

### 2. `lib/tools/policy-kb.ts`

Policy/Knowledge Base tool interface:

- **`searchPolicyKB(query: string)`**: Searches banking policies and FAQs
- Currently a stub with keyword-based responses
- Can be connected to RAG store/vector database later
- Returns answer and optional sources

### 3. `lib/agents/general-info-agent.ts`

Implements the `general_info` agent that:

- **Classifies intents** from customer messages (keyword-based, can be enhanced with LLM)
- **Gates sensitive operations** behind authentication
- **Answers non-sensitive FAQs** using policy KB
- **Returns deterministic actions** for auditability

## Agent Behavior

### Intent Classification

The agent classifies customer messages into:

**Non-sensitive FAQs:**
- `faq_branch_hours`: Branch hours and locations
- `faq_card_delivery_times`: Card delivery timelines
- `faq_fees`: Fee schedules and charges
- `faq_disputes_process`: Dispute/chargeback process
- `faq_fraud_process`: Fraud protection and reporting

**Sensitive Operations:**
- `account_balance`: Account balance inquiries (requires auth)
- `transactions`: Transaction history (requires auth)
- `card_freeze`: Card freeze/lock actions (requires auth + KBA)

**Unknown:**
- `unknown`: Unclassified intent (triggers clarification)

### Authentication Gating

The agent enforces authentication for sensitive operations:

1. **Checks identity status**: Must be `resolved_verified`
2. **Checks auth level**: Must not be `none`
3. **Checks bank customer ID**: Must be present

If any check fails, the agent:
- Returns `request_verification` action
- Asks clarifying question
- Does NOT disclose any account information
- Logs safety notes for audit

### Action Types

Agents return deterministic actions:

- **`answer_faq`**: Answer a general FAQ question
- **`request_verification`**: Request authentication (OTP/KBA)
- **`handoff_suggest`**: Suggest human handoff
- **`ask_clarifying_question`**: Ask for more information

## Usage Example

```typescript
import { generalInfoAgent } from '@/lib/agents/general-info-agent';
import type { AgentContext } from '@/lib/agents/contracts';

const context: AgentContext = {
  conversationId: 'conv-123',
  messageId: 'msg-456',
  channel: 'whatsapp',
  customer: {
    identityStatus: 'unresolved',
    bankCustomerId: null,
    authLevel: 'none',
  },
  recentMessages: [
    { direction: 'inbound', text: 'What are your branch hours?' },
  ],
  latestMessageText: 'What are your branch hours?',
  toolPermissions: ['read_policy_kb', 'send_message'],
};

const result = await generalInfoAgent(context);

console.log(result.intent); // "faq_branch_hours"
console.log(result.actions); // [{ type: "answer_faq", topic: "faq_branch_hours" }]
console.log(result.responseDraft); // "Our branches are open..."
```

## Integration with Step 4 State

The agent contract integrates with the Step 4 state object:

```typescript
// In processMessage or supervisor:
const agentContext: AgentContext = {
  conversationId: state.conversation_id,
  messageId: state.message_id,
  channel: state.channel,
  customer: {
    identityStatus: state.identity_status,
    bankCustomerId: state.bank_customer_id,
    authLevel: state.auth_level_required,
  },
  recentMessages: state.recent_messages.map(msg => ({
    direction: msg.type === 'customer' ? 'inbound' : 'outbound',
    text: msg.content,
  })),
  latestMessageText: state.latest_message?.content || '',
  toolPermissions: determineToolPermissions(state), // Based on auth level
};

const agentResult = await generalInfoAgent(agentContext);

// Update state with agent result
state.intent = agentResult.intent;
state.actions = agentResult.actions.map(action => ({
  type: mapActionType(action.type),
  description: action.type === 'answer_faq' ? `Answer FAQ: ${action.topic}` : action.reason || action.question || '',
  parameters: action,
  completed: false,
}));
state.assistant_draft = agentResult.responseDraft;
```

## Safety & Audit

The agent includes safety mechanisms:

1. **No sensitive data disclosure** without verification
2. **Safety notes** logged for audit trail
3. **Deterministic actions** for reproducibility
4. **Intent classification** for routing decisions

## Next Steps

- **Connect RAG store** to `policy-kb.ts` for real knowledge base
- **Add more agents** (fraud_specialist, disputes_specialist, etc.)
- **Enhance intent classification** with LLM instead of keywords
- **Implement action execution** (send messages, request auth, etc.)
- **Add supervisor orchestration** to route to appropriate agent

## Definition of Done

✅ **Agent contract defined** with all required types
✅ **Policy/KB tool interface** created (stub ready for RAG)
✅ **GeneralInfoAgent implemented** with:
  - Intent classification
  - Authentication gating
  - FAQ answering
  - Deterministic actions
  - Safety notes

