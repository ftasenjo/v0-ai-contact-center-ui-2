import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

// GET: Fetch agent status and queue counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }

    // Fetch agent status
    const { data: agent, error: agentError } = await supabaseServer
      .from("agents")
      .select("id, name, email, status, role, active_conversations")
      .eq("id", agentId)
      .single()

    if (agentError) {
      console.error("[agents/status] Failed to fetch agent:", agentError)
      return NextResponse.json({ error: agentError.message }, { status: 500 })
    }

    // Fetch queue counts
    const { count: callsInQueue } = await supabaseServer
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("channel", "voice")
      .in("status", ["waiting", "active"])

    const { count: chatsInQueue } = await supabaseServer
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .in("channel", ["chat", "whatsapp", "email"])
      .in("status", ["waiting", "active"])

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        status: agent.status,
        role: agent.role,
        activeConversations: agent.active_conversations || 0,
      },
      queues: {
        calls: callsInQueue || 0,
        chats: chatsInQueue || 0,
      },
    })
  } catch (error: any) {
    console.error("[agents/status] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// PATCH: Update agent status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, status, autoAccept } = body

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }

    if (status && !["online", "away", "busy", "offline"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const updateData: any = {}
    if (status) {
      // Map agent desktop status to database status
      const statusMap: Record<string, string> = {
        ready: "online",
        busy: "busy",
        break: "away",
        offline: "offline",
      }
      updateData.status = statusMap[status] || status
    }

    const { data, error } = await supabaseServer
      .from("agents")
      .update(updateData)
      .eq("id", agentId)
      .select()
      .single()

    if (error) {
      console.error("[agents/status] Failed to update agent status:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, agent: data })
  } catch (error: any) {
    console.error("[agents/status] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

