import { NextRequest, NextResponse } from "next/server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"
import { checkOtpVerificationStuck } from "@/lib/automation/checkers"

/**
 * POST /api/automation/checkers/otp-stuck
 * Body: { stuckMinutesThreshold?: number }
 * 
 * Checks for outbound jobs stuck in awaiting_verification and emits events.
 * Intended for cron invocation (e.g., every 15 minutes).
 */
export async function POST(request: NextRequest) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  try {
    const body = await request.json().catch(() => ({}))
    const threshold = typeof body?.stuckMinutesThreshold === "number" ? body.stuckMinutesThreshold : 30

    const result = await checkOtpVerificationStuck({
      stuckMinutesThreshold: threshold,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "Failed to check OTP stuck", message: e?.message },
      { status: 500 },
    )
  }
}

