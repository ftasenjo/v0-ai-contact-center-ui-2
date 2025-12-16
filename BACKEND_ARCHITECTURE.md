# Backend Architecture Overview

## 🏗️ Architecture Overview

The backend is built on **Next.js API Routes** (serverless functions) with the following key components:

```
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Twilio  │  │  Vapi    │  │  Email   │  │  OpenAI  │  │
│  │ (WhatsApp│  │  (Voice) │  │ (SendGrid│  │  (LLM)   │  │
│  │  & Calls)│  │          │  │  API)    │  │          │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼──────────────┼──────────────┼──────────────┼────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (app/api/)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/twilio/whatsapp/incoming  (Webhook Handler)    │  │
│  │  /api/twilio/incoming-call      (Call Handler)       │  │
│  │  /api/email/incoming            (Email Handler)     │  │
│  │  /api/agents/process            (AI Processing)     │  │
│  │  /api/conversations             (CRUD Operations)   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│              Business Logic Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LangGraph Workflow (lib/agents/langgraph-workflow)  │  │
│  │  - Intent Analysis                                    │  │
│  │  - Sentiment Analysis                                 │  │
│  │  - AI Response Generation                             │  │
│  │  - Escalation Detection                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Store Adapter (lib/store-adapter.ts)                 │  │
│  │  - Switches between in-memory & Supabase              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Storage Layer                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Supabase (PostgreSQL)                               │  │
│  │  - customers                                         │  │
│  │  - conversations                                     │  │
│  │  - messages                                         │  │
│  │  - channel_messages (WhatsApp/Email)                │  │
│  │  - calls                                            │  │
│  │  - call_transcripts                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 API Routes Structure

### 1. **Twilio Integration** (`/app/api/twilio/`)

#### WhatsApp Messages
- **`/api/twilio/whatsapp/incoming`** (POST)
  - Receives webhook from Twilio when a WhatsApp message arrives
  - **Flow:**
    1. Receives message data (from, to, body, messageSid)
    2. Stores message in `channel_messages` table
    3. Creates/updates conversation in `conversations` table
    4. Processes message through LangGraph AI workflow
    5. Generates AI response using OpenAI
    6. Stores AI response in both `channel_messages` and `messages` tables
    7. Sends response back via Twilio WhatsApp API
    8. Updates conversation metadata (sentiment, intent, escalation risk)

- **`/api/twilio/whatsapp/send`** (POST)
  - Sends outbound WhatsApp messages

- **`/api/twilio/whatsapp/webhook`** (POST)
  - Handles delivery status updates from Twilio

#### Voice Calls
- **`/api/twilio/incoming-call`** (POST)
  - Handles incoming phone calls
  - Can route to Vapi for AI voice assistant

- **`/api/twilio/make-call`** (POST)
  - Initiates outbound calls

- **`/api/twilio/calls/[callSid]`** (GET)
  - Retrieves call details

### 2. **Email Integration** (`/app/api/email/`)

- **`/api/email/incoming`** (POST)
  - Similar flow to WhatsApp:
    1. Receives email via SendGrid webhook
    2. Stores in `channel_messages` table
    3. Creates/updates conversation
    4. Processes through LangGraph
    5. Sends AI-generated response

### 3. **AI Agent Processing** (`/app/api/agents/`)

- **`/api/agents/process`** (POST)
  - Standalone endpoint for processing messages through LangGraph
  - Can be called directly for testing or manual processing

### 4. **Conversations Management** (`/app/api/conversations/`)

- **`/api/conversations`** (GET)
  - Returns all conversations, optionally filtered by industry
  - Merges Supabase data with demo data (if not using Supabase)

- **`/api/conversations/[id]`** (GET, DELETE)
  - Get single conversation or delete it

---

## 🔄 Data Flow: WhatsApp Message Example

Here's the complete flow when a customer sends a WhatsApp message:

```
1. Customer sends WhatsApp message
   ↓
2. Twilio receives message → POST to /api/twilio/whatsapp/incoming
   ↓
3. Store incoming message
   ├─→ Insert into channel_messages table
   └─→ Create/update conversation in conversations table
   ↓
4. Extract customer info from conversation
   ↓
5. Process through LangGraph workflow (lib/agents/langgraph-workflow.ts)
   ├─→ Load conversation history
   ├─→ Call OpenAI LLM with system prompt + history
   ├─→ Generate AI response
   ├─→ Analyze intent (billing, support, etc.)
   ├─→ Analyze sentiment (positive, neutral, negative)
   └─→ Determine if escalation needed
   ↓
6. Store AI response
   ├─→ Insert into channel_messages (for Twilio tracking)
   └─→ Insert into messages (for UI display)
   ↓
7. Update conversation metadata
   ├─→ Update sentiment, intent, priority
   ├─→ Set escalation_risk flag if needed
   └─→ Update last_message and last_message_time
   ↓
8. Send response via Twilio
   └─→ Return TwiML XML response
   ↓
9. Twilio delivers message to customer
```

---

## 🧠 LangGraph AI Workflow

Located in `lib/agents/langgraph-workflow.ts`

### Simplified Flow (Current Implementation)

The current implementation uses a **simplified direct LLM approach** rather than the full LangGraph workflow:

```typescript
processMessage(conversationId, customerMessage, customerInfo)
  ↓
1. Load conversation history from database
  ↓
2. Convert messages to LangChain format (HumanMessage, AIMessage)
  ↓
3. Call OpenAI with:
   - System prompt (friendly customer service assistant)
   - Last 10 messages for context
  ↓
4. Generate AI response
  ↓
5. Analyze intent (separate LLM call)
  ↓
6. Analyze sentiment (separate LLM call)
  ↓
7. Return:
   - response: string
   - intent: string | null
   - sentiment: 'positive' | 'neutral' | 'negative'
   - requiresEscalation: boolean
   - resolved: boolean
```

### Full LangGraph Workflow (Available but not currently used)

The file also contains a complete LangGraph workflow with nodes:
- `greetCustomer` - Initial greeting
- `analyzeIntent` - Categorize customer intent
- `analyzeSentiment` - Determine emotional tone
- `routeConversation` - Route to specialized handler
- `handleBilling` - Billing-specific responses
- `handleTechnical` - Technical support responses
- `handleProduct` - Product inquiry responses
- `handleGeneral` - General inquiries
- `escalateToHuman` - Mark for human handover

This can be enabled by modifying the workflow execution logic.

---

## 💾 Data Storage Layer

### Store Adapter Pattern (`lib/store-adapter.ts`)

The backend uses an **adapter pattern** to switch between storage backends:

- **In-Memory Store** (`lib/data-store.ts`)
  - Used when `USE_SUPABASE=false` or not set
  - Data is lost on server restart
  - Good for development/testing

- **Supabase Store** (`lib/supabase-store.ts`)
  - Used when `USE_SUPABASE=true`
  - Persistent PostgreSQL database
  - Production-ready

The adapter automatically routes all calls to the appropriate store based on the environment variable.

### Database Schema (Supabase)

Key tables:

1. **`customers`**
   - Customer information (name, email, phone, tier)
   - One customer can have multiple conversations

2. **`conversations`**
   - Main conversation record
   - Links to customer, agent (if assigned)
   - Tracks status, priority, sentiment, SLA
   - Has `industry` field for filtering

3. **`messages`**
   - Messages within a conversation
   - Types: `customer`, `agent`, `ai`, `system`
   - Used for conversation history display

4. **`channel_messages`**
   - Raw messages from external channels (WhatsApp, Email)
   - Links to conversations
   - Tracks delivery status

5. **`calls`**
   - Voice call records
   - Links to conversations and customers
   - Stores transcripts

6. **`call_transcripts`**
   - Individual transcript lines from calls
   - Speaker identification (customer, agent, ai)

---

## 🔧 Key Configuration

### Environment Variables (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
USE_SUPABASE=true

# OpenAI (for LangGraph)
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# LangGraph
USE_LANGGRAPH=true  # Enable/disable AI processing

# Email (SendGrid)
SENDGRID_API_KEY=...
```

---

## 🚀 How It All Connects

### Example: Incoming WhatsApp Message

1. **Twilio Webhook** → `POST /api/twilio/whatsapp/incoming`
2. **Store Message** → `storeMessage()` → Supabase `channel_messages`
3. **Create Conversation** → `createConversationFromMessage()` → Supabase `conversations`
4. **AI Processing** → `processMessage()` → OpenAI API → LangGraph workflow
5. **Store Response** → `storeMessage()` → Supabase `messages` + `channel_messages`
6. **Update Conversation** → `updateConversation()` → Update sentiment, intent, etc.
7. **Return TwiML** → Twilio sends message to customer

### Example: Frontend Request

1. **Frontend** → `GET /api/conversations?industry=ecommerce`
2. **API Route** → `getAllConversations('ecommerce')` → Supabase query
3. **Join Data** → Fetches conversations with related customers, messages, agents
4. **Return JSON** → Frontend displays in inbox

---

## 🎯 Key Features

1. **Multi-Channel Support**
   - WhatsApp, Email, Voice calls
   - Unified conversation management

2. **AI-Powered Responses**
   - Automatic message processing
   - Intent and sentiment analysis
   - Escalation detection

3. **Conversation Management**
   - Industry-based filtering
   - Handling status (AI-handled, needs-human, human-handled)
   - Message blocking for AI-handled conversations

4. **Persistent Storage**
   - Supabase PostgreSQL database
   - Automatic customer creation
   - Conversation threading

5. **Real-time Updates**
   - Webhook-based message delivery
   - Status tracking (sent, delivered, read)

---

## 🔍 Debugging Tips

1. **Check Logs**: All API routes have detailed `console.log` statements
2. **Database Queries**: Check Supabase dashboard for data
3. **Webhook Testing**: Use tools like ngrok to test webhooks locally
4. **LangGraph Logs**: Look for `🔄`, `📋`, `🤖`, `✅` emoji logs in terminal

---

## 📝 Next Steps / Improvements

1. **Enable Full LangGraph Workflow**: Switch from simplified to full workflow
2. **Human Handover**: Implement assignment API and connect to handover modal
3. **Message Sending**: Connect Send button to API endpoint
4. **Real-time Updates**: Add WebSocket/SSE for live conversation updates
5. **Agent Dashboard**: Add agent assignment and status management

