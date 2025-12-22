export type AutomationEventStatus = "pending" | "sent" | "failed"
export type AdminInboxSeverity = "info" | "warn" | "error"
export type AdminInboxStatus = "open" | "acknowledged" | "resolved" | "dismissed"

/**
 * Step 11: First admin-manageable item types (today scope)
 *
 * - fraud_case_created → "New fraud case" (admin: open case)
 * - outbound_failed_max_attempts → "Outbound intervention needed" (admin: open job / retry / cancel)
 * - daily_operational_summary_ready (optional) → "Daily report ready" (admin: view)
 * - otp_verification_stuck (optional) → "OTP pending > X minutes"
 */
export const AutomationEventTypes = {
  FraudCaseCreated: "fraud_case_created",
  OutboundFailedMaxAttempts: "outbound_failed_max_attempts",
  DailyOperationalSummaryReady: "daily_operational_summary_ready",
  OtpVerificationStuck: "otp_verification_stuck",
  CallAnalysisReady: "call_analysis_ready",
} as const

export type AutomationEventType = (typeof AutomationEventTypes)[keyof typeof AutomationEventTypes]

export type AutomationEventRow = {
  id: string
  event_type: string
  payload_json: any
  status: AutomationEventStatus
  attempts: number
  next_attempt_at: string | null
  last_error: string | null
  dedupe_key: string
  created_at: string
  updated_at: string
}

export type AdminInboxItemRow = {
  id: string
  type: string
  severity: AdminInboxSeverity
  title: string
  body: string | null
  link_ref: any | null
  status: AdminInboxStatus
  assigned_to: string | null
  dedupe_key: string
  created_at: string
  updated_at: string
}

/**
 * Step 12: Post-Call Analysis Types
 */
export type CallAnalysisIssueType = "fraud" | "card" | "login" | "dispute" | "payments" | "general" | "other"
export type CallAnalysisIssueSeverity = "low" | "medium" | "high"
export type CallAnalysisActionTaken = "card_frozen" | "case_created" | "none" | "other"

export type CallAnalysisRow = {
  id: string
  conversation_id: string
  provider: string
  provider_call_id: string | null
  vapi_call_id: string | null
  call_summary: string | null
  issue_type: CallAnalysisIssueType | null
  issue_severity: CallAnalysisIssueSeverity | null
  issue_resolved: boolean | null
  escalation_required: boolean | null
  supervisor_review_needed: boolean | null
  compliance_verified: boolean | null
  customer_sentiment: string | null
  customer_frustrated: boolean | null
  quality_score: number | null
  identity_verified: boolean | null
  step_up_auth_required: boolean | null
  step_up_auth_completed: boolean | null
  action_taken: CallAnalysisActionTaken | null
  next_best_action: string | null
  raw_analysis_json: any | null
  analyzed_at: string
  created_at: string
  updated_at: string
}

