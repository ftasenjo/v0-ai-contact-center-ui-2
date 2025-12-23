import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const { data: flow, error: flowError } = await supabaseServer
    .from("cc_agent_flows")
    .select("id,name,description,status,active_version_id,created_at,updated_at")
    .eq("id", id)
    .single()

  if (flowError) {
    const msg = flowError.message || "Failed to load agent flow"
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

  const { data: versions } = await supabaseServer
    .from("cc_agent_flow_versions")
    .select("id,flow_id,version,label,status,created_at,published_at")
    .eq("flow_id", id)
    .order("version", { ascending: false })
    .limit(50)

  return NextResponse.json({ success: true, flow, versions: versions || [] })
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))

  const update: any = {}
  if (typeof body?.name === "string") update.name = body.name.trim()
  if (typeof body?.description === "string") update.description = body.description
  if (typeof body?.status === "string") update.status = body.status

  const { data, error } = await supabaseServer
    .from("cc_agent_flows")
    .update(update)
    .eq("id", id)
    .select("id,name,description,status,active_version_id,created_at,updated_at")
    .single()

  if (error) {
    const msg = error.message || "Failed to update agent flow"
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

  return NextResponse.json({ success: true, flow: data })
}

