export type AgentFlowNodeType = "start" | "fetch" | "kb_search" | "send" | "llm" | "condition" | "end"

export type AgentFlowEdgeType = "default"

export interface AgentFlowNodeBase<T extends AgentFlowNodeType, D> {
  id: string
  type: T
  position: { x: number; y: number }
  data: D
}

export type AgentFlowNode =
  | AgentFlowNodeBase<
      "start",
      {
        label: string
      }
    >
  | AgentFlowNodeBase<
      "fetch",
      {
        label: string
        /**
         * References cc_integrations.id (remember: no secrets inside the flow graph).
         */
        integrationId: string
        method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
        path: string
        /**
         * JSON object as string (allows placeholders).
         * Example: {"email":"{{customer.email}}"}
         */
        queryJson?: string
        /**
         * JSON object as string (allows placeholders).
         * Example: {"Content-Type":"application/json"}
         */
        headersJson?: string
        /**
         * JSON body as string (allows placeholders).
         */
        bodyJson?: string
        /**
         * Variable key to store response under: vars[storeAs]
         */
        storeAs: string
        /**
         * If true, store bodyText when JSON parse fails.
         */
        preferJson?: boolean
      }
    >
  | AgentFlowNodeBase<
      "kb_search",
      {
        label: string
        /**
         * Search query template. If empty, returns top published articles (optionally filtered by category).
         */
        queryTemplate: string
        category?: string
        limit?: number
        includeContent?: boolean
        /**
         * Variable key to store results under: vars[storeAs]
         */
        storeAs: string
      }
    >
  | AgentFlowNodeBase<
      "send",
      {
        label: string
        channel: "whatsapp" | "email" | "sms" | "voice"
        /**
         * Destination address template. Examples:
         * - whatsapp: {{customer.phone}}
         * - email: {{customer.email}}
         */
        toTemplate: string
        subjectTemplate?: string
        bodyTemplate: string
        htmlTemplate?: string
        /**
         * Outbound purpose affects compliance gating. Defaults to service_notice.
         */
        purpose?: "fraud_alert" | "kyc_update" | "collections" | "case_followup" | "service_notice"
        sensitive?: boolean
        /**
         * If true, attempts to execute immediately (runs outbound runner once).
         * Otherwise only queues a cc_outbound_jobs row.
         */
        executeNow?: boolean
        storeAs: string
      }
    >
  | AgentFlowNodeBase<
      "llm",
      {
        label: string
        model?: string
        temperature?: number
        /**
         * A simple string template. Supported placeholders:
         * - {{message}}
         * - {{customer.name}}, {{customer.email}}, {{customer.phone}}, {{customer.tier}}
         * - {{vars.<key>}} (e.g. {{vars.kb}})
         */
        promptTemplate: string
      }
    >
  | AgentFlowNodeBase<
      "condition",
      {
        label: string
        /**
         * A v2-safe condition set: match against the input message or last LLM output.
         */
        when: "message" | "last_output"
        op: "contains" | "regex"
        value: string
      }
    >
  | AgentFlowNodeBase<
      "end",
      {
        label: string
      }
    >

export interface AgentFlowEdge {
  id: string
  type?: AgentFlowEdgeType
  source: string
  target: string
  /**
   * Optional routing labels:
   * - for condition nodes: "true" / "false"
   * - otherwise unused
   */
  label?: string
}

export interface AgentFlowGraph {
  schemaVersion: 1
  nodes: AgentFlowNode[]
  edges: AgentFlowEdge[]
  viewport?: { x: number; y: number; zoom: number }
}

export interface AgentFlowContext {
  message: string
  customer?: {
    id?: string
    name?: string
    email?: string
    phone?: string
    tier?: string
  }
  vars?: Record<string, any>
}

export interface AgentFlowStepLog {
  step: number
  nodeId: string
  nodeType: AgentFlowNodeType
  at: string
  input?: any
  output?: any
}

export interface AgentFlowRunResult {
  outputText: string
  logs: AgentFlowStepLog[]
  success: boolean
  error?: string
  durationMs: number
}

