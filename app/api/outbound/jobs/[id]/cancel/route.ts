import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/banking-store';

type UserRole = 'agent' | 'supervisor' | 'admin' | 'analyst';

function requireOutboundPermission(request: NextRequest): { ok: true; role: UserRole } | { ok: false; res: NextResponse } {
  const role = (request.headers.get('x-user-role') || '').toLowerCase() as UserRole;
  if (!role) {
    return { ok: false, res: NextResponse.json({ error: 'Missing x-user-role header' }, { status: 401 }) };
  }
  if (role !== 'admin' && role !== 'supervisor') {
    return { ok: false, res: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) };
  }
  return { ok: true, role };
}

/**
 * POST /api/outbound/jobs/:id/cancel
 * Body: { reasonCode?: string; reasonMessage?: string; outcomeCode?: string }
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const perm = requireOutboundPermission(request);
  if (!perm.ok) return perm.res;

  const now = new Date();
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    const reasonCode = body?.reasonCode || 'cancelled_by_staff';
    const reasonMessage = body?.reasonMessage || null;
    const outcomeCode = body?.outcomeCode || null; // e.g., opt_out, wrong_party, escalated_to_human

    const { data: job, error } = await supabaseServer
      .from('cc_outbound_jobs')
      .update({
        status: 'cancelled',
        cancel_reason_code: reasonCode,
        cancel_reason_message: reasonMessage,
        outcome_code: outcomeCode,
        next_attempt_at: null,
        updated_at: now.toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.role,
      eventType: 'outbound_job_cancelled',
      eventVersion: 1,
      bankCustomerId: job.bank_customer_id || undefined,
      context: 'outbound',
      inputRedacted: { outbound_job_id: id, reason_code: reasonCode, outcome_code: outcomeCode },
      outputRedacted: { status: 'cancelled' },
      success: true,
    });

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.ok ? perm.role : undefined,
      eventType: 'outbound_job_cancel_failed',
      eventVersion: 1,
      context: 'outbound',
      success: false,
      errorCode: 'OUTBOUND_CANCEL_FAILED',
      errorMessage: error?.message,
    });
    return NextResponse.json({ error: 'Failed to cancel job', message: error?.message }, { status: 500 });
  }
}

