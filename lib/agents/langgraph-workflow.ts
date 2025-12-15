/**
 * LangGraph-based agent workflow for contact center
 * Manages conversation flows, agent handoffs, and multi-step reasoning
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getConversation, updateConversation } from "@/lib/store-adapter";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Agent State - tracks conversation state throughout the workflow
 */
export interface AgentState {
  conversationId: string;
  messages: BaseMessage[];
  customerInfo: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    tier: 'standard' | 'premium' | 'enterprise';
  };
  intent: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  currentStep: string;
  requiresHumanEscalation: boolean;
  resolved: boolean;
  metadata: Record<string, any>;
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
  const conversation = await getConversation(state.conversationId);
  if (conversation) {
    await updateConversation(state.conversationId, {
      status: 'escalated',
      priority: 'high',
      escalationRisk: true,
    });
  }

  return {
    requiresHumanEscalation: true,
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
 * Simplified implementation that works with LangGraph's StateGraph
 */
export function createAgentWorkflow() {
  // Create workflow with state reducer functions
  const workflow = new StateGraph<AgentState>({
    channels: {
      conversationId: {
        reducer: (x: string | undefined, y: string | undefined) => y ?? x ?? "",
        default: () => "",
      },
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
      intent: {
        reducer: (x: string | null | undefined, y: string | null | undefined) => y ?? x ?? null,
        default: () => null,
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
  });

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

  // Add edges
  workflow.addEdge(START, 'greet');
  workflow.addEdge('greet', 'analyze_intent');
  workflow.addEdge('greet', 'analyze_sentiment');
  
  // After analyzing, route
  workflow.addEdge('analyze_intent', 'route');
  workflow.addEdge('analyze_sentiment', 'route');
  
  // Route to handlers
  workflow.addConditionalEdges('route', (state) => {
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
  workflow.addConditionalEdges('billing', (state) => {
    if (state.requiresHumanEscalation) return 'escalate';
    if (state.resolved) return 'end';
    return 'continue';
  }, {
    escalate: 'escalate',
    end: END,
    continue: 'analyze_intent', // Loop back to analyze next message
  });

  workflow.addConditionalEdges('technical', (state) => {
    if (state.requiresHumanEscalation) return 'escalate';
    if (state.resolved) return 'end';
    return 'continue';
  }, {
    escalate: 'escalate',
    end: END,
    continue: 'analyze_intent',
  });

  workflow.addConditionalEdges('product', (state) => {
    if (state.requiresHumanEscalation) return 'escalate';
    if (state.resolved) return 'end';
    return 'continue';
  }, {
    escalate: 'escalate',
    end: END,
    continue: 'analyze_intent',
  });

  workflow.addConditionalEdges('general', (state) => {
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
 * Process a new customer message through the agent workflow
 */
export async function processMessage(
  conversationId: string,
  customerMessage: string,
  customerInfo: AgentState['customerInfo']
): Promise<{
  response: string;
  intent: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  requiresEscalation: boolean;
  resolved: boolean;
}> {
  try {
    console.log('🔄 Starting LangGraph processMessage:', { conversationId, customerMessage: customerMessage.substring(0, 50) });
    
    // Get existing conversation
    const conversation = await getConversation(conversationId);
    console.log('📋 Conversation retrieved:', conversation ? 'Found' : 'Not found', conversationId);
    
    const existingMessages = conversation?.messages || [];
    console.log('💬 Existing messages:', existingMessages.length);
    
    // Convert to LangChain messages
    const messages: BaseMessage[] = existingMessages.map(msg => {
      if (msg.type === 'customer') {
        return new HumanMessage(msg.content);
      } else if (msg.type === 'agent' || msg.type === 'ai') {
        return new AIMessage(msg.content);
      } else {
        return new SystemMessage(msg.content);
      }
    });

    // Add new customer message
    messages.push(new HumanMessage(customerMessage));

    // For now, use a simplified direct LLM call instead of the complex workflow
    // This will help us debug if the issue is with the workflow or the LLM
    const llm = getAgentLLM();
    
    const systemPrompt = `You are a friendly and helpful customer service AI assistant. 
Respond to the customer's message in a warm, professional, and helpful manner.
Keep responses concise (2-3 sentences max) and solution-oriented.
If the customer seems frustrated, be empathetic and offer to help.`;

    const conversationHistory = messages.slice(-10); // Last 10 messages for context
    const llmMessages = [
      new SystemMessage(systemPrompt),
      ...conversationHistory,
    ];

    console.log('🤖 Calling OpenAI LLM...');
    const aiResponse = await llm.invoke(llmMessages);
    const response = aiResponse.content.toString();
    console.log('✅ Got AI response:', response.substring(0, 100));

    // Simple intent and sentiment analysis
    const intentPrompt = `Categorize this message into one: billing, technical_support, product_inquiry, complaint, cancellation, other. Respond with ONLY the category.`;
    const intentMsg = await llm.invoke([
      new SystemMessage(intentPrompt),
      new HumanMessage(customerMessage),
    ]);
    const intent = intentMsg.content.toString().trim().toLowerCase();

    const sentimentPrompt = `Analyze sentiment: positive, neutral, or negative. Respond with ONLY one word.`;
    const sentimentMsg = await llm.invoke([
      new SystemMessage(sentimentPrompt),
      new HumanMessage(customerMessage),
    ]);
    const sentiment = sentimentMsg.content.toString().trim().toLowerCase() as 'positive' | 'neutral' | 'negative';
    const normalizedSentiment = ['positive', 'neutral', 'negative'].includes(sentiment) ? sentiment : 'neutral';

    console.log('📊 Analysis:', { intent, sentiment: normalizedSentiment });

    return {
      response,
      intent: intent || null,
      sentiment: normalizedSentiment,
      requiresEscalation: normalizedSentiment === 'negative' && (intent.includes('complaint') || intent.includes('cancellation')),
      resolved: false,
    };
  } catch (error: any) {
    console.error('❌ LangGraph processMessage error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
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

