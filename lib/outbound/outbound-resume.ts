import { supabaseServer } from '@/lib/supabase-server';
import { normalizeAddress } from '@/lib/identity-resolution';
import { writeAuditLog } from '@/lib/banking-store';
import { processOutboundJob } from '@/lib/outbound/outbound-runner';

/**
 * Step 10: Resume any outbound jobs waiting on OTP verification.
 *
 * Trigger point: immediately after successful OTP verification in the inbound supervisor flow.
 * - Marks jobs as queued
 * - Sets payload_json.verification_state='verified'
 * - Processes immediately (deterministic runner for that job)
 */
export async function resumePendingOutboundAfterOtp(params: {
  bankCustomerId: string;
  channel: 'whatsapp' | 'email' | 'voice' | 'sms';
  fromAddress: string; // raw or normalized
  conversationId?: string;
  messageId?: string;
}) {
  const now = new Date();
  const normalized = normalizeAddress(params.channel, params.fromAddress);

  const { data: jobs, error } = await supabaseServer
    .from('cc_outbound_jobs')
    .select(
      `
      *,
      cc_outbound_campaigns:campaign_id(id,name,purpose,allowed_channels,status)
    `
    )
    .eq('status', 'awaiting_verification')
    .eq('bank_customer_id', params.bankCustomerId)
    .eq('channel', params.channel)
    .eq('target_address', normalized)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    await writeAuditLog({
      actorType: 'system',
      eventType: 'outbound_resume_poll_failed',
      eventVersion: 1,
      bankCustomerId: params.bankCustomerId,
      context: 'outbound',
      inputRedacted: { channel: params.channel, address: normalized },
      success: false,
      errorCode: 'OUTBOUND_RESUME_POLL_FAILED',
      errorMessage: error.message,
    });
    return { resumed: 0 };
  }

  let resumed = 0;
  for (const job of (jobs || []) as any[]) {
    // Mark verified + queue for immediate processing
    await supabaseServer
      .from('cc_outbound_jobs')
      .update({
        status: 'queued',
        next_attempt_at: now.toISOString(),
        updated_at: now.toISOString(),
        payload_json: {
          ...(job.payload_json || {}),
          verification_state: 'verified',
        },
      })
      .eq('id', job.id);

    await writeAuditLog({
      actorType: 'system',
      eventType: 'outbound_job_resumed_after_otp',
      eventVersion: 1,
      bankCustomerId: params.bankCustomerId,
      context: 'outbound',
      inputRedacted: {
        outbound_job_id: job.id,
        conversation_id: params.conversationId,
        message_id: params.messageId,
      },
      outputRedacted: { status: 'queued' },
      success: true,
    });

    // IMPORTANT: `processOutboundJob` uses the in-memory job payload.
    // Ensure the object we pass reflects the verified state to prevent re-sending VERIFY prompts.
    const patchedJob = {
      ...job,
      status: 'queued',
      next_attempt_at: now.toISOString(),
      payload_json: {
        ...(job.payload_json || {}),
        verification_state: 'verified',
      },
    };

    await processOutboundJob(patchedJob, now);
    resumed += 1;
  }

  return { resumed };
}

