import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"

/**
 * GET /api/automation/events
 * Query: status?, event_type?, limit?
 */
export async function GET(request: NextRequest) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const eventType = searchParams.get("event_type")
  const limitRaw = searchParams.get("limit")
  const limit = Math.max(1, Math.min(200, Number(limitRaw || "50") || 50))

  let q = supabaseServer.from("cc_automation_events").select("*").order("created_at", { ascending: false }).limit(limit)
  if (status && status !== "all") q = q.eq("status", status)
  if (eventType) q = q.eq("event_type", eventType)

  const { data, error } = await q
  
  if (error) {
    console.error("[automation/events] Database error:", error)
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }

  console.log(`[automation/events] Returning ${data?.length || 0} events (status=${status || "all"}, limit=${limit})`)
  return NextResponse.json({ items: data || [] })
}


