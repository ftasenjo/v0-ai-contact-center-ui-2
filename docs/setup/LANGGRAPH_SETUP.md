# LangGraph & LangChain Integration Guide

## Overview

This guide explains how LangGraph and LangChain are integrated into your contact center for intelligent agent management and conversation orchestration.

## Why LangGraph & LangChain?

### LangGraph Benefits:
- **Stateful Workflows**: Manages complex conversation flows with state persistence
- **Multi-Step Reasoning**: Handles multi-turn conversations intelligently
- **Agent Orchestration**: Routes conversations to specialized handlers
- **Decision Trees**: Makes intelligent routing decisions based on context
- **Visual Debugging**: Can visualize conversation flows

### LangChain Benefits:
- **LLM Integration**: Unified interface for multiple LLM providers
- **Tool Calling**: Agents can call functions/tools during conversations
- **Memory Management**: Maintains conversation context
- **Prompt Management**: Centralized prompt templates
- **Chain Composition**: Build complex AI workflows

## Architecture

```
Incoming Call/Message
    ↓
Twilio/Vapi Webhook
    ↓
LangGraph Workflow
    ├── Greet Customer
    ├── Analyze Intent
    ├── Analyze Sentiment
    ├── Route Conversation
    │   ├── Billing Handler
    │   ├── Technical Handler
    │   ├── Product Handler
    │   └── General Handler
    ├── Check Resolution
    └── Escalate if Needed
```

## Installation

### Step 1: Install Packages

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai
```

### Step 2: Configure Environment Variables

Add to your `.env.local` (choose ONE LLM provider):

**Option 1: OpenAI (Recommended)**
```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini  # or gpt-4, gpt-3.5-turbo, etc.
```

**Option 2: Anthropic Claude**
```env
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

**Option 3: Google Gemini (Free tier available)**
```env
GOOGLE_API_KEY=your-google-api-key
GOOGLE_MODEL=gemini-pro
```

**Option 4: Ollama (Free, runs locally)**
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

**Optional:**
```env
USE_LANGGRAPH=true
```

> **Note**: If you're using **Vapi for voice calls**, Vapi includes its own LLM. You only need an LLM API key if you want to use LangGraph for custom workflows, text-based conversations, or sophisticated routing.

## How It Works

### 1. Conversation Flow

When a customer sends a message:

1. **Message Received** → Webhook receives customer message
2. **LangGraph Workflow** → Processes message through workflow
3. **Intent Analysis** → Determines customer intent (billing, technical, etc.)
4. **Sentiment Analysis** → Analyzes customer sentiment
5. **Routing** → Routes to appropriate handler based on intent
6. **Response Generation** → Handler generates appropriate response
7. **Resolution Check** → Checks if issue is resolved
8. **Escalation** → Escalates to human if needed

### 2. Agent State Management

The `AgentState` interface tracks:
- Conversation messages
- Customer information
- Detected intent
- Sentiment analysis
- Current workflow step
- Escalation flags
- Resolution status

### 3. Specialized Handlers

Each handler is optimized for its domain:
- **Billing Handler**: Payment issues, invoices, refunds
- **Technical Handler**: Troubleshooting, bugs, technical support
- **Product Handler**: Product questions, features, pricing
- **General Handler**: Other inquiries

### 4. Tool Integration

Agents can call tools during conversations:
- `lookup_customer`: Look up customer information
- `create_support_ticket`: Create support tickets
- `check_order_status`: Check order status
- `schedule_callback`: Schedule callbacks
- `send_follow_up_email`: Send follow-up emails
- `update_conversation_tags`: Update conversation tags

## API Endpoints

### Process Message Through Agent

```bash
POST /api/agents/process
Content-Type: application/json

{
  "conversationId": "conv-123",
  "message": "I need help with my billing",
  "customerInfo": {
    "id": "cust-123",
    "name": "John Doe",
    "phone": "+15551234567",
    "email": "john@example.com",
    "tier": "premium"
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "I'd be happy to help you with your billing question...",
  "intent": "billing",
  "sentiment": "neutral",
  "requiresEscalation": false,
  "resolved": false
}
```

## Integration with Existing Systems

### Twilio Integration

When a call comes in via Twilio:

```typescript
// In /api/twilio/incoming-call/route.ts
if (useLangGraph) {
  const result = await processMessage(
    conversationId,
    customerMessage,
    customerInfo
  );
  // Use result.response in TwiML
}
```

### Vapi Integration

Vapi can use LangGraph for more sophisticated conversation management:

```typescript
// Configure Vapi assistant to call your LangGraph API
// Vapi → Your API → LangGraph → Response → Vapi
```

### Supabase Integration

Conversation state is stored in Supabase:
- Messages stored in `messages` table
- Conversation metadata in `conversations` table
- Agent state persisted between turns

## Customization

### Adding New Handlers

1. Create a new handler function in `langgraph-workflow.ts`:

```typescript
async function handleNewDomain(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAgentLLM();
  const systemPrompt = `Your specialized prompt here...`;
  // ... handler logic
}
```

2. Add node to workflow:

```typescript
workflow.addNode('new_domain', handleNewDomain);
```

3. Add routing logic:

```typescript
workflow.addConditionalEdges('route', (state) => {
  if (state.intent === 'new_domain') return 'new_domain';
  // ... other routes
});
```

### Adding New Tools

1. Create tool in `langchain-tools.ts`:

```typescript
export const newTool = new DynamicStructuredTool({
  name: "new_tool",
  description: "What the tool does",
  schema: z.object({
    param: z.string().describe("Parameter description"),
  }),
  func: async ({ param }) => {
    // Tool implementation
    return "Result";
  },
});
```

2. Add to `getAgentTools()`:

```typescript
export function getAgentTools() {
  return [
    // ... existing tools
    newTool,
  ];
}
```

## Benefits

### 1. Intelligent Routing
- Automatically routes conversations to the right handler
- Reduces response time
- Improves resolution rate

### 2. Context Awareness
- Maintains conversation context across turns
- Remembers previous interactions
- Provides personalized responses

### 3. Escalation Management
- Automatically detects when human intervention is needed
- Escalates based on sentiment, complexity, or customer request
- Updates conversation status in database

### 4. Multi-Step Reasoning
- Handles complex queries requiring multiple steps
- Can gather information incrementally
- Makes decisions based on full context

### 5. Tool Integration
- Agents can perform actions (create tickets, send emails)
- Integrates with your existing systems
- Reduces manual work

## Monitoring & Debugging

### View Workflow State

The agent state is logged at each step:
- Check server logs for workflow execution
- State includes all conversation context
- Can be visualized in LangGraph Studio (optional)

### Debug Mode

Enable debug logging:

```env
LANGGRAPH_DEBUG=true
```

This will log:
- Each workflow step
- State transitions
- LLM responses
- Tool calls

## Performance Considerations

### Caching
- Conversation state is cached in memory
- Reduces database queries
- Improves response time

### LLM Costs
- Uses `gpt-4o-mini` by default (cost-effective)
- Can switch to `gpt-4` for complex queries
- Consider caching common responses

### Rate Limiting
- Implement rate limiting for API calls
- Queue requests during high load
- Monitor LLM API usage

## Next Steps

1. **Configure OpenAI API Key**: Add `OPENAI_API_KEY` to `.env.local`
2. **Test Workflow**: Send a test message via `/api/agents/process`
3. **Customize Handlers**: Adjust prompts for your use case
4. **Add Tools**: Create tools for your specific needs
5. **Monitor**: Watch logs to see workflow execution

## Resources

- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/
- **LangChain Docs**: https://js.langchain.com/
- **OpenAI API**: https://platform.openai.com/docs

---

**✅ LangGraph & LangChain integration is ready!** Configure your OpenAI API key and start using intelligent agent workflows!

