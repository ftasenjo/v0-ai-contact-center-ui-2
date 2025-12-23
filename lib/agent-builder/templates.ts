import type { AgentFlowGraph } from "./types"

export type AgentFlowTemplate = {
  key: string
  name: string
  description: string
  graph: AgentFlowGraph
}

function baseGraph(params: { name: string; prompt: string }): AgentFlowGraph {
  return {
    schemaVersion: 1,
    nodes: [
      { id: "start-1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
      {
        id: "llm-1",
        type: "llm",
        position: { x: 260, y: 0 },
        data: {
          label: params.name,
          promptTemplate: params.prompt,
          model: "gpt-4o-mini",
          temperature: 0.4,
        },
      },
      { id: "end-1", type: "end", position: { x: 540, y: 0 }, data: { label: "End" } },
    ],
    edges: [
      { id: "e-start-llm", source: "start-1", target: "llm-1" },
      { id: "e-llm-end", source: "llm-1", target: "end-1" },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

export const AGENT_FLOW_TEMPLATES: AgentFlowTemplate[] = [
  {
    key: "banking_support_general",
    name: "Banking Support (General)",
    description: "General-purpose banking support agent (policies, next steps, escalation).",
    graph: baseGraph({
      name: "Banking Support",
      prompt:
        "You are a banking support agent.\n\nCustomer message: {{message}}\nCustomer: {{customer.name}} (tier: {{customer.tier}})\n\nProvide a clear, safe, compliant response. If you need verification, ask for it. If fraud/lost card is suspected, provide immediate steps and advise contacting the bank.\n\nReply:",
    }),
  },
  {
    key: "lost_card_fraud",
    name: "Lost Card / Fraud Triage",
    description: "Guides the customer through urgent fraud / lost card steps.",
    graph: baseGraph({
      name: "Lost Card / Fraud",
      prompt:
        "You are a banking fraud & lost card triage assistant.\n\nCustomer message: {{message}}\n\nDo:\n- Ask only for minimal info (no full PAN).\n- Provide urgent steps: freeze card, dispute transactions, change passwords, check recent activity.\n- Offer escalation to a human agent.\n\nReply:",
    }),
  },
  {
    key: "loan_prequalification",
    name: "Loan Pre-Qualification",
    description: "Collects basics and explains next steps; avoids making binding commitments.",
    graph: baseGraph({
      name: "Loan Pre-Qual",
      prompt:
        "You are a loan pre-qualification assistant.\n\nCustomer message: {{message}}\n\nAsk for: loan purpose, amount range, income range, employment status, credit score band (if they know), and residency.\nDo NOT promise approval. Provide next steps and required documents.\n\nReply:",
    }),
  },
  {
    key: "collections_soft",
    name: "Collections (Soft)",
    description: "Empathetic payment support: reminders, plan options, due date questions.",
    graph: baseGraph({
      name: "Collections Support",
      prompt:
        "You are a polite, empathetic payment support agent.\n\nCustomer message: {{message}}\n\nHelp with due dates, payment methods, hardship options, and setting up a payment plan. Avoid threats. Offer escalation.\n\nReply:",
    }),
  },
  {
    key: "branch_appointment",
    name: "Branch Appointment Scheduling",
    description: "Collects intent, preferred time, branch, and contact method.",
    graph: baseGraph({
      name: "Appointment Scheduling",
      prompt:
        "You are an appointment scheduling assistant for a bank.\n\nCustomer message: {{message}}\n\nAsk for: service needed, preferred date/time windows, nearest branch/city, and contact preference (email/phone). Confirm the details.\n\nReply:",
    }),
  },
]

export function getTemplate(key: string): AgentFlowTemplate | null {
  return AGENT_FLOW_TEMPLATES.find((t) => t.key === key) || null
}

