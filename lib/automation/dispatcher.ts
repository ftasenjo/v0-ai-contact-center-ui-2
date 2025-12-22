import { supabaseServer } from "@/lib/supabase-server"
import { redactSensitive } from "@/lib/audit-redaction"
import {
  AutomationEventTypes,
  type AdminInboxSeverity,
  type AutomationEventRow,
  type AutomationEventStatus,
} from "@/lib/automation/types"

const MAX_DISPATCHER_ATTEMPTS = 10 // After this, mark as dead-letter (keep visible for admin resolution)

function computeBackoffMs(attempts: number): number {
  // attempts is 0-based in the row; after failure we increment to N>=1
  if (attempts <= 1) return 10 * 1000
  if (attempts === 2) return 30 * 1000
  if (attempts === 3) return 2 * 60 * 1000
  if (attempts === 4) return 10 * 60 * 1000
  return 60 * 60 * 1000
}

function applyJitter(ms: number): number {
  const jitter = ms * 0.2
  const delta = (Math.random() * 2 - 1) * jitter
  return Math.max(5_000, Math.round(ms + delta))
}

function buildInboxItemFromEvent(event: AutomationEventRow): {
  type: string
  severity: AdminInboxSeverity
  title: string
  body: string
  link_ref: any
  dedupe_key: string
} | null {
  const payload = event.payload_json || {}

  if (event.event_type === AutomationEventTypes.FraudCaseCreated) {
    const caseId = payload.case_id || payload.caseId
    const caseNumber = payload.case_number || payload.caseNumber
    return {
      type: AutomationEventTypes.FraudCaseCreated,
      severity: "warn",
      title: "New fraud case",
      body: caseNumber ? `Fraud case ${caseNumber} created.` : "Fraud case created.",
      link_ref: caseId ? { kind: "case", id: caseId } : { kind: "case" },
      dedupe_key: event.dedupe_key,
    }
  }

  if (event.event_type === AutomationEventTypes.OutboundFailedMaxAttempts) {
    const jobId = payload.outbound_job_id || payload.job_id || payload.jobId
    const channel = payload.channel
    const toHint = payload.target_hint || payload.to_hint || payload.target_address_hint
    const lastError = payload.last_error_message || payload.last_error || payload.error
    const bodyParts = [
      channel ? `Channel: ${channel}` : null,
      toHint ? `To: ${toHint}` : null,
      lastError ? `Last error: ${lastError}` : null,
    ].filter(Boolean)

    return {
      type: AutomationEventTypes.OutboundFailedMaxAttempts,
      severity: "error",
      title: "Outbound intervention needed",
      body: bodyParts.length > 0 ? bodyParts.join(" · ") : "Outbound job reached max attempts.",
      link_ref: jobId ? { kind: "outbound_job", id: jobId } : { kind: "outbound_job" },
      dedupe_key: event.dedupe_key,
    }
  }

  if (event.event_type === AutomationEventTypes.DailyOperationalSummaryReady) {
    const reportId = payload.report_id || payload.reportId
    const date = payload.date
    return {
      type: AutomationEventTypes.DailyOperationalSummaryReady,
      severity: "info",
      title: "Daily report ready",
      body: date ? `Daily operational summary ready for ${date}.` : "Daily operational summary ready.",
      link_ref: reportId ? { kind: "daily_report", id: reportId } : { kind: "daily_report" },
      dedupe_key: event.dedupe_key,
    }
  }

  if (event.event_type === AutomationEventTypes.OtpVerificationStuck) {
    const jobId = payload.outbound_job_id || payload.job_id || payload.jobId
    const channel = payload.channel
    const stuckMinutes = payload.stuck_minutes || payload.minutes_stuck
    const toHint = payload.target_hint || payload.to_hint
    return {
      type: AutomationEventTypes.OtpVerificationStuck,
      severity: "warn",
      title: "OTP verification stuck",
      body: [
        channel ? `Channel: ${channel}` : null,
        toHint ? `To: ${toHint}` : null,
        stuckMinutes ? `Stuck for ${stuckMinutes} minutes` : "Awaiting verification for extended period",
      ].filter(Boolean).join(" · "),
      link_ref: jobId ? { kind: "outbound_job", id: jobId } : { kind: "outbound_job" },
      dedupe_key: event.dedupe_key,
    }
  }

  if (event.event_type === AutomationEventTypes.CallAnalysisReady) {
    const conversationId = payload.conversation_id
    const analysisId = payload.analysis_id
    const escalationRequired = payload.escalation_required
    const complianceVerified = payload.compliance_verified
    const qualityScore = payload.quality_score
    const customerFrustrated = payload.customer_frustrated
    const issueResolved = payload.issue_resolved
    const supervisorReviewNeeded = payload.supervisor_review_needed

    // This event type can generate multiple inbox items, but we'll handle that in a separate function
    // For now, return a summary item
    const flags = []
    if (escalationRequired) flags.push("Escalation required")
    if (complianceVerified === false) flags.push("Compliance risk")
    if (supervisorReviewNeeded) flags.push("Supervisor review")
    if (qualityScore !== null && qualityScore <= 6) flags.push("Low quality")
    if (customerFrustrated) flags.push("Customer frustrated")
    if (issueResolved === false) flags.push("Issue unresolved")

    return {
      type: AutomationEventTypes.CallAnalysisReady,
      severity: escalationRequired || complianceVerified === false ? "error" : qualityScore !== null && qualityScore <= 6 ? "warn" : "info",
      title: "Call analysis ready",
      body: flags.length > 0 ? flags.join(" · ") : "Call analysis completed.",
      link_ref: conversationId ? { kind: "conversation", id: conversationId } : { kind: "conversation" },
      dedupe_key: event.dedupe_key,
    }
  }

  return null
}

async function markEventStatus(params: {
  id: string
  status: AutomationEventStatus
  attempts?: number
  nextAttemptAt?: Date | null
  lastError?: string | null
}) {
  const now = new Date()
  await supabaseServer
    .from("cc_automation_events")
    .update({
      status: params.status,
      ...(typeof params.attempts === "number" ? { attempts: params.attempts } : {}),
      ...(params.nextAttemptAt === undefined
        ? {}
        : { next_attempt_at: params.nextAttemptAt ? params.nextAttemptAt.toISOString() : null }),
      ...(params.lastError === undefined ? {} : { last_error: params.lastError }),
      updated_at: now.toISOString(),
    })
    .eq("id", params.id)
}

async function insertInboxItemIdempotent(item: {
  type: string
  severity: AdminInboxSeverity
  title: string
  body: string
  link_ref: any
  dedupe_key: string
}) {
  const now = new Date()
  const bodySafe = typeof item.body === "string" ? redactSensitive(item.body, "automation") : ""
  const linkSafe = redactSensitive(item.link_ref, "automation")

  const { error } = await supabaseServer.from("cc_admin_inbox_items").insert({
    type: item.type,
    severity: item.severity,
    title: item.title,
    body: bodySafe,
    link_ref: linkSafe,
    status: "open",
    dedupe_key: item.dedupe_key,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  })

  // Idempotency: if we already created the inbox item, treat as success.
  if (error) {
    const msg = error.message || "Failed to insert inbox item"
    if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) return
    throw new Error(msg)
  }
}

export async function runAutomationDispatcher(params?: {
  limit?: number
  now?: Date
}): Promise<{
  now: string
  picked: number
  processed: number
  sent: number
  failed: number
  results: Array<{ event_id: string; status: "sent" | "failed" | "skipped"; error?: string }>
}> {
  const now = params?.now ?? new Date()
  const limit = params?.limit ?? 50

  if (process.env.AUTOMATION_DISPATCHER_FORCE_FAIL === "1") {
    throw new Error("AUTOMATION_DISPATCHER_FORCE_FAIL=1")
  }

  const { data: events, error } = await supabaseServer
    .from("cc_automation_events")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", now.toISOString())
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)

  const rows = (events || []) as AutomationEventRow[]
  const results: Array<{ event_id: string; status: "sent" | "failed" | "skipped"; error?: string }> = []

  let sent = 0
  let failed = 0

  for (const ev of rows) {
    try {
      const inboxItem = buildInboxItemFromEvent(ev)
      if (!inboxItem) {
        // Unknown event: mark as sent so it doesn't poison the queue.
        await markEventStatus({ id: ev.id, status: "sent", nextAttemptAt: null, lastError: null })
        results.push({ event_id: ev.id, status: "skipped" })
        continue
      }

      await insertInboxItemIdempotent(inboxItem)
      await markEventStatus({ id: ev.id, status: "sent", nextAttemptAt: null, lastError: null })
      sent += 1
      results.push({ event_id: ev.id, status: "sent" })
    } catch (e: any) {
      const nextAttempts = (ev.attempts || 0) + 1
      
      // Dead-letter: after MAX_DISPATCHER_ATTEMPTS, mark as failed permanently but keep visible
      if (nextAttempts >= MAX_DISPATCHER_ATTEMPTS) {
        const msg = redactSensitive(e?.message || "Dispatcher failed after max attempts", "automation")
        await markEventStatus({
          id: ev.id,
          status: "failed",
          attempts: nextAttempts,
          nextAttemptAt: null, // No more retries
          lastError: typeof msg === "string" ? `${msg} (dead-letter after ${MAX_DISPATCHER_ATTEMPTS} attempts)` : "Dispatcher failed (dead-letter)",
        })
        failed += 1
        results.push({ event_id: ev.id, status: "failed", error: `Dead-letter after ${MAX_DISPATCHER_ATTEMPTS} attempts: ${e?.message}` })
        continue
      }
      
      // Normal retry with backoff
      const base = computeBackoffMs(nextAttempts)
      const ms = applyJitter(base)
      const nextAt = new Date(now.getTime() + ms)
      const msg = redactSensitive(e?.message || "Dispatcher failed", "automation")

      await markEventStatus({
        id: ev.id,
        status: "failed",
        attempts: nextAttempts,
        nextAttemptAt: nextAt,
        lastError: typeof msg === "string" ? msg : "Dispatcher failed",
      })
      failed += 1
      results.push({ event_id: ev.id, status: "failed", error: e?.message })
    }
  }

  return {
    now: now.toISOString(),
    picked: rows.length,
    processed: results.length,
    sent,
    failed,
    results,
  }
}


