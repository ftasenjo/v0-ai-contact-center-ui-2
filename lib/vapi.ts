/**
 * Vapi client initialization and utilities
 * Vapi is a voice AI platform for building AI voice assistants
 */

const VAPI_API_URL = 'https://api.vapi.ai';

export interface VapiConfig {
  apiKey: string;
  assistantId?: string;
  phoneNumberId?: string;
}

export interface VapiCall {
  id: string;
  status: string;
  customer: {
    number: string;
  };
  assistant: {
    id: string;
    name: string;
  };
  startedAt?: string;
  endedAt?: string;
  transcript?: string;
  recordingUrl?: string;
}

export interface CreateCallRequest {
  phoneNumberId: string;
  customer: {
    number: string;
  };
  assistantId?: string;
  assistantOverrides?: {
    firstMessage?: string;
    voicemailMessage?: string;
    endCallFunction?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Get Vapi API key from environment
 */
export function getVapiApiKey(): string {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    throw new Error('VAPI_API_KEY is not configured in your .env.local file.');
  }
  return apiKey;
}

/**
 * Get Vapi assistant ID from environment
 */
export function getVapiAssistantId(): string | undefined {
  return process.env.VAPI_ASSISTANT_ID;
}

/**
 * Get Vapi phone number ID from environment
 */
export function getVapiPhoneNumberId(): string | undefined {
  return process.env.VAPI_PHONE_NUMBER_ID;
}

/**
 * Create a Vapi call
 */
export async function createVapiCall(request: CreateCallRequest): Promise<VapiCall> {
  const apiKey = getVapiApiKey();
  
  const response = await fetch(`${VAPI_API_URL}/call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Vapi call');
  }

  return await response.json();
}

/**
 * Get Vapi call details
 */
export async function getVapiCall(callId: string): Promise<VapiCall> {
  const apiKey = getVapiApiKey();
  
  const response = await fetch(`${VAPI_API_URL}/call/${callId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get Vapi call');
  }

  return await response.json();
}

/**
 * End a Vapi call
 */
export async function endVapiCall(callId: string): Promise<void> {
  const apiKey = getVapiApiKey();
  
  const response = await fetch(`${VAPI_API_URL}/call/${callId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'ended',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to end Vapi call');
  }
}

/**
 * List Vapi calls
 */
export async function listVapiCalls(limit: number = 50): Promise<VapiCall[]> {
  const apiKey = getVapiApiKey();
  
  const response = await fetch(`${VAPI_API_URL}/call?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to list Vapi calls');
  }

  const data = await response.json();
  return data.calls || [];
}

/**
 * Get Vapi assistant details
 */
export async function getVapiAssistant(assistantId: string): Promise<any> {
  const apiKey = getVapiApiKey();
  
  const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get Vapi assistant');
  }

  return await response.json();
}



