import { NextRequest, NextResponse } from "next/server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"
import { runAutomationDispatcher } from "@/lib/automation/dispatcher"

/**
 * POST /api/automation/dispatch
 * Body: { limit?: number }
 *
 * Turns Outbox events into Admin inbox items (Step 11).
 */
export async function POST(request: NextRequest) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  const now = new Date()
  try {
    const body = await request.json().catch(() => ({}))
    const limit = typeof body?.limit === "number" ? body.limit : 50
    const result = await runAutomationDispatcher({ limit, now })
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "Failed to run automation dispatcher", message: e?.message },
      { status: 500 },
    )
  }
}


