import { supabaseServer } from '@/lib/supabase-server';
import { getTwilioClient } from '@/lib/twilio';
import { callToolWithAudit } from '@/lib/tools/audit-wrapper';
import { writeAuditLog } from '@/lib/banking-store';
import { evaluateOutboundEligibility, type OutboundChannel } from '@/lib/compliance/outbound-eligibility';
import { emitAutomationEvent } from '@/lib/automation/outbox';
import { AutomationEventTypes } from '@/lib/automation/types';

export type OutboundJobStatus = 'queued' | 'sent' | 'failed' | 'cancelled' | 'awaiting_verification';
export type OutboundOutcomeCode =
  | 'success_verified'
  | 'success_unverified_info_only'
  | 'no_answer'
  | 'busy'
  | 'failed_delivery'
  | 'opt_out'
  | 'wrong_party'
  | 'callback_scheduled'
  | 'escalated_to_human';

type CampaignPurpose = 'fraud_alert' | 'kyc_update' | 'collections' | 'case_followup' | 'service_notice';

type OutboundJobRow = {
  id: string;
  campaign_id: string;
  bank_customer_id: string | null;
  target_address: string;
  channel: OutboundChannel;
  payload_json: any;
  status: OutboundJobStatus;
  scheduled_at: string | null;
  next_attempt_at: string | null;
  attempt_count: number;
  max_attempts: number;
  outcome_code: OutboundOutcomeCode | null;
  cancel_reason_code: string | null;
  cancel_reason_message: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
  cc_outbound_campaigns?: {
    id: string;
    name: string;
    purpose: CampaignPurpose;
    allowed_channels: any;
    status: string;
  } | null;
};

function defaultMaxAttempts(channel: OutboundChannel): number {
  if (channel === 'voice') return 2;
  return 3; // whatsapp/email/sms
}

function computeBackoffMs(channel: OutboundChannel, attemptNumber: number): number {
  // attemptNumber is 1-based (first attempt = 1)
  if (channel === 'voice') {
    // 2 attempts total; retry once after ~30m (with jitter)
    return 30 * 60 * 1000;
  }
  // WhatsApp/email: 5m, 30m, 4h
  if (attemptNumber <= 1) return 5 * 60 * 1000;
  if (attemptNumber === 2) return 30 * 60 * 1000;
  return 4 * 60 * 60 * 1000;
}

function applyJitter(ms: number): number {
  // +/- 20%
  const jitter = ms * 0.2;
  const delta = (Math.random() * 2 - 1) * jitter;
  return Math.max(10_000, Math.round(ms + delta));
}

function requiresStepUp(purpose?: CampaignPurpose | null): boolean {
  return purpose === 'fraud_alert' || purpose === 'collections' || purpose === 'kyc_update' || purpose === 'case_followup';
}

function buildVerifyPrompt(purpose?: CampaignPurpose | null): string {
  if (purpose === 'fraud_alert') return '🔐 Security check: reply VERIFY to confirm it’s you. Then we’ll share next steps.';
  if (purpose === 'collections') return '🔐 Security check: reply VERIFY to confirm it’s you. Then we’ll share your account options.';
  if (purpose === 'kyc_update') return '🔐 Security check: reply VERIFY to confirm it’s you. Then we’ll help you complete your update.';
  if (purpose === 'case_followup') return '🔐 Security check: reply VERIFY to confirm it’s you. Then we’ll share details about your case.';
  return '🔐 Security check: reply VERIFY to continue.';
}

function buildFinalMessage(job: OutboundJobRow, purpose?: CampaignPurpose | null): { text: string; isSensitive: boolean } {
  const payload = job.payload_json || {};
  const explicitText = typeof payload.text === 'string' ? payload.text : null;
  const finalText = typeof payload.final_text === 'string' ? payload.final_text : null;
  const sensitive = payload.sensitive === true || requiresStepUp(purpose);

  // If verified, use final_text/text. Otherwise, never send sensitive content.
  const verified = payload.verification_state === 'verified';

  if (!verified && sensitive) {
    // The prompt itself is non-sensitive, but the *job* is sensitive and must be gated.
    return { text: buildVerifyPrompt(purpose), isSensitive: true };
  }

  if (finalText) return { text: finalText, isSensitive: sensitive };
  if (explicitText) return { text: explicitText, isSensitive: sensitive };

  // Safe fallback (non-sensitive)
  return { text: 'We’re trying to reach you regarding your account. Reply VERIFY to continue.', isSensitive: false };
}

async function insertAttempt(params: {
  job: OutboundJobRow;
  attemptNumber: number;
  status: 'sent' | 'delivered' | 'failed' | 'no_answer' | 'busy';
  provider: 'twilio' | 'sendgrid' | 'vapi' | 'other';
  providerMessageId?: string | null;
  providerCallSid?: string | null;
  outcomeCode?: OutboundOutcomeCode | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  at: Date;
}) {
  await supabaseServer.from('cc_outbound_attempts').insert({
    outbound_job_id: params.job.id,
    channel: params.job.channel,
    provider: params.provider,
    provider_message_id: params.providerMessageId || null,
    provider_call_sid: params.providerCallSid || null,
    attempt_number: params.attemptNumber,
    status: params.status,
    outcome_code: params.outcomeCode || null,
    sent_at: params.status === 'sent' ? params.at.toISOString() : null,
    delivered_at: params.status === 'delivered' ? params.at.toISOString() : null,
    failed_at: params.status === 'failed' ? params.at.toISOString() : null,
    error_code: params.errorCode || null,
    error_message: params.errorMessage || null,
    created_at: params.at.toISOString(),
  });
}

async function sendWhatsApp(job: OutboundJobRow, body: string) {
  // Local/dev escape hatch: if Twilio isn't configured, fall back to a deterministic mock send.
  if (
    process.env.OUTBOUND_PROVIDER_MODE === 'mock' ||
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN
  ) {
    return { sid: `mock-whatsapp-${job.id}-${Date.now()}`, status: 'sent' };
  }
  const twilio = getTwilioClient();
  const fromWhatsApp =
    process.env.TWILIO_WHATSAPP_NUMBER ||
    (process.env.TWILIO_PHONE_NUMBER ? `whatsapp:${process.env.TWILIO_PHONE_NUMBER}` : undefined);
  if (!fromWhatsApp) throw new Error('Missing TWILIO_WHATSAPP_NUMBER/TWILIO_PHONE_NUMBER');

  const toFormatted = job.target_address.startsWith('whatsapp:') ? job.target_address : `whatsapp:${job.target_address}`;

  return callToolWithAudit(
    'send_outbound_whatsapp',
    { to: toFormatted, from: fromWhatsApp, job_id: job.id, body_preview: body.slice(0, 80) },
    async () => {
      const msg = await twilio.messages.create({ from: fromWhatsApp, to: toFormatted, body });
      return { sid: msg.sid, status: msg.status };
    },
    { actorType: 'system', bankCustomerId: job.bank_customer_id || undefined, context: 'outbound' }
  );
}

async function sendSms(job: OutboundJobRow, body: string) {
  if (
    process.env.OUTBOUND_PROVIDER_MODE === 'mock' ||
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN
  ) {
    return { sid: `mock-sms-${job.id}-${Date.now()}`, status: 'sent' };
  }
  const twilio = getTwilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error('Missing TWILIO_PHONE_NUMBER');
  const to = job.target_address; // should be normalized to +E164

  return callToolWithAudit(
    'send_outbound_sms',
    { to, from, job_id: job.id, body_preview: body.slice(0, 80) },
    async () => {
      const msg = await twilio.messages.create({ from, to, body });
      return { sid: msg.sid, status: msg.status };
    },
    { actorType: 'system', bankCustomerId: job.bank_customer_id || undefined, context: 'outbound' }
  );
}

async function sendEmail(job: OutboundJobRow, subject: string, text: string, html?: string) {
  if (process.env.OUTBOUND_PROVIDER_MODE === 'mock') {
    return { queued: true, provider: 'mock' };
  }
  return callToolWithAudit(
    'send_outbound_email',
    { to: job.target_address, job_id: job.id, subject, body_preview: text.slice(0, 80) },
    async () => {
      const apiKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
      if (!apiKey) throw new Error('Missing SENDGRID_API_KEY');
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(apiKey);
      await sgMail.default.send({
        to: job.target_address,
        from: fromEmail,
        subject,
        text,
        html: html || text,
      });
      // SendGrid doesn’t guarantee an id in this SDK call; provider id may come via event webhook later.
      return { queued: true };
    },
    { actorType: 'system', bankCustomerId: job.bank_customer_id || undefined, context: 'outbound' }
  );
}

async function startVoiceCall(job: OutboundJobRow, sayText: string) {
  if (process.env.OUTBOUND_PROVIDER_MODE === 'mock') {
    return { callSid: `mock-voice-${job.id}-${Date.now()}`, status: 'queued' };
  }
  const twilio = getTwilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error('Missing TWILIO_PHONE_NUMBER');
  const to = job.target_address;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${escapeXml(
    sayText
  )}</Say></Response>`;

  return callToolWithAudit(
    'start_outbound_voice_call',
    { to, from, job_id: job.id, say_preview: sayText.slice(0, 80) },
    async () => {
      const call = await twilio.calls.create({
        from,
        to,
        twiml,
      });
      return { callSid: call.sid, status: call.status };
    },
    { actorType: 'system', bankCustomerId: job.bank_customer_id || undefined, context: 'outbound' }
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function maybePostN8nDecision(payload: any) {
  const url = process.env.N8N_OUTBOUND_WEBHOOK_URL;
  if (!url) return;
  await callToolWithAudit(
    'n8n_outbound_hook',
    { has_url: true, event: payload?.event_type },
    async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { ok: res.ok, status: res.status };
    },
    { actorType: 'system', context: 'outbound' }
  );
}

async function cancelJobIneligible(params: {
  job: OutboundJobRow;
  now: Date;
  reasons: string[];
}) {
  const reason = params.reasons[0] || 'ineligible';
  await supabaseServer
    .from('cc_outbound_jobs')
    .update({
      status: 'cancelled',
      cancel_reason_code: reason,
      cancel_reason_message: params.reasons.join(','),
      next_attempt_at: null,
      updated_at: params.now.toISOString(),
      outcome_code: reason === 'DNC' ? 'opt_out' : null,
    })
    .eq('id', params.job.id);

  await writeAuditLog({
    actorType: 'system',
    eventType: 'outbound_job_cancelled_ineligible',
    eventVersion: 1,
    bankCustomerId: params.job.bank_customer_id || undefined,
    context: 'outbound',
    inputRedacted: { outbound_job_id: params.job.id, reasons: params.reasons },
    outputRedacted: { status: 'cancelled' },
    success: true,
  });

  await maybePostN8nDecision({
    event_type: 'outbound_job_cancelled_ineligible',
    outbound_job_id: params.job.id,
    reasons: params.reasons,
    at: params.now.toISOString(),
  });
}

async function scheduleRetry(params: {
  job: OutboundJobRow;
  now: Date;
  newAttemptCount: number;
  errorCode: string;
  errorMessage: string;
}) {
  const reachedMax = params.newAttemptCount >= (params.job.max_attempts || defaultMaxAttempts(params.job.channel));
  if (reachedMax) {
    await supabaseServer
      .from('cc_outbound_jobs')
      .update({
        status: 'failed',
        outcome_code: 'failed_delivery',
        last_error_code: params.errorCode,
        last_error_message: params.errorMessage,
        next_attempt_at: null,
        attempt_count: params.newAttemptCount,
        updated_at: params.now.toISOString(),
      })
      .eq('id', params.job.id);

    // Step 11: Emit "ops inbox" event (best-effort; must never break outbound flow)
    try {
      await emitAutomationEvent({
        eventType: AutomationEventTypes.OutboundFailedMaxAttempts,
        dedupeKey: `outbound_failed_max_attempts:${params.job.id}`,
        payload: {
          outbound_job_id: params.job.id,
          channel: params.job.channel,
          target_hint: params.job.target_address,
          attempt_count: params.newAttemptCount,
          max_attempts: params.job.max_attempts || defaultMaxAttempts(params.job.channel),
          last_error_code: params.errorCode,
          last_error_message: params.errorMessage,
          at: params.now.toISOString(),
        },
      });
    } catch {
      // Non-fatal
    }
    return;
  }

  const base = computeBackoffMs(params.job.channel, params.newAttemptCount);
  const ms = applyJitter(base);
  const next = new Date(params.now.getTime() + ms);

  await supabaseServer
    .from('cc_outbound_jobs')
    .update({
      status: 'queued',
      last_error_code: params.errorCode,
      last_error_message: params.errorMessage,
      next_attempt_at: next.toISOString(),
      attempt_count: params.newAttemptCount,
      max_attempts: params.job.max_attempts || defaultMaxAttempts(params.job.channel),
      updated_at: params.now.toISOString(),
    })
    .eq('id', params.job.id);
}

async function markAwaitingVerification(params: {
  job: OutboundJobRow;
  now: Date;
  attemptCount: number;
}) {
  await supabaseServer
    .from('cc_outbound_jobs')
    .update({
      status: 'awaiting_verification',
      outcome_code: 'success_unverified_info_only',
      next_attempt_at: null,
      attempt_count: params.attemptCount,
      max_attempts: params.job.max_attempts || defaultMaxAttempts(params.job.channel),
      updated_at: params.now.toISOString(),
      payload_json: {
        ...(params.job.payload_json || {}),
        verification_state: 'pending',
      },
    })
    .eq('id', params.job.id);
}

async function markJobSucceeded(params: {
  job: OutboundJobRow;
  now: Date;
  attemptCount: number;
  outcome: OutboundOutcomeCode;
}) {
  await supabaseServer
    .from('cc_outbound_jobs')
    .update({
      status: 'sent',
      outcome_code: params.outcome,
      next_attempt_at: null,
      attempt_count: params.attemptCount,
      updated_at: params.now.toISOString(),
    })
    .eq('id', params.job.id);
}

export async function processOutboundJob(job: OutboundJobRow, now: Date): Promise<{
  jobId: string;
  status: OutboundJobStatus;
}> {
  const campaignPurpose = job.cc_outbound_campaigns?.purpose ?? null;

  await writeAuditLog({
    actorType: 'system',
    eventType: 'outbound_job_processing_started',
    eventVersion: 1,
    bankCustomerId: job.bank_customer_id || undefined,
    context: 'outbound',
    inputRedacted: { outbound_job_id: job.id, channel: job.channel, status: job.status },
    success: true,
  });

  const eligibility = await evaluateOutboundEligibility({
    bankCustomerId: job.bank_customer_id,
    channel: job.channel,
    destination: job.target_address,
    now,
    campaignPurpose: campaignPurpose || undefined,
    serviceNoticeOverride: job.payload_json?.service_notice_override === true,
    outboundJobId: job.id,
    campaignId: job.campaign_id,
  });

  if (!eligibility.eligible) {
    await cancelJobIneligible({ job, now, reasons: eligibility.reasons });
    return { jobId: job.id, status: 'cancelled' };
  }

  // Ensure bank_customer_id is set if we resolved it (helps resumption)
  if (!job.bank_customer_id && eligibility.resolvedBankCustomerId) {
    await supabaseServer
      .from('cc_outbound_jobs')
      .update({ bank_customer_id: eligibility.resolvedBankCustomerId, updated_at: now.toISOString() })
      .eq('id', job.id);
    job.bank_customer_id = eligibility.resolvedBankCustomerId;
  }

  const attemptNumber = (job.attempt_count || 0) + 1;
  const { text, isSensitive } = buildFinalMessage(job, campaignPurpose);

  // Hard rule: never send sensitive content unless verification_state=verified
  if (isSensitive && job.payload_json?.verification_state !== 'verified') {
    // Force VERIFY prompt instead (safe)
    const verifyText = buildVerifyPrompt(campaignPurpose);
    try {
      if (job.channel === 'whatsapp') {
        const res = await sendWhatsApp(job, verifyText);
        await insertAttempt({
          job,
          attemptNumber,
          status: 'sent',
          provider: 'twilio',
          providerMessageId: (res as any)?.sid ?? null,
          at: now,
          outcomeCode: 'success_unverified_info_only',
        });
      } else if (job.channel === 'email') {
        await sendEmail(job, 'Verification required', verifyText);
        await insertAttempt({
          job,
          attemptNumber,
          status: 'sent',
          provider: 'sendgrid',
          at: now,
          outcomeCode: 'success_unverified_info_only',
        });
      } else if (job.channel === 'voice') {
        const res = await startVoiceCall(job, verifyText);
        await insertAttempt({
          job,
          attemptNumber,
          status: 'sent',
          provider: 'twilio',
          providerCallSid: (res as any)?.callSid ?? null,
          at: now,
          outcomeCode: 'success_unverified_info_only',
        });
      } else if (job.channel === 'sms') {
        const res = await sendSms(job, verifyText);
        await insertAttempt({
          job,
          attemptNumber,
          status: 'sent',
          provider: 'twilio',
          providerMessageId: (res as any)?.sid ?? null,
          at: now,
          outcomeCode: 'success_unverified_info_only',
        });
      } else {
        throw new Error(`Unsupported channel: ${job.channel}`);
      }

      await markAwaitingVerification({ job, now, attemptCount: attemptNumber });

      await writeAuditLog({
        actorType: 'system',
        eventType: 'outbound_job_sent_verify_prompt',
        eventVersion: 1,
        bankCustomerId: job.bank_customer_id || undefined,
        context: 'outbound',
        inputRedacted: { outbound_job_id: job.id, attempt_number: attemptNumber, channel: job.channel },
        outputRedacted: { status: 'awaiting_verification' },
        success: true,
      });

      await maybePostN8nDecision({
        event_type: 'outbound_job_sent_verify_prompt',
        outbound_job_id: job.id,
        attempt_number: attemptNumber,
        channel: job.channel,
        at: now.toISOString(),
      });

      return { jobId: job.id, status: 'awaiting_verification' };
    } catch (err: any) {
      const errorCode = err?.code || 'OUTBOUND_SEND_FAILED';
      const errorMessage = err?.message || 'Failed to send verification prompt';
      await insertAttempt({
        job,
        attemptNumber,
        status: 'failed',
        provider: job.channel === 'email' ? 'sendgrid' : 'twilio',
        at: now,
        errorCode,
        errorMessage,
        outcomeCode: 'failed_delivery',
      });
      await scheduleRetry({ job, now, newAttemptCount: attemptNumber, errorCode, errorMessage });
      return { jobId: job.id, status: 'queued' };
    }
  }

  // Verified OR non-sensitive message
  try {
    if (job.channel === 'whatsapp') {
      const res = await sendWhatsApp(job, text);
      await insertAttempt({
        job,
        attemptNumber,
        status: 'sent',
        provider: 'twilio',
        providerMessageId: (res as any)?.sid ?? null,
        at: now,
        outcomeCode: job.payload_json?.verification_state === 'verified' ? 'success_verified' : 'success_unverified_info_only',
      });
    } else if (job.channel === 'email') {
      const subject = typeof job.payload_json?.subject === 'string' ? job.payload_json.subject : 'Notification';
      await sendEmail(job, subject, text, job.payload_json?.html);
      await insertAttempt({
        job,
        attemptNumber,
        status: 'sent',
        provider: 'sendgrid',
        at: now,
        outcomeCode: job.payload_json?.verification_state === 'verified' ? 'success_verified' : 'success_unverified_info_only',
      });
    } else if (job.channel === 'voice') {
      const res = await startVoiceCall(job, text);
      await insertAttempt({
        job,
        attemptNumber,
        status: 'sent',
        provider: 'twilio',
        providerCallSid: (res as any)?.callSid ?? null,
        at: now,
        outcomeCode: job.payload_json?.verification_state === 'verified' ? 'success_verified' : 'success_unverified_info_only',
      });
    } else if (job.channel === 'sms') {
      const res = await sendSms(job, text);
      await insertAttempt({
        job,
        attemptNumber,
        status: 'sent',
        provider: 'twilio',
        providerMessageId: (res as any)?.sid ?? null,
        at: now,
        outcomeCode:
          job.payload_json?.verification_state === 'verified' ? 'success_verified' : 'success_unverified_info_only',
      });
    } else {
      throw new Error(`Unsupported channel: ${job.channel}`);
    }

    const outcome: OutboundOutcomeCode =
      job.payload_json?.verification_state === 'verified' ? 'success_verified' : 'success_unverified_info_only';
    await markJobSucceeded({ job, now, attemptCount: attemptNumber, outcome });

    await writeAuditLog({
      actorType: 'system',
      eventType: 'outbound_job_sent',
      eventVersion: 1,
      bankCustomerId: job.bank_customer_id || undefined,
      context: 'outbound',
      inputRedacted: { outbound_job_id: job.id, attempt_number: attemptNumber, channel: job.channel },
      outputRedacted: { status: 'sent', outcome_code: outcome },
      success: true,
    });

    await maybePostN8nDecision({
      event_type: 'outbound_job_sent',
      outbound_job_id: job.id,
      attempt_number: attemptNumber,
      channel: job.channel,
      outcome_code: outcome,
      at: now.toISOString(),
    });

    return { jobId: job.id, status: 'sent' };
  } catch (err: any) {
    const errorCode = err?.code || 'OUTBOUND_SEND_FAILED';
    const errorMessage = err?.message || 'Failed to send outbound message';

    await insertAttempt({
      job,
      attemptNumber,
      status: 'failed',
      provider: job.channel === 'email' ? 'sendgrid' : 'twilio',
      at: now,
      errorCode,
      errorMessage,
      outcomeCode: 'failed_delivery',
    });

    await writeAuditLog({
      actorType: 'system',
      eventType: 'outbound_job_send_failed',
      eventVersion: 1,
      bankCustomerId: job.bank_customer_id || undefined,
      context: 'outbound',
      inputRedacted: { outbound_job_id: job.id, attempt_number: attemptNumber, channel: job.channel },
      outputRedacted: { error_code: errorCode },
      success: false,
      errorCode,
      errorMessage,
    });

    await scheduleRetry({ job, now, newAttemptCount: attemptNumber, errorCode, errorMessage });
    return { jobId: job.id, status: 'queued' };
  }
}

/**
 * Step 10: Poll for due jobs and run them deterministically.
 * Intended to be invoked from an API route / cron (later Vercel Cron).
 */
export async function runDueOutboundJobs(params?: { limit?: number; now?: Date }) {
  const now = params?.now ?? new Date();
  const limit = params?.limit ?? 25;

  const { data: jobs, error } = await supabaseServer
    .from('cc_outbound_jobs')
    .select(
      `
      *,
      cc_outbound_campaigns:campaign_id(id,name,purpose,allowed_channels,status)
    `
    )
    .eq('status', 'queued')
    .lte('next_attempt_at', now.toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(limit);

  if (error) {
    await writeAuditLog({
      actorType: 'system',
      eventType: 'outbound_runner_poll_failed',
      eventVersion: 1,
      context: 'outbound',
      inputRedacted: { limit, now: now.toISOString() },
      success: false,
      errorCode: 'OUTBOUND_POLL_FAILED',
      errorMessage: error.message,
    });
    throw error;
  }

  const results: Array<{ jobId: string; status: OutboundJobStatus }> = [];
  for (const j of (jobs || []) as any[]) {
    const job = j as OutboundJobRow;
    results.push(await processOutboundJob(job, now));
  }

  await writeAuditLog({
    actorType: 'system',
    eventType: 'outbound_runner_completed',
    eventVersion: 1,
    context: 'outbound',
    inputRedacted: { limit, now: now.toISOString(), due_jobs: (jobs || []).length },
    outputRedacted: { results },
    success: true,
  });

  return { now: now.toISOString(), processed: results.length, results };
}

