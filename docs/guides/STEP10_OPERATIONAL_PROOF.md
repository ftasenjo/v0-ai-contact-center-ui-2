# Step 10: Operational Proof (OTP-Resume Ritual)

## Proof Job ID
**`27ecc6e7-c1f5-463f-b2fc-d5450a904012`**

This job demonstrates the complete OTP-resume flow:
1. Created with sensitive payload → forced VERIFY prompt
2. Runner sent attempt #1 (verify prompt) → `awaiting_verification`
3. User replied VERIFY → OTP started
4. User replied OTP code (000000 in mock mode) → OTP verified
5. Outbound resume triggered → job returned to `queued`
6. Runner processed again → attempt #2 sent (final payload) → `sent`

## Proof SQL Queries

### 4.1 Job + Status Transitions
```sql
select id, status, updated_at
from cc_outbound_jobs
where id = '27ecc6e7-c1f5-463f-b2fc-d5450a904012';
```

**Expected result:**
- `status`: `sent`
- `updated_at`: shows progression from `queued` → `awaiting_verification` → `sent`

### 4.2 Attempts are Append-Only & Ordered
```sql
select attempt_number as attempt_no, status, created_at, provider_message_id
from cc_outbound_attempts
where outbound_job_id = '27ecc6e7-c1f5-463f-b2fc-d5450a904012'
order by attempt_number asc;
```

**Expected result:**
- **attempt #1**: `status='sent'`, `outcome_code='success_unverified_info_only'` (verify prompt)
- **attempt #2**: `status='sent'`, `outcome_code='success_verified'` (final payload after OTP)
- `attempt_number` strictly increasing (1, 2)
- `created_at` timestamps in ascending order

### 4.3 Audit Chain is Complete
```sql
select event_type, created_at
from cc_audit_logs
where input_redacted->>'job_id' = '27ecc6e7-c1f5-463f-b2fc-d5450a904012'
   or input_redacted->>'outbound_job_id' = '27ecc6e7-c1f5-463f-b2fc-d5450a904012'
order by created_at asc;
```

**Expected audit chain (7 events):**
1. `outbound_job_processing_started` (first run)
2. `outbound_eligibility_decision` (eligible: true)
3. `outbound_job_sent_verify_prompt` (attempt #1)
4. `outbound_job_resumed_after_otp` (after OTP verification)
5. `outbound_job_processing_started` (second run)
6. `outbound_eligibility_decision` (eligible: true)
7. `outbound_job_sent` (attempt #2, final payload)

## UI Verification

### `/workflows` (Jobs List)
- Proof job appears in list with:
  - `status`: `sent` (green badge)
  - `channel`: `whatsapp`
  - `to_hint`: `+14•••45` (masked)
  - `attempts_count`: `2`
  - `last_attempt_at`: timestamp
- Clicking the job navigates to `/workflows/jobs/27ecc6e7-c1f5-463f-b2fc-d5450a904012`

### `/workflows/jobs/27ecc6e7-c1f5-463f-b2fc-d5450a904012` (Job Detail)
**Job Summary:**
- `id`: `27ecc6e7-c1f5-463f-b2fc-d5450a904012`
- `status`: `sent`
- `channel`: `whatsapp`
- `campaign_id`: `0d14074d-75ad-4ee4-aa99-a15e8a735d4b`
- `payload_redacted`: Shows `{ sensitive: true, final_text: "CONFIDENTIAL: ...", verification_state: "verified" }`

**Attempts Timeline:**
- **Attempt #1** (2025-12-19T17:48:51.368Z): `status='sent'`, provider_message_id present
- **Attempt #2** (2025-12-19T17:48:57.598Z): `status='sent'`, provider_message_id present

**Audit Tail (last 50):**
Shows all 7 events listed above, ordered by `created_at` descending (newest first in UI).

## Negative Tests Verified

### DNC (Do Not Contact)
- **Job ID**: `35f75cb9-33f8-4bcc-ad58-548803560ec1`
- **Result**: `status='cancelled'`, `cancel_reason_code='DNC'`, `outcome_code='opt_out'`
- **Audit**: `outbound_eligibility_decision` with `reasons=['DNC']`, `eligible=false`

### Quiet Hours
- **Job ID**: `2e03ccb8-8999-429a-a165-7ce7f8f10188`
- **Result**: `status='cancelled'`, `cancel_reason_code='quiet_hours'`
- **Audit**: `outbound_eligibility_decision` with `reasons=['quiet_hours']`, `eligible=false`
- **Note**: Current behavior is **cancel** (not defer). Future ticket: "quiet-hours deferral policy" if defer is desired.

## Reconciliation Rule

See: `docs/guides/OUTBOUND_RECONCILIATION_RULE.md`

- **attempt = sent** when provider API returns success
- Delivery receipts/bounces/call outcomes are **later** via provider webhooks
