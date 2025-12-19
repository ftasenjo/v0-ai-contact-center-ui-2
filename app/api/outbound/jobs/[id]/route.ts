import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/banking-store';
import { requireOutboundAdmin } from '@/lib/outbound/api-auth';
import { redactSensitive } from '@/lib/audit-redaction';

/**
 * GET /api/outbound/jobs/:id
 * Returns job + campaign + attempts (ordered by attempt_number asc).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = requireOutboundAdmin(request);
  if (!perm.ok) return perm.res;

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing job id' }, { status: 400 });

    const { data: job, error } = await supabaseServer
      .from('cc_outbound_jobs')
      .select('id,status,channel,created_at,campaign_id,payload_json')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!job) {
      return NextResponse.json({ error: 'Outbound job not found' }, { status: 404 });
    }

    const { data: attempts, error: attemptsError } = await supabaseServer
      .from('cc_outbound_attempts')
      .select('attempt_number,status,created_at,provider_message_id,provider_call_sid')
      .eq('outbound_job_id', id)
      .order('attempt_number', { ascending: true });

    if (attemptsError) throw attemptsError;

    const { data: audit, error: auditError } = await supabaseServer
      .from('cc_audit_logs')
      .select('event_type,created_at,input_redacted')
      .or(`input_redacted->>outbound_job_id.eq.${id},input_redacted->>job_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (auditError) throw auditError;

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status === "cancelled" ? "canceled" : job.status,
        channel: job.channel,
        created_at: job.created_at,
        campaign_id: job.campaign_id,
        payload_redacted: redactSensitive(job.payload_json || {}, "outbound"),
      },
      attempts: (attempts || []).map((a: any) => ({
        attempt_no: a.attempt_number,
        status: a.status,
        created_at: a.created_at,
        provider_message_id: a.provider_message_id || a.provider_call_sid || null,
      })),
      audit_tail: (audit || []).map((e: any) => ({
        event_type: e.event_type,
        created_at: e.created_at,
      })),
    });
  } catch (error: any) {
    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.ok ? perm.actorId : undefined,
      eventType: 'outbound_job_get_failed',
      eventVersion: 1,
      context: 'outbound',
      success: false,
      errorCode: 'OUTBOUND_JOB_GET_FAILED',
      errorMessage: error?.message,
    });
    return NextResponse.json({ error: 'Failed to fetch outbound job', message: error?.message }, { status: 500 });
  }
}

