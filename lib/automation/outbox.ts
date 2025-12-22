import { supabaseServer } from "@/lib/supabase-server"
import { redactSensitive } from "@/lib/audit-redaction"
import type { AutomationEventType } from "@/lib/automation/types"

export async function emitAutomationEvent(params: {
  eventType: AutomationEventType
  dedupeKey: string
  payload: any
  /** Optional: schedule for later; default = now */
  nextAttemptAt?: Date
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const now = new Date()
    const payloadSafe = redactSensitive(params.payload, "automation")

    const { data, error } = await supabaseServer.from("cc_automation_events").insert({
      event_type: params.eventType,
      payload_json: payloadSafe ?? {},
      status: "pending",
      attempts: 0,
      next_attempt_at: (params.nextAttemptAt ?? now).toISOString(),
      last_error: null,
      dedupe_key: params.dedupeKey,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).select()

    // Idempotent: duplicate dedupe_key is a no-op.
    if (error) {
      const msg = error.message || "Failed to insert automation event"
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        console.log(`[emitAutomationEvent] Duplicate dedupe_key (idempotent): ${params.dedupeKey}`)
        return { ok: true }
      }
      console.error(`[emitAutomationEvent] Failed to insert event ${params.eventType}:`, error)
      return { ok: false, error: msg }
    }

    if (data && data.length > 0) {
      console.log(`[emitAutomationEvent] ✅ Created event ${params.eventType} (id: ${data[0].id}, dedupe: ${params.dedupeKey})`)
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to emit automation event" }
  }
}


