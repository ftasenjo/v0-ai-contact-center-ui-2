import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"

/**
 * POST /api/automation/events/:id/retry
 * Forces an event back to pending and eligible now.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  const { id } = await context.params
  const now = new Date()

  const { data, error } = await supabaseServer
    .from("cc_automation_events")
    .update({
      status: "pending",
      next_attempt_at: now.toISOString(),
      last_error: null,
      updated_at: now.toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, event: data })
}


