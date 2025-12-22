import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"

/**
 * GET /api/automation/inbox
 * Query: status?, severity?, type?, limit?
 */
export async function GET(request: NextRequest) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const severity = searchParams.get("severity")
  const type = searchParams.get("type")
  const limitRaw = searchParams.get("limit")
  const limit = Math.max(1, Math.min(200, Number(limitRaw || "50") || 50))

  let q = supabaseServer.from("cc_admin_inbox_items").select("*").order("created_at", { ascending: false }).limit(limit)

  if (status) q = q.eq("status", status)
  if (severity) q = q.eq("severity", severity)
  if (type) q = q.eq("type", type)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ items: data || [] })
}


