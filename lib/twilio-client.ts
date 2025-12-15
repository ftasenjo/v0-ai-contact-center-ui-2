/**
 * Client-side utilities for interacting with Twilio API
 * Note: These functions call your Next.js API routes, not Twilio directly
 */

export interface Call {
  callSid: string;
  from: string;
  to: string;
  status: string;
  direction: 'inbound' | 'outbound';
  duration?: number;
  startTime?: Date;
  endTime?: Date;
}

export interface WhatsAppMessage {
  messageSid: string;
  from: string;
  to: string;
  body: string;
  status: string;
  timestamp?: Date;
  mediaUrls?: string[];
}

export interface EmailMessage {
  messageId: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  status: string;
  timestamp?: Date;
}

export interface MakeCallRequest {
  to: string;
  agentId?: string;
}

export interface SendWhatsAppRequest {
  to: string;
  message: string;
  mediaUrl?: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  from?: string;
  html?: string;
}

/**
 * Fetch list of calls from the API
 */
export async function fetchCalls(options?: {
  status?: string;
  limit?: number;
}): Promise<Call[]> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await fetch(`/api/twilio/calls?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch calls');
  }

  const data = await response.json();
  return data.calls || [];
}

/**
 * Fetch details of a specific call
 */
export async function fetchCall(callSid: string): Promise<Call> {
  const response = await fetch(`/api/twilio/calls/${callSid}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch call');
  }

  const data = await response.json();
  return data.call;
}

/**
 * Make an outbound call
 */
export async function makeCall(request: MakeCallRequest): Promise<{
  success: boolean;
  callSid: string;
  status: string;
  to: string;
  from: string;
}> {
  const response = await fetch('/api/twilio/make-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to make call');
  }

  return await response.json();
}

/**
 * End a call
 */
export async function endCall(callSid: string): Promise<void> {
  const response = await fetch(`/api/twilio/calls/${callSid}`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to end call');
  }
}

/**
 * Send a WhatsApp message
 */
export async function sendWhatsApp(request: SendWhatsAppRequest): Promise<{
  success: boolean;
  messageSid: string;
  status: string;
  to: string;
  from: string;
}> {
  const response = await fetch('/api/twilio/whatsapp/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send WhatsApp message');
  }

  return await response.json();
}

/**
 * Send an email
 */
export async function sendEmail(request: SendEmailRequest): Promise<{
  success: boolean;
  messageId?: string;
  message: string;
}> {
  const response = await fetch('/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send email');
  }

  return await response.json();
}
