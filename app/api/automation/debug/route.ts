import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"

/**
 * GET /api/automation/debug
 * Diagnostic endpoint to check automation system status
 */
export async function GET(request: NextRequest) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  try {
    // Check events count
    const { count: eventsCount, error: eventsError } = await supabaseServer
      .from("cc_automation_events")
      .select("*", { count: "exact", head: true })

    // Check inbox items count
    const { count: inboxCount, error: inboxError } = await supabaseServer
      .from("cc_admin_inbox_items")
      .select("*", { count: "exact", head: true })

    // Get recent events
    const { data: recentEvents, error: recentError } = await supabaseServer
      .from("cc_automation_events")
      .select("id, event_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)

    // Get recent inbox items
    const { data: recentInbox, error: recentInboxError } = await supabaseServer
      .from("cc_admin_inbox_items")
      .select("id, type, status, dedupe_key, created_at")
      .order("created_at", { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      counts: {
        events: eventsCount ?? 0,
        inbox: inboxCount ?? 0,
      },
      errors: {
        events: eventsError?.message,
        inbox: inboxError?.message,
        recentEvents: recentError?.message,
        recentInbox: recentInboxError?.message,
      },
      recent: {
        events: recentEvents ?? [],
        inbox: recentInbox ?? [],
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        error: e?.message || "Debug check failed",
      },
      { status: 500 }
    )
  }
}

