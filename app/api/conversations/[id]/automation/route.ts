import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"

/**
 * GET /api/conversations/[id]/automation
 * Fetch automation events and inbox items related to a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const conversationId = resolvedParams?.id

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    // Fetch inbox items linked to this conversation
    // link_ref is JSONB: { kind: "conversation", id: "..." }
    const { data: inboxItems, error: inboxError } = await supabaseServer
      .from("cc_admin_inbox_items")
      .select("*")
      .eq("link_ref->>kind", "conversation")
      .eq("link_ref->>id", conversationId)
      .order("created_at", { ascending: false })

    if (inboxError) {
      console.error("[conversations/[id]/automation] Failed to fetch inbox items:", inboxError)
      return NextResponse.json({ error: inboxError.message }, { status: 500 })
    }

    // Fetch automation events that reference this conversation
    // Check payload_json for conversation_id
    const { data: events, error: eventsError } = await supabaseServer
      .from("cc_automation_events")
      .select("*")
      .eq("payload_json->>conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (eventsError) {
      console.error("[conversations/[id]/automation] Failed to fetch events:", eventsError)
      // Non-fatal: continue without events
    }

    return NextResponse.json({
      inboxItems: inboxItems || [],
      events: events || [],
    })
  } catch (e: any) {
    console.error("[conversations/[id]/automation] Error:", e)
    return NextResponse.json({ error: e?.message || "Failed to fetch automation data" }, { status: 500 })
  }
}

