/**
 * Step 11: Automation checkers
 * 
 * Periodic checks that emit automation events for operational issues.
 * These should be called from cron/scheduled tasks.
 */

import { supabaseServer } from "@/lib/supabase-server"
import { emitAutomationEvent } from "@/lib/automation/outbox"
import { AutomationEventTypes } from "@/lib/automation/types"

/**
 * Check for outbound jobs stuck in awaiting_verification for too long
 * 
 * @param stuckMinutesThreshold - Alert if stuck longer than this (default: 30 minutes)
 */
export async function checkOtpVerificationStuck(params?: {
  stuckMinutesThreshold?: number
  now?: Date
}): Promise<{
  checked: number
  found: number
  eventsEmitted: number
}> {
  const now = params?.now ?? new Date()
  const thresholdMinutes = params?.stuckMinutesThreshold ?? 30
  const thresholdMs = thresholdMinutes * 60 * 1000
  const thresholdTime = new Date(now.getTime() - thresholdMs)

  // Find jobs stuck in awaiting_verification for > threshold
  const { data: stuckJobs, error } = await supabaseServer
    .from("cc_outbound_jobs")
    .select("id,channel,target_address,updated_at,created_at")
    .eq("status", "awaiting_verification")
    .lt("updated_at", thresholdTime.toISOString())
    .order("updated_at", { ascending: true })

  if (error) {
    console.error("[checkOtpVerificationStuck] Failed to query:", error)
    return { checked: 0, found: 0, eventsEmitted: 0 }
  }

  let eventsEmitted = 0

  for (const job of stuckJobs || []) {
    const stuckMs = now.getTime() - new Date(job.updated_at).getTime()
    const stuckMinutes = Math.floor(stuckMs / (60 * 1000))

    // Redact target address for safety
    const targetHint = job.target_address
      ? job.target_address.replace(/(.{3}).*(.{4})/, "$1***$2")
      : "unknown"

    const result = await emitAutomationEvent({
      eventType: AutomationEventTypes.OtpVerificationStuck,
      dedupeKey: `otp_stuck:${job.id}`,
      payload: {
        outbound_job_id: job.id,
        channel: job.channel,
        target_hint: targetHint,
        stuck_minutes: stuckMinutes,
        updated_at: job.updated_at,
        at: now.toISOString(),
      },
    })

    if (result.ok) {
      eventsEmitted += 1
    }
  }

  return {
    checked: (stuckJobs || []).length,
    found: (stuckJobs || []).length,
    eventsEmitted,
  }
}

/**
 * Generate and emit daily operational summary event
 * 
 * This should be called once per day (e.g., at 9 AM) to generate the summary.
 */
export async function generateDailyOperationalSummary(params?: {
  date?: string // YYYY-MM-DD format, defaults to today
  now?: Date
}): Promise<{
  success: boolean
  eventEmitted: boolean
  summary?: any
}> {
  const now = params?.now ?? new Date()
  const date = params?.date ?? now.toISOString().split("T")[0] // YYYY-MM-DD

  // Generate summary counts
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0))
  const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999))

  try {
    // Count fraud cases created yesterday
    const { count: fraudCasesCount } = await supabaseServer
      .from("cc_cases")
      .select("*", { count: "exact", head: true })
      .eq("type", "fraud")
      .gte("created_at", yesterdayStart.toISOString())
      .lte("created_at", yesterdayEnd.toISOString())

    // Count outbound jobs by status
    const { count: outboundQueued } = await supabaseServer
      .from("cc_outbound_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued")
      .gte("created_at", yesterdayStart.toISOString())

    const { count: outboundFailed } = await supabaseServer
      .from("cc_outbound_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", yesterdayStart.toISOString())

    // Count inbox items by status
    const { count: inboxOpen } = await supabaseServer
      .from("cc_admin_inbox_items")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")

    const summary = {
      date,
      fraud_cases_created: fraudCasesCount || 0,
      outbound_queued: outboundQueued || 0,
      outbound_failed: outboundFailed || 0,
      inbox_open_items: inboxOpen || 0,
      generated_at: now.toISOString(),
    }

    const result = await emitAutomationEvent({
      eventType: AutomationEventTypes.DailyOperationalSummaryReady,
      dedupeKey: `daily_summary:${date}`,
      payload: {
        date,
        summary,
        report_id: `daily-${date}`,
        at: now.toISOString(),
      },
    })

    return {
      success: true,
      eventEmitted: result.ok,
      summary,
    }
  } catch (e: any) {
    console.error("[generateDailyOperationalSummary] Failed:", e)
    return {
      success: false,
      eventEmitted: false,
    }
  }
}

