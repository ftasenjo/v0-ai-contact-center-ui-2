import { NextRequest, NextResponse } from 'next/server';
import { runDueOutboundJobs } from '@/lib/outbound/outbound-runner';
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
 * POST /api/outbound/jobs/run
 * Body: { limit?: number }
 *
 * Intended for cron invocation later (Vercel Cron).
 */
export async function POST(request: NextRequest) {
  const perm = requireOutboundPermission(request);
  if (!perm.ok) return perm.res;

  const now = new Date();
  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body?.limit === 'number' ? body.limit : 25;

    const result = await runDueOutboundJobs({ limit, now });

    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.role,
      eventType: 'outbound_runner_invoked',
      eventVersion: 1,
      context: 'outbound',
      inputRedacted: { limit, now: now.toISOString() },
      outputRedacted: { processed: result.processed },
      success: true,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    await writeAuditLog({
      actorType: 'agent',
      actorId: perm.ok ? perm.role : undefined,
      eventType: 'outbound_runner_invoke_failed',
      eventVersion: 1,
      context: 'outbound',
      success: false,
      errorCode: 'OUTBOUND_RUN_FAILED',
      errorMessage: error?.message,
    });
    return NextResponse.json({ error: 'Failed to run outbound jobs', message: error?.message }, { status: 500 });
  }
}

