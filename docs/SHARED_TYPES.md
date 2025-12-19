# Shared Types Documentation

This document describes the shared TypeScript types used across the Contact Center AI application.

## Overview

Shared types ensure type safety and consistency across:
- **UI Components** - React components in `app/` and `components/`
- **API Routes** - Next.js API handlers in `app/api/`
- **LangGraph Workflow** - AI agent workflow in `lib/agents/`
- **Tools** - LangChain tools in `lib/agents/langchain-tools.ts`
- **Database Access** - Supabase queries in `lib/supabase-store.ts` and `lib/banking-store.ts`

---

## Current Type Locations

### 1. Database Types
**Location**: `lib/supabase.ts`

**Key Types**:
- `Database` - Complete Supabase database schema types
  - `Database['public']['Tables']['customers']`
  - `Database['public']['Tables']['conversations']`
  - `Database['public']['Tables']['messages']`
  - `Database['public']['Tables']['calls']`
  - `Database['public']['Tables']['channel_messages']`
  - `Database['public']['Tables']['cc_bank_customers']`
  - `Database['public']['Tables']['cc_conversations']`
  - `Database['public']['Tables']['cc_messages']`
  - `Database['public']['Tables']['cc_cases']`
  - `Database['public']['Tables']['cc_auth_sessions']`
  - `Database['public']['Tables']['cc_audit_logs']`
  - `Database['public']['Tables']['cc_preferences']`

**Usage**:
```typescript
import type { Database } from '@/lib/supabase';

type CustomerRow = Database['public']['Tables']['customers']['Row'];
type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
```

---

### 2. Domain Model Types
**Location**: `lib/sample-data.ts`

**Key Types**:
- `Conversation` - Main conversation entity
  ```typescript
  interface Conversation {
    id: string;
    customer: Customer;
    channel: 'voice' | 'chat' | 'email' | 'whatsapp';
    status: 'active' | 'waiting' | 'resolved' | 'escalated';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    sentiment: 'positive' | 'neutral' | 'negative';
    sentimentScore: number;
    sla: SLA;
    assignedTo: string | null;
    queue: string;
    topic: string;
    lastMessage: string;
    lastMessageTime: Date;
    startTime: Date;
    messages: Message[];
    aiConfidence: number;
    escalationRisk: boolean;
    tags: string[];
  }
  ```

- `Message` - Individual message in a conversation
  ```typescript
  interface Message {
    id: string;
    type: 'customer' | 'agent' | 'ai' | 'system';
    content: string;
    timestamp: Date;
    sentiment?: 'positive' | 'neutral' | 'negative';
    confidence?: number;
    isTranscript?: boolean;
  }
  ```

- `Customer` - Customer information
- `Agent` - Agent information
- `Industry` - Industry type union
- `SLA` - Service Level Agreement data

**Usage**:
```typescript
import type { Conversation, Message, Customer } from '@/lib/sample-data';
```

---

### 3. Agent Workflow Types
**Location**: `lib/agents/langgraph-workflow.ts`

**Key Types**:
- `AgentState` - State tracked throughout LangGraph workflow
  ```typescript
  interface AgentState {
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
  ```

**Usage**:
```typescript
import type { AgentState } from '@/lib/agents/langgraph-workflow';
```

---

### 4. Data Store Types
**Location**: `lib/data-store.ts`

**Key Types**:
- `StoredCall` - Call data structure
  ```typescript
  interface StoredCall {
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
    transcript?: Array<{
      speaker: 'customer' | 'agent' | 'ai' | 'system';
      text: string;
      timestamp: Date;
    }>;
  }
  ```

- `StoredMessage` - Message data structure
  ```typescript
  interface StoredMessage {
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
  ```

**Usage**:
```typescript
import type { StoredCall, StoredMessage } from '@/lib/data-store';
```

---

### 5. Conversation Handling Types
**Location**: `lib/conversation-handling.ts`

**Key Types**:
- `HandlingStatus` - Conversation handling status
  ```typescript
  type HandlingStatus = 'ai-handled' | 'human-handling-needed' | 'human-handled';
  ```

**Usage**:
```typescript
import type { HandlingStatus } from '@/lib/conversation-handling';
import { getHandlingStatus, filterByHandlingStatus } from '@/lib/conversation-handling';
```

---

### 6. Permissions Types
**Location**: `lib/permissions.ts` and `contexts/auth-context.tsx`

**Key Types**:
- `UserRole` - User role type
  ```typescript
  type UserRole = 'agent' | 'supervisor' | 'admin' | 'analyst';
  ```

**Usage**:
```typescript
import type { UserRole } from '@/contexts/auth-context';
import { hasPermission, canAccessRoute } from '@/lib/permissions';
```

---

## Recommended Organization

### Current State
Types are currently scattered across multiple files in `lib/`. This works but can be improved.

### Proposed Structure (Future)

Create a centralized types directory:

```
lib/
  types/
    index.ts          # Barrel file - re-exports all public types
    database.ts       # Database types (from supabase.ts)
    domain.ts         # Domain models (Conversation, Message, etc.)
    agent.ts          # Agent workflow types (AgentState)
    store.ts          # Data store types (StoredCall, StoredMessage)
    auth.ts           # Auth and permissions types
    channels.ts       # Channel-specific types (webhook payloads)
```

### Barrel File Example (`lib/types/index.ts`)

```typescript
// Re-export database types
export type { Database } from '../supabase';

// Re-export domain types
export type {
  Conversation,
  Message,
  Customer,
  Agent,
  Industry,
  SLA,
} from '../sample-data';

// Re-export agent types
export type { AgentState } from '../agents/langgraph-workflow';

// Re-export store types
export type { StoredCall, StoredMessage } from '../data-store';

// Re-export handling types
export type { HandlingStatus } from '../conversation-handling';

// Re-export auth types
export type { UserRole } from '../contexts/auth-context';
```

### Usage After Refactor

```typescript
// Single import for all types
import type {
  Conversation,
  Message,
  AgentState,
  StoredCall,
  HandlingStatus,
  UserRole,
} from '@/lib/types';
```

---

## Type Categories

### Public Types
Types that should be imported and used across the application:
- `Conversation`, `Message`, `Customer`, `Agent`
- `AgentState`
- `StoredCall`, `StoredMessage`
- `HandlingStatus`
- `UserRole`
- `Database` (for database operations)

### Internal Types
Types that are implementation details and shouldn't be exported:
- Internal state types
- Utility types
- Type helpers

---

## Import Guidelines

### Current Approach (Before Refactor)
```typescript
// Import from specific files
import type { Conversation } from '@/lib/sample-data';
import type { AgentState } from '@/lib/agents/langgraph-workflow';
import type { StoredCall } from '@/lib/data-store';
```

### Future Approach (After Refactor)
```typescript
// Import from centralized types
import type {
  Conversation,
  AgentState,
  StoredCall,
} from '@/lib/types';
```

---

## Type Safety Best Practices

### 1. Use Narrow Types
Prefer specific union types over `string`:
```typescript
// ✅ Good
channel: 'whatsapp' | 'email' | 'voice' | 'chat'

// ❌ Bad
channel: string
```

### 2. Avoid `any`
Use `unknown` or specific types instead:
```typescript
// ✅ Good
metadata: Record<string, unknown>

// ❌ Bad
metadata: Record<string, any>
```

### 3. Use Type Guards
For runtime validation:
```typescript
function isConversation(obj: unknown): obj is Conversation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'customer' in obj
  );
}
```

### 4. Prefer Interfaces for Extensibility
```typescript
// ✅ Good - can be extended
interface Customer {
  id: string;
  name: string;
}

interface PremiumCustomer extends Customer {
  tier: 'premium';
}

// ❌ Less flexible
type Customer = {
  id: string;
  name: string;
}
```

---

## Runtime Validation

### Current State
Types are compile-time only. No runtime validation.

### Future Improvement
Use Zod schemas for runtime validation:

```typescript
import { z } from 'zod';

const ConversationSchema = z.object({
  id: z.string().uuid(),
  customer: z.object({
    id: z.string().uuid(),
    name: z.string(),
    // ... more fields
  }),
  channel: z.enum(['voice', 'chat', 'email', 'whatsapp']),
  status: z.enum(['active', 'waiting', 'resolved', 'escalated']),
  // ... more fields
});

type Conversation = z.infer<typeof ConversationSchema>;
```

**Benefits**:
- Runtime validation for API payloads
- Type safety from schema
- Better error messages

---

## Versioning Strategy

### Current Approach
Since this is a single repository (not a separate package):
- Types are versioned with the application
- Breaking changes should be documented in PRs
- Use semantic discipline: avoid breaking changes when possible

### Guidelines
1. **Avoid Breaking Changes**: Prefer adding new optional fields
2. **Deprecation**: Mark deprecated types with `@deprecated` JSDoc
3. **Migration**: Provide migration guides for breaking changes
4. **Documentation**: Update this file when types change

### Example Deprecation
```typescript
/**
 * @deprecated Use `HandlingStatus` instead
 */
type OldHandlingType = 'ai' | 'human' | 'pending';
```

---

## Security Considerations

### Do NOT Include in Types
- ❌ Secrets (API keys, tokens)
- ❌ PII (Personally Identifiable Information) in type definitions
- ❌ Passwords or authentication credentials
- ❌ Internal implementation details

### Safe to Include
- ✅ Public identifiers (IDs, UUIDs)
- ✅ Enums and status values
- ✅ Public metadata
- ✅ Non-sensitive configuration

---

## Channel-Specific Types

### Webhook Payload Types (Future)
Consider creating types for webhook payloads:

```typescript
// lib/types/channels.ts

export interface TwilioWhatsAppWebhook {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  NumMedia: string;
  MediaUrl0?: string;
}

export interface SendGridInboundWebhook {
  headers: string;
  text: string;
  html: string;
  from: string;
  to: string;
  subject: string;
  envelope: string;
}
```

See `CHANNELS_CONTRACT.md` for detailed webhook schemas.

---

## Summary

### Current State
- Types are distributed across `lib/` files
- Each file exports its own types
- No centralized type management

### Recommended Next Steps
1. ✅ **Document existing types** (this file)
2. 🔄 **Create `lib/types/` directory** (optional refactor)
3. 🔄 **Create barrel file** `lib/types/index.ts` (optional)
4. 🔄 **Add Zod schemas** for runtime validation (future)
5. 🔄 **Create channel-specific types** (future)

### Quick Reference

| Type Category | Location | Key Types |
|--------------|----------|-----------|
| Database | `lib/supabase.ts` | `Database` |
| Domain | `lib/sample-data.ts` | `Conversation`, `Message`, `Customer` |
| Agent | `lib/agents/langgraph-workflow.ts` | `AgentState` |
| Store | `lib/data-store.ts` | `StoredCall`, `StoredMessage` |
| Handling | `lib/conversation-handling.ts` | `HandlingStatus` |
| Auth | `lib/permissions.ts`, `contexts/auth-context.tsx` | `UserRole` |

---

## Questions or Updates?

When adding new types:
1. Document them in this file
2. Consider if they should be in a centralized location
3. Update the "Quick Reference" table
4. Add examples if the type is complex

