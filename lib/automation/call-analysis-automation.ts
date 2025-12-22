/**
 * Step 12: Post-Call Analysis Automation
 * Creates inbox items from call analysis flags
 */

import { supabaseServer } from "@/lib/supabase-server"
import { emitAutomationEvent } from "@/lib/automation/outbox"
import { AutomationEventTypes } from "@/lib/automation/types"
import type { CallAnalysisRow } from "@/lib/automation/types"

/**
 * Process call analysis and create automation events/inbox items
 * Called after call analysis is stored
 */
export async function processCallAnalysis(analysis: CallAnalysisRow): Promise<void> {
  try {
    // Emit main analysis ready event
    await emitAutomationEvent({
      eventType: AutomationEventTypes.CallAnalysisReady,
      dedupeKey: `call_analysis_ready:${analysis.id}`,
      payload: {
        analysis_id: analysis.id,
        conversation_id: analysis.conversation_id,
        provider_call_id: analysis.provider_call_id,
        escalation_required: analysis.escalation_required,
        compliance_verified: analysis.compliance_verified,
        quality_score: analysis.quality_score,
        customer_frustrated: analysis.customer_frustrated,
        issue_resolved: analysis.issue_resolved,
        supervisor_review_needed: analysis.supervisor_review_needed,
        issue_type: analysis.issue_type,
        issue_severity: analysis.issue_severity,
        at: new Date().toISOString(),
      },
    })

    // Create specific inbox items for actionable flags
    const inboxItems: Array<{
      type: string
      severity: "info" | "warn" | "error"
      title: string
      body: string
      dedupeKey: string
    }> = []

    if (analysis.escalation_required) {
      inboxItems.push({
        type: "call_escalation_required",
        severity: "error",
        title: "Call escalation required",
        body: analysis.call_summary
          ? `Call requires escalation. ${analysis.call_summary.substring(0, 100)}${analysis.call_summary.length > 100 ? "..." : ""}`
          : "Call requires escalation.",
        dedupeKey: `call_escalation:${analysis.conversation_id}:${analysis.id}`,
      })
    }

    if (analysis.compliance_verified === false) {
      inboxItems.push({
        type: "call_compliance_review",
        severity: "error",
        title: "Compliance review required",
        body: analysis.call_summary
          ? `Compliance verification failed. ${analysis.call_summary.substring(0, 100)}${analysis.call_summary.length > 100 ? "..." : ""}`
          : "Compliance verification failed. Review required.",
        dedupeKey: `call_compliance:${analysis.conversation_id}:${analysis.id}`,
      })
    }

    if (analysis.supervisor_review_needed) {
      inboxItems.push({
        type: "call_supervisor_review",
        severity: "warn",
        title: "Supervisor review needed",
        body: analysis.call_summary
          ? `Supervisor review requested. ${analysis.call_summary.substring(0, 100)}${analysis.call_summary.length > 100 ? "..." : ""}`
          : "Supervisor review needed for this call.",
        dedupeKey: `call_supervisor:${analysis.conversation_id}:${analysis.id}`,
      })
    }

    if (analysis.quality_score !== null && analysis.quality_score <= 6) {
      inboxItems.push({
        type: "call_qa_coaching",
        severity: "warn",
        title: "QA coaching candidate",
        body: `Quality score: ${analysis.quality_score}/10. Review for coaching opportunities.`,
        dedupeKey: `call_qa:${analysis.conversation_id}:${analysis.id}`,
      })
    }

    if (analysis.customer_frustrated) {
      inboxItems.push({
        type: "call_customer_frustrated",
        severity: "warn",
        title: "Customer frustrated",
        body: analysis.call_summary
          ? `Customer showed frustration. ${analysis.call_summary.substring(0, 100)}${analysis.call_summary.length > 100 ? "..." : ""}`
          : "Customer showed frustration during call.",
        dedupeKey: `call_frustrated:${analysis.conversation_id}:${analysis.id}`,
      })
    }

    if (analysis.issue_resolved === false) {
      inboxItems.push({
        type: "call_followup_required",
        severity: "warn",
        title: "Follow-up required",
        body: analysis.issue_type
          ? `Issue not resolved: ${analysis.issue_type}. Follow-up needed.`
          : "Issue not resolved. Follow-up required.",
        dedupeKey: `call_followup:${analysis.conversation_id}:${analysis.id}`,
      })
    }

    // Create inbox items directly (bypassing dispatcher for immediate visibility)
    for (const item of inboxItems) {
      try {
        await supabaseServer.from("cc_admin_inbox_items").insert({
          type: item.type,
          severity: item.severity,
          title: item.title,
          body: item.body,
          link_ref: { kind: "conversation", id: analysis.conversation_id },
          status: "open",
          dedupe_key: item.dedupeKey,
        })
      } catch (e: any) {
        // Idempotent: duplicate dedupe_key is fine
        if (!e?.message?.toLowerCase().includes("duplicate") && !e?.message?.toLowerCase().includes("unique")) {
          console.error(`[call-analysis-automation] Failed to create inbox item ${item.type}:`, e)
        }
      }
    }
  } catch (e: any) {
    console.error("[call-analysis-automation] Failed to process call analysis automation:", e)
    // Non-fatal: don't break call analysis storage
  }
}

