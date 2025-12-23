import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import type { AgentFlowContext, AgentFlowGraph } from "@/lib/agent-builder/types"
import { runAgentFlow } from "@/lib/agent-builder/executor"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now()
  const { id } = await ctx.params

  const body = await request.json().catch(() => ({}))
  const versionId = typeof body?.versionId === "string" ? body.versionId : null
  const context = body?.context as AgentFlowContext | undefined

  if (!context || typeof context?.message !== "string") {
    return NextResponse.json({ success: false, error: "context.message is required" }, { status: 400 })
  }

  // Load graph: explicit versionId > active version > latest version
  let graphRow: any = null

  if (versionId) {
    const { data, error } = await supabaseServer
      .from("cc_agent_flow_versions")
      .select("id,flow_id,graph_json")
      .eq("id", versionId)
      .eq("flow_id", id)
      .single()

    if (error) {
      const msg = error.message || "Failed to load version graph"
      if (msg.includes("Could not find the table") || msg.includes("schema cache")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Missing DB tables for Agent Builder. Please run `supabase/migrations/013_agent_builder.sql` in Supabase SQL Editor and restart the server.",
          },
          { status: 503 },
        )
      }
      return NextResponse.json({ success: false, error: msg }, { status: 500 })
    }
    graphRow = data
  } else {
    const { data: flow, error: flowErr } = await supabaseServer
      .from("cc_agent_flows")
      .select("id,active_version_id")
      .eq("id", id)
      .single()

    if (flowErr) {
      const msg = flowErr.message || "Failed to load flow"
      if (msg.includes("Could not find the table") || msg.includes("schema cache")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Missing DB tables for Agent Builder. Please run `supabase/migrations/013_agent_builder.sql` in Supabase SQL Editor and restart the server.",
          },
          { status: 503 },
        )
      }
      return NextResponse.json({ success: false, error: msg }, { status: 500 })
    }

    if (flow?.active_version_id) {
      const { data, error } = await supabaseServer
        .from("cc_agent_flow_versions")
        .select("id,flow_id,graph_json")
        .eq("id", flow.active_version_id)
        .eq("flow_id", id)
        .single()

      if (error) {
        const msg = error.message || "Failed to load active version"
        if (msg.includes("Could not find the table") || msg.includes("schema cache")) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Missing DB tables for Agent Builder. Please run `supabase/migrations/013_agent_builder.sql` in Supabase SQL Editor and restart the server.",
            },
            { status: 503 },
          )
        }
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
      }
      graphRow = data
    } else {
      const { data, error } = await supabaseServer
        .from("cc_agent_flow_versions")
        .select("id,flow_id,graph_json")
        .eq("flow_id", id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        const msg = error.message || "Failed to load latest version"
        if (msg.includes("Could not find the table") || msg.includes("schema cache")) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Missing DB tables for Agent Builder. Please run `supabase/migrations/013_agent_builder.sql` in Supabase SQL Editor and restart the server.",
            },
            { status: 503 },
          )
        }
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
      }
      graphRow = data
    }
  }

  const graph = graphRow?.graph_json as AgentFlowGraph | undefined
  if (!graph || graph.schemaVersion !== 1) {
    return NextResponse.json(
      { success: false, error: "No valid graph found for this flow (create a version first)" },
      { status: 400 },
    )
  }

  const result = await runAgentFlow({ graph, context, maxSteps: 25 })

  // Best-effort persist run (non-fatal)
  try {
    await supabaseServer.from("cc_agent_flow_runs").insert({
      flow_id: id,
      flow_version_id: graphRow?.id ?? null,
      mode: "simulate",
      input_json: { context },
      output_json: { outputText: result.outputText },
      logs_json: result.logs,
      success: result.success,
      error_text: result.success ? null : result.error || "unknown_error",
      duration_ms: Math.max(0, Date.now() - startedAt),
    })
  } catch {
    // ignore
  }

  return NextResponse.json({
    success: result.success,
    error: result.success ? null : result.error || "Flow execution failed",
    result,
  })
}

