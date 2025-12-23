import { NextRequest, NextResponse } from "next/server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"
import { generateDailyOperationalSummary } from "@/lib/automation/checkers"

/**
 * POST /api/automation/checkers/daily-summary
 * Body: { date?: string } // YYYY-MM-DD format, defaults to today
 * 
 * Generates daily operational summary and emits event.
 * Intended for cron invocation (e.g., daily at 9 AM).
 */
export async function POST(request: NextRequest) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  try {
    const body = await request.json().catch(() => ({}))
    const date = typeof body?.date === "string" ? body.date : undefined

    const result = await generateDailyOperationalSummary({ date })

    return NextResponse.json({ ...result, success: true })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "Failed to generate daily summary", message: e?.message },
      { status: 500 },
    )
  }
}

