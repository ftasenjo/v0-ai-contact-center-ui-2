import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { normalizeAddress } from '@/lib/identity-resolution';
import { writeAuditLog } from '@/lib/banking-store';
import { requireOutboundAdmin } from '@/lib/outbound/api-auth';

function defaultMaxAttempts(channel: string): number {
  return channel === 'voice' ? 2 : 3;
}

/**
 * POST /api/outbound/jobs/create
 *
 * Body:
 * - campaignId?: string
 * - campaign?: { name: string; purpose: 'fraud_alert'|'kyc_update'|'collections'|'case_followup'|'service_notice'; allowedChannels?: string[] }
 * - bankCustomerId?: string
 * - channel: 'whatsapp'|'email'|'voice'|'sms'
 * - targetAddress: string
 * - payloadJson?: any
 * - scheduledAt?: ISO string
 * - maxAttempts?: number
 */
export async function POST(request: NextRequest) {
  const perm = requireOutboundAdmin(request);
  if (!perm.ok) return perm.res;

  const now = new Date();
  try {
    const body = await request.json();
    const {
      campaignId,
      campaign,
      bankCustomerId,
      channel,
      targetAddress,
      payloadJson,
      scheduledAt,
      maxAttempts,
    } = body || {};

    if (!channel || !targetAddress) {
      return NextResponse.json({ error: 'channel and targetAddress are required' }, { status: 400 });
    }

    const normalizedTarget = normalizeAddress(channel, targetAddress);
    const schedule = scheduledAt ? new Date(scheduledAt) : now;
    const nextAttemptAt = schedule.toISOString();

    let resolvedCampaignId = campaignId as string | undefined;
    if (!resolvedCampaignId) {
      if (!campaign?.name || !campaign?.purpose) {
        return NextResponse.json(
          { error: 'Either campaignId or campaign {name,purpose} is required' },
          { status: 400 }
        );
      }

      const { data: createdCampaign, error: campaignErr } = await supabaseServer
        .from('cc_outbound_campaigns')
        .insert({
          name: campaign.name,
          purpose: campaign.purpose,
          allowed_channels: campaign.allowedChannels || null,
          status: 'active',
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select('id')
        .single();

      if (campaignErr) throw campaignErr;
      resolvedCampaignId = createdCampaign.id;
    }

    const { data: job, error: jobErr } = await supabaseServer
      .from('cc_outbound_jobs')
      .insert({
        campaign_id: resolvedCampaignId,
        bank_customer_id: bankCustomerId || null,
        target_address: normalizedTarget,
        channel,
        payload_json: payloadJson || {},
        status: 'queued',
        scheduled_at: schedule.toISOString(),
        next_attempt_at: nextAttemptAt,
        attempt_count: 0,
        max_attempts: typeof maxAttempts === 'number' ? maxAttempts : defaultMaxAttempts(channel),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select('*')
      .single();

    if (jobErr) throw jobErr;

    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.actorId,
      eventType: 'outbound_job_created',
      eventVersion: 1,
      bankCustomerId: bankCustomerId || undefined,
      context: 'outbound',
      inputRedacted: {
        campaign_id: resolvedCampaignId,
        channel,
        target_address: normalizedTarget,
        scheduled_at: schedule.toISOString(),
        max_attempts: job.max_attempts,
      },
      outputRedacted: { outbound_job_id: job.id, status: job.status },
      success: true,
    });

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.ok ? perm.actorId : undefined,
      eventType: 'outbound_job_create_failed',
      eventVersion: 1,
      context: 'outbound',
      success: false,
      errorCode: 'OUTBOUND_JOB_CREATE_FAILED',
      errorMessage: error?.message,
    });

    return NextResponse.json({ error: 'Failed to create outbound job', message: error?.message }, { status: 500 });
  }
}

