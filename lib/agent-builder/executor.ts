import type { BaseMessage } from "@langchain/core/messages"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

import type { AgentFlowContext, AgentFlowGraph, AgentFlowNode, AgentFlowRunResult, AgentFlowStepLog } from "./types"
import { integrationFetch } from "@/lib/integrations/fetch"
import { supabaseServer } from "@/lib/supabase-server"
import { normalizeAddress } from "@/lib/identity-resolution"
import { runDueOutboundJobs } from "@/lib/outbound/outbound-runner"

function nowIso() {
  return new Date().toISOString()
}

function getByPath(root: any, path: string) {
  if (!path) return undefined
  const parts = path.split(".").filter(Boolean)
  let cur = root
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined
    cur = cur[p]
  }
  return cur
}

function renderTemplate(template: string, ctx: AgentFlowContext, lastOutput: string) {
  const safe = (v: any) => (v === null || v === undefined ? "" : String(v))
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey) => {
    const key = String(rawKey || "").trim()
    if (!key) return ""
    if (key === "message") return safe(ctx.message)
    if (key === "last_output") return safe(lastOutput)
    if (key.startsWith("customer.")) return safe(getByPath(ctx.customer || {}, key.slice("customer.".length)))
    if (key.startsWith("vars.")) return safe(getByPath(ctx.vars || {}, key.slice("vars.".length)))
    return ""
  })
}

function indexGraph(graph: AgentFlowGraph) {
  const nodesById = new Map<string, AgentFlowNode>()
  for (const n of graph.nodes) nodesById.set(n.id, n)

  const outgoing = new Map<string, { target: string; label?: string }[]>()
  for (const e of graph.edges) {
    const arr = outgoing.get(e.source) || []
    arr.push({ target: e.target, label: e.label })
    outgoing.set(e.source, arr)
  }

  return { nodesById, outgoing }
}

function findStartNode(graph: AgentFlowGraph) {
  const start = graph.nodes.find((n) => n.type === "start")
  if (!start) throw new Error("Flow graph must include a start node")
  return start
}

function pickNextNode(outgoing: { target: string; label?: string }[] | undefined, desiredLabel?: string) {
  if (!outgoing || outgoing.length === 0) return null
  if (desiredLabel) {
    const match = outgoing.find((e) => (e.label || "").toLowerCase() === desiredLabel.toLowerCase())
    if (match) return match.target
  }
  return outgoing[0].target
}

async function invokeLLM(params: {
  prompt: string
  model?: string
  temperature?: number
}): Promise<string> {
  // Lazily import to keep this module server-only and avoid bundling client-side.
  const { ChatOpenAI } = await import("@langchain/openai")

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  const llm = new ChatOpenAI({
    apiKey: openaiKey,
    modelName: params.model || process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: typeof params.temperature === "number" ? params.temperature : 0.4,
  })

  const messages: BaseMessage[] = [
    new SystemMessage(
      "You are a helpful contact center AI assistant. Follow the prompt exactly and respond succinctly.",
    ),
    new HumanMessage(params.prompt),
  ]

  const res = await llm.invoke(messages)
  const text = (res as any)?.content
  if (typeof text === "string") return text
  // LangChain can return arrays for multimodal content; fallback to JSON.
  return JSON.stringify(text ?? "")
}

export async function runAgentFlow(params: {
  graph: AgentFlowGraph
  context: AgentFlowContext
  maxSteps?: number
}): Promise<AgentFlowRunResult> {
  const startedAt = Date.now()
  const logs: AgentFlowStepLog[] = []
  const maxSteps = typeof params.maxSteps === "number" ? params.maxSteps : 25

  let lastOutput = ""
  let outputText = ""
  const vars: Record<string, any> = { ...(params.context.vars || {}) }

  try {
    const graph = params.graph
    const { nodesById, outgoing } = indexGraph(graph)
    const start = findStartNode(graph)

    let currentNodeId: string | null = start.id

    for (let step = 1; step <= maxSteps; step++) {
      if (!currentNodeId) break
      const node = nodesById.get(currentNodeId)
      if (!node) throw new Error(`Unknown node id: ${currentNodeId}`)

      if (node.type === "start") {
        logs.push({
          step,
          nodeId: node.id,
          nodeType: node.type,
          at: nowIso(),
          input: { message: params.context.message, customer: params.context.customer || null },
        })
        currentNodeId = pickNextNode(outgoing.get(node.id)) // default edge
        continue
      }

      if (node.type === "fetch") {
        const ctxWithVars: AgentFlowContext = { ...params.context, vars }
        const renderedQuery = node.data.queryJson ? renderTemplate(node.data.queryJson, ctxWithVars, lastOutput) : ""
        const renderedHeaders = node.data.headersJson
          ? renderTemplate(node.data.headersJson, ctxWithVars, lastOutput)
          : ""
        const renderedBody = node.data.bodyJson ? renderTemplate(node.data.bodyJson, ctxWithVars, lastOutput) : ""

        const parseMaybeJson = (s: string) => {
          if (!s || !s.trim()) return undefined
          try {
            return JSON.parse(s)
          } catch {
            throw new Error("Invalid JSON in fetch node configuration")
          }
        }

        const queryObj = parseMaybeJson(renderedQuery)
        const headersObj = parseMaybeJson(renderedHeaders)
        const bodyObj = parseMaybeJson(renderedBody)

        const result = await integrationFetch({
          integrationId: node.data.integrationId,
          method: node.data.method || "GET",
          path: node.data.path,
          query: queryObj,
          headers: headersObj,
          bodyJson: bodyObj,
        })

        const stored =
          node.data.preferJson !== false
            ? result.bodyJson ?? { bodyText: result.bodyText }
            : { bodyText: result.bodyText, bodyJson: result.bodyJson }

        vars[node.data.storeAs || "fetch"] = {
          status: result.status,
          ok: result.ok,
          headers: result.headers,
          data: stored,
        }

        lastOutput = result.bodyJson ? JSON.stringify(result.bodyJson) : result.bodyText

        logs.push({
          step,
          nodeId: node.id,
          nodeType: node.type,
          at: nowIso(),
          input: {
            integrationId: node.data.integrationId,
            method: node.data.method || "GET",
            path: node.data.path,
            query: queryObj || null,
          },
          output: {
            status: result.status,
            ok: result.ok,
            storedAs: node.data.storeAs,
          },
        })

        currentNodeId = pickNextNode(outgoing.get(node.id))
        continue
      }

      if (node.type === "kb_search") {
        const ctxWithVars: AgentFlowContext = { ...params.context, vars }
        const query = (renderTemplate(node.data.queryTemplate || "", ctxWithVars, lastOutput) || "").trim()
        const category = typeof node.data.category === "string" && node.data.category.trim() ? node.data.category.trim() : null
        const limit = typeof node.data.limit === "number" && node.data.limit > 0 ? Math.min(20, node.data.limit) : 5
        const includeContent = node.data.includeContent === true
        const storeAs = node.data.storeAs || "kb"

        type KBRow = {
          id: string
          title: string
          category: string
          subcategory: string | null
          summary: string | null
          content: string
          tags: string[] | null
          priority: number | null
        }

        let articles: KBRow[] = []
        if (query) {
          // Prefer RPC if available
          const { data: rpcData, error: rpcErr } = await supabaseServer.rpc("search_knowledge_base", {
            search_query: query,
          })
          if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
            const ids = rpcData.map((r: any) => r.id)
            let q1 = supabaseServer
              .from("cc_knowledge_base")
              .select("id,title,category,subcategory,summary,content,tags,priority")
              .in("id", ids)
              .eq("status", "published")

            if (category) q1 = q1.eq("category", category)
            const { data, error } = await q1.limit(limit)
            if (error) throw new Error(error.message)
            articles = (data || []) as any
          } else {
            // Fallback text search
            let q2 = supabaseServer
              .from("cc_knowledge_base")
              .select("id,title,category,subcategory,summary,content,tags,priority")
              .eq("status", "published")
              .or(`title.ilike.%${query}%,content.ilike.%${query}%,summary.ilike.%${query}%`)
            if (category) q2 = q2.eq("category", category)
            const { data, error } = await q2.order("priority", { ascending: false }).limit(limit)
            if (error) throw new Error(error.message)
            articles = (data || []) as any
          }
        } else {
          let q3 = supabaseServer
            .from("cc_knowledge_base")
            .select("id,title,category,subcategory,summary,content,tags,priority")
            .eq("status", "published")
            .order("priority", { ascending: false })
            .order("view_count", { ascending: false })
            .limit(limit)
          if (category) q3 = q3.eq("category", category)
          const { data, error } = await q3
          if (error) throw new Error(error.message)
          articles = (data || []) as any
        }

        const packed = articles.map((a) => ({
          id: a.id,
          title: a.title,
          category: a.category,
          subcategory: a.subcategory,
          summary: a.summary,
          tags: a.tags || [],
          content: includeContent ? a.content : undefined,
        }))

        vars[storeAs] = {
          query,
          category,
          count: packed.length,
          articles: packed,
        }

        lastOutput = packed.length > 0 ? JSON.stringify(packed.slice(0, 2)) : ""

        logs.push({
          step,
          nodeId: node.id,
          nodeType: node.type,
          at: nowIso(),
          input: { query, category, limit, includeContent, storeAs },
          output: { count: packed.length, titles: packed.slice(0, 3).map((x) => x.title) },
        })

        currentNodeId = pickNextNode(outgoing.get(node.id))
        continue
      }

      if (node.type === "send") {
        const ctxWithVars: AgentFlowContext = { ...params.context, vars }
        const channel = node.data.channel
        const to = (renderTemplate(node.data.toTemplate || "", ctxWithVars, lastOutput) || "").trim()
        const body = renderTemplate(node.data.bodyTemplate || "", ctxWithVars, lastOutput)
        const subject =
          channel === "email"
            ? (renderTemplate(node.data.subjectTemplate || "Notification", ctxWithVars, lastOutput) || "Notification").trim()
            : undefined
        const html =
          channel === "email" && node.data.htmlTemplate
            ? renderTemplate(node.data.htmlTemplate, ctxWithVars, lastOutput)
            : undefined

        if (!to) throw new Error("Send node missing destination (toTemplate)")

        const purpose = node.data.purpose || "service_notice"
        const now = new Date()

        // Create a lightweight campaign if none exists (per send operation)
        const { data: createdCampaign, error: campErr } = await supabaseServer
          .from("cc_outbound_campaigns")
          .insert({
            name: `Flow Send (${purpose})`,
            purpose,
            allowed_channels: [channel],
            status: "active",
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .select("id")
          .single()

        if (campErr || !createdCampaign?.id) throw new Error(campErr?.message || "Failed to create outbound campaign")

        const normalizedTarget = normalizeAddress(channel as any, to)

        const payload_json: any = {
          text: body,
          subject: subject || undefined,
          html: html || undefined,
          sensitive: node.data.sensitive === true,
          verification_state: "verified", // default for flow sends; can be tightened later
        }

        const { data: job, error: jobErr } = await supabaseServer
          .from("cc_outbound_jobs")
          .insert({
            campaign_id: createdCampaign.id,
            bank_customer_id: null,
            target_address: normalizedTarget,
            channel,
            payload_json,
            status: "queued",
            scheduled_at: now.toISOString(),
            next_attempt_at: now.toISOString(),
            attempt_count: 0,
            max_attempts: channel === "voice" ? 2 : 3,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .select("id,status,channel,target_address,next_attempt_at")
          .single()

        if (jobErr || !job) throw new Error(jobErr?.message || "Failed to create outbound job")

        const storeAs = node.data.storeAs || "send"
        vars[storeAs] = { outbound_job_id: job.id, status: job.status, channel: job.channel, to: job.target_address }

        if (node.data.executeNow) {
          await runDueOutboundJobs({ limit: 1, now })
        }

        logs.push({
          step,
          nodeId: node.id,
          nodeType: node.type,
          at: nowIso(),
          input: { channel, to: normalizedTarget, subject: subject || null, purpose, executeNow: node.data.executeNow === true },
          output: { outbound_job_id: job.id, status: job.status },
        })

        currentNodeId = pickNextNode(outgoing.get(node.id))
        continue
      }

      if (node.type === "llm") {
        const ctxWithVars: AgentFlowContext = { ...params.context, vars }
        const prompt = renderTemplate(node.data.promptTemplate, ctxWithVars, lastOutput)
        const llmText = await invokeLLM({
          prompt,
          model: node.data.model,
          temperature: node.data.temperature,
        })
        lastOutput = llmText
        outputText = llmText
        logs.push({
          step,
          nodeId: node.id,
          nodeType: node.type,
          at: nowIso(),
          input: { prompt },
          output: { textPreview: llmText.slice(0, 200), length: llmText.length },
        })
        currentNodeId = pickNextNode(outgoing.get(node.id))
        continue
      }

      if (node.type === "condition") {
        const sourceText = node.data.when === "message" ? params.context.message : lastOutput
        let passed = false
        if (node.data.op === "contains") {
          passed = sourceText.toLowerCase().includes(node.data.value.toLowerCase())
        } else {
          const re = new RegExp(node.data.value, "i")
          passed = re.test(sourceText)
        }
        logs.push({
          step,
          nodeId: node.id,
          nodeType: node.type,
          at: nowIso(),
          input: { when: node.data.when, op: node.data.op, value: node.data.value },
          output: { passed },
        })
        currentNodeId = pickNextNode(outgoing.get(node.id), passed ? "true" : "false")
        continue
      }

      if (node.type === "end") {
        logs.push({ step, nodeId: node.id, nodeType: node.type, at: nowIso() })
        break
      }
    }

    if (logs.length >= maxSteps) {
      throw new Error(`Flow exceeded maxSteps=${maxSteps} (possible cycle)`)
    }

    return {
      outputText,
      logs,
      success: true,
      durationMs: Date.now() - startedAt,
    }
  } catch (e: any) {
    return {
      outputText,
      logs,
      success: false,
      error: e?.message || "Flow execution failed",
      durationMs: Date.now() - startedAt,
    }
  }
}

