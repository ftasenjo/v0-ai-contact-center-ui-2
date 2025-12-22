import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAutomationAdmin } from "@/lib/automation/api-auth"
import { redactSensitive } from "@/lib/audit-redaction"
import type { CallAnalysisRow } from "@/lib/automation/types"

/**
 * POST /api/calls/analysis
 * Store post-call analysis results
 * Body: CallAnalysisRow (without id, created_at, updated_at)
 */
export async function POST(request: NextRequest) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  try {
    const body = await request.json()
    const {
      conversation_id,
      provider = "vapi",
      provider_call_id,
      vapi_call_id,
      call_summary,
      issue_type,
      issue_severity,
      issue_resolved,
      escalation_required,
      supervisor_review_needed,
      compliance_verified,
      customer_sentiment,
      customer_frustrated,
      quality_score,
      identity_verified,
      step_up_auth_required,
      step_up_auth_completed,
      action_taken,
      next_best_action,
      raw_analysis_json,
    } = body

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 })
    }

    // Redact sensitive data in raw_analysis_json
    const rawAnalysisSafe = raw_analysis_json ? redactSensitive(raw_analysis_json, "automation") : null

    const { data, error } = await supabaseServer
      .from("cc_call_analysis")
      .insert({
        conversation_id,
        provider,
        provider_call_id: provider_call_id || null,
        vapi_call_id: vapi_call_id || null,
        call_summary: call_summary || null,
        issue_type: issue_type || null,
        issue_severity: issue_severity || null,
        issue_resolved: issue_resolved ?? null,
        escalation_required: escalation_required ?? null,
        supervisor_review_needed: supervisor_review_needed ?? null,
        compliance_verified: compliance_verified ?? null,
        customer_sentiment: customer_sentiment || null,
        customer_frustrated: customer_frustrated ?? null,
        quality_score: quality_score || null,
        identity_verified: identity_verified ?? null,
        step_up_auth_required: step_up_auth_required ?? null,
        step_up_auth_completed: step_up_auth_completed ?? null,
        action_taken: action_taken || null,
        next_best_action: next_best_action || null,
        raw_analysis_json: rawAnalysisSafe,
        analyzed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("[calls/analysis] Failed to insert analysis:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Step 12: Process automation (create inbox items from analysis flags)
    if (data) {
      try {
        const { processCallAnalysis } = await import("@/lib/automation/call-analysis-automation")
        await processCallAnalysis(data as any)
      } catch (e) {
        // Non-fatal: log but don't fail the analysis storage
        console.warn("[calls/analysis] Failed to process automation:", e)
      }
    }

    return NextResponse.json({ success: true, analysis: data })
  } catch (e: any) {
    console.error("[calls/analysis] Error:", e)
    return NextResponse.json({ error: e?.message || "Failed to store call analysis" }, { status: 500 })
  }
}

/**
 * GET /api/calls/analysis
 * Query: conversation_id?, provider_call_id?, vapi_call_id?
 */
export async function GET(request: NextRequest) {
  const perm = requireAutomationAdmin(request)
  if (!perm.ok) return perm.res

  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversation_id")
    const providerCallId = searchParams.get("provider_call_id")
    const vapiCallId = searchParams.get("vapi_call_id")

    let q = supabaseServer.from("cc_call_analysis").select("*").order("analyzed_at", { ascending: false })

    if (conversationId) {
      q = q.eq("conversation_id", conversationId)
    }
    if (providerCallId) {
      q = q.eq("provider_call_id", providerCallId)
    }
    if (vapiCallId) {
      q = q.eq("vapi_call_id", vapiCallId)
    }

    const { data, error } = await q

    if (error) {
      console.error("[calls/analysis] Failed to fetch analysis:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    console.error("[calls/analysis] Error:", e)
    return NextResponse.json({ error: e?.message || "Failed to fetch call analysis" }, { status: 500 })
  }
}

