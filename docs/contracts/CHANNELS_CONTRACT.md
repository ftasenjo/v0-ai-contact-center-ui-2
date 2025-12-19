# Channels Contract

This document defines the contract for all communication channels integrated with the Contact Center AI system.

## Overview

The system supports multiple channels:
- **WhatsApp** (via Twilio)
- **Email** (via SendGrid)
- **Voice** (via Twilio + Vapi)
- **SMS** (via Twilio)

---

## 1. Twilio WhatsApp Webhook

### Endpoint
`POST /api/twilio/whatsapp/incoming`

### Request Payload (Form Data)
```typescript
{
  From: string;        // "whatsapp:+1234567890"
  To: string;          // "whatsapp:+14155238886"
  Body: string;         // Message content
  MessageSid: string;   // Unique message ID
  NumMedia: string;     // "0" or number of media attachments
  MediaUrl0?: string;   // Media URL if NumMedia > 0
  MediaUrl1?: string;   // Additional media URLs
  // ... MediaUrlN for N media items
}
```

### Response
**Content-Type**: `text/xml`

**TwiML Response**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Response text here</Message>
</Response>
```

### Status Webhook
`POST /api/twilio/whatsapp/webhook`

**Payload**:
```typescript
{
  MessageSid: string;
  MessageStatus: 'queued' | 'sending' | 'sent' | 'failed' | 'delivered' | 'undelivered' | 'received' | 'read';
  From: string;
  To: string;
}
```

---

## 2. Twilio Voice Webhook

### Incoming Call
`POST /api/twilio/incoming-call`

### Request Payload (Form Data)
```typescript
{
  From: string;      // "+1234567890"
  To: string;        // "+14155238886"
  CallSid: string;   // Unique call ID
  CallStatus: string; // "ringing" | "in-progress" | "completed" | "busy" | "no-answer" | "failed"
}
```

### Response
**Content-Type**: `text/xml`

**TwiML Response** (if Vapi enabled):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.vapi.ai/stream" />
  </Connect>
</Response>
```

**TwiML Response** (if Vapi disabled):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Please hold...</Say>
  <Dial>+1234567890</Dial>
</Response>
```

### Call Status Webhook
`POST /api/twilio/webhook`

**Payload**:
```typescript
{
  CallSid: string;
  CallStatus: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  From: string;
  To: string;
  Duration?: string;  // Call duration in seconds
  RecordingUrl?: string;
}
```

---

## 3. SendGrid Inbound Parse Webhook

### Endpoint
`POST /api/email/incoming`

### Request Payload (Form Data)
```typescript
{
  headers: string;        // Email headers (JSON string)
  text: string;          // Plain text body
  html: string;          // HTML body
  from: string;          // "Name <email@example.com>"
  to: string;            // Recipient email
  subject: string;       // Email subject
  envelope: string;      // Envelope data (JSON string)
  charsets: string;      // Character sets (JSON string)
  SPF: string;           // SPF validation result
  attachments?: number;   // Number of attachments
  attachment-info?: string; // Attachment metadata (JSON string)
  attachment1?: File;     // First attachment
  attachment2?: File;     // Additional attachments
}
```

### Response
**Status**: `200 OK`
**Body**: `{ success: true }`

---

## 4. Vapi Webhook

### Endpoint
`POST /api/vapi/webhook`

### Request Payload (JSON)
```typescript
{
  type: 'call-status-update' | 'end-of-call-report' | 'transcript' | 'function-call' | 'speech-update';
  call: {
    id: string;
    status: string;
    customer?: {
      number: string;
    };
    assistant?: {
      id: string;
      name: string;
    };
    transcript?: string;
    summary?: string;
    cost?: number;
    duration?: number;
  };
  // Additional fields based on type
}
```

### Webhook Types

#### call-status-update
```typescript
{
  type: 'call-status-update';
  call: {
    id: string;
    status: 'queued' | 'ringing' | 'in-progress' | 'ended';
  };
}
```

#### end-of-call-report
```typescript
{
  type: 'end-of-call-report';
  call: {
    id: string;
    status: 'ended';
    transcript: string;
    summary: string;
    cost: number;
    duration: number;
  };
}
```

#### transcript
```typescript
{
  type: 'transcript';
  call: {
    id: string;
  };
  transcript: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  };
}
```

#### function-call
```typescript
{
  type: 'function-call';
  call: {
    id: string;
  };
  functionCall: {
    name: string;
    parameters: Record<string, any>;
  };
}
```

### Response
**Status**: `200 OK`
**Body**: `{ success: true }`

---

## Error Handling

All webhook endpoints should:
1. Return `200 OK` to acknowledge receipt (even on errors)
2. Log errors for debugging
3. Handle missing or invalid payloads gracefully
4. Validate required fields before processing

### Error Response Format
```typescript
{
  error: string;
  message?: string;
  code?: string;
}
```

---

## Validation

### Required Fields by Channel

**WhatsApp**:
- `From`, `To`, `Body`, `MessageSid`

**Voice**:
- `From`, `To`, `CallSid`

**Email**:
- `from`, `to`, `subject`, `text` or `html`

**Vapi**:
- `type`, `call.id`

---

## Security

1. **Twilio**: Validate requests using Twilio signature
2. **SendGrid**: Validate using SendGrid signature
3. **Vapi**: Validate using Vapi webhook secret
4. **Rate Limiting**: Implement rate limiting on all endpoints
5. **IP Whitelisting**: Consider whitelisting provider IPs

---

## Versioning

Current version: **v1.0**

Future changes should:
- Maintain backward compatibility
- Version endpoints if breaking changes needed
- Document deprecations

