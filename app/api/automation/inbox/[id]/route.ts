import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"

/**
 * POST /api/automation/inbox/:id
 * Body: { action: 'acknowledge'|'resolve'|'dismiss' }
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  const { id } = await context.params
  const now = new Date()
  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || "")

  const status =
    action === "acknowledge"
      ? "acknowledged"
      : action === "resolve"
        ? "resolved"
        : action === "dismiss"
          ? "dismissed"
          : null

  if (!status) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from("cc_admin_inbox_items")
    .update({ status, updated_at: now.toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, item: data })
}


