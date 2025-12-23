import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))
  const versionId = typeof body?.versionId === "string" ? body.versionId : null

  if (!versionId) {
    return NextResponse.json({ success: false, error: "versionId is required" }, { status: 400 })
  }

  // Mark version published
  const { data: updatedVersion, error: verErr } = await supabaseServer
    .from("cc_agent_flow_versions")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", versionId)
    .eq("flow_id", id)
    .select("id,flow_id,version,label,status,created_at,published_at")
    .single()

  if (verErr) {
    const msg = verErr.message || "Failed to publish version"
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

  // Point flow to active version
  const { data: updatedFlow, error: flowErr } = await supabaseServer
    .from("cc_agent_flows")
    .update({ status: "published", active_version_id: versionId })
    .eq("id", id)
    .select("id,name,description,status,active_version_id,created_at,updated_at")
    .single()

  if (flowErr) {
    const msg = flowErr.message || "Failed to update flow active version"
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

  return NextResponse.json({ success: true, flow: updatedFlow, version: updatedVersion })
}

