# Tools Contract

This document defines the contract for AI agent tools and their request/response schemas.

## Overview

Tools are functions that the AI agent can call to perform actions or retrieve information. Tools are defined using LangChain's tool system.

---

## Tool Request Schema

### Base Request
```typescript
{
  conversationId: string;
  toolName: string;
  parameters: Record<string, any>;
  metadata?: {
    customerId?: string;
    agentId?: string;
    timestamp?: string;
  };
}
```

---

## Tool Response Schema

### Success Response
```typescript
{
  success: true;
  data: any;
  toolCallId: string;
  executionTime?: number; // milliseconds
}
```

### Error Response
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  toolCallId: string;
}
```

---

## Available Tools

### 1. lookup_customer

**Purpose**: Look up customer information by phone, email, or customer ID.

**Request**:
```typescript
{
  toolName: 'lookup_customer';
  parameters: {
    phone?: string;
    email?: string;
    customerId?: string;
  };
}
```

**Success Response**:
```typescript
{
  success: true;
  data: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    accountNumber?: string;
    tier: 'standard' | 'premium' | 'enterprise';
    riskLevel?: 'low' | 'medium' | 'high';
    kycStatus?: 'pending' | 'verified' | 'rejected';
  };
}
```

**Error Codes**:
- `CUSTOMER_NOT_FOUND`: Customer does not exist
- `INVALID_PARAMETERS`: Missing required parameters
- `DATABASE_ERROR`: Database query failed

---

### 2. create_support_ticket

**Purpose**: Create a support ticket or case.

**Request**:
```typescript
{
  toolName: 'create_support_ticket';
  parameters: {
    type: 'fraud' | 'dispute' | 'chargeback' | 'account_issue' | 'transaction_inquiry' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    customerId: string;
    amount?: number;
    currency?: string;
  };
}
```

**Success Response**:
```typescript
{
  success: true;
  data: {
    caseId: string;
    caseNumber: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    createdAt: string;
  };
}
```

**Error Codes**:
- `INVALID_CUSTOMER`: Customer ID not found
- `INVALID_TYPE`: Invalid case type
- `MISSING_DESCRIPTION`: Description is required
- `DATABASE_ERROR`: Failed to create case

---

### 3. check_account_balance

**Purpose**: Check customer account balance (banking-specific).

**Request**:
```typescript
{
  toolName: 'check_account_balance';
  parameters: {
    customerId: string;
    accountType?: 'checking' | 'savings' | 'credit';
  };
}
```

**Success Response**:
```typescript
{
  success: true;
  data: {
    balance: number;
    currency: string;
    accountType: string;
    lastUpdated: string;
  };
}
```

**Error Codes**:
- `CUSTOMER_NOT_FOUND`: Customer does not exist
- `ACCOUNT_NOT_FOUND`: Account not found
- `AUTH_REQUIRED`: Authentication required to access balance
- `PERMISSION_DENIED`: Insufficient permissions

---

### 4. verify_customer_identity

**Purpose**: Verify customer identity using OTP or KBA.

**Request**:
```typescript
{
  toolName: 'verify_customer_identity';
  parameters: {
    customerId: string;
    method: 'otp' | 'kba' | 'biometric';
    conversationId: string;
  };
}
```

**Success Response**:
```typescript
{
  success: true;
  data: {
    authSessionId: string;
    status: 'pending' | 'verified' | 'failed';
    expiresAt: string;
    method: string;
  };
}
```

**Error Codes**:
- `CUSTOMER_NOT_FOUND`: Customer does not exist
- `INVALID_METHOD`: Invalid authentication method
- `AUTH_FAILED`: Authentication failed
- `AUTH_EXPIRED`: Authentication session expired

---

## Error Codes Reference

### General Errors
- `INTERNAL_ERROR`: Unexpected server error
- `INVALID_REQUEST`: Request format is invalid
- `TIMEOUT`: Tool execution timed out
- `RATE_LIMITED`: Too many requests

### Customer Errors
- `CUSTOMER_NOT_FOUND`: Customer does not exist
- `CUSTOMER_SUSPENDED`: Customer account is suspended
- `CUSTOMER_BLOCKED`: Customer account is blocked

### Authentication Errors
- `AUTH_REQUIRED`: Authentication required
- `AUTH_FAILED`: Authentication failed
- `AUTH_EXPIRED`: Authentication expired
- `PERMISSION_DENIED`: Insufficient permissions

### Data Errors
- `INVALID_PARAMETERS`: Invalid or missing parameters
- `DATABASE_ERROR`: Database operation failed
- `DATA_NOT_FOUND`: Requested data not found

### Business Logic Errors
- `INVALID_OPERATION`: Operation not allowed
- `DUPLICATE_ENTRY`: Entry already exists
- `VALIDATION_FAILED`: Data validation failed

---

## Tool Execution Flow

1. **Request Received**: Agent requests tool execution
2. **Validation**: Validate parameters and permissions
3. **Authentication Check**: Verify if auth is required
4. **Execution**: Execute tool logic
5. **Response**: Return success or error response
6. **Logging**: Log tool execution for audit

---

## Tool Versioning

Current version: **v1.0**

### Versioning Strategy
- **Major version**: Breaking changes (new required parameters, changed response format)
- **Minor version**: New optional parameters, new response fields
- **Patch version**: Bug fixes, internal improvements

### Deprecation Policy
- Deprecated tools/parameters marked with `@deprecated`
- Minimum 3 months notice before removal
- Migration guide provided

---

## Rate Limiting

Tools are rate-limited to prevent abuse:
- **Per conversation**: 10 tool calls per minute
- **Per customer**: 20 tool calls per hour
- **Global**: 1000 tool calls per hour

---

## Security

1. **Input Validation**: All parameters validated before execution
2. **Authentication**: Sensitive tools require customer authentication
3. **Authorization**: Check permissions before execution
4. **Audit Logging**: All tool calls logged to `cc_audit_logs`
5. **Data Redaction**: Sensitive data redacted in logs

---

## Testing

Tools should be tested with:
- Valid inputs
- Invalid inputs
- Missing parameters
- Authentication scenarios
- Error conditions
- Rate limiting

---

## Future Tools

Planned tools:
- `transfer_to_agent`: Transfer conversation to human agent
- `schedule_callback`: Schedule a callback
- `update_customer_preferences`: Update customer preferences
- `check_transaction_history`: Get transaction history
- `block_card`: Block a credit/debit card
- `unblock_card`: Unblock a card

