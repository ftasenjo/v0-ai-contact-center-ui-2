/**
 * Client-side utilities for Vapi integration
 */

export interface CreateCallRequest {
  to: string;
  assistantId?: string;
  metadata?: Record<string, any>;
}

export interface VapiCallResponse {
  success: boolean;
  call?: {
    id: string;
    status: string;
    customer: {
      number: string;
    };
    assistant: {
      id: string;
      name: string;
    };
  };
  error?: string;
  message?: string;
}

/**
 * Create a Vapi call from the client
 */
export async function createVapiCall(request: CreateCallRequest): Promise<VapiCallResponse> {
  const response = await fetch('/api/vapi/call', {
    method: 'POST',
    headers: {
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
export async function getVapiCall(callId: string): Promise<VapiCallResponse> {
  const response = await fetch(`/api/vapi/call?id=${callId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get Vapi call');
  }

  return await response.json();
}



