/**
 * Store adapter - allows switching between in-memory and Supabase storage
 * Set USE_SUPABASE=true in .env.local to use Supabase
 */

import * as memoryStore from './data-store';
import * as supabaseStore from './supabase-store';
import { StoredCall, StoredMessage } from './data-store';
import { Conversation } from './sample-data';

const USE_SUPABASE = process.env.USE_SUPABASE === 'true';

// Export the appropriate store functions
export const storeCall = USE_SUPABASE ? supabaseStore.storeCall : memoryStore.storeCall;
export const getCall = USE_SUPABASE ? supabaseStore.getCall : memoryStore.getCall;
export const getAllCalls = USE_SUPABASE ? supabaseStore.getAllCalls : memoryStore.getAllCalls;
export const getActiveCalls = USE_SUPABASE ? supabaseStore.getActiveCalls : memoryStore.getActiveCalls;
export const updateCallStatus = USE_SUPABASE ? supabaseStore.updateCallStatus : memoryStore.updateCallStatus;
export const appendCallTranscript = USE_SUPABASE ? supabaseStore.appendCallTranscript : memoryStore.appendCallTranscript;

export const storeMessage = USE_SUPABASE ? supabaseStore.storeMessage : memoryStore.storeMessage;
export const getMessage = USE_SUPABASE ? supabaseStore.getMessage : memoryStore.getMessage;
export const getAllMessages = USE_SUPABASE ? supabaseStore.getAllMessages : memoryStore.getAllMessages;

export const getAllConversations = USE_SUPABASE 
  ? (industry?: string) => supabaseStore.getAllConversations(industry)
  : () => Promise.resolve(memoryStore.getAllConversations());
export const getConversation = USE_SUPABASE ? supabaseStore.getConversation : (id: string) => Promise.resolve(memoryStore.getConversation(id));
export const updateConversation = USE_SUPABASE ? supabaseStore.updateConversation : memoryStore.updateConversation;
export const deleteConversation = USE_SUPABASE ? supabaseStore.deleteConversation : memoryStore.deleteConversation;

// Helper to create conversations from calls/messages
export const createConversationFromCall = USE_SUPABASE 
  ? supabaseStore.createConversationFromCall
  : async (call: StoredCall) => {
      memoryStore.storeCall(call);
      return `call-${call.callSid}`;
    };

export const createConversationFromMessage = USE_SUPABASE
  ? supabaseStore.createConversationFromMessage
  : async (message: StoredMessage) => {
      memoryStore.storeMessage(message);
      return `msg-${message.messageSid}`;
    };

