# Step 10 — Outbound Workflows + Compliance + Retry Policies

This step adds **deterministic outbound workflows** for WhatsApp / Email / Voice with:

- **Eligibility checks** (DNC, quiet hours, allowed channels, unknown-party handling)
- **Step-up auth gating** (no sensitive content before OTP verification)
- **Retry policies** (exponential backoff + jitter)
- **Append-only attempt logs** + audit events for every decision
- Optional **n8n webhook** after decisions (`N8N_OUTBOUND_WEBHOOK_URL`)

---

## 1) Database tables

Migration: `supabase/migrations/008_outbound_workflows.sql`

### `cc_outbound_campaigns`
- **purpose**: `fraud_alert | kyc_update | collections | case_followup | service_notice`
- **allowed_channels**: JSON array (e.g. `["whatsapp","email"]`)
- **status**: `active | paused | archived`

### `cc_outbound_jobs`
Represents a single outbound job to a destination on a channel.

- **status**: `queued | sent | failed | cancelled | awaiting_verification`
- **target_address**: **normalized** destination (see `normalizeAddress()` in `lib/identity-resolution.ts`)
- **payload_json**: templated parameters and workflow state
  - `sensitive: true` (optional)
  - `text` / `final_text` (optional message bodies)
  - `subject` / `html` (email)
  - `service_notice_override: true` (explicit override for **quiet hours** only when purpose=`service_notice`)
  - `verification_state: "pending" | "verified"` (managed by runner/resume)

### `cc_outbound_attempts` (append-only)
Append-only log of each attempt:
- provider ids (`provider_message_id`, `provider_call_sid`)
- attempt status (`sent | delivered | failed | no_answer | busy`)

Indexes exist for:
- `status,next_attempt_at` on jobs
- `bank_customer_id`
- uniqueness on provider IDs

RLS matches current `cc_*` posture: **service_role** has full access.

---

## 2) Compliance / Eligibility engine

File: `lib/compliance/outbound-eligibility.ts`

Inputs:
- `bankCustomerId` (optional)
- `channel`
- `destination` (raw or normalized)
- `now` (timezone-aware decision)

Outputs:
- `eligible: boolean`
- `reasons: DNC | quiet_hours | channel_not_allowed | missing_consent | unknown_party`

Decision rules:
- **DNC**: `cc_comm_preferences.do_not_contact = true` → ineligible (no overrides)
- **Channel allowlist**: `cc_comm_preferences.allowed_channels` must contain the channel
- **Quiet hours**: computed using `cc_comm_preferences.timezone`, `quiet_hours_start`, `quiet_hours_end`
  - can be bypassed **only** if:
    - campaign purpose is `service_notice`
    - AND `payload_json.service_notice_override === true`
- **Unknown party**: if `bankCustomerId` not provided and `cc_identity_links` is not verified/bound

Every decision emits `cc_audit_logs` event:
- `outbound_eligibility_decision`

---

## 3) Outbound runner / orchestration

File: `lib/outbound/outbound-runner.ts`

Entry point:
- `runDueOutboundJobs({ limit, now })`

Behavior:
- Polls jobs where:
  - `status='queued'`
  - `next_attempt_at <= now()`
- Runs eligibility check
  - if ineligible: sets job `cancelled` + audit `outbound_job_cancelled_ineligible`
- Sends message via provider (wrapped with `callToolWithAudit()`)
  - WhatsApp: Twilio
  - Email: SendGrid
  - Voice: Twilio outbound call with minimal TwiML `<Say>`
- Writes `cc_outbound_attempts` row for **every attempt**
- Updates job status / outcome and schedules retry if needed

Optional n8n hook:
- Set `N8N_OUTBOUND_WEBHOOK_URL`
- Runner posts **after** decisions (`outbound_job_sent`, `outbound_job_cancelled_ineligible`, etc.)

---

## 4) Retry policy (default)

### WhatsApp / Email
- **max_attempts**: 3
- backoff: **5m, 30m, 4h**
- jitter: ±20%

### Voice
- **max_attempts**: 2
- retry delay: ~30m (±20%)

Stop retrying when job is:
- `cancelled`
- `sent` with outcome `success_verified` or `success_unverified_info_only`
- `failed` after reaching max attempts

---

## 5) Step-up auth gating + resume

Rules:
- For `fraud_alert | collections | kyc_update | case_followup`:
  - Runner sends **only** a non-sensitive prompt:
    - “Reply VERIFY”
  - Job transitions to `awaiting_verification`

Resume on OTP verification:
- File: `lib/outbound/outbound-resume.ts`
- Hooked into inbound OTP success in `lib/agents/supervisor.ts`
- Finds matching jobs with `status='awaiting_verification'` and:
  - sets `payload_json.verification_state='verified'`
  - queues and immediately processes them via runner

---

## 6) Admin API routes

All routes require header:
- `x-user-role: admin|supervisor`

### Create job
`POST /api/outbound/jobs/create`

Body (minimal):
- `campaign`: `{ name, purpose }` (or `campaignId`)
- `channel`
- `targetAddress`
- `payloadJson` (optional)

### Run due jobs
`POST /api/outbound/jobs/run`

Body:
- `limit` (optional)

### Cancel job
`POST /api/outbound/jobs/:id/cancel`

Body:
- `reasonCode` (optional)
- `reasonMessage` (optional)
- `outcomeCode` (optional)

