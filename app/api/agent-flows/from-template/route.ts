import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { getTemplate } from "@/lib/agent-builder/templates"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const templateKey = typeof body?.templateKey === "string" ? body.templateKey : ""
  const overrideName = typeof body?.name === "string" ? body.name.trim() : ""

  const template = getTemplate(templateKey)
  if (!template) {
    return NextResponse.json({ success: false, error: "Unknown templateKey" }, { status: 400 })
  }

  const name = overrideName || template.name
  const description = template.description

  // Create flow
  const { data: flow, error: flowErr } = await supabaseServer
    .from("cc_agent_flows")
    .insert({ name, description, status: "draft" })
    .select("id,name,description,status,active_version_id,created_at,updated_at")
    .single()

  if (flowErr || !flow) {
    return NextResponse.json({ success: false, error: flowErr?.message || "Failed to create flow" }, { status: 500 })
  }

  // Create first version with template graph
  const { data: ver, error: verErr } = await supabaseServer
    .from("cc_agent_flow_versions")
    .insert({
      flow_id: flow.id,
      version: 1,
      label: `Template: ${template.name}`,
      status: "draft",
      graph_json: template.graph,
    })
    .select("id,flow_id,version,label,status,created_at,published_at")
    .single()

  if (verErr || !ver) {
    return NextResponse.json(
      { success: false, error: verErr?.message || "Failed to create flow version" },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, flow, version: ver })
}

