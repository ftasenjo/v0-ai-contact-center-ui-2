import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  const { data, error } = await supabaseServer
    .from("cc_agent_flows")
    .select("id,name,description,status,active_version_id,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(200)

  if (error) {
    const msg = error.message || "Failed to load agent flows"
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

  return NextResponse.json({ success: true, flows: data || [] })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : null
  const description = typeof body?.description === "string" ? body.description : null

  if (!name) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from("cc_agent_flows")
    .insert({ name, description, status: "draft" })
    .select("id,name,description,status,active_version_id,created_at,updated_at")
    .single()

  if (error) {
    const msg = error.message || "Failed to create agent flow"
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

