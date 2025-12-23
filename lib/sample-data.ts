export interface Conversation {
  id: string
  customer: {
    id: string
    name: string
    email: string
    phone: string
    avatar: string
    language: string
    preferredLanguage: string
    tier: "standard" | "premium" | "enterprise"
  }
  channel: "voice" | "chat" | "email" | "whatsapp"
  status: "active" | "waiting" | "resolved" | "escalated"
  priority: "low" | "medium" | "high" | "urgent"
  sentiment: "positive" | "neutral" | "negative"
  sentimentScore: number
  sla: {
    deadline: Date
    remaining: number
    status: "healthy" | "warning" | "breached"
  }
  assignedTo: string | null
  queue: string
  topic: string
  lastMessage: string
  lastMessageTime: Date
  startTime: Date
  messages: Message[]
  aiConfidence: number
  escalationRisk: boolean
  tags: string[]
  // Optional metadata bag for feature flags / workflow notes, etc.
  metadata?: Record<string, unknown>
}

export interface Message {
  id: string
  type: "customer" | "agent" | "ai" | "system"
  content: string
  timestamp: Date
  // Optional fields used by Supabase-backed message rows / ingestion payloads
  body_text?: string
  text?: string
  direction?: "inbound" | "outbound"
  sentiment?: "positive" | "neutral" | "negative"
  confidence?: number
  isTranscript?: boolean
}

export interface Agent {
  id: string
  name: string
  email: string
  avatar: string
  status: "online" | "away" | "busy" | "offline"
  role: "agent" | "supervisor"
  activeConversations: number
  avgHandleTime: number
  csat: number
}

// Sample conversations
export const sampleConversations: Conversation[] = [
  {
    id: "conv-001",
    customer: {
      id: "cust-001",
      name: "Emily Richardson",
      email: "emily.r@techcorp.com",
      phone: "+1 (555) 123-4567",
      avatar: "/professional-woman-emily.jpg",
      language: "English",
      preferredLanguage: "en",
      tier: "enterprise",
    },
    channel: "voice",
    status: "active",
    priority: "high",
    sentiment: "negative",
    sentimentScore: 0.25,
    sla: {
      deadline: new Date(Date.now() + 5 * 60 * 1000),
      remaining: 5,
      status: "warning",
    },
    assignedTo: "agent-001",
    queue: "Enterprise Support",
    topic: "Service Outage",
    lastMessage: "This is unacceptable, our entire team has been down for 2 hours!",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 1000),
    startTime: new Date(Date.now() - 45 * 60 * 1000),
    aiConfidence: 0.72,
    escalationRisk: true,
    tags: ["outage", "enterprise", "urgent"],
    messages: [
      {
        id: "msg-001",
        type: "system",
        content: "Call connected - Enterprise Support Queue",
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
      },
      {
        id: "msg-002",
        type: "customer",
        content: "Hi, I need help urgently. Our entire platform has been down since this morning.",
        timestamp: new Date(Date.now() - 44 * 60 * 1000),
        sentiment: "negative",
        isTranscript: true,
      },
      {
        id: "msg-003",
        type: "ai",
        content:
          "I understand you're experiencing a service outage. I can see there's an ongoing incident affecting your region. Let me connect you with our enterprise support team for immediate assistance.",
        timestamp: new Date(Date.now() - 43 * 60 * 1000),
        confidence: 0.89,
        isTranscript: true,
      },
      {
        id: "msg-004",
        type: "customer",
        content: "This is unacceptable, our entire team has been down for 2 hours!",
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        sentiment: "negative",
        isTranscript: true,
      },
    ],
  },
  {
    id: "conv-002",
    customer: {
      id: "cust-002",
      name: "Marcus Johnson",
      email: "m.johnson@retail.com",
      phone: "+1 (555) 234-5678",
      avatar: "/professional-man-marcus.jpg",
      language: "English",
      preferredLanguage: "en",
      tier: "premium",
    },
    channel: "chat",
    status: "active",
    priority: "medium",
    sentiment: "neutral",
    sentimentScore: 0.55,
    sla: {
      deadline: new Date(Date.now() + 25 * 60 * 1000),
      remaining: 25,
      status: "healthy",
    },
    assignedTo: "agent-001",
    queue: "Sales Support",
    topic: "Pricing Inquiry",
    lastMessage: "Can you explain the difference between the Pro and Enterprise plans?",
    lastMessageTime: new Date(Date.now() - 5 * 60 * 1000),
    startTime: new Date(Date.now() - 15 * 60 * 1000),
    aiConfidence: 0.94,
    escalationRisk: false,
    tags: ["pricing", "upgrade"],
    messages: [
      {
        id: "msg-005",
        type: "system",
        content: "Chat started via website widget",
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
      },
      {
        id: "msg-006",
        type: "customer",
        content: "Hello, I'm interested in upgrading our plan.",
        timestamp: new Date(Date.now() - 14 * 60 * 1000),
        sentiment: "positive",
      },
      {
        id: "msg-007",
        type: "ai",
        content:
          "Hi Marcus! Great to hear you're considering an upgrade. I'd be happy to help you explore our plans. What specific features are you looking for?",
        timestamp: new Date(Date.now() - 13 * 60 * 1000),
        confidence: 0.95,
      },
      {
        id: "msg-008",
        type: "customer",
        content: "Can you explain the difference between the Pro and Enterprise plans?",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        sentiment: "neutral",
      },
    ],
  },
  {
    id: "conv-003",
    customer: {
      id: "cust-003",
      name: "Sofia Martinez",
      email: "sofia.m@startup.io",
      phone: "+1 (555) 345-6789",
      avatar: "/professional-woman-sofia.jpg",
      language: "Spanish",
      preferredLanguage: "es",
      tier: "standard",
    },
    channel: "whatsapp",
    status: "waiting",
    priority: "low",
    sentiment: "positive",
    sentimentScore: 0.82,
    sla: {
      deadline: new Date(Date.now() + 45 * 60 * 1000),
      remaining: 45,
      status: "healthy",
    },
    assignedTo: null,
    queue: "General Support",
    topic: "Account Setup",
    lastMessage: "¡Gracias! I'll wait for the verification email.",
    lastMessageTime: new Date(Date.now() - 8 * 60 * 1000),
    startTime: new Date(Date.now() - 20 * 60 * 1000),
    aiConfidence: 0.88,
    escalationRisk: false,
    tags: ["onboarding", "spanish"],
    messages: [
      {
        id: "msg-009",
        type: "system",
        content: "WhatsApp conversation started",
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
      },
      {
        id: "msg-010",
        type: "customer",
        content: "Hola, necesito ayuda configurando mi cuenta.",
        timestamp: new Date(Date.now() - 19 * 60 * 1000),
        sentiment: "neutral",
      },
      {
        id: "msg-011",
        type: "ai",
        content:
          "¡Hola Sofia! Con mucho gusto te ayudo con la configuración de tu cuenta. ¿Ya verificaste tu correo electrónico?",
        timestamp: new Date(Date.now() - 18 * 60 * 1000),
        confidence: 0.91,
      },
      {
        id: "msg-012",
        type: "customer",
        content: "¡Gracias! I'll wait for the verification email.",
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        sentiment: "positive",
      },
    ],
  },
  {
    id: "conv-004",
    customer: {
      id: "cust-004",
      name: "James Chen",
      email: "j.chen@finance.com",
      phone: "+1 (555) 456-7890",
      avatar: "/professional-asian-man-james.jpg",
      language: "English",
      preferredLanguage: "en",
      tier: "enterprise",
    },
    channel: "email",
    status: "active",
    priority: "urgent",
    sentiment: "negative",
    sentimentScore: 0.18,
    sla: {
      deadline: new Date(Date.now() - 10 * 60 * 1000),
      remaining: -10,
      status: "breached",
    },
    assignedTo: "agent-002",
    queue: "Billing",
    topic: "Billing Dispute",
    lastMessage: "I've been charged twice for the same invoice. This needs to be resolved immediately.",
    lastMessageTime: new Date(Date.now() - 35 * 60 * 1000),
    startTime: new Date(Date.now() - 90 * 60 * 1000),
    aiConfidence: 0.65,
    escalationRisk: true,
    tags: ["billing", "dispute", "enterprise"],
    messages: [
      {
        id: "msg-013",
        type: "system",
        content: "Email received from j.chen@finance.com",
        timestamp: new Date(Date.now() - 90 * 60 * 1000),
      },
      {
        id: "msg-014",
        type: "customer",
        content: "I've been charged twice for the same invoice. This needs to be resolved immediately.",
        timestamp: new Date(Date.now() - 35 * 60 * 1000),
        sentiment: "negative",
      },
    ],
  },
  {
    id: "conv-005",
    customer: {
      id: "cust-005",
      name: "Rachel Thompson",
      email: "rachel.t@agency.co",
      phone: "+1 (555) 567-8901",
      avatar: "/professional-woman-rachel.jpg",
      language: "English",
      preferredLanguage: "en",
      tier: "premium",
    },
    channel: "chat",
    status: "active",
    priority: "medium",
    sentiment: "positive",
    sentimentScore: 0.78,
    sla: {
      deadline: new Date(Date.now() + 30 * 60 * 1000),
      remaining: 30,
      status: "healthy",
    },
    assignedTo: "agent-001",
    queue: "Technical Support",
    topic: "API Integration",
    lastMessage: "The webhook is working now, thank you so much!",
    lastMessageTime: new Date(Date.now() - 3 * 60 * 1000),
    startTime: new Date(Date.now() - 25 * 60 * 1000),
    aiConfidence: 0.91,
    escalationRisk: false,
    tags: ["api", "integration", "resolved"],
    messages: [
      {
        id: "msg-015",
        type: "system",
        content: "Chat started via mobile app",
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
      },
      {
        id: "msg-016",
        type: "customer",
        content: "Hi, I'm having trouble setting up webhooks for our integration.",
        timestamp: new Date(Date.now() - 24 * 60 * 1000),
        sentiment: "neutral",
      },
      {
        id: "msg-017",
        type: "ai",
        content:
          "Hello Rachel! I'd be happy to help with webhook setup. Can you tell me which endpoint you're trying to configure?",
        timestamp: new Date(Date.now() - 23 * 60 * 1000),
        confidence: 0.93,
      },
      {
        id: "msg-018",
        type: "customer",
        content: "The webhook is working now, thank you so much!",
        timestamp: new Date(Date.now() - 3 * 60 * 1000),
        sentiment: "positive",
      },
    ],
  },
]

export const sampleAgents: Agent[] = [
  {
    id: "agent-001",
    name: "Sarah Chen",
    email: "sarah.chen@majlisconnect.com",
    avatar: "/professional-woman-sarah-agent.jpg",
    status: "online",
    role: "agent",
    activeConversations: 4,
    avgHandleTime: 8.5,
    csat: 4.8,
  },
  {
    id: "agent-002",
    name: "David Park",
    email: "david.park@majlisconnect.com",
    avatar: "/professional-man-david-agent.jpg",
    status: "busy",
    role: "agent",
    activeConversations: 3,
    avgHandleTime: 7.2,
    csat: 4.6,
  },
  {
    id: "agent-003",
    name: "Maria Garcia",
    email: "maria.garcia@majlisconnect.com",
    avatar: "/professional-woman-maria-agent.jpg",
    status: "online",
    role: "agent",
    activeConversations: 2,
    avgHandleTime: 9.1,
    csat: 4.9,
  },
  {
    id: "agent-004",
    name: "Alex Thompson",
    email: "alex.thompson@majlisconnect.com",
    avatar: "/professional-person-alex-agent.jpg",
    status: "away",
    role: "agent",
    activeConversations: 0,
    avgHandleTime: 8.8,
    csat: 4.7,
  },
]

export const knowledgeBaseSuggestions = [
  {
    id: "kb-001",
    title: "Service Level Agreement Details",
    excerpt: "Enterprise customers receive 99.9% uptime guarantee with 4-hour response time...",
    relevance: 0.95,
  },
  {
    id: "kb-002",
    title: "Incident Response Procedure",
    excerpt: "During service outages, follow these steps: 1. Acknowledge the customer...",
    relevance: 0.89,
  },
  {
    id: "kb-003",
    title: "Escalation Matrix",
    excerpt: "For enterprise billing disputes over $10,000, escalate to Finance Manager...",
    relevance: 0.82,
  },
]

// Export industry-specific demo data
export {
  healthcareConversations,
  ecommerceConversations,
  bankingConversations,
  saasConversations,
  allIndustryConversations,
  industryAgents,
} from './industry-demo-data'

// Industry types
export type Industry = 'healthcare' | 'ecommerce' | 'banking' | 'saas'

// Get conversations by industry
export function getConversationsByIndustry(industry: Industry): Conversation[] {
  const {
    healthcareConversations,
    ecommerceConversations,
    bankingConversations,
    saasConversations,
  } = require('./industry-demo-data')

  switch (industry) {
    case 'healthcare':
      return healthcareConversations
    case 'ecommerce':
      return ecommerceConversations
    case 'banking':
      return bankingConversations
    case 'saas':
      return saasConversations
    default:
      return healthcareConversations
  }
}
