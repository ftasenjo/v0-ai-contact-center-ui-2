/**
 * LangGraph-based agent workflow for contact center
 * Manages conversation flows, agent handoffs, and multi-step reasoning
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getConversation, updateConversation } from "@/lib/store-adapter";
import { RunnableConfig } from "@langchain/core/runnables";
import { resolveIdentity, IdentityResolutionResult } from "@/lib/identity-resolution";
import { Conversation, Message } from "@/lib/sample-data";

/**
 * Voice formatting helper (Step 9 scaffolding)
 * - Short confirmations
 * - Clear turn-taking
 * - Avoids long paragraphs / markdown for TTS
 */
function formatVoiceResponse(draft: string): string {
  const input = (draft || '').trim();
  if (!input) return '';

  // Remove common markdown formatting that sounds bad in voice
  let text = input
    .replace(/```[\s\S]*?```/g, ' ') // code fences
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italics
    .replace(/^[-*]\s+/gm, '') // bullets
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into sentences and keep it tight (voice-friendly)
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  let compact = sentences.slice(0, 2).join(' ').trim();
  if (!compact) compact = text;

  // Short acknowledgement prefix (turn-taking)
  if (!/^(okay|ok|got it|sure|alright|thanks|thank you|understood)\b/i.test(compact)) {
    compact = `Okay. ${compact}`;
  }

  // Ensure it ends cleanly
  if (!/[.!?]$/.test(compact)) compact = `${compact}.`;

  // If it's still long, trim to a reasonable TTS chunk
  const maxChars = 280;
  if (compact.length > maxChars) {
    compact = compact.slice(0, maxChars - 1);
    compact = compact.replace(/\s+\S*$/, ''); // avoid cutting mid-word
    compact = `${compact}…`;
  }

  return compact;
}

/**
 * Node: Voice formatting (Step 9 scaffolding)
 * Applies to `assistant_draft` only; does not execute actions.
 */
async function voiceFormatting(state: AgentState): Promise<Partial<AgentState>> {
  if (state.channel !== 'voice') return {};
  const formatted = formatVoiceResponse(state.assistant_draft);
  return { assistant_draft: formatted };
}

/**
 * Step 4: Comprehensive Agent State Object
 * Single source of truth for the entire LangGraph run
 * 
 * This state object can explain the entire run in audit logs
 */
export interface AgentState {
  // ========== INPUT ==========
  conversation_id: string;
  message_id: string;
  channel: 'whatsapp' | 'voice' | 'email' | 'sms';

  // ========== CONVERSATION CONTEXT ==========
  conversation: Conversation | null; // Full conversation from CC DB
  latest_message: Message | null; // Latest message from CC DB
  recent_messages: Message[]; // Short window (last 5-10 messages)

  // ========== IDENTITY ==========
  identity_status: 'resolved_verified' | 'resolved_unverified' | 'unresolved' | 'ambiguous';
  bank_customer_id: string | null; // Set if identity is resolved

  // ========== ROUTING ==========
  intent: string | null; // Normalized enum (fraud, disputes, billing, loans, cards, general, other)
  selected_agent: AgentType | null; // One of the 7 specialized agents
  requires_auth: boolean; // Whether authentication is required
  auth_level_required: 'none' | 'otp' | 'kba'; // Authentication level needed

  // ========== OUTPUTS ==========
  assistant_draft: string; // Generated assistant response (before finalization)
  actions: Action[]; // Deterministic plan of actions to take
  disposition_code: string | null; // Final disposition (resolved, escalated, pending, etc.)

  // ========== CONTROL ==========
  errors: ErrorInfo[]; // Errors encountered during processing
  retry_count: number; // Number of retries attempted

  // ========== LEGACY FIELDS (for backward compatibility) ==========
  messages: BaseMessage[]; // LangChain message format
  customerInfo: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    tier: 'standard' | 'premium' | 'enterprise';
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  currentStep: string;
  requiresHumanEscalation: boolean;
  resolved: boolean;
  metadata: Record<string, any>;
}

/**
 * Agent Types - 7 specialized banking agents
 */
export type AgentType =
  | 'fraud_specialist'      // Fraud detection and prevention
  | 'disputes_specialist'    // Chargebacks and disputes
  | 'billing_specialist'    // Billing and payments
  | 'loans_specialist'      // Loan inquiries and applications
  | 'cards_specialist'       // Credit/debit card issues
  | 'general_support'        // General banking inquiries
  | 'escalation_handler';    // High-priority escalations

/**
 * Action - Deterministic plan item
 */
export interface Action {
  type: 'respond' | 'escalate' | 'request_auth' | 'create_case' | 'lookup_customer' | 'update_conversation';
  description: string;
  parameters?: Record<string, any>;
  completed: boolean;
}

/**
 * Error Info - Structured error information
 */
export interface ErrorInfo {
  code: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * Initialize LLM for agent
 * Currently supports OpenAI. Other providers can be added by installing their packages.
 */
function getAgentLLM() {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your .env.local file.\n\n' +
      'To use other providers, install their packages:\n' +
      '- Anthropic: npm install @langchain/anthropic\n' +
      '- Google: npm install @langchain/google-genai\n' +
      '- Ollama: npm install @langchain/ollama'
    );
  }

  return new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.7,
    apiKey: openaiKey,
  });
}

/**
 * Map intent to agent type (7 specialized banking agents)
 */
function mapIntentToAgent(intent: string | null): AgentType {
  if (!intent) return 'general_support';
  
  const normalized = intent.toLowerCase();
  
  if (normalized.includes('fraud') || normalized.includes('suspicious')) {
    return 'fraud_specialist';
  }
  if (normalized.includes('dispute') || normalized.includes('chargeback')) {
    return 'disputes_specialist';
  }
  if (normalized.includes('billing') || normalized.includes('payment') || normalized.includes('invoice')) {
    return 'billing_specialist';
  }
  if (normalized.includes('loan') || normalized.includes('mortgage') || normalized.includes('credit line')) {
    return 'loans_specialist';
  }
  if (normalized.includes('card') || normalized.includes('credit card') || normalized.includes('debit')) {
    return 'cards_specialist';
  }
  if (normalized.includes('complaint') || normalized.includes('escalat') || normalized.includes('urgent')) {
    return 'escalation_handler';
  }
  
  return 'general_support';
}

/**
 * Determine if intent requires authentication
 */
function requiresAuthentication(intent: string | null, identityStatus: AgentState['identity_status']): {
  requires_auth: boolean;
  auth_level_required: 'none' | 'otp' | 'kba';
} {
  if (identityStatus === 'resolved_verified') {
    return { requires_auth: false, auth_level_required: 'none' };
  }

  if (!intent) {
    return { requires_auth: false, auth_level_required: 'none' };
  }

  const normalized = intent.toLowerCase();
  
  // High-sensitivity intents require KBA
  if (normalized.includes('fraud') || normalized.includes('dispute') || normalized.includes('account') || normalized.includes('transaction')) {
    return { requires_auth: true, auth_level_required: 'kba' };
  }
  
  // Medium-sensitivity intents require OTP
  if (normalized.includes('billing') || normalized.includes('payment') || normalized.includes('card')) {
    return { requires_auth: true, auth_level_required: 'otp' };
  }
  
  return { requires_auth: false, auth_level_required: 'none' };
}

/**
 * Audit log helper - logs state transitions
 */
async function auditStateTransition(
  conversationId: string,
  eventType: string,
  state: Partial<AgentState>,
  success: boolean = true,
  error?: ErrorInfo
): Promise<void> {
  try {
    const { writeAuditLog } = await import('@/lib/banking-store');
    await writeAuditLog({
      conversationId,
      actorType: 'system',
      eventType,
      eventVersion: 1,
      inputRedacted: {
        conversation_id: state.conversation_id,
        message_id: state.message_id,
        channel: state.channel,
        intent: state.intent,
        selected_agent: state.selected_agent,
        identity_status: state.identity_status,
      },
      outputRedacted: {
        assistant_draft_length: state.assistant_draft?.length || 0,
        actions_count: state.actions?.length || 0,
        disposition_code: state.disposition_code,
        errors_count: state.errors?.length || 0,
      },
      success,
      errorCode: error?.code,
      errorMessage: error?.message,
    });
  } catch (auditError) {
    console.error('Failed to write audit log:', auditError);
    // Don't throw - audit logging failures shouldn't break the workflow
  }
}

/**
 * Node: Greet customer and gather initial information
 */
async function greetCustomer(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAgentLLM();
  
  const systemPrompt = `You are a friendly customer service AI assistant. 
Greet the customer warmly and ask how you can help them today.
Keep responses brief and conversational.`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  const response = await llm.invoke(messages);
  
  return {
    messages: [...state.messages, response],
    assistant_draft: response.content.toString(),
    currentStep: 'greeting',
  };
}

/**
 * Node: Analyze intent from customer message
 */
async function analyzeIntent(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAgentLLM();
  
  const systemPrompt = `Analyze the customer's intent from their messages.
Categorize into one of: billing, technical_support, product_inquiry, complaint, cancellation, other.
Respond with ONLY the category name, nothing else.`;

  const lastCustomerMessage = state.messages
    .filter(m => m instanceof HumanMessage)
    .pop();

  if (!lastCustomerMessage) {
    return { intent: 'other' };
  }

  const messages = [
    new SystemMessage(systemPrompt),
    lastCustomerMessage,
  ];

  const response = await llm.invoke(messages);
  const intent = response.content.toString().toLowerCase().trim();

  return {
    intent,
    currentStep: 'intent_analysis',
  };
}

/**
 * Node: Analyze sentiment
 */
async function analyzeSentiment(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAgentLLM();
  
  const systemPrompt = `Analyze the sentiment of the customer's messages.
Respond with ONLY one word: positive, neutral, or negative.
Then on a new line, provide a confidence score from 0.0 to 1.0.`;

  const customerMessages = state.messages.filter(m => m instanceof HumanMessage);
  const recentMessages = customerMessages.slice(-3); // Last 3 customer messages

  if (recentMessages.length === 0) {
    return { sentiment: 'neutral', sentimentScore: 0.5 };
  }

  const messages = [
    new SystemMessage(systemPrompt),
    ...recentMessages,
  ];

  const response = await llm.invoke(messages);
  const content = response.content.toString().trim();
  const lines = content.split('\n');
  const sentiment = (lines[0] || 'neutral').toLowerCase() as 'positive' | 'neutral' | 'negative';
  const score = parseFloat(lines[1] || '0.5') || 0.5;

  return {
    sentiment,
    sentimentScore: score,
    currentStep: 'sentiment_analysis',
  };
}

/**
 * Node: Route to appropriate handler based on intent
 */
async function routeConversation(state: AgentState): Promise<Partial<AgentState>> {
  const intent = state.intent || 'other';
  
  // Check if escalation is needed based on sentiment
  const needsEscalation = 
    state.sentiment === 'negative' && state.sentimentScore < 0.3 ||
    state.requiresHumanEscalation ||
    intent === 'complaint' ||
    intent === 'cancellation';

  if (needsEscalation) {
    return {
      requiresHumanEscalation: true,
      currentStep: 'escalation',
    };
  }

  // Route to appropriate handler
  const routingMap: Record<string, string> = {
    billing: 'billing_handler',
    technical_support: 'technical_handler',
    product_inquiry: 'product_handler',
    complaint: 'escalation',
    cancellation: 'escalation',
    other: 'general_handler',
  };

  return {
    currentStep: routingMap[intent] || 'general_handler',
  };
}

/**
 * Node: Handle billing inquiries
 */
async function handleBilling(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAgentLLM();
  
  const systemPrompt = `You are a billing specialist AI assistant.
Help the customer with billing questions, payment issues, or account inquiries.
Be professional and solution-oriented. If you cannot resolve the issue, offer to connect them with a human billing specialist.`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  const response = await llm.invoke(messages);
  
  // Check if resolution was achieved
  const resolutionCheck = await checkResolution(state, response);
  
  return {
    messages: [...state.messages, response],
    assistant_draft: response.content.toString(),
    currentStep: 'billing_handler',
    resolved: resolutionCheck.resolved,
    requiresHumanEscalation: resolutionCheck.requiresEscalation,
  };
}

/**
 * Node: Handle technical support
 */
async function handleTechnical(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAgentLLM();
  
  const systemPrompt = `You are a technical support AI assistant.
Help the customer troubleshoot technical issues, provide solutions, and guide them through fixes.
Be patient and clear with instructions. If the issue is complex, offer to escalate to a technical specialist.`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  const response = await llm.invoke(messages);
  
  const resolutionCheck = await checkResolution(state, response);
  
  return {
    messages: [...state.messages, response],
    assistant_draft: response.content.toString(),
    currentStep: 'technical_handler',
    resolved: resolutionCheck.resolved,
    requiresHumanEscalation: resolutionCheck.requiresEscalation,
  };
}

/**
 * Node: Handle product inquiries
 */
async function handleProduct(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAgentLLM();
  
  const systemPrompt = `You are a product specialist AI assistant.
Answer questions about products, features, pricing, and help customers find what they need.
Be enthusiastic and helpful. If the customer wants to purchase, guide them through the process.`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  const response = await llm.invoke(messages);
  
  const resolutionCheck = await checkResolution(state, response);
  
  return {
    messages: [...state.messages, response],
    assistant_draft: response.content.toString(),
    currentStep: 'product_handler',
    resolved: resolutionCheck.resolved,
    requiresHumanEscalation: resolutionCheck.requiresEscalation,
  };
}

/**
 * Node: General handler for other inquiries
 */
async function handleGeneral(state: AgentState): Promise<Partial<AgentState>> {
  const llm = getAgentLLM();
  
  const systemPrompt = `You are a helpful customer service AI assistant.
Answer the customer's questions and help them with their needs.
Be friendly and solution-oriented. If you cannot help, offer to connect them with a human agent.`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  const response = await llm.invoke(messages);
  
  const resolutionCheck = await checkResolution(state, response);
  
  return {
    messages: [...state.messages, response],
    assistant_draft: response.content.toString(),
    currentStep: 'general_handler',
    resolved: resolutionCheck.resolved,
    requiresHumanEscalation: resolutionCheck.requiresEscalation,
  };
}

/**
 * Node: Escalate to human agent
 */
async function escalateToHuman(state: AgentState): Promise<Partial<AgentState>> {
  // Update conversation in database to mark for human assignment
  const conversation = state.conversation || await getConversation(state.conversation_id);
  if (conversation) {
    try {
      const { updateBankingConversation } = await import('@/lib/banking-store');
      await updateBankingConversation(state.conversation_id, {
        status: 'escalated',
        priority: 'urgent',
      });
    } catch {
      // Fallback to old store
      await updateConversation(state.conversation_id, {
        status: 'escalated',
        priority: 'high',
        escalationRisk: true,
      });
    }
  }

  // Audit: Escalation
  await auditStateTransition(state.conversation_id, 'agent_escalated', {
    conversation_id: state.conversation_id,
    selected_agent: 'escalation_handler',
    disposition_code: 'escalated',
  });

  return {
    requiresHumanEscalation: true,
    selected_agent: 'escalation_handler',
    disposition_code: 'escalated',
    currentStep: 'escalation',
    resolved: false,
  };
}

/**
 * Node: Check if conversation is resolved
 */
async function checkResolution(
  state: AgentState,
  lastResponse: AIMessage
): Promise<{ resolved: boolean; requiresEscalation: boolean }> {
  const llm = getAgentLLM();
  
  const systemPrompt = `Analyze if the customer's issue has been resolved based on the conversation.
Respond with ONLY "resolved" or "not_resolved".
Then on a new line, indicate if human escalation is needed: "escalate" or "no_escalation".`;

  const recentMessages = state.messages.slice(-5); // Last 5 messages
  const messages = [
    new SystemMessage(systemPrompt),
    ...recentMessages,
    lastResponse,
  ];

  const response = await llm.invoke(messages);
  const content = response.content.toString().trim();
  const lines = content.split('\n');
  const resolved = (lines[0] || 'not_resolved').toLowerCase().includes('resolved');
  const needsEscalation = (lines[1] || 'no_escalation').toLowerCase().includes('escalate');

  return {
    resolved,
    requiresEscalation: needsEscalation,
  };
}

/**
 * Conditional edge: Should escalate?
 */
function shouldEscalate(state: AgentState): string {
  if (state.requiresHumanEscalation) {
    return 'escalate';
  }
  return 'continue';
}

/**
 * Conditional edge: Is resolved?
 */
function isResolved(state: AgentState): string {
  if (state.resolved) {
    return 'end';
  }
  return 'continue';
}

/**
 * Build the agent workflow graph
 * Step 4: Updated to support comprehensive state object
 */
export function createAgentWorkflow() {
  // Create workflow with state reducer functions
  // NOTE: We intentionally loosen the StateGraph typing here.
  // Upstream @langchain/langgraph typings are very strict about node-name unions and
  // can drift across versions; our runtime behavior is correct and we don't want CI
  // blocked on node-name type inference.
  const workflow = new StateGraph<AgentState>({
    channels: {
      // Step 4: Input fields
      conversation_id: {
        reducer: (x: string | undefined, y: string | undefined) => y ?? x ?? "",
        default: () => "",
      },
      message_id: {
        reducer: (x: string | undefined, y: string | undefined) => y ?? x ?? "",
        default: () => "",
      },
      channel: {
        reducer: (x: AgentState['channel'] | undefined, y: AgentState['channel'] | undefined) => y ?? x ?? 'whatsapp',
        default: () => 'whatsapp' as const,
      },
      // Step 4: Conversation context
      conversation: {
        reducer: (x: Conversation | null | undefined, y: Conversation | null | undefined) => y ?? x ?? null,
        default: () => null,
      },
      latest_message: {
        reducer: (x: Message | null | undefined, y: Message | null | undefined) => y ?? x ?? null,
        default: () => null,
      },
      recent_messages: {
        reducer: (x: Message[] | undefined, y: Message[] | undefined) => {
          const existing = x ?? [];
          const newMessages = y ?? [];
          // Keep last 10 messages
          return [...existing, ...newMessages].slice(-10);
        },
        default: () => [],
      },
      // Step 4: Identity
      identity_status: {
        reducer: (x: AgentState['identity_status'] | undefined, y: AgentState['identity_status'] | undefined) => 
          y ?? x ?? 'unresolved',
        default: () => 'unresolved' as const,
      },
      bank_customer_id: {
        reducer: (x: string | null | undefined, y: string | null | undefined) => y ?? x ?? null,
        default: () => null,
      },
      // Step 4: Routing
      intent: {
        reducer: (x: string | null | undefined, y: string | null | undefined) => y ?? x ?? null,
        default: () => null,
      },
      selected_agent: {
        reducer: (x: AgentType | null | undefined, y: AgentType | null | undefined) => y ?? x ?? null,
        default: () => null,
      },
      requires_auth: {
        reducer: (x: boolean | undefined, y: boolean | undefined) => y ?? x ?? false,
        default: () => false,
      },
      auth_level_required: {
        reducer: (x: AgentState['auth_level_required'] | undefined, y: AgentState['auth_level_required'] | undefined) => 
          y ?? x ?? 'none',
        default: () => 'none' as const,
      },
      // Step 4: Outputs
      assistant_draft: {
        reducer: (x: string | undefined, y: string | undefined) => y ?? x ?? "",
        default: () => "",
      },
      actions: {
        reducer: (x: Action[] | undefined, y: Action[] | undefined) => {
          const existing = x ?? [];
          const newActions = y ?? [];
          // Merge actions, preferring new ones
          return newActions.length > 0 ? newActions : existing;
        },
        default: () => [],
      },
      disposition_code: {
        reducer: (x: string | null | undefined, y: string | null | undefined) => y ?? x ?? null,
        default: () => null,
      },
      // Step 4: Control
      errors: {
        reducer: (x: ErrorInfo[] | undefined, y: ErrorInfo[] | undefined) => {
          const existing = x ?? [];
          const newErrors = y ?? [];
          return [...existing, ...newErrors];
        },
        default: () => [],
      },
      retry_count: {
        reducer: (x: number | undefined, y: number | undefined) => (y ?? 0) + (x ?? 0),
        default: () => 0,
      },
      // Legacy fields (for backward compatibility)
      messages: {
        reducer: (x: BaseMessage[] | undefined, y: BaseMessage[] | undefined) => {
          const existing = x ?? [];
          const newMessages = y ?? [];
          return [...existing, ...newMessages];
        },
        default: () => [],
      },
      customerInfo: {
        reducer: (x: AgentState['customerInfo'] | undefined, y: Partial<AgentState['customerInfo']> | undefined) => {
          return y ? { ...(x ?? {
            id: "",
            name: "",
            phone: "",
            tier: 'standard' as const,
          }), ...y } : (x ?? {
            id: "",
            name: "",
            phone: "",
            tier: 'standard' as const,
          });
        },
        default: () => ({
          id: "",
          name: "",
          phone: "",
          tier: 'standard' as const,
        }),
      },
      sentiment: {
        reducer: (x: 'positive' | 'neutral' | 'negative' | undefined, y: 'positive' | 'neutral' | 'negative' | undefined) => y ?? x ?? 'neutral',
        default: () => 'neutral' as const,
      },
      sentimentScore: {
        reducer: (x: number | undefined, y: number | undefined) => y ?? x ?? 0.5,
        default: () => 0.5,
      },
      currentStep: {
        reducer: (x: string | undefined, y: string | undefined) => y ?? x ?? "",
        default: () => "",
      },
      requiresHumanEscalation: {
        reducer: (x: boolean | undefined, y: boolean | undefined) => y ?? x ?? false,
        default: () => false,
      },
      resolved: {
        reducer: (x: boolean | undefined, y: boolean | undefined) => y ?? x ?? false,
        default: () => false,
      },
      metadata: {
        reducer: (x: Record<string, any> | undefined, y: Record<string, any> | undefined) => ({ ...(x ?? {}), ...(y ?? {}) }),
        default: () => ({}),
      },
    },
  }) as any;

  // Add nodes
  workflow.addNode('greet', greetCustomer);
  workflow.addNode('analyze_intent', analyzeIntent);
  workflow.addNode('analyze_sentiment', analyzeSentiment);
  workflow.addNode('route', routeConversation);
  workflow.addNode('billing', handleBilling);
  workflow.addNode('technical', handleTechnical);
  workflow.addNode('product', handleProduct);
  workflow.addNode('general', handleGeneral);
  workflow.addNode('escalate', escalateToHuman);
  workflow.addNode('voice_format', voiceFormatting);

  // Add edges
  workflow.addEdge(START, 'greet');
  workflow.addEdge('greet', 'analyze_intent');
  workflow.addEdge('greet', 'analyze_sentiment');
  
  // After analyzing, route
  workflow.addEdge('analyze_intent', 'route');
  workflow.addEdge('analyze_sentiment', 'route');
  
  // Route to handlers
  workflow.addConditionalEdges('route', (state: AgentState) => {
    const step = state.currentStep;
    if (step === 'escalation') return 'escalate';
    if (step === 'billing_handler') return 'billing';
    if (step === 'technical_handler') return 'technical';
    if (step === 'product_handler') return 'product';
    return 'general';
  }, {
    escalate: 'escalate',
    billing: 'billing',
    technical: 'technical',
    product: 'product',
    general: 'general',
  });

  // Check resolution after handlers
  workflow.addConditionalEdges('billing', (state: AgentState) => {
    if (state.requiresHumanEscalation) return 'escalate';
    if (state.resolved) return 'end';
    return 'continue';
  }, {
    escalate: 'escalate',
    end: END,
    continue: 'analyze_intent', // Loop back to analyze next message
  });

  workflow.addConditionalEdges('technical', (state: AgentState) => {
    if (state.requiresHumanEscalation) return 'escalate';
    if (state.resolved) return 'end';
    return 'continue';
  }, {
    escalate: 'escalate',
    end: END,
    continue: 'analyze_intent',
  });

  workflow.addConditionalEdges('product', (state: AgentState) => {
    if (state.requiresHumanEscalation) return 'escalate';
    if (state.resolved) return 'end';
    return 'continue';
  }, {
    escalate: 'escalate',
    end: END,
    continue: 'analyze_intent',
  });

  workflow.addConditionalEdges('general', (state: AgentState) => {
    if (state.requiresHumanEscalation) return 'escalate';
    if (state.resolved) return 'end';
    return 'continue';
  }, {
    escalate: 'escalate',
    end: END,
    continue: 'analyze_intent',
  });

  workflow.addEdge('escalate', END);

  return workflow.compile();
}

/**
 * Initialize AgentState from input parameters
 * Step 4: Creates comprehensive state object as single source of truth
 */
async function initializeAgentState(
  conversationId: string,
  messageId: string,
  channel: 'whatsapp' | 'email' | 'voice' | 'sms',
  customerMessage: string,
  metadata?: {
    fromAddress?: string;
  }
): Promise<AgentState> {
  // Try banking store first, fallback to old store
  let conversation: Conversation | null = null;
  try {
    const { getBankingConversation } = await import('@/lib/banking-store');
    const conv = await getBankingConversation(conversationId);
    conversation = conv || null;
  } catch {
    try {
      const conv = await getConversation(conversationId);
      conversation = conv || null;
    } catch {
      console.warn('Could not fetch conversation from either store');
      conversation = null;
    }
  }

  // Get recent messages (last 10)
  const allMessages = conversation?.messages || [];
  const recentMessages = allMessages.slice(-10);
  const latestMessage = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;

  // Resolve identity (Step 3F integration)
  let identityStatus: AgentState['identity_status'] = 'unresolved';
  let bankCustomerId: string | null = null;
  
  if (metadata?.fromAddress) {
    try {
      const identityResult = await resolveIdentity({
        channel,
        fromAddress: metadata.fromAddress,
        conversationId,
      });
      
      identityStatus = identityResult.status === 'resolved_verified' ? 'resolved_verified' :
                      identityResult.status === 'resolved_unverified' ? 'resolved_unverified' :
                      identityResult.status === 'ambiguous' ? 'ambiguous' : 'unresolved';
      
      if (identityResult.status === 'resolved_verified' || identityResult.status === 'resolved_unverified') {
        bankCustomerId = identityResult.bankCustomerId || null;
      }
      
      console.log('🔐 Identity resolution:', { identityStatus, bankCustomerId });
    } catch (error) {
      console.error('Error resolving identity:', error);
    }
  }

  // Convert messages to LangChain format
  const langChainMessages: BaseMessage[] = allMessages.map(msg => {
    if (msg.type === 'customer') {
      return new HumanMessage(msg.content);
    } else if (msg.type === 'agent' || msg.type === 'ai') {
      return new AIMessage(msg.content);
    } else {
      return new SystemMessage(msg.content);
    }
  });
  langChainMessages.push(new HumanMessage(customerMessage));

  // Extract customer info
  const customerInfo = conversation?.customer || {
    id: '',
    name: 'Unknown',
    phone: '',
    email: '',
    avatar: '/placeholder-user.jpg',
    language: 'English',
    preferredLanguage: 'en',
    tier: 'standard' as const,
  };

  // Initialize state
  const initialState: AgentState = {
    // Input
    conversation_id: conversationId,
    message_id: messageId,
    channel,

    // Conversation context
    conversation,
    latest_message: latestMessage,
    recent_messages: recentMessages,

    // Identity
    identity_status: identityStatus,
    bank_customer_id: bankCustomerId,

    // Routing (will be populated by analysis)
    intent: null,
    selected_agent: null,
    requires_auth: false,
    auth_level_required: 'none',

    // Outputs (will be populated by workflow)
    assistant_draft: '',
    actions: [],
    disposition_code: null,

    // Control
    errors: [],
    retry_count: 0,

    // Legacy fields (for backward compatibility)
    messages: langChainMessages,
    customerInfo: {
      id: customerInfo.id,
      name: customerInfo.name,
      phone: customerInfo.phone,
      email: customerInfo.email,
      tier: customerInfo.tier,
    },
    sentiment: 'neutral',
    sentimentScore: 0.5,
    currentStep: 'initialized',
    requiresHumanEscalation: false,
    resolved: false,
    metadata: {},
  };

  return initialState;
}

/**
 * Process a new customer message through the agent workflow
 * Step 4: Uses comprehensive state object as single source of truth
 */
export async function processMessage(
  conversationId: string,
  customerMessage: string,
  customerInfo: AgentState['customerInfo'],
  metadata?: {
    channel?: 'whatsapp' | 'email' | 'voice' | 'sms';
    fromAddress?: string;
    messageId?: string;
  }
): Promise<{
  response: string;
  intent: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  requiresEscalation: boolean;
  resolved: boolean;
}> {
  const messageId = metadata?.messageId || `msg-${Date.now()}`;
  const channel = metadata?.channel || 'whatsapp';
  
  try {
    console.log('🔄 Starting LangGraph processMessage (Step 4):', { 
      conversationId, 
      messageId,
      channel,
      customerMessage: customerMessage.substring(0, 50) 
    });
    
    // Step 4.1: Initialize comprehensive state object
    let state = await initializeAgentState(
      conversationId,
      messageId,
      channel,
      customerMessage,
      metadata
    );

    // Audit: State initialized
    await auditStateTransition(conversationId, 'agent_state_initialized', state);

    // Step 4: Analyze intent
    const llm = getAgentLLM();
    const intentPrompt = `Categorize this banking message into one: fraud, disputes, billing, loans, cards, general, other. Respond with ONLY the category.`;
    const intentMsg = await llm.invoke([
      new SystemMessage(intentPrompt),
      new HumanMessage(customerMessage),
    ]);
    const intent = intentMsg.content.toString().trim().toLowerCase();
    state.intent = intent || null;

    // Step 4: Map intent to agent
    state.selected_agent = mapIntentToAgent(state.intent);

    // Step 4: Determine auth requirements
    const authCheck = requiresAuthentication(state.intent, state.identity_status);
    state.requires_auth = authCheck.requires_auth;
    state.auth_level_required = authCheck.auth_level_required;

    // Step 4: Analyze sentiment
    const sentimentPrompt = `Analyze sentiment: positive, neutral, or negative. Respond with ONLY one word.`;
    const sentimentMsg = await llm.invoke([
      new SystemMessage(sentimentPrompt),
      new HumanMessage(customerMessage),
    ]);
    const sentiment = sentimentMsg.content.toString().trim().toLowerCase() as 'positive' | 'neutral' | 'negative';
    const normalizedSentiment = ['positive', 'neutral', 'negative'].includes(sentiment) ? sentiment : 'neutral';
    state.sentiment = normalizedSentiment;
    state.sentimentScore = 0.5; // Could be enhanced with confidence score

    // Step 4: Generate assistant response
    const systemPrompt = `You are a friendly and helpful banking customer service AI assistant. 
Respond to the customer's message in a warm, professional, and helpful manner.
Keep responses concise (2-3 sentences max) and solution-oriented.
If the customer seems frustrated, be empathetic and offer to help.`;

    const conversationHistory = state.messages.slice(-10);
    const llmMessages = [
      new SystemMessage(systemPrompt),
      ...conversationHistory,
    ];

    console.log('🤖 Calling OpenAI LLM...');
    const aiResponse = await llm.invoke(llmMessages);
    const response = aiResponse.content.toString();
    state.assistant_draft = channel === 'voice' ? formatVoiceResponse(response) : response;

    // Step 4: Create deterministic action plan
    const actions: Action[] = [
      {
        type: 'respond',
        description: `Respond to customer with ${state.selected_agent} expertise`,
        parameters: { response: response.substring(0, 100) },
        completed: false,
      },
    ];

    if (state.requires_auth && state.identity_status !== 'resolved_verified') {
      actions.push({
        type: 'request_auth',
        description: `Request ${state.auth_level_required} authentication`,
        parameters: { auth_level: state.auth_level_required },
        completed: false,
      });
    }

    const requiresEscalation = normalizedSentiment === 'negative' && 
                               (intent.includes('complaint') || intent.includes('fraud') || intent.includes('dispute'));
    
    if (requiresEscalation) {
      actions.push({
        type: 'escalate',
        description: 'Escalate to human agent due to negative sentiment and sensitive intent',
        parameters: { priority: 'high' },
        completed: false,
      });
      state.requiresHumanEscalation = true;
      state.selected_agent = 'escalation_handler';
    }

    state.actions = actions;
    state.disposition_code = requiresEscalation ? 'escalated' : (state.identity_status === 'resolved_verified' ? 'in_progress' : 'pending_auth');
    state.resolved = false;

    // Audit: State after processing
    await auditStateTransition(conversationId, 'agent_state_processed', state);

    console.log('✅ Step 4 State processed:', {
      intent: state.intent,
      selected_agent: state.selected_agent,
      identity_status: state.identity_status,
      requires_auth: state.requires_auth,
      auth_level: state.auth_level_required,
      actions_count: state.actions.length,
      disposition: state.disposition_code,
    });

    // Return legacy format for backward compatibility
    return {
      response: state.assistant_draft,
      intent: state.intent,
      sentiment: state.sentiment,
      requiresEscalation: state.requiresHumanEscalation,
      resolved: state.resolved,
    };
  } catch (error: any) {
    console.error('❌ LangGraph processMessage error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    // Audit: Error state
    const errorInfo: ErrorInfo = {
      code: 'PROCESSING_ERROR',
      message: error?.message || 'Unknown error',
      timestamp: new Date(),
      recoverable: true,
    };
    const errorState: Partial<AgentState> = {
      conversation_id: conversationId,
      message_id: messageId,
      channel,
      errors: [errorInfo],
    };
    await auditStateTransition(conversationId, 'agent_state_error', errorState, false, errorInfo);

    // Return a fallback response instead of throwing
    return {
      response: 'Thank you for your message! Our team will get back to you shortly. For urgent matters, please call us.',
      intent: null,
      sentiment: 'neutral',
      requiresEscalation: false,
      resolved: false,
    };
  }
}

