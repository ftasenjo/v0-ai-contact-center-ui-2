/**
 * Simple in-memory data store for conversations and calls
 * In production, this would be replaced with a database (PostgreSQL, MongoDB, etc.)
 */

import { Conversation, Message } from './sample-data';

export type TranscriptSpeaker = 'customer' | 'agent' | 'ai' | 'system';

/**
 * Normalized transcript storage format (voice)
 *
 * - StoredCall.transcript uses this shape in both memory + Supabase modes.
 * - Supabase persistence currently stores the core fields (speaker/text/timestamp)
 *   into `call_transcripts` and may optionally mirror into `messages` with `is_transcript=true`.
 *
 * NOTE: Optional fields are scaffolding for richer voice timing/confidence later.
 */
export interface TranscriptTurn {
  speaker: TranscriptSpeaker;
  text: string;
  timestamp: Date;

  // --- Optional voice metadata (scaffolding) ---
  source?: 'twilio' | 'vapi' | 'human' | 'system';
  isFinal?: boolean;
  confidence?: number; // 0..1 (STT confidence if available)
  startMs?: number; // offset from call start
  endMs?: number; // offset from call start
  turnId?: string; // stable id for dedupe across retries
}

export interface StoredCall {
  callSid: string;
  from: string;
  to: string;
  status: string;
  direction: 'inbound' | 'outbound';
  duration?: number;
  startTime: Date;
  endTime?: Date;
  agentId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  topic?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  transcript?: TranscriptTurn[];
}

export interface StoredMessage {
  messageSid: string;
  from: string;
  to: string;
  body: string;
  channel: 'whatsapp' | 'email' | 'sms';
  status: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  mediaUrls?: string[];
}

// In-memory stores
const callsStore = new Map<string, StoredCall>();
const messagesStore = new Map<string, StoredMessage>();
const conversationsStore = new Map<string, Conversation>();

/**
 * Call storage functions
 */
export function storeCall(call: StoredCall): void {
  callsStore.set(call.callSid, call);
  
  // Also create/update conversation
  const conversationId = `call-${call.callSid}`;
  const existingConv = conversationsStore.get(conversationId);
  
  const conversation: Conversation = {
    id: conversationId,
    customer: {
      id: `cust-${call.from}`,
      name: call.customerName || call.from,
      email: call.customerEmail || '',
      phone: call.from,
      avatar: '/placeholder-user.jpg',
      language: 'English',
      preferredLanguage: 'en',
      tier: 'standard',
    },
    channel: 'voice',
    status: call.status === 'completed' ? 'resolved' : call.status === 'in-progress' ? 'active' : 'waiting',
    priority: call.sentiment === 'negative' ? 'high' : 'medium',
    sentiment: call.sentiment || 'neutral',
    sentimentScore: call.sentimentScore || 0.5,
    sla: {
      deadline: new Date(Date.now() + 30 * 60 * 1000),
      remaining: 30,
      status: 'healthy',
    },
    assignedTo: call.agentId || null,
    queue: 'General Support',
    topic: call.topic || 'Incoming Call',
    lastMessage: call.transcript?.[call.transcript.length - 1]?.text || 'Call in progress',
    lastMessageTime: call.startTime,
    startTime: call.startTime,
    aiConfidence: 0.85,
    escalationRisk: call.sentiment === 'negative',
    tags: call.sentiment === 'negative' ? ['urgent'] : [],
    messages: (call.transcript || []).map((t, idx) => ({
      id: `msg-${call.callSid}-${idx}`,
      type: t.speaker,
      content: t.text,
      timestamp: t.timestamp,
      sentiment: t.speaker === 'customer' ? call.sentiment : undefined,
      isTranscript: true,
    })),
  };
  
  conversationsStore.set(conversationId, conversation);
}

export function getCall(callSid: string): StoredCall | undefined {
  return callsStore.get(callSid);
}

export function getAllCalls(): StoredCall[] {
  return Array.from(callsStore.values()).sort((a, b) => 
    b.startTime.getTime() - a.startTime.getTime()
  );
}

export function getActiveCalls(): StoredCall[] {
  return getAllCalls().filter(call => 
    call.status === 'in-progress' || call.status === 'ringing' || call.status === 'queued'
  );
}

export function updateCallStatus(callSid: string, status: string, updates?: Partial<StoredCall>): void {
  const call = callsStore.get(callSid);
  if (call) {
    callsStore.set(callSid, {
      ...call,
      status,
      ...updates,
    });
    
    // Update conversation status
    const conversationId = `call-${callSid}`;
    const conv = conversationsStore.get(conversationId);
    if (conv) {
      conv.status = status === 'completed' ? 'resolved' : status === 'in-progress' ? 'active' : 'waiting';
      conversationsStore.set(conversationId, conv);
    }
  }
}

/**
 * Append transcript turns to an existing call (used by Vapi/Twilio voice webhooks).
 * Also mirrors into the in-memory conversation messages for UI display.
 */
export function appendCallTranscript(callSid: string, turns: TranscriptTurn[]): void {
  const call = callsStore.get(callSid);
  if (!call) return;

  const existingTranscript = call.transcript ?? [];
  const merged = [...existingTranscript, ...turns].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  callsStore.set(callSid, { ...call, transcript: merged });

  // Update conversation messages so the UI reflects live transcript
  const conversationId = `call-${callSid}`;
  const conv = conversationsStore.get(conversationId);
  if (!conv) return;

  const baseIdx = conv.messages.length;
  const transcriptMessages = turns.map((t, idx) => ({
    id: `msg-${callSid}-rt-${baseIdx + idx}`,
    type: t.speaker,
    content: t.text,
    timestamp: t.timestamp,
    sentiment: t.speaker === 'customer' ? call.sentiment : undefined,
    isTranscript: true,
  }));

  const newMessages = [...conv.messages, ...transcriptMessages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const last = newMessages[newMessages.length - 1];
  conversationsStore.set(conversationId, {
    ...conv,
    messages: newMessages,
    lastMessage: last?.content ?? conv.lastMessage,
    lastMessageTime: last?.timestamp ?? conv.lastMessageTime,
  });
}

/**
 * Message storage functions
 */
export function storeMessage(message: StoredMessage): void {
  messagesStore.set(message.messageSid, message);
  
  // Also create/update conversation
  const conversationId = `msg-${message.messageSid}`;
  const existingConv = conversationsStore.get(conversationId);
  
  const conversation: Conversation = {
    id: conversationId,
    customer: {
      id: `cust-${message.from}`,
      name: message.customerName || message.from,
      email: message.customerEmail || '',
      phone: message.from,
      avatar: '/placeholder-user.jpg',
      language: 'English',
      preferredLanguage: 'en',
      tier: 'standard',
    },
    channel: message.channel === 'whatsapp' ? 'whatsapp' : message.channel === 'email' ? 'email' : 'chat',
    status: 'active',
    priority: 'medium',
    sentiment: 'neutral',
    sentimentScore: 0.5,
    sla: {
      deadline: new Date(Date.now() + 30 * 60 * 1000),
      remaining: 30,
      status: 'healthy',
    },
    assignedTo: null,
    queue: 'General Support',
    topic: 'Incoming Message',
    lastMessage: message.body,
    lastMessageTime: message.timestamp,
    startTime: message.timestamp,
    aiConfidence: 0.85,
    escalationRisk: false,
    tags: [],
    messages: [
      {
        id: `msg-${message.messageSid}`,
        type: message.direction === 'inbound' ? 'customer' : 'agent',
        content: message.body,
        timestamp: message.timestamp,
      },
    ],
  };
  
  // Merge with existing conversation if it exists
  if (existingConv) {
    conversation.messages = [...existingConv.messages, conversation.messages[0]];
    conversation.startTime = existingConv.startTime;
  }
  
  conversationsStore.set(conversationId, conversation);
}

export function getMessage(messageSid: string): StoredMessage | undefined {
  return messagesStore.get(messageSid);
}

export function getAllMessages(): StoredMessage[] {
  return Array.from(messagesStore.values()).sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );
}

/**
 * Conversation functions
 */
export function getAllConversations(): Conversation[] {
  return Array.from(conversationsStore.values()).sort((a, b) => 
    b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
  );
}

export function getConversation(id: string): Conversation | undefined {
  return conversationsStore.get(id);
}

export function updateConversation(id: string, updates: Partial<Conversation>): void {
  const conv = conversationsStore.get(id);
  if (conv) {
    conversationsStore.set(id, { ...conv, ...updates });
  }
}

export function deleteConversation(id: string): void {
  conversationsStore.delete(id);
}

/**
 * Clear all data (useful for testing)
 */
export function clearAllData(): void {
  callsStore.clear();
  messagesStore.clear();
  conversationsStore.clear();
}

