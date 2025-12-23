import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import type { AgentFlowGraph } from "@/lib/agent-builder/types"

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { data, error } = await supabaseServer
    .from("cc_agent_flow_versions")
    .select("id,flow_id,version,label,status,graph_json,created_at,published_at")
    .eq("flow_id", id)
    .order("version", { ascending: false })
    .limit(50)

  if (error) {
    const msg = error.message || "Failed to load versions"
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
  return NextResponse.json({ success: true, versions: data || [] })
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))

  const graph = body?.graph as AgentFlowGraph | undefined
  if (!graph || typeof graph !== "object" || graph.schemaVersion !== 1) {
    return NextResponse.json({ success: false, error: "graph (schemaVersion=1) is required" }, { status: 400 })
  }

  const label = typeof body?.label === "string" ? body.label : null

  // Next version number = max(version)+1
  const { data: maxRow, error: maxErr } = await supabaseServer
    .from("cc_agent_flow_versions")
    .select("version")
    .eq("flow_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxErr) return NextResponse.json({ success: false, error: maxErr.message }, { status: 500 })
  const nextVersion = (maxRow?.version || 0) + 1

  const { data, error } = await supabaseServer
    .from("cc_agent_flow_versions")
    .insert({
      flow_id: id,
      version: nextVersion,
      label,
      status: "draft",
      graph_json: graph,
    })
    .select("id,flow_id,version,label,status,created_at,published_at")
    .single()

  if (error) {
    const msg = error.message || "Failed to create version"
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

  return NextResponse.json({ success: true, version: data })
}

