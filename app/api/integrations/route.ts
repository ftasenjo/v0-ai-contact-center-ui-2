import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  const { data, error } = await supabaseServer
    .from("cc_integrations")
    .select("id,name,provider,base_url,status,auth_type")
    .order("name", { ascending: true })
    .limit(200)

  if (error) {
    const msg = error.message || "Failed to load integrations"
    if (msg.includes("Could not find the table") || msg.includes("schema cache")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing DB tables for Integrations. Please run `supabase/migrations/014_integrations.sql` in Supabase SQL Editor and restart the server.",
          integrations: [],
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ success: false, error: msg, integrations: [] }, { status: 500 })
  }

  return NextResponse.json({ success: true, integrations: data || [] })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const provider = typeof body?.provider === "string" ? body.provider.trim() : ""
  const base_url = typeof body?.base_url === "string" ? body.base_url.trim() : ""
  const auth_type = typeof body?.auth_type === "string" ? body.auth_type : "bearer_env"
  const auth_env_key = typeof body?.auth_env_key === "string" ? body.auth_env_key.trim() : null
  const auth_config = typeof body?.auth_config === "object" && body.auth_config ? body.auth_config : {}

  if (!name || !provider || !base_url) {
    return NextResponse.json(
      { success: false, error: "name, provider, base_url are required" },
      { status: 400 },
    )
  }

  const { data, error } = await supabaseServer
    .from("cc_integrations")
    .insert({
      name,
      provider,
      base_url,
      status: "active",
      auth_type,
      auth_env_key,
      auth_config,
    })
    .select("id,name,provider,base_url,status,auth_type")
    .single()

  if (error) {
    const msg = error.message || "Failed to create integration"
    if (msg.includes("Could not find the table") || msg.includes("schema cache")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing DB tables for Integrations. Please run `supabase/migrations/014_integrations.sql` in Supabase SQL Editor and restart the server.",
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }

  return NextResponse.json({ success: true, integration: data })
}

